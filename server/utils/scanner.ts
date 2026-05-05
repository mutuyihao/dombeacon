import { domainStatusLatest, domainStatusHistory } from "../db/schema";
import { eq } from "drizzle-orm";
import { useDb } from "./db";

const RDAP_TIMEOUT_MS = 7000;

const RDAP_SERVERS: Record<string, string> = {
  com: "https://rdap.verisign.com/com/v1/domain/",
  net: "https://rdap.verisign.com/net/v1/domain/",
  org: "https://rdap.publicinterestregistry.net/rdap/org/domain/",
  io: "https://rdap.nic.io/domain/",
  me: "https://rdap.nic.me/domain/",
  // Fallback or generic bootstrap would be better but hardcoding common ones for MVP
};

type RdapSummary = {
  handle: string | null;
  unicodeName: string | null;
  rdapUrl: string | null;
  events: {
    registration: string | null;
    expiration: string | null;
    registrarExpiration: string | null;
    lastChanged: string | null;
    transfer: string | null;
    lastUpdateOfRdapDb: string | null;
  };
  statuses: string[];
  secureDNS: {
    delegationSigned: boolean | null;
    dsData: Array<{
      keyTag: number | null;
      algorithm: number | null;
      digestType: number | null;
      digest: string | null;
    }>;
  } | null;
  registrar: {
    name: string | null;
    ianaId: string | null;
    abuseEmail: string | null;
    abusePhone: string | null;
  } | null;
  nameserversDetailed: Array<{
    name: string;
    v4?: string[];
    v6?: string[];
  }>;
};

const parseRdap = (
  data: any,
  ctx: { domain: string; rdapBase: string },
): {
  status: string;
  expiresAt: Date | null;
  registrar: string;
  nameservers: string[];
  rdapSummary: RdapSummary;
} => {
  const normalizeStatusKey = (s: any) =>
    String(s || "")
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, "");

  const normalizeEventAction = (s: any) =>
    String(s || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  const asArray = (v: any) => (Array.isArray(v) ? v : []);

  const pickEventDate = (events: any[], actions: string[]) => {
    const targets = new Set(actions.map(normalizeEventAction));
    const hit = events.find((e) => targets.has(normalizeEventAction(e?.eventAction)));
    return typeof hit?.eventDate === "string" && hit.eventDate
      ? String(hit.eventDate)
      : null;
  };

  const pickVcardTextProp = (vcardArray: any, propName: string) => {
    const props = asArray(vcardArray?.[1]);
    for (const p of props) {
      if (!Array.isArray(p)) continue;
      const name = String(p?.[0] || "").trim().toLowerCase();
      if (name !== propName) continue;
      const value = p?.[3];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return null;
  };

  const pickVcardTel = (vcardArray: any) => {
    const props = asArray(vcardArray?.[1]);
    for (const p of props) {
      if (!Array.isArray(p)) continue;
      const name = String(p?.[0] || "").trim().toLowerCase();
      if (name !== "tel") continue;
      const value = p?.[3];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return null;
  };

  // Logic to determine status
  // 1. Check 'events' for expiration
  // Prefer registrar expiration when present (registrar system), then registry expiration.
  const events = asArray(data?.events);
  const eventRegistrarExpiration = pickEventDate(events, ["registrar expiration"]);
  const eventExpiration = pickEventDate(events, [
    "expiration",
    "registration expiration",
  ]);
  const expiresAtRaw = eventRegistrarExpiration || eventExpiration;
  let expiresAt: Date | null = null;
  if (expiresAtRaw) {
    const d = new Date(expiresAtRaw);
    expiresAt = Number.isNaN(d.getTime()) ? null : d;
  }

  // 2. Check 'status' array
  // RDAP statuses: 'active', 'inactive', 'pending delete', etc.
  // Our Enums: AVAILABLE, REGISTERED, EXPIRING, PENDING_DELETE, UNKNOWN

  let status = "REGISTERED";
  const rdapStatus = data?.status || [];
  const statuses = asArray(rdapStatus).map((s) => String(s || "").trim()).filter(Boolean);
  const statusKeys = new Set(
    (Array.isArray(rdapStatus) ? rdapStatus : []).map(normalizeStatusKey),
  );

  const hasPendingDelete = statusKeys.has("pendingdelete");
  const hasRedemption = statusKeys.has("redemptionperiod");
  const hasPendingRestore = statusKeys.has("pendingrestore");

  // Rule: Pending Delete (formerly DROPPING)
  // Notes:
  // - "client delete prohibited" / "server delete prohibited" are locks, not lifecycle deletion.
  // - Per ICANN docs, "pending delete" may be combined with "redemption period" or "pending restore".
  //   When "pending restore" is present, a restore is in progress, so avoid labeling it as "PENDING_DELETE".
  if (hasPendingDelete || hasRedemption) {
    status = hasPendingRestore ? "EXPIRING" : "PENDING_DELETE";
  } else if (hasPendingRestore) {
    // Restore in progress after redemption period.
    status = "EXPIRING";
  } else if (statusKeys.has("autorenewperiod")) {
    // Domain is in registry auto-renew grace period: treat as expiring/at risk.
    status = "EXPIRING";
  } else if (expiresAt) {
    const now = new Date();
    const diffDays = (expiresAt.getTime() - now.getTime()) / (1000 * 3600 * 24);
    if (diffDays <= 30) {
      // <30 days or already expired (still exists in registry)
      status = "EXPIRING";
    }
  }

  // Nameservers
  const nameserversDetailed = asArray(data?.nameservers)
    .map((ns: any) => {
      const name = String(ns?.ldhName || ns?.unicodeName || "").trim();
      if (!name) return null;
      const v4 = asArray(ns?.ipAddresses?.v4).map((v: any) => String(v || "").trim()).filter(Boolean);
      const v6 = asArray(ns?.ipAddresses?.v6).map((v: any) => String(v || "").trim()).filter(Boolean);
      const row: { name: string; v4?: string[]; v6?: string[] } = { name };
      if (v4.length) row.v4 = v4;
      if (v6.length) row.v6 = v6;
      return row;
    })
    .filter(Boolean) as Array<{ name: string; v4?: string[]; v6?: string[] }>;

  const nameservers = nameserversDetailed.map((ns) => ns.name);

  // Registrar
  const registrarEntity = asArray(data?.entities).find(
    (e: any) => Array.isArray(e?.roles) && e.roles.includes("registrar"),
  );
  const registrarName =
    pickVcardTextProp(registrarEntity?.vcardArray, "fn") || "Unknown";
  const registrarIanaId = (() => {
    const byPublicId = asArray(registrarEntity?.publicIds).find(
      (p: any) =>
        String(p?.type || "").trim().toLowerCase() === "iana registrar id" &&
        String(p?.identifier || "").trim(),
    );
    const fromPublic = byPublicId ? String(byPublicId.identifier).trim() : "";
    const fromHandle = String(registrarEntity?.handle || "").trim();
    return fromPublic || fromHandle || null;
  })();

  const abuseEntity = asArray(registrarEntity?.entities).find(
    (e: any) => Array.isArray(e?.roles) && e.roles.includes("abuse"),
  );
  const abuseEmail = pickVcardTextProp(abuseEntity?.vcardArray, "email");
  const abusePhone = pickVcardTel(abuseEntity?.vcardArray);

  const secureDNS = (() => {
    if (!data?.secureDNS) return null;
    const delegationSigned =
      typeof data.secureDNS.delegationSigned === "boolean"
        ? data.secureDNS.delegationSigned
        : null;
    const dsData = asArray(data.secureDNS.dsData).map((d: any) => ({
      keyTag: Number.isFinite(Number(d?.keyTag)) ? Number(d.keyTag) : null,
      algorithm: Number.isFinite(Number(d?.algorithm)) ? Number(d.algorithm) : null,
      digestType: Number.isFinite(Number(d?.digestType))
        ? Number(d.digestType)
        : null,
      digest: typeof d?.digest === "string" && d.digest.trim() ? d.digest.trim() : null,
    }));
    return { delegationSigned, dsData };
  })();

  const rdapUrl = (() => {
    const selfLink = asArray(data?.links).find(
      (l: any) => String(l?.rel || "").trim().toLowerCase() === "self",
    );
    const href = String(selfLink?.href || "").trim();
    if (href) return href;
    return `${ctx.rdapBase}${ctx.domain}`;
  })();

  const rdapSummary: RdapSummary = {
    handle: typeof data?.handle === "string" && data.handle.trim() ? data.handle.trim() : null,
    unicodeName:
      typeof data?.unicodeName === "string" && data.unicodeName.trim()
        ? data.unicodeName.trim()
        : null,
    rdapUrl,
    events: {
      registration: pickEventDate(events, ["registration", "reregistration"]),
      expiration: eventExpiration,
      registrarExpiration: eventRegistrarExpiration,
      lastChanged: pickEventDate(events, ["last changed"]),
      transfer: pickEventDate(events, ["transfer"]),
      lastUpdateOfRdapDb: pickEventDate(events, ["last update of rdap database"]),
    },
    statuses,
    secureDNS,
    registrar: {
      name: registrarName || null,
      ianaId: registrarIanaId,
      abuseEmail,
      abusePhone,
    },
    nameserversDetailed,
  };

  return {
    status,
    expiresAt,
    registrar: registrarName || "Unknown",
    nameservers,
    rdapSummary,
  };
};

type CheckDomainResult = {
  changed: boolean;
  oldStatus: string | null;
  newStatus: string;
};

type CheckDomainOptions = {
  fetchImpl?: typeof fetch;
  updateStatusImpl?: typeof updateStatus;
  updateErrorImpl?: typeof updateError;
};

export const checkDomain = async (
  domain: string,
  domainId: number,
  options: CheckDomainOptions = {},
): Promise<CheckDomainResult | null> => {
  const tld = domain.split(".").pop();
  const rdapBase = RDAP_SERVERS[tld || ""] || "https://rdap.org/domain/"; // Fallback to generic RDAP gateway

  try {
    const fetchImpl = options.fetchImpl ?? fetch;
    const updateStatusImpl = options.updateStatusImpl ?? updateStatus;
    const updateErrorImpl = options.updateErrorImpl ?? updateError;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), RDAP_TIMEOUT_MS);

    const response = await fetchImpl(`${rdapBase}${domain}`, {
      headers: { Accept: "application/rdap+json" },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (response.status === 404) {
      // AVAILABLE
      return await updateStatusImpl(
        domainId,
        "AVAILABLE",
        null,
        null,
        [],
        "rdap",
        null,
        null,
        "404 Not Found",
      );
    }

    if (!response.ok) {
      // Error or rate limit - update error fields without changing status
      const errorMsg = `RDAP Check failed: HTTP ${response.status}`;
      console.error(`${errorMsg} for ${domain}`);
      await updateErrorImpl(domainId, errorMsg);
      return null;
    }

    const data = await response.json();
    const { status, expiresAt, registrar, nameservers, rdapSummary } = parseRdap(
      data,
      { domain, rdapBase },
    );

    return await updateStatusImpl(
      domainId,
      status,
      expiresAt,
      registrar,
      nameservers,
      "rdap",
      JSON.stringify(data),
      JSON.stringify(rdapSummary),
      "Parsed successfully",
    );
  } catch (error: any) {
    const updateErrorImpl = options.updateErrorImpl ?? updateError;
    const errorMsg = `Network error: ${error?.name === "AbortError" ? "timeout" : error.message}`;
    console.error(`Check error for ${domain}:`, error);
    await updateErrorImpl(domainId, errorMsg);
    return null;
  }
};

async function updateStatus(
  domainId: number,
  status: string,
  expiresAt: Date | null,
  registrar: string | null,
  nameservers: string[],
  source: string,
  rawSnapshot: string | null,
  rdapSummaryJson: string | null,
  reason: string,
) {
  const db = useDb();
  const now = new Date();

  // Get current status for change detection
  const current = await db
    .select({ status: domainStatusLatest.status })
    .from(domainStatusLatest)
    .where(eq(domainStatusLatest.domainId, domainId))
    .get();

  const oldStatus = current?.status || null;
  const isChanged = oldStatus !== status;

  // Upsert latest - clear error fields on successful scan
  await db
    .insert(domainStatusLatest)
    .values({
      domainId,
      status,
      checkedAt: now,
      expiresAt,
      registrar,
      nameserversJson: JSON.stringify(nameservers),
      source,
      rawSnapshot,
      rdapSummaryJson,
      parseReason: reason,
      lastError: null,
      lastErrorAt: null,
    })
    .onConflictDoUpdate({
      target: domainStatusLatest.domainId,
      set: {
        status,
        checkedAt: now,
        expiresAt,
        registrar,
        nameserversJson: JSON.stringify(nameservers),
        source,
        rawSnapshot,
        rdapSummaryJson,
        parseReason: reason,
        lastError: null,
        lastErrorAt: null,
      },
    });

  // Record history if changed or not recently checked (e.g. daily)
  // For now, record all checks as per original code, but we focus on returning change info
  await db.insert(domainStatusHistory).values({
    domainId,
    status,
    checkedAt: now,
    expiresAt,
    source,
    rawSnapshot,
    rdapSummaryJson,
    parseReason: reason,
  });

  return {
    changed: isChanged,
    oldStatus,
    newStatus: status,
  };
}

// Update error fields without changing status
async function updateError(domainId: number, errorMsg: string) {
  const db = useDb();
  const now = new Date();

  // If the domain has never been scanned, there might be no `domain_status_latest`
  // row yet. Upsert ensures the UI shows an "unknown" state + error instead of
  // looking uninitialized.
  await db
    .insert(domainStatusLatest)
    .values({
      domainId,
      status: "UNKNOWN",
      checkedAt: now,
      lastError: errorMsg,
      lastErrorAt: now,
    })
    .onConflictDoUpdate({
      target: domainStatusLatest.domainId,
      set: {
        checkedAt: now,
        lastError: errorMsg,
        lastErrorAt: now,
      },
    });
}
