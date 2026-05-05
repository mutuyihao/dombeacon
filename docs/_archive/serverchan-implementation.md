# Server酱集成实现文档

## 概述

Server酱是一个微信通知服务，允许通过简单的 HTTP 请求向微信发送消息。本文档记录了 Server酱在 DomBeacon（域灯）中的完整集成实现。

## 功能特性

### 核心功能
- ✅ 微信通知推送
- ✅ Markdown 消息格式化
- ✅ 事件类型过滤
- ✅ 配置管理 UI
- ✅ 测试功能
- ✅ SendKey 安全遮罩
- ✅ 双语支持（中英文）

### 支持的事件类型
1. **wanted_available** - 想要的域名可注册
2. **wanted_dropping** - 想要的域名待删除
3. **owned_expiring** - 拥有的域名即将过期
4. **status_change** - 状态变更
5. **expiring_soon** - 即将过期
6. **dropping_alert** - 待删除警报
7. **daily_summary** - 每日摘要

## 数据库设计

### serverchanConfigs 表

```sql
CREATE TABLE serverchan_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  send_key TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  event_types TEXT,  -- JSON array: ["wanted_available", "owned_expiring", ...]
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**字段说明**:
- `id` - 主键
- `name` - 配置名称（用户自定义）
- `send_key` - Server酱 SendKey（从 https://sct.ftqq.com 获取）
- `enabled` - 是否启用
- `event_types` - JSON 数组，指定接收哪些事件类型
- `created_at` - 创建时间

## 后端实现

### 1. Server酱工具 (`server/utils/serverchan.ts`)

#### 核心函数

**sendServerchan** - 发送 Server酱消息
```typescript
export const sendServerchan = async (
  sendKey: string,
  message: ServerchanMessage,
  timeout: number = 10000,
): Promise<boolean>
```

**参数**:
- `sendKey` - Server酱 SendKey
- `message` - 消息对象 `{ title, desp, short }`
- `timeout` - 超时时间（毫秒）

**返回**: `boolean` - 发送是否成功

**API 调用**:
```typescript
POST https://sct.ftqq.com/{SendKey}.send
Content-Type: application/x-www-form-urlencoded

title=消息标题&desp=Markdown内容&short=短消息
```

**getActiveServerchanConfigs** - 获取活跃配置
```typescript
export const getActiveServerchanConfigs = async (
  eventType: string
): Promise<ServerchanConfig[]>
```

筛选启用的配置，并根据 `event_types` 过滤。

**formatServerchanMessage** - 格式化消息
```typescript
export const formatServerchanMessage = (
  eventType: string,
  eventData: any,
): ServerchanMessage
```

根据事件类型生成格式化的 Markdown 消息。

**notifyServerchan** - 发送通知到所有配置
```typescript
export const notifyServerchan = async (params: {
  domainId?: number;
  actionId?: number;
  eventType: string;
  eventData: any;
}): Promise<number>
```

返回成功发送的数量。

**testServerchan** - 测试配置
```typescript
export const testServerchan = async (id: number): Promise<boolean>
```

发送测试消息验证配置是否正常工作。

### 2. API 端点

#### GET /api/serverchan
获取所有 Server酱 配置

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "主通知",
      "sendKey": "SCT123456...",
      "enabled": true,
      "eventTypes": "[\"wanted_available\",\"owned_expiring\"]",
      "createdAt": "2026-05-03T12:00:00Z"
    }
  ]
}
```

#### POST /api/serverchan
创建新配置

**请求体**:
```json
{
  "name": "主通知",
  "sendKey": "SCT123456...",
  "eventTypes": ["wanted_available", "owned_expiring"],
  "enabled": true
}
```

**验证**:
- `name` 必填
- `sendKey` 必填且格式为字母数字
- `eventTypes` 可选，JSON 数组

#### DELETE /api/serverchan/:id
删除配置

**响应**:
```json
{
  "success": true
}
```

#### POST /api/serverchan/:id/test
测试配置

**响应**:
```json
{
  "success": true,
  "message": "Server酱 test successful"
}
```

### 3. 集成到扫描流程

在 `server/utils/tasks.ts` 中集成：

```typescript
import { notifyServerchan } from "./serverchan";

// 域名可注册时
if (d.watchKind === "WANTED" && result.newStatus === "AVAILABLE" && result.changed) {
  const action = await createAction({...});
  
  // 发送 Server酱 通知
  await notifyServerchan({
    domainId: d.id,
    actionId: action.id,
    eventType: "WANTED_AVAILABLE",
    eventData: {
      domain: d.domain,
      watchKind: d.watchKind,
      priority: d.priority,
      oldStatus: result.oldStatus,
      newStatus: result.newStatus,
      actionId: action.id,
    },
  });
}
```

## 前端实现

### 1. Server酱页面 (`pages/serverchan.vue`)

**功能**:
- 列表展示所有 Server酱 配置
- 卡片式布局
- 显示配置名称、SendKey（遮罩）、事件类型
- 测试按钮
- 删除按钮（带确认）
- 空状态提示

**SendKey 遮罩**:
```typescript
const maskSendKey = (sendKey) => {
  if (!sendKey || sendKey.length < 8) return '****';
  return sendKey.substring(0, 4) + '****' + sendKey.substring(sendKey.length - 4);
};
```

显示为: `SCT1****5678`

### 2. ServerchanModal 组件 (`components/ServerchanModal.vue`)

**表单字段**:
- **名称** (必填) - 配置名称
- **SendKey** (必填) - Server酱 SendKey
- **事件类型** (多选) - 7种事件类型
- **启用** (开关) - 是否启用

**SendKey 获取指南**:
```
1. 访问 https://sct.ftqq.com
2. 使用微信扫码登录
3. 在「SendKey」页面获取您的 SendKey
```

### 3. 国际化

**中文** (`zh-CN.json`):
```json
{
  "serverchan": {
    "title": "Server酱配置",
    "addServerchan": "添加 Server酱",
    "sendKey": "SendKey",
    "sendKeyPlaceholder": "请输入 Server酱 SendKey",
    "sendKeyHint": "从 https://sct.ftqq.com 获取",
    "testServerchan": "测试 Server酱",
    "testSuccess": "测试成功",
    "testFailed": "测试失败",
    ...
  }
}
```

**英文** (`en-US.json`):
```json
{
  "serverchan": {
    "title": "Server酱 Configuration",
    "addServerchan": "Add Server酱",
    "sendKey": "SendKey",
    "sendKeyPlaceholder": "Enter Server酱 SendKey",
    "sendKeyHint": "Get from https://sct.ftqq.com",
    "testServerchan": "Test Server酱",
    "testSuccess": "Test successful",
    "testFailed": "Test failed",
    ...
  }
}
```

## 消息格式示例

### 域名可注册通知

```markdown
## 域名可注册通知

**域名**: example.com

**类型**: 想要的

**优先级**: HIGH

**状态变更**: REGISTERED → AVAILABLE

立即前往注册商注册此域名！
```

### 域名即将过期

```markdown
## 域名过期提醒

**域名**: example.com

**类型**: 拥有的

**优先级**: HIGH

**过期时间**: 2026-06-01 12:00:00

请及时续费以避免域名丢失！
```

### 每日摘要

```markdown
## 每日域名摘要

**监控总数**: 50 个域名

**需要关注**: 3 个域名

**域名列表**:

- **example1.com** (EXPIRING) - 过期: 2026-06-01
- **example2.com** (AVAILABLE) - 过期: -
- **example3.com** (PENDING_DELETE) - 过期: 2026-05-15
```

## 安全考虑

### SendKey 保护

1. **数据库存储**: SendKey 以明文存储（需要用于 API 调用）
2. **UI 遮罩**: 前端显示时遮罩中间部分
3. **API 响应**: 完整返回（仅管理员可访问）

**建议**:
- 定期轮换 SendKey
- 使用环境变量存储敏感配置
- 限制 API 访问权限

### 错误处理

```typescript
try {
  const success = await sendServerchan(config.sendKey, message);
  
  // 记录通知事件
  await db.insert(notificationEvents).values({
    eventType,
    channel: "SERVERCHAN",
    status: success ? "SENT" : "FAILED",
    sentAt: success ? new Date() : null,
    failedAt: success ? null : new Date(),
    errorMessage: success ? null : "Server酱 send failed",
  });
} catch (error) {
  console.error("Server酱 error:", error.message);
  // 记录失败
}
```

## 测试

### 手动测试

1. 访问 `/serverchan` 页面
2. 点击「添加 Server酱」
3. 填写配置信息
4. 点击「测试 Server酱」按钮
5. 检查微信是否收到测试消息

### 测试消息内容

```
标题: 🧪 DomBeacon（域灯）测试通知

内容:
## 测试通知

这是来自 **主通知** 的测试消息。

如果您收到此消息，说明 Server酱 配置正常工作！

---

*发送时间: 2026-05-03 12:00:00*
```

## 性能优化

### 1. 批量发送
```typescript
// 并发发送到多个配置
const promises = configs.map(config => 
  sendServerchan(config.sendKey, message)
);
await Promise.allSettled(promises);
```

### 2. 超时控制
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000);

await fetch(url, {
  signal: controller.signal,
  ...
});
```

### 3. 错误重试
```typescript
// 可选：添加重试逻辑
for (let i = 0; i < 3; i++) {
  const success = await sendServerchan(sendKey, message);
  if (success) break;
  await sleep(1000 * (i + 1)); // 指数退避
}
```

## 故障排查

### 常见问题

**1. 测试失败**
- 检查 SendKey 是否正确
- 确认 Server酱 服务是否正常
- 检查网络连接

**2. 未收到通知**
- 确认配置已启用
- 检查事件类型是否匹配
- 查看 `notification_events` 表的错误信息

**3. SendKey 无效**
- 重新登录 https://sct.ftqq.com
- 生成新的 SendKey
- 更新配置

### 日志查看

```bash
# 查看 Server酱 发送日志
grep "Server酱" logs/app.log

# 查看失败的通知
SELECT * FROM notification_events 
WHERE channel = 'SERVERCHAN' AND status = 'FAILED'
ORDER BY created_at DESC;
```

## 文件清单

### 新增文件
- `server/db/schema.ts` - 添加 `serverchanConfigs` 表
- `server/utils/serverchan.ts` - Server酱工具函数
- `server/api/serverchan/index.get.ts` - 获取配置列表
- `server/api/serverchan/index.post.ts` - 创建配置
- `server/api/serverchan/[id].delete.ts` - 删除配置
- `server/api/serverchan/[id]/test.post.ts` - 测试配置
- `pages/serverchan.vue` - Server酱管理页面
- `components/ServerchanModal.vue` - 配置模态框

### 修改文件
- `server/utils/tasks.ts` - 集成 Server酱通知
- `components/AppHeader.vue` - 添加导航链接
- `i18n/locales/en-US.json` - 添加英文翻译
- `i18n/locales/zh-CN.json` - 添加中文翻译

## 下一步计划

### 短期优化
1. **消息模板** - 允许用户自定义消息格式
2. **发送历史** - 查看历史发送记录
3. **重试机制** - 失败自动重试

### 中期功能
1. **多 SendKey 支持** - 一个配置支持多个 SendKey
2. **消息优先级** - 根据优先级调整发送策略
3. **发送限流** - 避免频繁发送

### 长期规划
1. **其他通知渠道** - 钉钉、飞书等
2. **通知聚合** - 合并多个事件为一条消息
3. **智能通知** - 根据用户行为调整通知策略

## 总结

Server酱集成已完整实现，包括：
- ✅ 完整的后端 API
- ✅ 用户友好的 UI
- ✅ 双语支持
- ✅ 安全的 SendKey 处理
- ✅ 完善的错误处理
- ✅ 事件追踪和去重

**v1.1 进度**: 80% → Server酱功能全部完成

**下一步**: SSL 证书检测

---

*文档版本: 1.0*  
*最后更新: 2026-05-03*  
*作者: DomBeacon Team*
