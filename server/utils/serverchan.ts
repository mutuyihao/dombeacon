import { serverchanConfigs, notificationEvents } from "../db/schema";
import { eq } from "drizzle-orm";
import { parseProtectedJson, revealSecretText } from "./secrets";

export interface ServerchanMessage {
  title: string;
  desp?: string; // Markdown content
  short?: string; // Short message for notification
  channel?: number; // ServerChan Turbo dynamic channel id
  noip?: boolean; // Hide caller IP in ServerChan message detail
  openid?: string; // Optional copy recipients / WeCom UID list
  tags?: string; // Pipe-separated tags, e.g. "监控|域名"
}

export interface ServerchanConfigOptions {
  channel?: number | null;
  noip?: boolean;
  openid?: string;
  tags?: string;
  titlePrefix?: string;
  timeoutMs?: number;
}

export interface ServerchanSendResult {
  ok: boolean;
  error?: string;
  status?: number;
  statusText?: string;
  code?: number;
  message?: string;
}

const SERVERCHAN_API_BASE = "https://sctapi.ftqq.com";
const DEFAULT_SERVERCHAN_TIMEOUT_MS = 10000;
const SERVERCHAN_CHANNEL_IDS = new Set([9, 98, 88, 18, 66, 1, 8, 2, 3]);
const MIN_SERVERCHAN_TIMEOUT_MS = 3000;
const MAX_SERVERCHAN_TIMEOUT_MS = 30000;

const clampText = (value: unknown, maxLength: number) => {
  const text = String(value || "").trim();
  return text ? text.slice(0, maxLength) : "";
};

export const normalizeServerchanOptions = (
  value: unknown,
): ServerchanConfigOptions => {
  const input =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const rawChannel = Number(input.channel);
  const channel = SERVERCHAN_CHANNEL_IDS.has(rawChannel) ? rawChannel : null;
  const rawTimeout = Number(input.timeoutMs);

  return {
    channel,
    noip: Boolean(input.noip),
    openid: clampText(input.openid, 500),
    tags: clampText(input.tags, 200),
    titlePrefix: clampText(input.titlePrefix, 24),
    timeoutMs: Number.isFinite(rawTimeout)
      ? Math.min(
          MAX_SERVERCHAN_TIMEOUT_MS,
          Math.max(MIN_SERVERCHAN_TIMEOUT_MS, Math.round(rawTimeout)),
        )
      : DEFAULT_SERVERCHAN_TIMEOUT_MS,
  };
};

export const parseServerchanOptions = (
  value: string | null | undefined,
): ServerchanConfigOptions => normalizeServerchanOptions(
  parseProtectedJson<Record<string, unknown>>(value, {}),
);

export const applyServerchanOptions = (
  message: ServerchanMessage,
  options?: ServerchanConfigOptions | null,
): ServerchanMessage => {
  const normalized = normalizeServerchanOptions(options || {});
  const title = normalized.titlePrefix
    ? `${normalized.titlePrefix}${message.title}`
    : message.title;

  return {
    ...message,
    title: title.slice(0, 32),
    channel: normalized.channel || undefined,
    noip: normalized.noip || undefined,
    openid: normalized.openid || undefined,
    tags: normalized.tags || undefined,
  };
};

/**
 * Send Server酱 notification
 * API: https://sctapi.ftqq.com/{SendKey}.send
 */
export const sendServerchanDetailed = async (
  sendKey: string,
  message: ServerchanMessage,
  timeout: number = DEFAULT_SERVERCHAN_TIMEOUT_MS,
): Promise<ServerchanSendResult> => {
  const url = `${SERVERCHAN_API_BASE}/${encodeURIComponent(sendKey)}.send`;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), timeout);

    const formData = new URLSearchParams();
    formData.append("title", message.title.slice(0, 32));
    if (message.desp) formData.append("desp", message.desp);
    if (message.short) formData.append("short", message.short.slice(0, 64));
    if (message.noip) formData.append("noip", "1");
    if (message.channel && message.channel > 0) {
      formData.append("channel", String(message.channel));
    }
    if (message.openid) formData.append("openid", message.openid);
    if (message.tags) formData.append("tags", message.tags);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      const error = `HTTP ${response.status} ${response.statusText}${
        body ? `: ${body.slice(0, 300)}` : ""
      }`;
      console.error(`Server酱 request failed: ${error}`);
      return {
        ok: false,
        error,
        status: response.status,
        statusText: response.statusText,
      };
    }

    const text = await response.text();
    let result: any = {};
    try {
      result = text ? JSON.parse(text) : {};
    } catch {
      const error = `Invalid Server酱 response: ${text.slice(0, 300)}`;
      console.error(error);
      return { ok: false, error };
    }

    // Server酱 API returns { code: 0, message: "success", data: {...} }
    if (Number(result.code) !== 0) {
      const apiMessage =
        result.message || result.msg || `Server酱 API code ${result.code}`;
      console.error(`Server酱 API error: ${apiMessage}`);
      return {
        ok: false,
        error: apiMessage,
        code: Number(result.code),
        message: apiMessage,
      };
    }

    return {
      ok: true,
      code: 0,
      message: result.message || result.msg || "success",
    };
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.error("Server酱 request timeout");
      return { ok: false, error: `Server酱 request timeout after ${timeout}ms` };
    } else {
      console.error("Server酱 request error:", error.message);
      return { ok: false, error: error.message || "Server酱 request error" };
    }
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

export const sendServerchan = async (
  sendKey: string,
  message: ServerchanMessage,
  timeout: number = 10000,
): Promise<boolean> => {
  const result = await sendServerchanDetailed(sendKey, message, timeout);
  return result.ok;
};

/**
 * Get active Server酱 configs for specific event type
 */
export const getActiveServerchanConfigs = async (eventType: string) => {
  const db = useDb();
  const configs = await db
    .select()
    .from(serverchanConfigs)
    .where(eq(serverchanConfigs.enabled, true))
    .all();

  // Filter by event type
  return configs.filter((config) => {
    if (!config.eventTypes) return true; // No filter = all events
    try {
      const types = JSON.parse(config.eventTypes);
      const normalizedTypes = Array.isArray(types)
        ? types.map((type) => String(type || "").toUpperCase())
        : [];
      return normalizedTypes.includes(eventType);
    } catch {
      return true;
    }
  }).map((config) => ({
    ...config,
    sendKey: revealSecretText(config.sendKey),
    options: parseServerchanOptions(config.optionsJson),
  }));
};

/**
 * Format domain event as Server酱 message
 */
export const formatServerchanMessage = (
  eventType: string,
  eventData: any,
): ServerchanMessage => {
  const { domain, watchKind, priority, oldStatus, newStatus, expiresAt } =
    eventData;
  const { issuer, validTo, daysUntilExpiry } = eventData || {};

  let title = "";
  let desp = "";
  let short = "";

  switch (eventType) {
    case "WANTED_AVAILABLE":
      title = `🎉 域名可注册: ${domain}`;
      short = `${domain} 现在可以注册了！`;
      desp = `## 域名可注册通知\n\n`;
      desp += `**域名**: ${domain}\n\n`;
      desp += `**类型**: ${watchKind === "WANTED" ? "想要的" : "拥有的"}\n\n`;
      desp += `**优先级**: ${priority}\n\n`;
      desp += `**状态变更**: ${oldStatus} → ${newStatus}\n\n`;
      desp += `立即前往注册商注册此域名！`;
      break;

    case "WANTED_DROPPING":
      title = `⚠️ 域名待删除: ${domain}`;
      short = `${domain} 进入待删除状态`;
      desp = `## 域名待删除通知\n\n`;
      desp += `**域名**: ${domain}\n\n`;
      desp += `**类型**: ${watchKind === "WANTED" ? "想要的" : "拥有的"}\n\n`;
      desp += `**优先级**: ${priority}\n\n`;
      desp += `**状态变更**: ${oldStatus} → ${newStatus}\n\n`;
      desp += `域名即将释放，请密切关注！`;
      break;

    case "OWNED_EXPIRING":
      title = `⏰ 域名即将过期: ${domain}`;
      short = `${domain} 即将过期`;
      desp = `## 域名过期提醒\n\n`;
      desp += `**域名**: ${domain}\n\n`;
      desp += `**类型**: 拥有的\n\n`;
      desp += `**优先级**: ${priority}\n\n`;
      if (expiresAt) {
        desp += `**过期时间**: ${new Date(expiresAt).toLocaleString("zh-CN")}\n\n`;
      }
      desp += `请及时续费以避免域名丢失！`;
      break;

    case "SSL_EXPIRING":
      title = `🔒 SSL 证书即将过期: ${domain}`;
      short =
        daysUntilExpiry != null
          ? `${domain} SSL 将在 ${daysUntilExpiry} 天后过期`
          : `${domain} SSL 即将过期`;
      desp = `## SSL 证书到期提醒\n\n`;
      desp += `**域名**: ${domain}\n\n`;
      desp += `**类型**: 已拥有\n\n`;
      desp += `**优先级**: ${priority}\n\n`;
      if (issuer) desp += `**签发者**: ${issuer}\n\n`;
      if (validTo) {
        desp += `**到期时间**: ${new Date(validTo).toLocaleString("zh-CN")}\n\n`;
      }
      if (daysUntilExpiry != null) {
        desp += `**剩余天数**: ${daysUntilExpiry}\n\n`;
      }
      desp += `请尽快续签/替换证书，避免线上故障。`;
      break;

    case "SSL_INVALID":
      title = `🔒 SSL 证书无效: ${domain}`;
      short = `${domain} SSL 证书无效`;
      desp = `## SSL 证书告警\n\n`;
      desp += `**域名**: ${domain}\n\n`;
      desp += `**类型**: 已拥有\n\n`;
      desp += `**优先级**: ${priority}\n\n`;
      if (issuer) desp += `**签发者**: ${issuer}\n\n`;
      if (validTo) {
        desp += `**到期时间**: ${new Date(validTo).toLocaleString("zh-CN")}\n\n`;
      }
      desp += `证书链/域名匹配可能存在问题，请尽快检查。`;
      break;

    case "STATUS_CHANGE":
      title = `🔄 域名状态变更: ${domain}`;
      short = `${domain} 状态: ${oldStatus} → ${newStatus}`;
      desp = `## 域名状态变更\n\n`;
      desp += `**域名**: ${domain}\n\n`;
      desp += `**类型**: ${watchKind === "WANTED" ? "想要的" : "拥有的"}\n\n`;
      desp += `**优先级**: ${priority}\n\n`;
      desp += `**状态变更**: ${oldStatus} → ${newStatus}\n\n`;
      break;

    case "DROPPING_ALERT":
      const domains = eventData.domains || [];
      title = `🚨 批量域名待删除警报`;
      short = `${domains.length} 个域名进入待删除状态`;
      desp = `## 批量域名待删除警报\n\n`;
      desp += `**数量**: ${domains.length} 个域名\n\n`;
      desp += `**域名列表**:\n\n`;
      domains.forEach((d: any) => {
        desp += `- ${d.domain}\n`;
      });
      break;

    case "DAILY_SUMMARY":
      const notableDomains = eventData.domains || [];
      const totalDomains = eventData.totalDomains || 0;
      title = `📊 每日域名摘要`;
      short = `${notableDomains.length} 个域名需要关注`;
      desp = `## 每日域名摘要\n\n`;
      desp += `**监控总数**: ${totalDomains} 个域名\n\n`;
      desp += `**需要关注**: ${notableDomains.length} 个域名\n\n`;
      if (notableDomains.length > 0) {
        desp += `**域名列表**:\n\n`;
        notableDomains.forEach((d: any) => {
          desp += `- **${d.domain}** (${d.status})`;
          if (d.expiresAt) {
            desp += ` - 过期: ${new Date(d.expiresAt).toLocaleDateString("zh-CN")}`;
          }
          desp += `\n`;
        });
      }
      break;

    default:
      title = `📢 域名通知: ${domain || "系统"}`;
      short = `域名事件: ${eventType}`;
      desp = `## 域名通知\n\n`;
      desp += `**事件类型**: ${eventType}\n\n`;
      desp += `**详情**: ${JSON.stringify(eventData, null, 2)}\n\n`;
  }

  return { title, desp, short };
};

/**
 * Send notifications to all active Server酱 configs
 */
export const notifyServerchan = async (params: {
  domainId?: number;
  actionId?: number;
  eventType: string;
  eventData: any;
}): Promise<number> => {
  const { domainId, actionId, eventType, eventData } = params;

  // Get active configs for this event type
  const configs = await getActiveServerchanConfigs(eventType);

  if (configs.length === 0) {
    return 0;
  }

  const db = useDb();
  let successCount = 0;

  for (const config of configs) {
    try {
      const baseMessage = formatServerchanMessage(eventType, eventData);
      const message = applyServerchanOptions(baseMessage, config.options);
      const success = await sendServerchan(
        config.sendKey,
        message,
        config.options?.timeoutMs || DEFAULT_SERVERCHAN_TIMEOUT_MS,
      );

      // Record notification event
      await db.insert(notificationEvents).values({
        domainId: domainId || null,
        actionId: actionId || null,
        eventType,
        channel: "SERVERCHAN",
        status: success ? "SENT" : "FAILED",
        sentAt: success ? new Date() : null,
        failedAt: success ? null : new Date(),
        errorMessage: success ? null : "Server酱 send failed",
        metadata: JSON.stringify({
          configId: config.id,
          configName: config.name,
          dedupeKey: eventData?.dedupeKey || null,
          message: {
            title: message.title,
            short: message.short,
          },
          options: {
            channel: message.channel || null,
            noip: Boolean(message.noip),
            tags: message.tags || null,
          },
        }),
      });

      if (success) {
        successCount++;
        console.log(`Server酱 notification sent via config: ${config.name}`);
      } else {
        console.error(`Server酱 notification failed via config: ${config.name}`);
      }
    } catch (error: any) {
      console.error(`Error sending Server酱 notification via ${config.name}:`, error.message);

      // Record failure
      await db.insert(notificationEvents).values({
        domainId: domainId || null,
        actionId: actionId || null,
        eventType,
        channel: "SERVERCHAN",
        status: "FAILED",
        failedAt: new Date(),
        errorMessage: error.message,
        metadata: JSON.stringify({
          configId: config.id,
          configName: config.name,
          dedupeKey: eventData?.dedupeKey || null,
        }),
      });
    }
  }

  return successCount;
};

/**
 * Test Server酱 configuration
 */
export const testServerchan = async (
  id: number,
): Promise<ServerchanSendResult> => {
  const db = useDb();
  const config = await db
    .select()
    .from(serverchanConfigs)
    .where(eq(serverchanConfigs.id, id))
    .get();

  if (!config) {
    throw new Error("Server酱 config not found");
  }

  const testMessage: ServerchanMessage = {
    title: "🧪 DomBeacon（域灯）测试通知",
    desp: `## 测试通知\n\n这是来自 **${config.name}** 的测试消息。\n\n如果您收到此消息，说明 Server酱 配置正常工作！\n\n---\n\n*发送时间: ${new Date().toLocaleString("zh-CN")}*`,
    short: "DomBeacon（域灯）测试通知",
  };
  const options = parseServerchanOptions(config.optionsJson);

  return await sendServerchanDetailed(
    revealSecretText(config.sendKey),
    applyServerchanOptions(testMessage, options),
    options.timeoutMs || DEFAULT_SERVERCHAN_TIMEOUT_MS,
  );
};
