import { domainStatusLatest, domainStatusHistory } from "../db/schema";
import { eq } from "drizzle-orm";

const RDAP_SERVERS: Record<string, string> = {
  com: "https://rdap.verisign.com/com/v1/domain/",
  net: "https://rdap.verisign.com/net/v1/domain/",
  org: "https://rdap.publicinterestregistry.net/rdap/org/domain/",
  io: "https://rdap.nic.io/domain/",
  me: "https://rdap.nic.me/domain/",
  // Fallback or generic bootstrap would be better but hardcoding common ones for MVP
};

// Simplified parser
const parseRdap = (
  data: any,
): {
  status: string;
  expiresAt: Date | null;
  registrar: string;
  nameservers: string[];
} => {
  // Logic to determine status
  // 1. Check 'events' for expiration
  let expiresAt = null;
  if (data.events) {
    const expEvent = data.events.find(
      (e: any) =>
        e.eventAction === "expiration" ||
        e.eventAction === "registration expiration",
    );
    if (expEvent) expiresAt = new Date(expEvent.eventDate);
  }

  // 2. Check 'status' array
  // RDAP statuses: 'active', 'inactive', 'pending delete', etc.
  // Our Enums: AVAILABLE, REGISTERED, EXPIRING, PENDING_DELETE, UNKNOWN

  let status = "REGISTERED";
  const rdapStatus = data.status || [];

  // Rule: Pending Delete (formerly DROPPING)
  if (
    rdapStatus.some(
      (s: string) =>
        s.toLowerCase().includes("delete") ||
        s.toLowerCase().includes("redemption"),
    )
  ) {
    status = "PENDING_DELETE";
  } else if (expiresAt) {
    const now = new Date();
    const diffDays = (expiresAt.getTime() - now.getTime()) / (1000 * 3600 * 24);
    if (diffDays < 30 && diffDays > -10) {
      // <30 days or slightly expired but not dropped
      status = "EXPIRING";
    }
  }

  // Nameservers
  const nameservers = data.nameservers
    ? data.nameservers.map((ns: any) => ns.ldhName).filter(Boolean)
    : [];

  // Registrar
  const registrar = data.entities
    ? data.entities
        .find((e: any) => e.roles && e.roles.includes("registrar"))
        ?.vcardArray?.[1]?.find((v: any) => v[0] === "fn")?.[3]
    : "Unknown";

  return { status, expiresAt, registrar: registrar || "Unknown", nameservers };
};

export const checkDomain = async (domain: string, domainId: number) => {
  const db = useDb();
  const tld = domain.split(".").pop();
  const rdapBase = RDAP_SERVERS[tld || ""] || "https://rdap.org/domain/"; // Fallback to generic RDAP gateway

  try {
    const response = await fetch(`${rdapBase}${domain}`, {
      headers: { Accept: "application/rdap+json" },
    });

    if (response.status === 404) {
      // AVAILABLE
      await updateStatus(
        domainId,
        "AVAILABLE",
        null,
        null,
        [],
        "rdap",
        null,
        "404 Not Found",
      );
      return;
    }

    if (!response.ok) {
      // Error or rate limit - update error fields without changing status
      const errorMsg = `RDAP Check failed: HTTP ${response.status}`;
      console.error(`${errorMsg} for ${domain}`);
      await updateError(domainId, errorMsg);
      return null;
    }

    const data = await response.json();
    const { status, expiresAt, registrar, nameservers } = parseRdap(data);

    return await updateStatus(
      domainId,
      status,
      expiresAt,
      registrar,
      nameservers,
      "rdap",
      JSON.stringify(data),
      "Parsed successfully",
    );
  } catch (error: any) {
    const errorMsg = `Network error: ${error.message}`;
    console.error(`Check error for ${domain}:`, error);
    await updateError(domainId, errorMsg);
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

  await db
    .update(domainStatusLatest)
    .set({
      lastError: errorMsg,
      lastErrorAt: now,
    })
    .where(eq(domainStatusLatest.domainId, domainId));
}
