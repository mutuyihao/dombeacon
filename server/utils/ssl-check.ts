import { eq } from "drizzle-orm";
import { domains, sslStatusLatest } from "../db/schema";
import { createAction } from "./actions";
import { fanoutNotification } from "./notification-fanout";
import { scanDomainSSL } from "./ssl";

export const checkDomainSSLById = async (id: number) => {
  const db = useDb();
  const domain = await db
    .select()
    .from(domains)
    .where(eq(domains.id, id))
    .limit(1)
    .get();

  if (!domain) {
    throw new Error("Domain not found");
  }

  const prevSSL = await db
    .select()
    .from(sslStatusLatest)
    .where(eq(sslStatusLatest.domainId, id))
    .get();

  const result = await scanDomainSSL(id, domain.domain);

  if (domain.watchKind !== "OWNED") {
    return result;
  }

  const isExpiring =
    result.hasSSL &&
    result.daysUntilExpiry !== undefined &&
    result.daysUntilExpiry !== null &&
    result.daysUntilExpiry < 30;
  const isInvalid = result.hasSSL && !result.isValid;

  const prevDays = prevSSL?.daysUntilExpiry ?? null;
  const prevIsValid = prevSSL?.isValid ?? null;
  const prevHasSSL = prevSSL?.hasSSL ?? null;

  const becameExpiring = isExpiring && (prevDays === null || prevDays >= 30);
  const becameInvalid =
    isInvalid && (prevHasSSL !== true || prevIsValid !== false);

  if (isExpiring) {
    const action = await createAction({
      domainId: id,
      actionType: "SSL_EXPIRING",
      priority: domain.priority,
      metadata: {
        daysUntilExpiry: result.daysUntilExpiry,
        validTo: result.validTo?.toISOString(),
        issuer: result.issuer,
        domain: domain.domain,
      },
    });

    if (becameExpiring) {
      await fanoutNotification({
        domainId: id,
        actionId: action.id,
        eventType: "SSL_EXPIRING",
        templateType: "action_created",
        templateData: {
          domain: domain.domain,
          actionType: "SSL_EXPIRING",
          priority: domain.priority,
        },
        eventData: {
          domain: domain.domain,
          watchKind: domain.watchKind,
          priority: domain.priority,
          issuer: result.issuer,
          validTo: result.validTo?.toISOString(),
          daysUntilExpiry: result.daysUntilExpiry,
          actionId: action.id,
        },
        dedupeKey: `ssl_expiring:${id}`,
        deduplicateHours: 24,
      });
    }
  }

  if (isInvalid) {
    const action = await createAction({
      domainId: id,
      actionType: "SSL_INVALID",
      priority: domain.priority,
      metadata: {
        issuer: result.issuer,
        validTo: result.validTo?.toISOString(),
        domain: domain.domain,
      },
    });

    if (becameInvalid) {
      await fanoutNotification({
        domainId: id,
        actionId: action.id,
        eventType: "SSL_INVALID",
        templateType: "action_created",
        templateData: {
          domain: domain.domain,
          actionType: "SSL_INVALID",
          priority: domain.priority,
        },
        eventData: {
          domain: domain.domain,
          watchKind: domain.watchKind,
          priority: domain.priority,
          issuer: result.issuer,
          validTo: result.validTo?.toISOString(),
          actionId: action.id,
        },
        dedupeKey: `ssl_invalid:${id}`,
        deduplicateHours: 24,
      });
    }
  }

  return result;
};
