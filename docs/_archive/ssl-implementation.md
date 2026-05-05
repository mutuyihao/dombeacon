# SSL 证书检测实现文档

## 概述

SSL 证书检测功能允许 DomBeacon（域灯）监控域名的 SSL 证书状态、有效期和颁发者信息。本文档记录了 SSL 证书检测的完整实现。

## 功能特性

### 核心功能
- ✅ SSL 证书状态检测
- ✅ 证书有效期监控
- ✅ 证书颁发者识别
- ✅ 过期警报（30天内）
- ✅ 无效证书检测
- ✅ 历史记录追踪
- ✅ 手动触发检查
- ✅ 自动集成到扫描流程
- ✅ 双语支持（中英文）

### 支持的检测项
1. **hasSSL** - 是否配置 SSL 证书
2. **isValid** - 证书是否有效
3. **issuer** - 证书颁发者
4. **validFrom** - 证书生效时间
5. **validTo** - 证书过期时间
6. **daysUntilExpiry** - 距离过期天数

## 数据库设计

### sslStatusLatest 表

```sql
CREATE TABLE ssl_status_latest (
  domain_id INTEGER PRIMARY KEY REFERENCES domains(id) ON DELETE CASCADE,
  has_ssl BOOLEAN DEFAULT FALSE,
  is_valid BOOLEAN DEFAULT FALSE,
  issuer TEXT,
  valid_from TIMESTAMP,
  valid_to TIMESTAMP,
  days_until_expiry INTEGER,
  checked_at TIMESTAMP,
  last_error TEXT,
  last_error_at TIMESTAMP
);
```

**字段说明**:
- `domain_id` - 域名 ID（主键，外键）
- `has_ssl` - 是否有 SSL 证书
- `is_valid` - 证书是否有效
- `issuer` - 证书颁发者
- `valid_from` - 证书生效时间
- `valid_to` - 证书过期时间
- `days_until_expiry` - 距离过期天数
- `checked_at` - 最后检查时间
- `last_error` - 最后错误信息
- `last_error_at` - 最后错误时间

### sslStatusHistory 表

```sql
CREATE TABLE ssl_status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id INTEGER REFERENCES domains(id) ON DELETE CASCADE,
  has_ssl BOOLEAN,
  is_valid BOOLEAN,
  issuer TEXT,
  valid_from TIMESTAMP,
  valid_to TIMESTAMP,
  days_until_expiry INTEGER,
  checked_at TIMESTAMP
);
```

**用途**: 记录 SSL 证书状态的历史变更，用于追踪证书更新和变化。

## 后端实现

### 1. SSL 检测工具 (`server/utils/ssl.ts`)

#### 核心函数

**checkSSLCertificate** - 检查 SSL 证书
```typescript
export const checkSSLCertificate = async (
  domain: string,
  timeout: number = 10000,
): Promise<Omit<SSLCheckResult, "domainId" | "changed">>
```

**实现原理**:
```typescript
const options = {
  host: domain,
  port: 443,
  method: "GET",
  rejectUnauthorized: false, // 允许检查无效证书
  timeout,
};

const req = https.request(options, (res) => {
  const cert = (res.socket as tls.TLSSocket).getPeerCertificate();
  
  // 提取证书信息
  const validFrom = new Date(cert.valid_from);
  const validTo = new Date(cert.valid_to);
  const daysUntilExpiry = Math.floor(
    (validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // 判断证书是否有效
  const isValid = 
    (res.socket as tls.TLSSocket).authorized ||
    (now >= validFrom && now <= validTo);
});
```

**updateSSLStatus** - 更新数据库状态
```typescript
export const updateSSLStatus = async (
  domainId: number,
  result: Omit<SSLCheckResult, "domainId" | "changed">,
): Promise<{ changed: boolean }>
```

**变更检测逻辑**:
- 比较 `hasSSL`、`isValid`、`issuer`、`validTo`
- 首次检查视为变更
- 仅在有变更时记录历史

**scanDomainSSL** - 完整扫描流程
```typescript
export const scanDomainSSL = async (
  domainId: number,
  domain: string,
): Promise<SSLCheckResult>
```

组合检测和更新操作，返回完整结果。

### 2. API 端点

#### GET /api/ssl
获取所有 SSL 状态

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "domainId": 1,
      "domain": "example.com",
      "watchKind": "OWNED",
      "priority": "HIGH",
      "hasSSL": true,
      "isValid": true,
      "issuer": "Let's Encrypt",
      "validFrom": "2026-01-01T00:00:00Z",
      "validTo": "2026-04-01T00:00:00Z",
      "daysUntilExpiry": 28,
      "checkedAt": "2026-05-03T12:00:00Z",
      "lastError": null,
      "lastErrorAt": null
    }
  ]
}
```

#### POST /api/ssl/:id/check
手动触发 SSL 检查

**响应**:
```json
{
  "success": true,
  "data": {
    "domainId": 1,
    "domain": "example.com",
    "hasSSL": true,
    "isValid": true,
    "issuer": "Let's Encrypt",
    "validFrom": "2026-01-01T00:00:00Z",
    "validTo": "2026-04-01T00:00:00Z",
    "daysUntilExpiry": 28,
    "changed": false
  }
}
```

### 3. 集成到扫描流程

在 `server/utils/tasks.ts` 中集成：

```typescript
import { scanDomainSSL } from "./ssl";

// 在域名扫描循环中
for (const d of activeDomains) {
  // ... RDAP 扫描 ...

  // 仅对 OWNED 域名检查 SSL
  if (d.watchKind === "OWNED") {
    try {
      const sslResult = await scanDomainSSL(d.id, d.domain);

      // SSL 即将过期（< 30 天）
      if (sslResult.hasSSL && sslResult.daysUntilExpiry < 30) {
        await createAction({
          domainId: d.id,
          actionType: "SSL_EXPIRING",
          priority: d.priority,
          metadata: {
            daysUntilExpiry: sslResult.daysUntilExpiry,
            validTo: sslResult.validTo?.toISOString(),
            issuer: sslResult.issuer,
            domain: d.domain,
          },
        });
      }

      // SSL 证书无效
      if (sslResult.hasSSL && !sslResult.isValid) {
        await createAction({
          domainId: d.id,
          actionType: "SSL_INVALID",
          priority: d.priority,
          metadata: {
            issuer: sslResult.issuer,
            validTo: sslResult.validTo?.toISOString(),
            domain: d.domain,
          },
        });
      }
    } catch (sslError) {
      console.error(`SSL check failed for ${d.domain}:`, sslError.message);
    }
  }
}
```

### 4. Action 类型扩展

在 `server/utils/actions.ts` 中添加新的 Action 类型：

```typescript
export type ActionType =
  | "WANTED_AVAILABLE"
  | "WANTED_DROPPING"
  | "OWNED_EXPIRING"
  | "SSL_EXPIRING"    // 新增
  | "SSL_INVALID"     // 新增
  | "SCAN_FAILED";
```

## 前端实现

### 1. SSL 监控页面 (`pages/ssl.vue`)

**功能**:
- 列表展示所有域名的 SSL 状态
- 卡片式布局
- 状态徽章（有效/即将过期/无效/无SSL）
- 优先级徽章
- 过滤标签（全部/即将过期/无效/无SSL）
- 手动触发检查按钮
- 批量刷新功能
- 空状态提示

**状态徽章颜色**:
```typescript
const getSSLStatusClass = (status) => {
  if (!status.hasSSL) {
    return 'bg-gray-100 text-gray-600 border-gray-200';
  }
  if (!status.isValid) {
    return 'bg-red-100 text-red-700 border-red-200';
  }
  if (status.daysUntilExpiry < 30) {
    return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  }
  return 'bg-green-100 text-green-700 border-green-200';
};
```

**过期天数颜色**:
```typescript
const getDaysUntilExpiryClass = (days) => {
  if (days < 7) return 'text-red-600 font-semibold';
  if (days < 30) return 'text-yellow-600 font-medium';
  return 'text-text-secondary';
};
```

### 2. 国际化

**中文** (`zh-CN.json`):
```json
{
  "ssl": {
    "title": "SSL 证书监控",
    "description": "监控域名的 SSL 证书状态和过期时间",
    "refreshAll": "刷新全部",
    "checkNow": "立即检查",
    "lastChecked": "最后检查",
    "issuer": "颁发者",
    "daysUntilExpiry": "{days} 天后过期",
    "noData": "暂无 SSL 证书数据",
    "filters": {
      "all": "全部",
      "expiring": "即将过期",
      "invalid": "无效证书",
      "nossl": "无 SSL"
    },
    "status": {
      "valid": "有效",
      "expiring": "即将过期",
      "invalid": "无效",
      "noSSL": "无 SSL"
    }
  }
}
```

**英文** (`en-US.json`):
```json
{
  "ssl": {
    "title": "SSL Certificate Monitoring",
    "description": "Monitor SSL certificate status and expiration dates",
    "refreshAll": "Refresh All",
    "checkNow": "Check Now",
    "lastChecked": "Last Checked",
    "issuer": "Issuer",
    "daysUntilExpiry": "Expires in {days} days",
    "noData": "No SSL certificate data",
    "filters": {
      "all": "All",
      "expiring": "Expiring Soon",
      "invalid": "Invalid",
      "nossl": "No SSL"
    },
    "status": {
      "valid": "Valid",
      "expiring": "Expiring Soon",
      "invalid": "Invalid",
      "noSSL": "No SSL"
    }
  }
}
```

## 使用场景

### 场景 1: 监控生产域名 SSL 证书

**步骤**:
1. 添加域名时选择 `watchKind: OWNED`
2. 系统每小时自动检查 SSL 状态
3. 证书 30 天内过期时创建 `SSL_EXPIRING` action
4. 在 `/ssl` 页面查看所有证书状态

### 场景 2: 手动检查特定域名

**步骤**:
1. 访问 `/ssl` 页面
2. 找到目标域名
3. 点击「立即检查」按钮
4. 查看更新后的证书信息

### 场景 3: 批量刷新所有证书

**步骤**:
1. 访问 `/ssl` 页面
2. 点击右上角「刷新全部」按钮
3. 等待所有域名检查完成
4. 查看更新后的状态

### 场景 4: 筛选即将过期的证书

**步骤**:
1. 访问 `/ssl` 页面
2. 点击「即将过期」标签
3. 查看 30 天内过期的证书列表
4. 优先处理高优先级域名

## 安全考虑

### 1. 证书验证

```typescript
rejectUnauthorized: false  // 允许检查无效证书
```

**原因**: 需要检测无效证书以发出警报，而不是直接拒绝连接。

### 2. 超时控制

```typescript
timeout: 10000  // 10秒超时
```

**原因**: 防止长时间等待导致扫描任务阻塞。

### 3. 错误处理

```typescript
try {
  const sslResult = await scanDomainSSL(d.id, d.domain);
} catch (sslError) {
  console.error(`SSL check failed for ${d.domain}:`, sslError.message);
  // 不中断整个扫描流程
}
```

**原因**: 单个域名的 SSL 检查失败不应影响其他域名。

## 性能优化

### 1. 仅检查 OWNED 域名

```typescript
if (d.watchKind === "OWNED") {
  // 仅对拥有的域名检查 SSL
}
```

**原因**: WANTED 域名通常未配置 SSL，检查无意义。

### 2. 并发控制

当前实现为串行检查，未来可优化为：

```typescript
const sslPromises = ownedDomains.map(d => 
  scanDomainSSL(d.id, d.domain).catch(err => ({
    domainId: d.id,
    error: err.message
  }))
);

const results = await Promise.allSettled(sslPromises);
```

### 3. 缓存策略

- 使用 `sslStatusLatest` 表缓存最新状态
- 避免频繁重复检查
- 仅在状态变更时记录历史

## 故障排查

### 常见问题

**1. 检查失败 - Connection timeout**
- 检查域名是否可访问
- 确认端口 443 是否开放
- 检查网络连接

**2. 检查失败 - No certificate found**
- 域名未配置 SSL 证书
- 证书配置错误
- 使用 HTTP 而非 HTTPS

**3. 证书显示无效**
- 证书已过期
- 证书不受信任
- 域名与证书不匹配
- 证书链不完整

### 日志查看

```bash
# 查看 SSL 检查日志
grep "SSL check" logs/app.log

# 查看失败的检查
SELECT * FROM ssl_status_latest
WHERE last_error IS NOT NULL
ORDER BY last_error_at DESC;

# 查看即将过期的证书
SELECT * FROM ssl_status_latest
WHERE has_ssl = 1 AND days_until_expiry < 30
ORDER BY days_until_expiry ASC;
```

## 文件清单

### 新增文件
- `server/db/schema.ts` - 添加 `sslStatusLatest` 和 `sslStatusHistory` 表
- `server/utils/ssl.ts` - SSL 检测工具函数
- `server/api/ssl/index.get.ts` - 获取 SSL 状态列表
- `server/api/ssl/[id]/check.post.ts` - 手动触发 SSL 检查
- `pages/ssl.vue` - SSL 监控页面

### 修改文件
- `server/utils/tasks.ts` - 集成 SSL 检查到扫描流程
- `server/utils/actions.ts` - 添加 SSL 相关 Action 类型
- `components/AppHeader.vue` - 添加 SSL 导航链接
- `i18n/locales/en-US.json` - 添加英文翻译
- `i18n/locales/zh-CN.json` - 添加中文翻译

## 下一步计划

### 短期优化
1. **通知集成** - SSL 过期通知发送到邮件/Webhook/Server酱
2. **证书详情** - 显示完整证书链信息
3. **自动续期提醒** - 提前 7/14/30 天发送提醒

### 中期功能
1. **证书监控历史图表** - 可视化证书更新历史
2. **多域名证书支持** - SAN 证书识别
3. **证书评分** - 基于安全性评分（A+/A/B/C）

### 长期规划
1. **Let's Encrypt 集成** - 自动续期支持
2. **证书采购提醒** - 商业证书到期前提醒
3. **合规性检查** - TLS 版本、加密套件检查

## 总结

SSL 证书检测功能已完整实现，包括：
- ✅ 完整的后端检测逻辑
- ✅ 数据库 schema 设计
- ✅ RESTful API 端点
- ✅ 用户友好的 UI
- ✅ 双语支持
- ✅ 集成到扫描流程
- ✅ Action 队列集成
- ✅ 错误处理和日志

**v1.1 进度**: 80% → 90% (SSL 功能完成)

**下一步**: 成本追踪或 CSV 导入导出

---

*文档版本: 1.0*
*最后更新: 2026-05-03*
*作者: DomBeacon Team*
  "ssl": {
    "title": "SSL 证书监控",
    "description": "监控域名的 SSL 证书状态和过期时间",
    "refreshAll": "刷新全部",
    "checkNow": "立即检查",
    "lastChecked": "最后检查",
    "issuer": "颁发者",
    "daysUntilExpiry": "{days} 天后过期",
    "filters": {
      "all": "全部",
      "expiring": "即将过期",
      "invalid": "无效证书",
      "nossl": "无 SSL"
    },
    "status": {
      "valid": "有效",
      "expiring": "即将过期",
      "invalid": "无效",
      "noSSL": "无 SSL"
    }
  }
}
```

**英文** (`en-US.json`):
```json
{
  "ssl": {
    "title": "SSL Certificate Monitoring",
    "description": "Monitor SSL certificate status and expiration dates",
    "refreshAll": "Refresh All",
    "checkNow": "Check Now",
    "lastChecked": "Last Checked",
    "issuer": "Issuer",
    "daysUntilExpiry": "Expires in {days} days",
    "filters": {
      "all": "All",
      "expiring": "Expiring Soon",
      "invalid": "Invalid",
      "nossl": "No SSL"
    },
    "status": {
      "valid": "Valid",
      "expiring": "Expiring Soon",
      "invalid": "Invalid",
      "noSSL": "No SSL"
    }
  }
}
```

## 使用场景

### 场景 1: 自动监控
- 每小时扫描自动检查 OWNED 域名的 SSL 状态
- 发现即将过期（< 30天）自动创建 Action
- 发现无效证书自动创建 Action

### 场景 2: 手动检查
- 用户访问 `/ssl` 页面查看所有 SSL 状态
- 点击「立即检查」按钮手动触发单个域名检查
- 点击「刷新全部」批量检查所有域名

### 场景 3: 过滤查看
- 点击「即将过期」标签查看 30 天内过期的证书
- 点击「无效证书」标签查看有问题的证书
- 点击「无 SSL」标签查看未配置 SSL 的域名

## 错误处理

### 常见错误

**1. 连接超时**
```
Error: Connection timeout
```
- 原因：域名无法访问或防火墙阻止
- 处理：记录错误，不更新状态

**2. 无证书**
```
Error: No certificate found
```
- 原因：域名未配置 SSL
- 处理：设置 `hasSSL = false`

**3. 证书过期**
```
isValid = false, daysUntilExpiry < 0
```
- 原因：证书已过期
- 处理：创建 `SSL_INVALID` Action

### 错误记录

```typescript
// 错误时更新 lastError 字段
await db.update(sslStatusLatest)
  .set({
    lastError: error.message,
    lastErrorAt: new Date()
  })
  .where(eq(sslStatusLatest.domainId, domainId));
```

## 性能优化

### 1. 超时控制
```typescript
const timeout = 10000; // 10秒超时
```

### 2. 并发控制
```typescript
// 在扫描循环中顺序执行，避免过多并发连接
for (const d of activeDomains) {
  await scanDomainSSL(d.id, d.domain);
}
```

### 3. 仅检查 OWNED 域名
```typescript
if (d.watchKind === "OWNED") {
  // 仅对拥有的域名检查 SSL
}
```

## 故障排查

### 问题 1: SSL 检查失败
- 检查域名是否可访问
- 检查端口 443 是否开放
- 检查网络连接

### 问题 2: 证书信息不准确
- 确认域名解析正确
- 检查是否有 CDN 或代理
- 验证证书链完整性

### 问题 3: 未创建 Action
- 确认域名 `watchKind` 为 `OWNED`
- 检查 `daysUntilExpiry` 是否 < 30
- 查看 Action 去重逻辑

## 文件清单

### 新增文件
- `server/db/schema.ts` - 添加 `sslStatusLatest` 和 `sslStatusHistory` 表
- `server/utils/ssl.ts` - SSL 检测工具函数
- `server/api/ssl/index.get.ts` - 获取 SSL 状态列表
- `server/api/ssl/[id]/check.post.ts` - 手动触发检查
- `pages/ssl.vue` - SSL 监控页面

### 修改文件
- `server/utils/tasks.ts` - 集成 SSL 检查到扫描流程
- `server/utils/actions.ts` - 添加 SSL 相关 Action 类型
- `components/AppHeader.vue` - 添加 SSL 导航链接
- `i18n/locales/zh-CN.json` - 添加中文翻译
- `i18n/locales/en-US.json` - 添加英文翻译

## 下一步计划

### 短期优化
1. **通知集成** - SSL 过期通知发送到邮件/Webhook/Server酱
2. **证书详情** - 显示完整证书链和指纹
3. **批量操作** - 批量检查和导出

### 中期功能
1. **证书更新提醒** - 提前 7/15/30 天提醒
2. **证书历史** - 查看证书更新历史
3. **自动续期检测** - 检测 Let's Encrypt 自动续期

### 长期规划
1. **证书分析** - 证书强度和安全性分析
2. **多域名证书** - SAN 证书支持
3. **证书监控报告** - 生成 SSL 健康报告

## 总结

SSL 证书检测功能已完整实现，包括：
- ✅ 完整的后端检测逻辑
- ✅ 数据库 schema 设计
- ✅ API 端点实现
- ✅ 集成到扫描流程
- ✅ 用户友好的 UI
- ✅ 双语支持
- ✅ Action 自动创建
- ✅ 完善的错误处理

**v1.1 进度**: 80% → 90% (SSL 功能完成)

**下一步**: 成本追踪或 CSV 导入导出

---

*文档版本: 1.0*
*最后更新: 2026-05-03*
*作者: DomBeacon Team*
