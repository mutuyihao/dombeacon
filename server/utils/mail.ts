import nodemailer from "nodemailer";
import { notificationRules, notificationEvents } from "../db/schema";
import { eq, and, gte } from "drizzle-orm";

export interface MailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export const getSmtpConfig = async () => {
  const db = useDb();
  const rule = await db.select().from(notificationRules).limit(1).get();
  if (!rule || !rule.smtpConfigJson) return null;
  try {
    return {
      ...JSON.parse(rule.smtpConfigJson),
      targetEmail: rule.targetEmail,
      instant: rule.instantEnabled,
      daily: rule.dailyEnabled,
    };
  } catch {
    return null;
  }
};

/**
 * Check if a similar notification was sent recently (deduplication)
 * @param domainId - Domain ID
 * @param eventType - Event type
 * @param hoursWindow - Time window in hours (default 24)
 */
export const wasRecentlySent = async (
  domainId: number,
  eventType: string,
  hoursWindow: number = 24,
): Promise<boolean> => {
  const db = useDb();
  const cutoff = new Date(Date.now() - hoursWindow * 60 * 60 * 1000);

  const recent = await db
    .select()
    .from(notificationEvents)
    .where(
      and(
        eq(notificationEvents.domainId, domainId),
        eq(notificationEvents.eventType, eventType),
        eq(notificationEvents.status, "SENT"),
        gte(notificationEvents.sentAt, cutoff),
      ),
    )
    .limit(1)
    .get();

  return !!recent;
};

/**
 * Record a notification event
 */
export const recordNotificationEvent = async (params: {
  domainId?: number;
  actionId?: number;
  eventType: string;
  channel: string;
  status: "PENDING" | "SENT" | "FAILED";
  errorMessage?: string;
  metadata?: any;
}) => {
  const db = useDb();
  const now = new Date();

  await db.insert(notificationEvents).values({
    domainId: params.domainId || null,
    actionId: params.actionId || null,
    eventType: params.eventType,
    channel: params.channel,
    status: params.status,
    sentAt: params.status === "SENT" ? now : null,
    failedAt: params.status === "FAILED" ? now : null,
    errorMessage: params.errorMessage || null,
    metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    createdAt: now,
  });
};

export const sendMail = async (
  subject: string,
  html: string,
  text?: string,
) => {
  const config = await getSmtpConfig();
  if (!config) {
    console.warn("SMTP config not found, skipping email.");
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: Number(config.port),
    secure: Number(config.port) === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  try {
    await transporter.sendMail({
      from: config.from,
      to: config.targetEmail,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ""), // Strip HTML for text version
    });
    return true;
  } catch (e) {
    console.error("Email send failed:", e);
    return false;
  }
};

/**
 * Send notification with deduplication
 */
export const sendNotification = async (params: {
  domainId?: number;
  actionId?: number;
  eventType: string;
  templateType: "instant" | "daily" | "dropping_alert" | "action_created";
  templateData: any;
  deduplicateHours?: number;
}) => {
  const {
    domainId,
    actionId,
    eventType,
    templateType,
    templateData,
    deduplicateHours = 24,
  } = params;

  // Check deduplication
  if (domainId && deduplicateHours > 0) {
    const wasSent = await wasRecentlySent(domainId, eventType, deduplicateHours);
    if (wasSent) {
      console.log(
        `Skipping notification for domain ${domainId}, event ${eventType} - already sent within ${deduplicateHours}h`,
      );
      return false;
    }
  }

  // Get template
  const template = getTemplate(templateType, templateData);

  // Send email
  const success = await sendMail(template.subject, template.html, template.text);

  // Record event
  await recordNotificationEvent({
    domainId,
    actionId,
    eventType,
    channel: "EMAIL",
    status: success ? "SENT" : "FAILED",
    errorMessage: success ? undefined : "SMTP send failed",
    metadata: { templateType, ...templateData },
  });

  return success;
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case "AVAILABLE":
      return "#7C8B7A";
    case "REGISTERED":
      return "#7A7F8C";
    case "EXPIRING":
      return "#A08C7C";
    case "PENDING_DELETE":
      return "#8C6F6F";
    default:
      return "#8A8780";
  }
};

export const getTemplate = (
  type: "instant" | "daily" | "dropping_alert" | "action_created",
  data: any,
): MailTemplate => {
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  const appName = "DomBeacon (域灯)";

  if (type === "instant") {
    const { domain, oldStatus, newStatus } = data;
    const color = getStatusColor(newStatus);

    return {
      subject: `[${appName}] ${domain} → ${newStatus}`,
      html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F4F2EE;">
    <div style="max-width: 600px; margin: 40px auto; padding: 0 20px;">
        <div style="background: #FAF8F4; border: 1px solid #E7E2DA; border-radius: 16px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
            <h2 style="margin: 0 0 24px 0; color: #4B5B6B; font-size: 20px; font-weight: 600;">🔔 Status Change Detected</h2>

            <div style="background: white; border: 1px solid #E7E2DA; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #2B2B2B; word-break: break-all;">${domain}</h3>

                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                    <span style="color: #6B6B6B; font-size: 14px;">${oldStatus}</span>
                    <span style="color: #9A9A9A;">→</span>
                    <span style="color: ${color}; font-weight: 600; font-size: 14px;">${newStatus}</span>
                </div>

                <p style="margin: 0; color: #6B6B6B; font-size: 14px; line-height: 1.6;">
                    The domain status has changed. Check the dashboard for more details.
                </p>
            </div>

            <a href="${baseUrl}/domains" style="display: inline-block; padding: 12px 24px; background: #4B5B6B; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500;">View Dashboard</a>

            <p style="margin: 24px 0 0 0; color: #9A9A9A; font-size: 12px; line-height: 1.5;">
                This is an automated notification from ${appName}.<br>
                Time: ${new Date().toLocaleString()}
            </p>
        </div>
    </div>
</body>
</html>
            `,
      text: `${appName} - Status Change\n\nDomain: ${domain}\nStatus: ${oldStatus} → ${newStatus}\n\nView details: ${baseUrl}/domains`,
    };
  } else if (type === "action_created") {
    const { domain, actionType, priority } = data;
    const actionTypeLabels: Record<string, string> = {
      WANTED_AVAILABLE: "🎯 Wanted Domain Available",
      WANTED_DROPPING: "⚠️ Wanted Domain Dropping",
      OWNED_EXPIRING: "⏰ Owned Domain Expiring",
      SSL_EXPIRING: "🔒 SSL Expiring Soon",
      SSL_INVALID: "🔒 SSL Invalid",
      SCAN_FAILED: "❌ Scan Failed",
    };

    const priorityColors: Record<string, string> = {
      HIGH: "#8C6F6F",
      MEDIUM: "#A08C7C",
      LOW: "#8A8780",
    };

    return {
      subject: `[${appName}] Action Required: ${domain}`,
      html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F4F2EE;">
    <div style="max-width: 600px; margin: 40px auto; padding: 0 20px;">
        <div style="background: #FAF8F4; border: 1px solid #E7E2DA; border-left: 4px solid ${priorityColors[priority] || "#8A8780"}; border-radius: 16px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
            <h2 style="margin: 0 0 24px 0; color: #4B5B6B; font-size: 20px; font-weight: 600;">${actionTypeLabels[actionType] || "Action Required"}</h2>

            <div style="background: white; border: 1px solid #E7E2DA; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #2B2B2B; word-break: break-all;">${domain}</h3>

                <div style="margin-bottom: 16px;">
                    <span style="display: inline-block; padding: 4px 12px; background: ${priorityColors[priority]}20; color: ${priorityColors[priority]}; border-radius: 6px; font-size: 12px; font-weight: 600;">
                        ${priority} PRIORITY
                    </span>
                </div>

                <p style="margin: 0; color: #6B6B6B; font-size: 14px; line-height: 1.6;">
                    A new action has been created for this domain. Please review and take appropriate action.
                </p>
            </div>

            <a href="${baseUrl}/actions" style="display: inline-block; padding: 12px 24px; background: #4B5B6B; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500;">View Action Queue</a>

            <p style="margin: 24px 0 0 0; color: #9A9A9A; font-size: 12px; line-height: 1.5;">
                This is an automated notification from ${appName}.<br>
                Time: ${new Date().toLocaleString()}
            </p>
        </div>
    </div>
</body>
</html>
            `,
      text: `${appName} - Action Required\n\nDomain: ${domain}\nType: ${actionTypeLabels[actionType]}\nPriority: ${priority}\n\nView actions: ${baseUrl}/actions`,
    };
  } else if (type === "daily") {
    const { domains, stats } = data;

    const domainRows = domains
      .map(
        (d: any) => `
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #E7E2DA;">
                <strong style="color: #2B2B2B; font-size: 14px;">${d.domain}</strong>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #E7E2DA;">
                <span style="color: ${getStatusColor(d.status)}; font-size: 13px; font-weight: 500;">${d.status}</span>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #E7E2DA; color: #6B6B6B; font-size: 13px;">
                ${d.expiresAt ? new Date(d.expiresAt).toLocaleDateString() : "-"}
            </td>
        </tr>
        `,
      )
      .join("");

    return {
      subject: `[${appName}] Daily Summary - ${new Date().toLocaleDateString()}`,
      html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F4F2EE;">
    <div style="max-width: 600px; margin: 40px auto; padding: 0 20px;">
        <div style="background: #FAF8F4; border: 1px solid #E7E2DA; border-radius: 16px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
            <h2 style="margin: 0 0 24px 0; color: #4B5B6B; font-size: 20px; font-weight: 600;">📊 Daily Summary</h2>

            <div style="background: white; border: 1px solid #E7E2DA; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px;">
                    <div style="text-align: center;">
                        <div style="font-size: 24px; font-weight: 600; color: #4B5B6B;">${stats?.total || 0}</div>
                        <div style="font-size: 12px; color: #9A9A9A; margin-top: 4px;">Total Domains</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 24px; font-weight: 600; color: #7C8B7A;">${stats?.active || 0}</div>
                        <div style="font-size: 12px; color: #9A9A9A; margin-top: 4px;">Active</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 24px; font-weight: 600; color: #A08C7C;">${stats?.expiring || 0}</div>
                        <div style="font-size: 12px; color: #9A9A9A; margin-top: 4px;">Expiring Soon</div>
                    </div>
                </div>

                ${domains.length > 0 ? `
                <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #2B2B2B;">Notable Domains</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="text-align: left;">
                            <th style="padding: 12px; border-bottom: 2px solid #E7E2DA; color: #6B6B6B; font-size: 12px; font-weight: 600; text-transform: uppercase;">Domain</th>
                            <th style="padding: 12px; border-bottom: 2px solid #E7E2DA; color: #6B6B6B; font-size: 12px; font-weight: 600; text-transform: uppercase;">Status</th>
                            <th style="padding: 12px; border-bottom: 2px solid #E7E2DA; color: #6B6B6B; font-size: 12px; font-weight: 600; text-transform: uppercase;">Expires</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${domainRows}
                    </tbody>
                </table>
                ` : `
                <p style="text-align: center; color: #9A9A9A; font-size: 14px; padding: 24px 0;">No notable changes today.</p>
                `}
            </div>

            <a href="${baseUrl}/domains" style="display: inline-block; padding: 12px 24px; background: #4B5B6B; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500;">Open Dashboard</a>

            <p style="margin: 24px 0 0 0; color: #9A9A9A; font-size: 12px; line-height: 1.5;">
                This is an automated daily summary from ${appName}.<br>
                Time: ${new Date().toLocaleString()}
            </p>
        </div>
    </div>
</body>
</html>
            `,
      text: `${appName} - Daily Summary\n\nTotal Domains: ${stats?.total || 0}\nActive: ${stats?.active || 0}\nExpiring Soon: ${stats?.expiring || 0}\n\nView dashboard: ${baseUrl}/domains`,
    };
  }

  throw new Error(`Unknown email template type: ${type}`);
};
