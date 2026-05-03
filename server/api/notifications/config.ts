import { notificationRules } from "../../db/schema";
import { eq } from "drizzle-orm";

export const getRules = async () => {
  const db = useDb();
  const rules = await db.select().from(notificationRules).limit(1).get();
  if (!rules)
    return {
      dailyEnabled: false,
      instantEnabled: false,
      targetEmail: "",
      smtpConfig: {},
    };

  return {
    ...rules,
    smtpConfig: rules.smtpConfigJson ? JSON.parse(rules.smtpConfigJson) : {},
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
    const values = {
      instantEnabled: body.instantEnabled,
      dailyEnabled: body.dailyEnabled,
      targetEmail: body.targetEmail,
      smtpConfigJson: JSON.stringify(body.smtpConfig || {}),
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
