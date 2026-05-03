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
  // Our Enums: AVAILABLE, REGISTERED, EXPIRING, DROPPING, UNKNOWN

  let status = "REGISTERED";
  const rdapStatus = data.status || [];

  // Rule: Dropping
  if (
    rdapStatus.some(
      (s: string) =>
        s.toLowerCase().includes("delete") ||
        s.toLowerCase().includes("redemption"),
    )
  ) {
    status = "DROPPING";
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
      // Error or rate limit
      // Log error
      console.error(`RDAP Check failed for ${domain}: ${response.status}`);
      return; // Retry later or mark UNKNOWN
      // For now, let's update to UNKNOWN if it's 500s? Or just skip update.
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
    console.error(`Check error for ${domain}`, error);
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

  // Upsert latest
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
