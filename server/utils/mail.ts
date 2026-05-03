import nodemailer from "nodemailer";
import { notificationRules } from "../db/schema";

export interface MailTemplate {
  subject: string;
  html: string;
}

export const getSmtpConfig = async () => {
  const db = useDb();
  // improvements: support multiple rules
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

export const sendMail = async (subject: string, html: string) => {
  const config = await getSmtpConfig();
  if (!config) {
    console.warn("SMTP config not found, skipping email.");
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: Number(config.port),
    secure: Number(config.port) === 465, // Auto-detect secure
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
    });
    return true;
  } catch (e) {
    console.error("Email send failed:", e);
    return false; // In future, log to smtp_events
  }
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case "AVAILABLE":
      return "#7C8B7A"; // Greenish
    case "REGISTERED":
      return "#7A7F8C"; // Bluish
    case "EXPIRING":
      return "#A08C7C"; // Brownish
    case "DROPPING":
      return "#8C6F6F"; // Reddish
    default:
      return "#8A8780";
  }
};

export const getTemplate = (
  type: "instant" | "daily" | "dropping_alert",
  data: any,
): MailTemplate => {
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";

  if (type === "instant") {
    const { domain, oldStatus, newStatus } = data;
    const color = getStatusColor(newStatus);

    return {
      subject: `[Domain Watchlist] ${domain} changed to ${newStatus}`,
      html: `
            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 8px;">
                <h2 style="color: #4B5B6B;">Status Change Detected</h2>
                <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <h3 style="margin: 0 0 10px 0;">${domain}</h3>
                    <p>Status changed from <strong>${oldStatus}</strong> to <strong style="color: ${color}">${newStatus}</strong></p>
                    <a href="${baseUrl}/domains" style="display: inline-block; margin-top: 10px; padding: 8px 16px; background: #4B5B6B; color: white; text-decoration: none; border-radius: 4px;">View Details</a>
                </div>
            </div>
            `,
    };
  } else if (type === "daily") {
    // Daily Summary
    const { runs, domains } = data;
    // domains is list of notable domains (e.g. dropping/expiring)

    const rows = domains
      .map(
        (d: any) => `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${d.domain}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; color: ${getStatusColor(d.status)}">${d.status}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${d.expiresAt ? new Date(d.expiresAt).toLocaleDateString() : "-"}</td>
            </tr>
        `,
      )
      .join("");

    return {
      subject: `[Domain Watchlist] Daily Summary - ${new Date().toLocaleDateString()}`,
      html: `
            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 8px;">
                <h2 style="color: #4B5B6B;">Daily Summary</h2>
                <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <p>System is running normally.</p>
                    <h3 style="margin-top: 20px;">Notable Domains</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="text-align: left; color: #666;">
                                <th style="padding: 8px; border-bottom: 2px solid #eee;">Domain</th>
                                <th style="padding: 8px; border-bottom: 2px solid #eee;">Status</th>
                                <th style="padding: 8px; border-bottom: 2px solid #eee;">Expires</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows || '<tr><td colspan="3" style="padding: 10px; text-align: center; color: #999;">No notable changes.</td></tr>'}
                        </tbody>
                    </table>
                    <a href="${baseUrl}/domains" style="display: inline-block; margin-top: 20px; padding: 8px 16px; background: #4B5B6B; color: white; text-decoration: none; border-radius: 4px;">Open Dashboard</a>
                </div>
            </div>
             `,
    };
  } else if (type === "dropping_alert") {
    const { domains } = data;
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";

    const items = domains
      .map(
        (d: any) => `
        <li style="margin-bottom: 10px;">
            <strong style="color: #8C6F6F;">${d.domain}</strong> 
            <span style="color: #666; font-size: 0.9em;">(ID: ${d.id})</span>
        </li>
    `,
      )
      .join("");

    return {
      subject: `⚠️ [Alert] ${domains.length} Domain(s) are now Pending Deletion (DROPPING)`,
      html: `
            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #fff5f5; border: 1px solid #feb2b2; border-radius: 8px;">
                <h2 style="color: #c53030; margin-top: 0;">⚠️ Pending Deletion Alert</h2>
                <p>The following domains have transitioned to <strong>DROPPING</strong> status and may be released soon:</p>
                <ul style="padding-left: 20px;">
                    ${items}
                </ul>
                <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #feb2b2;">
                    <a href="${baseUrl}/domains" style="display: inline-block; padding: 10px 20px; background: #c53030; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Check Dashboard Immediately</a>
                </div>
                <p style="font-size: 0.8em; color: #718096; margin-top: 20px;">
                    This is an automated alert. Domains in DROPPING status are usually in their final deletion phase.
                </p>
            </div>
            `,
    };
  }

  throw new Error(`Unknown email template type: ${type}`);
};
