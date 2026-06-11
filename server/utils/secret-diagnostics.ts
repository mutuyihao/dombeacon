import {
  notificationRules,
  pushSubscriptions,
  serverchanConfigs,
  webhookConfigs,
} from "../db/schema";
import {
  hasSecretEncryptionKey,
  isEncryptedSecret,
  warnMissingSecretEncryptionKey,
} from "./secrets";
import { useDb } from "./db";
import { logger } from "./logger";

type Db = ReturnType<typeof useDb>;

const hasProtectedJsonPayload = (value: string | null | undefined) => {
  if (!value) return false;
  const trimmed = value.trim();
  return Boolean(trimmed && trimmed !== "{}" && trimmed !== "[]");
};

const parseJson = (value: string | null | undefined) => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as any) : {};
  } catch {
    return {};
  }
};

const isPlainSecret = (value: string | null | undefined) =>
  Boolean(value && !isEncryptedSecret(value));

/**
 * Emits startup diagnostics for secret storage. It never attempts to decrypt or
 * rewrite secrets, so startup remains safe even when the encryption key changed.
 */
export const warnAboutPlaintextStoredSecrets = async (db: Db) => {
  const plaintextLocations: string[] = [];

  if (!hasSecretEncryptionKey()) {
    warnMissingSecretEncryptionKey("existing configured secrets");
  }

  const [rules, serverchans, webhooks, pushSubs] = await Promise.all([
    db.select().from(notificationRules).all(),
    db.select().from(serverchanConfigs).all(),
    db.select().from(webhookConfigs).all(),
    db.select().from(pushSubscriptions).all(),
  ]);

  for (const rule of rules) {
    const smtpConfig = parseJson(rule.smtpConfigJson);
    if (isPlainSecret(smtpConfig.pass)) {
      plaintextLocations.push(`notification_rules:${rule.id}:smtp.pass`);
    }
  }

  for (const config of serverchans) {
    if (isPlainSecret(config.sendKey)) {
      plaintextLocations.push(`serverchan_configs:${config.id}:send_key`);
    }
    if (
      hasProtectedJsonPayload(config.optionsJson) &&
      isPlainSecret(config.optionsJson)
    ) {
      plaintextLocations.push(`serverchan_configs:${config.id}:options_json`);
    }
  }

  for (const config of webhooks) {
    if (
      hasProtectedJsonPayload(config.headersJson) &&
      isPlainSecret(config.headersJson)
    ) {
      plaintextLocations.push(`webhook_configs:${config.id}:headers_json`);
    }
  }

  for (const subscription of pushSubs) {
    if (isPlainSecret(subscription.endpoint)) {
      plaintextLocations.push(`push_subscriptions:${subscription.id}:endpoint`);
    }
    if (isPlainSecret(subscription.p256dh)) {
      plaintextLocations.push(`push_subscriptions:${subscription.id}:p256dh`);
    }
    if (isPlainSecret(subscription.auth)) {
      plaintextLocations.push(`push_subscriptions:${subscription.id}:auth`);
    }
  }

  if (plaintextLocations.length > 0) {
    logger.warn("Detected stored secret fields that are not encrypted", {
      scope: "security",
      count: plaintextLocations.length,
      locations: plaintextLocations.slice(0, 20),
      truncated: plaintextLocations.length > 20,
    });
  }
};
