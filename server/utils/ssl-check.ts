import { eq } from "drizzle-orm";
import { domains, sslStatusLatest } from "../db/schema";
import { createAction } from "./actions";
import { sendNotification } from "./mail";
import { notifyPush } from "./push";
import { notifyServerchan } from "./serverchan";
import { scanDomainSSL } from "./ssl";
import { notifyWebhooks } from "./webhook";

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

  const notifyAll = async (params: {
    actionId: number;
    eventType: "SSL_EXPIRING" | "SSL_INVALID";
    eventData: any;
  }) => {
    await Promise.allSettled([
      sendNotification({
        domainId: id,
        actionId: params.actionId,
        eventType: params.eventType,
        templateType: "action_created",
        templateData: {
          domain: domain.domain,
          actionType: params.eventType,
          priority: domain.priority,
        },
        deduplicateHours: 24,
      }),
      notifyWebhooks({
        domainId: id,
        actionId: params.actionId,
        eventType: params.eventType,
        eventData: params.eventData,
      }),
      notifyServerchan({
        domainId: id,
        actionId: params.actionId,
        eventType: params.eventType,
        eventData: params.eventData,
      }),
      notifyPush({
        domainId: id,
        actionId: params.actionId,
        eventType: params.eventType,
        eventData: params.eventData,
      }),
    ]);
  };

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
      await notifyAll({
        actionId: action.id,
        eventType: "SSL_EXPIRING",
        eventData: {
          domain: domain.domain,
          watchKind: domain.watchKind,
          priority: domain.priority,
          issuer: result.issuer,
          validTo: result.validTo?.toISOString(),
          daysUntilExpiry: result.daysUntilExpiry,
          actionId: action.id,
        },
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
      await notifyAll({
        actionId: action.id,
        eventType: "SSL_INVALID",
        eventData: {
          domain: domain.domain,
          watchKind: domain.watchKind,
          priority: domain.priority,
          issuer: result.issuer,
          validTo: result.validTo?.toISOString(),
          actionId: action.id,
        },
      });
    }
  }

  return result;
};
