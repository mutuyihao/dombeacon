import { serverchanConfigs, notificationEvents } from "../db/schema";
import { eq } from "drizzle-orm";

export interface ServerchanMessage {
  title: string;
  desp?: string; // Markdown content
  short?: string; // Short message for notification
}

/**
 * Send Server酱 notification
 * API: https://sct.ftqq.com/{SendKey}.send
 */
export const sendServerchan = async (
  sendKey: string,
  message: ServerchanMessage,
  timeout: number = 10000,
): Promise<boolean> => {
  const url = `https://sct.ftqq.com/${sendKey}.send`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const formData = new URLSearchParams();
    formData.append("title", message.title);
    if (message.desp) formData.append("desp", message.desp);
    if (message.short) formData.append("short", message.short);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`Server酱 request failed: ${response.status} ${response.statusText}`);
      return false;
    }

    const result = await response.json();

    // Server酱 API returns { code: 0, message: "success", data: {...} }
    if (result.code !== 0) {
      console.error(`Server酱 API error: ${result.message}`);
      return false;
    }

    return true;
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.error("Server酱 request timeout");
    } else {
      console.error("Server酱 request error:", error.message);
    }
    return false;
  }
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
      return types.includes(eventType);
    } catch {
      return true;
    }
  });
};

/**
 * Format domain event as Server酱 message
 */
export const formatServerchanMessage = (
  eventType: string,
  eventData: any,
): ServerchanMessage => {
  const { domain, watchKind, priority, oldStatus, newStatus, expiresAt } = eventData;

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

  const message = formatServerchanMessage(eventType, eventData);
  const db = useDb();
  let successCount = 0;

  for (const config of configs) {
    try {
      const success = await sendServerchan(config.sendKey, message);

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
          message: {
            title: message.title,
            short: message.short,
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
        }),
      });
    }
  }

  return successCount;
};

/**
 * Test Server酱 configuration
 */
export const testServerchan = async (id: number): Promise<boolean> => {
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
    title: "🧪 Domain Ops Radar 测试通知",
    desp: `## 测试通知\n\n这是来自 **${config.name}** 的测试消息。\n\n如果您收到此消息，说明 Server酱 配置正常工作！\n\n---\n\n*发送时间: ${new Date().toLocaleString("zh-CN")}*`,
    short: "Domain Ops Radar 测试通知",
  };

  return await sendServerchan(config.sendKey, testMessage);
};

  let successCount = 0;

  for (const config of configs) {
    try {
      // Record event as PENDING
      const [event] = await db
        .insert(notificationEvents)
        .values({
          domainId: domainId || null,
          actionId: actionId || null,
          eventType,
          channel: "SERVERCHAN",
          status: "PENDING",
          metadata: JSON.stringify({
            configId: config.id,
            configName: config.name,
          }),
        })
        .returning();

      // Send notification
      const success = await sendServerchan(config.sendKey, message);

      if (success) {
        // Update event as SENT
        await db
          .update(notificationEvents)
          .set({
            status: "SENT",
            sentAt: new Date(),
          })
          .where(eq(notificationEvents.id, event.id));

        successCount++;
        console.log(`Server酱 notification sent: ${config.name} - ${message.title}`);
      } else {
        // Update event as FAILED
        await db
          .update(notificationEvents)
          .set({
            status: "FAILED",
            failedAt: new Date(),
            errorMessage: "Server酱 API request failed",
          })
          .where(eq(notificationEvents.id, event.id));

        console.error(`Server酱 notification failed: ${config.name}`);
      }
    } catch (error: any) {
      console.error(`Error sending Server酱 notification to ${config.name}:`, error.message);
    }
  }

  return successCount;
};

/**
 * Test Server酱 configuration
 */
export const testServerchan = async (id: number): Promise<boolean> => {
  const db = useDb();
  const config = await db
    .select()
    .from(serverchanConfigs)
    .where(eq(serverchanConfigs.id, id))
    .get();

  if (!config) {
    throw new Error("Server酱 configuration not found");
  }

  const testMessage: ServerchanMessage = {
    title: "🧪 Domain Ops Radar 测试通知",
    desp: `## 测试通知\n\n这是来自 **${config.name}** 的测试消息。\n\n如果您收到此消息，说明 Server酱 配置正常工作！\n\n---\n\n*发送时间: ${new Date().toLocaleString("zh-CN")}*`,
    short: "Domain Ops Radar 测试通知",
  };

  return await sendServerchan(config.sendKey, testMessage);
};
