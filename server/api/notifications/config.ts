import { notificationRules } from "../../db/schema";
import { eq } from "drizzle-orm";
import {
  isEncryptedSecret,
  protectSecretText,
  revealSecretText,
} from "../../utils/secrets";
import { recordAuditEvent } from "../../utils/audit";
import {
  getNotificationChannelDiagnostics,
  getNotificationChannelSettings,
  getNotificationEventChannelPresets,
  getRiskNotificationDeliverySummary,
  setNotificationChannelSettings,
  setNotificationEventChannelPresets,
} from "../../utils/notification-preferences";

const parseSmtpConfig = (value?: string | null) => {
  let config: any = {};
  try {
    config = value ? JSON.parse(value) : {};
  } catch {
    return {};
  }

  try {
    return {
      ...config,
      pass: config?.pass ? revealSecretText(config.pass) : "",
      passConfigured: Boolean(config?.pass),
    };
  } catch {
    return {
      ...config,
      pass: "",
      passConfigured: Boolean(config?.pass),
    };
  }
};

const sanitizeSmtpConfig = (config: any) => {
  const { pass, passConfigured, ...safeConfig } = config || {};
  return {
    ...safeConfig,
    pass: "",
    passConfigured: Boolean(passConfigured || pass),
  };
};

const getRawSmtpConfig = (value?: string | null) => {
  try {
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
};

const protectExistingPass = (pass: string | null | undefined) => {
  if (!pass) return "";
  if (isEncryptedSecret(pass)) return pass;
  return protectSecretText(pass) || "";
};

export const getRules = async () => {
  const db = useDb();
  const rules = await db.select().from(notificationRules).limit(1).get();
  const [
    eventChannelPresets,
    riskDeliverySummary,
    channelSettings,
    channelDiagnostics,
  ] = await Promise.all([
    getNotificationEventChannelPresets({ db }),
    getRiskNotificationDeliverySummary({ db }),
    getNotificationChannelSettings({ db }),
    getNotificationChannelDiagnostics({ db }),
  ]);
  if (!rules)
    return {
      dailyEnabled: false,
      instantEnabled: false,
      targetEmail: "",
      smtpConfig: { pass: "", passConfigured: false },
      channelSettings,
      channelDiagnostics,
      eventChannelPresets,
      riskDeliverySummary,
    };

  const smtpConfig = parseSmtpConfig(rules.smtpConfigJson);
  return {
    id: rules.id,
    dailyEnabled: Boolean(rules.dailyEnabled),
    instantEnabled: Boolean(rules.instantEnabled),
    targetEmail: rules.targetEmail || "",
    smtpConfig: sanitizeSmtpConfig(smtpConfig),
    channelSettings,
    channelDiagnostics,
    eventChannelPresets,
    riskDeliverySummary,
  };
};

export default defineEventHandler(async (event) => {
  const method = event.method;
  const db = useDb();

  if (method === "GET") {
    return success(await getRules());
  }

  if (method === "POST") {
    const body = await readBody(event);
    // Validate? generic check

    // Upsert id=1
    const existing = await db.select().from(notificationRules).limit(1).get();
    const currentRawSmtpConfig = getRawSmtpConfig(existing?.smtpConfigJson);
    const incomingSmtpConfig = body.smtpConfig || {};
    const incomingPass = String(incomingSmtpConfig.pass || "").trim();
    const nextSmtpConfig = {
      ...currentRawSmtpConfig,
      ...incomingSmtpConfig,
      pass: incomingPass
        ? protectSecretText(incomingPass) || ""
        : protectExistingPass(currentRawSmtpConfig.pass),
    };
    delete nextSmtpConfig.passConfigured;

    const values = {
      instantEnabled: Boolean(body.instantEnabled),
      dailyEnabled: Boolean(body.dailyEnabled),
      targetEmail: body.targetEmail || "",
      smtpConfigJson: JSON.stringify(nextSmtpConfig),
    };
    const hasEventChannelPresets = Object.prototype.hasOwnProperty.call(
      body || {},
      "eventChannelPresets",
    );
    const eventChannelPresets = hasEventChannelPresets
      ? await setNotificationEventChannelPresets(body.eventChannelPresets, {
          db,
        })
      : undefined;
    const hasChannelSettings = Object.prototype.hasOwnProperty.call(
      body || {},
      "channelSettings",
    );
    const channelSettings = hasChannelSettings
      ? await setNotificationChannelSettings(body.channelSettings, {
          db,
        })
      : undefined;

    if (existing) {
      await db
        .update(notificationRules)
        .set(values)
        .where(eq(notificationRules.id, existing.id));
    } else {
      await db.insert(notificationRules).values(values);
    }
    await recordAuditEvent({
      event,
      eventType: "notifications.email_config_update",
      outcome: "success",
      actorType: "admin",
      metadata: {
        instantEnabled: values.instantEnabled,
        dailyEnabled: values.dailyEnabled,
        targetEmailConfigured: Boolean(values.targetEmail),
        smtpConfigured: Boolean(nextSmtpConfig.host),
        smtpUserConfigured: Boolean(nextSmtpConfig.user),
        smtpPassChanged: Boolean(incomingPass),
        smtpPassConfigured: Boolean(nextSmtpConfig.pass),
        notificationChannelSettingsChanged: hasChannelSettings,
        notificationChannelSettings: channelSettings,
        riskEventChannelPresetsChanged: hasEventChannelPresets,
        riskEventChannelPresets: eventChannelPresets,
      },
    });
    return success({ saved: true, channelSettings, eventChannelPresets });
  }
});
