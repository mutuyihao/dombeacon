import { notificationRules } from "../../db/schema";
import { eq } from "drizzle-orm";

const parseSmtpConfig = (value?: string | null) => {
  try {
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
};

const sanitizeSmtpConfig = (config: any) => {
  const { pass, ...safeConfig } = config || {};
  return {
    ...safeConfig,
    pass: "",
    passConfigured: Boolean(pass),
  };
};

export const getRules = async () => {
  const db = useDb();
  const rules = await db.select().from(notificationRules).limit(1).get();
  if (!rules)
    return {
      dailyEnabled: false,
      instantEnabled: false,
      targetEmail: "",
      smtpConfig: { pass: "", passConfigured: false },
    };

  const smtpConfig = parseSmtpConfig(rules.smtpConfigJson);
  return {
    id: rules.id,
    dailyEnabled: Boolean(rules.dailyEnabled),
    instantEnabled: Boolean(rules.instantEnabled),
    targetEmail: rules.targetEmail || "",
    smtpConfig: sanitizeSmtpConfig(smtpConfig),
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
    const currentSmtpConfig = parseSmtpConfig(existing?.smtpConfigJson);
    const incomingSmtpConfig = body.smtpConfig || {};
    const nextSmtpConfig = {
      ...currentSmtpConfig,
      ...incomingSmtpConfig,
      pass:
        incomingSmtpConfig.pass && String(incomingSmtpConfig.pass).trim()
          ? incomingSmtpConfig.pass
          : currentSmtpConfig.pass || "",
    };
    delete nextSmtpConfig.passConfigured;

    const values = {
      instantEnabled: Boolean(body.instantEnabled),
      dailyEnabled: Boolean(body.dailyEnabled),
      targetEmail: body.targetEmail || "",
      smtpConfigJson: JSON.stringify(nextSmtpConfig),
    };

    if (existing) {
      await db
        .update(notificationRules)
        .set(values)
        .where(eq(notificationRules.id, existing.id));
    } else {
      await db.insert(notificationRules).values(values);
    }
    return success({ saved: true });
  }
});
