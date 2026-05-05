# DomBeacon（域灯）v1.2 实施计划

## Context

v1.1 已完成所有原计划功能(Webhook、Server酱、SSL 检测、CSV 导入导出、成本追踪),具备生产可用性。
v1.2 的目标是**提升生产体验和可维护性**,聚焦四个方向:

1. **可用性** — PWA 让应用可安装、离线可用、被动接收推送
2. **可观测性** — 通知历史让用户能看到"发了什么/没发什么/为什么失败"
3. **效率** — 高级筛选让大批量域名管理更顺手
4. **可持续性** — 数据库索引、批量优化、自动化测试为长期演进打底

**约束**:
- 一次性发布 v1.2.0(用户选择,而非拆分)
- PWA 采用完整方案(Service Worker + 离线 + Web Push)
- 测试栈采用 Vitest + Playwright E2E
- 维持现有 Morandi 配色、双语(zh/en)、Headless UI 模态框风格
- Nuxt 4.2 在 Windows 原生构建有已知问题,继续依赖 WSL/Docker 验证

---

## 五大工作流

### 1. PWA 完整方案

**1.1 Service Worker + 安装能力**
- 添加依赖: `@vite-pwa/nuxt`, `web-push`, `workbox-window`
- 在 [nuxt.config.ts](nuxt.config.ts) 注册 `@vite-pwa/nuxt` 模块,配置:
  - `registerType: 'autoUpdate'`
  - manifest: 名称、图标、颜色(取自 `assets/css/main.css` 的 Morandi token)
  - workbox runtimeCaching:
    - HTML/JS/CSS → StaleWhileRevalidate
    - `/api/domains`, `/api/actions`, `/api/notifications` → NetworkFirst(超时 3s,降级到缓存)
    - `/api/auth/*`, POST/PUT/DELETE → NetworkOnly(不缓存)
- 生成图标资源到 `public/icons/`:192/512/maskable PNG + favicon SVG
- 新增 `pages/offline.vue` 作为离线降级页
- 在 [components/AppHeader.vue](components/AppHeader.vue) 增加 Install 按钮(检测 `beforeinstallprompt` 事件,无可装时隐藏)

**1.2 Web Push**
- 新增 schema 表 `push_subscriptions`(在 [server/db/schema.ts](server/db/schema.ts) 追加):
  ```
  id, endpoint(unique), p256dh, auth, userAgent, createdAt
  ```
- 环境变量(写入 `.env.example`):`VAPID_PUBLIC_KEY`、`VAPID_PRIVATE_KEY`、`VAPID_SUBJECT`
- 新建 [server/utils/push.ts](server/utils/push.ts),提供 `notifyPush({ domainId, actionId, eventType, eventData })`,逻辑参考 [server/utils/serverchan.ts](server/utils/serverchan.ts):
  - 拉取所有 subscriptions
  - 调 `web-push.sendNotification`
  - 写 `notificationEvents` 记录(channel='PUSH')
- 新建 API:
  - `POST /api/push/subscribe` — 接收 subscription JSON 并入库
  - `DELETE /api/push/subscribe` — 按 endpoint 移除
  - `GET /api/push/vapid-public` — 返回公钥(供前端 `pushManager.subscribe`)
- 在 [server/utils/tasks.ts](server/utils/tasks.ts) 的 `runDomainScan` 中,与现有 `notifyWebhooks`/`notifyServerchan` 并列调用 `notifyPush`
- 在 `pages/settings.vue` 增加 "推送通知" 开关 + 订阅按钮(调用 `serviceWorkerRegistration.pushManager.subscribe`)
- Service Worker 中处理 `push` 事件展示通知,`notificationclick` 跳转到 `/actions`

---

### 2. 通知历史查看

**2.1 列表页**
- 新增 [pages/notifications.vue](pages/notifications.vue),布局参考 [pages/webhooks.vue](pages/webhooks.vue) 卡片+筛选风格
- 列展示: 时间、事件类型、域名、通道(EMAIL/WEBHOOK/SERVERCHAN/PUSH)、状态(SENT/FAILED/PENDING) badge、动作
- 支持筛选: channel、status、eventType、domain(下拉)、日期区间
- 分页(50/页),加载更多按钮
- 点击行打开 `NotificationDetailModal`(新组件,沿用 [components/WebhookModal.vue](components/WebhookModal.vue) 的 Headless UI Dialog 模式)展示完整 metadata、错误信息

**2.2 重试失败通知**
- 新增 API `POST /api/notifications/[id]/retry`:
  - 读 event,根据 channel 选择对应的发送函数(`sendMail`/`sendWebhook`/`sendServerchan`/`sendWebPush`)
  - 用原 metadata 重建 payload
  - 写入新的 `notificationEvents` 记录(标记 retryOf=原 id),不修改原记录
- UI: 仅 FAILED 状态显示 "重试" 按钮

**2.3 列表 API**
- 新增 [server/api/notifications/index.get.ts](server/api/notifications/index.get.ts) — 实现风格参考 [server/api/domains/index.get.ts](server/api/domains/index.get.ts)
- 复用 [server/utils/api.ts](server/utils/api.ts) 的 `success`/`fail` 包装

**2.4 导航 + i18n**
- [components/AppHeader.vue](components/AppHeader.vue) 增加 `/notifications` 链接
- [i18n/locales/zh-CN.json](i18n/locales/zh-CN.json) 和 `en-US.json` 增加 `nav.notifications`、`notification.*` 字段

---

### 3. 高级筛选

**3.1 筛选状态拆离**
- 新增 [composables/useFilterState.ts](composables/useFilterState.ts) — 把 `pages/domains/index.vue` 当前的 `currentStatus`/`search` 抽出,扩展到多条件:
  - watchKind、priority、status、ssl 状态(expiring<30d / invalid / none)、tags(多选)、group、expiry 范围、search
- 与 URL query 双向同步(`useRoute`/`navigateTo`),支持分享筛选链接

**3.2 筛选面板组件**
- 新增 [components/FilterPanel.vue](components/FilterPanel.vue) — 可折叠侧边或顶部面板,含全部多条件
- 在 [pages/domains/index.vue](pages/domains/index.vue) 用 `FilterPanel` 替换当前简单 tabs(tabs 作为快捷筛选保留)
- 已选条件显示为可移除的 chip 列表

**3.3 保存筛选**
- 新增 schema 表 `saved_filters`:`id, name, criteriaJson, isDefault(boolean), createdAt`
- API:
  - `GET /api/filters` — 列出
  - `POST /api/filters` — 保存当前条件
  - `DELETE /api/filters/[id]`
  - `PATCH /api/filters/[id]` — 改名 / 设默认
- UI: 顶部 dropdown "我的筛选",支持保存当前 / 加载 / 删除 / 设为默认

**3.4 后端筛选支持**
- 扩展 [server/api/domains/index.get.ts](server/api/domains/index.get.ts) 接收新参数,join `sslStatusLatest` 处理 SSL 维度,返回 total 用于分页

---

### 4. 性能优化

**4.1 数据库索引**
- 在 [server/db/schema.ts](server/db/schema.ts) 通过 Drizzle 的 `index()` 给以下列加索引(已无索引的现状):
  - `domains`: watchKind, priority, isActive, groupName
  - `domainStatusLatest`: status, expiresAt
  - `actions`: domainId, status, priority, triggeredAt
  - `notificationEvents`: domainId, eventType, status, channel, createdAt, sentAt
  - `sslStatusLatest`: daysUntilExpiry, validTo
  - `domainCosts`: domainId, paymentDate, costType
- 新增迁移文件 [server/db/migrations/0002_v12_indexes_pwa.sql](server/db/migrations/0002_v12_indexes_pwa.sql),包含 CREATE INDEX、push_subscriptions、saved_filters

**4.2 批量与并发优化**
- [server/utils/tasks.ts](server/utils/tasks.ts) `runDomainScan`:
  - 当前每域名串行 + 1s sleep — 改为分批并发(每批 5 个并行,批间 sleep 1s),把 SSL + RDAP 并发跑而不是串行
  - 通知 fanout(email/webhook/serverchan/push)已经是顺序调用 — 改为 `Promise.allSettled` 并行
- 缓存 SMTP/webhook/serverchan/push subscriptions 配置在单次 scan run 内复用,而非每次发通知都重读
- 通知事件批量插入(收集后单次 `db.insert(notificationEvents).values([...])`)

**4.3 列表分页 total**
- 所有列表 API 返回 `{ items, total, page, limit }`,前端用于显示页码
- 修复 [server/api/domains/index.get.ts:102](server/api/domains/index.get.ts#L102) 当前未返回 total 的问题

**4.4 修复发现的 bug**
- [server/utils/serverchan.ts:289-368](server/utils/serverchan.ts#L289-L368) 存在重构遗留的孤立代码(在 `testServerchan` 闭合后还有 `let successCount = 0` 等无函数包裹的语句,且 `testServerchan` 重复定义)— 必须删除,否则 TS 编译异常

---

### 5. 测试覆盖

**5.1 框架接入**
- 新增 devDependencies: `vitest`, `@vue/test-utils`, `@nuxt/test-utils`, `@playwright/test`, `happy-dom`
- 新增 [vitest.config.ts](vitest.config.ts) — environment=happy-dom,alias 与 tsconfig 对齐
- 新增 [playwright.config.ts](playwright.config.ts) — baseURL=http://localhost:3000,webServer 启动 `npm run dev`
- [package.json](package.json) 增加脚本: `test`, `test:unit`, `test:watch`, `test:e2e`

**5.2 单元测试目录**
- `tests/unit/server/utils/`:
  - `mail.test.ts` — getTemplate 三种模板渲染、wasRecentlySent 24h 窗口逻辑
  - `actions.test.ts` — createAction 去重、autoResolveSnoozedActions
  - `ssl.test.ts` — 证书解析、daysUntilExpiry 计算
  - `serverchan.test.ts` — formatServerchanMessage 各 eventType 输出
  - `webhook.test.ts` — getActiveWebhooks 事件类型过滤
  - `csv.test.ts` — import/export 解析、validation
- 用 in-memory SQLite fixture: `tests/fixtures/db.ts` — 创建临时 db、跑 migration、提供 seed helpers

**5.3 集成测试**
- `tests/integration/api/`:
  - `domains.test.ts` — CRUD + 高级筛选
  - `notifications.test.ts` — 列表 + retry
  - `filters.test.ts` — 保存/加载
  - `push.test.ts` — subscribe/unsubscribe
- 用 `@nuxt/test-utils` 的 `setup`/`$fetch` 起测试服

**5.4 E2E 关键路径**
- `tests/e2e/`:
  - `auth.spec.ts` — 登录/未登录跳转
  - `add-domain.spec.ts` — 添加域名 → 出现在列表
  - `notifications.spec.ts` — 查看通知历史 + 筛选
  - `pwa.spec.ts` — manifest 可访问、Service Worker 注册成功

**5.5 CI**
- 新增 `.github/workflows/ci.yml`:在 Ubuntu runner 上 `pnpm install` → `pnpm test:unit` → `pnpm test:e2e`(避开 Windows native build 问题)

---

## 关键文件改动清单

| 类别 | 文件 |
|------|------|
| 配置 | [nuxt.config.ts](nuxt.config.ts), [package.json](package.json), [.env.example](.env.example), [vitest.config.ts](vitest.config.ts) (新), [playwright.config.ts](playwright.config.ts) (新) |
| Schema/迁移 | [server/db/schema.ts](server/db/schema.ts), [server/db/migrations/0002_v12_indexes_pwa.sql](server/db/migrations/0002_v12_indexes_pwa.sql) (新) |
| 服务端 utils | [server/utils/push.ts](server/utils/push.ts) (新), [server/utils/tasks.ts](server/utils/tasks.ts), [server/utils/serverchan.ts](server/utils/serverchan.ts) (修 bug) |
| API | `server/api/notifications/`、`server/api/push/`、`server/api/filters/` (全新目录) |
| 页面 | [pages/notifications.vue](pages/notifications.vue) (新), [pages/offline.vue](pages/offline.vue) (新), [pages/domains/index.vue](pages/domains/index.vue), [pages/settings.vue](pages/settings.vue) |
| 组件 | [components/FilterPanel.vue](components/FilterPanel.vue) (新), [components/NotificationDetailModal.vue](components/NotificationDetailModal.vue) (新), [components/AppHeader.vue](components/AppHeader.vue) |
| Composables | [composables/useFilterState.ts](composables/useFilterState.ts) (新), [composables/useNotifications.ts](composables/useNotifications.ts) (新), [composables/usePushSubscription.ts](composables/usePushSubscription.ts) (新) |
| i18n | [i18n/locales/zh-CN.json](i18n/locales/zh-CN.json), [i18n/locales/en-US.json](i18n/locales/en-US.json) |
| 静态资源 | `public/icons/*`, `public/manifest.webmanifest` |
| 测试 | `tests/unit/`, `tests/integration/`, `tests/e2e/`, `tests/fixtures/` (全新) |
| CI | `.github/workflows/ci.yml` (新) |

## 复用现有工具

- **通知去重 + 事件记录**: [server/utils/mail.ts](server/utils/mail.ts) 中的 `wasRecentlySent`、`recordNotificationEvent` — push 通道直接复用
- **通知 fanout 模板**: [server/utils/webhook.ts](server/utils/webhook.ts) 的 `notifyWebhooks`、[server/utils/serverchan.ts](server/utils/serverchan.ts) 的 `notifyServerchan` — `notifyPush` 沿用相同结构
- **API 包装**: [server/utils/api.ts](server/utils/api.ts) 的 `success`/`fail`
- **任务锁**: [server/utils/tasks.ts](server/utils/tasks.ts) 的 `acquireLock`/`releaseLock` — 性能优化中保持不动
- **模态框模式**: [components/WebhookModal.vue](components/WebhookModal.vue) Headless UI Dialog 结构(NotificationDetailModal 沿用)
- **列表+筛选页模式**: [pages/webhooks.vue](pages/webhooks.vue)、[pages/ssl.vue](pages/ssl.vue) 卡片 + tab 筛选(notifications.vue 沿用)
- **Toast**: [composables/useToast.ts](composables/useToast.ts) 直接用
- **Drizzle 查询**: [server/utils/actions.ts](server/utils/actions.ts) 的 `getActionsWithDomains` 多条件 join 模式 — 通知列表/高级筛选都参考它

## 验证

**1. 本地开发(WSL/Docker)**
- `npm install && npx drizzle-kit push` — 应用新 schema
- `npm run dev` — 启动后访问 http://localhost:3000

**2. PWA 验证**
- Chrome DevTools → Application → Manifest:确认图标、name、display=standalone
- Application → Service Workers:确认注册成功且 active
- 网络断开后刷新 `/domains`:应展示离线降级页或缓存数据
- 用 `web-push` CLI 发测试推送或在 settings 页订阅后等下次 scan 触发

**3. 通知历史**
- 触发一次扫描(/api/tasks/trigger),查看 `/notifications` 应显示新事件
- 改一个 webhook URL 为无效地址,触发扫描后状态应为 FAILED;点击重试应再次发送

**4. 高级筛选**
- 在 `/domains` 选择多条件 → URL 同步、刷新保留筛选
- 保存筛选 → 切换条件 → 从 dropdown 加载回原状态
- 设为默认 → 关闭浏览器再打开应自动应用

**5. 性能**
- `EXPLAIN QUERY PLAN` 跑常用查询,确认走索引
- 扫描 100+ 域名应较 v1.1 缩短(并发分批)

**6. 测试**
- `pnpm test:unit` — 全部通过
- `pnpm test:e2e` — 全部通过
- CI 在 PR 上跑通

## 范围之外 / 风险

- **Web Push 兼容性**: iOS Safari ≥16.4 才支持 Web Push,需在 UI 提示用户
- **Workbox + Nuxt 4.2 Windows**: 已知 Nuxt 4.2 在 Windows 原生构建有问题,PWA 构建建议在 WSL/Docker 验证;若 `@vite-pwa/nuxt` 与 Nuxt 4.2 不兼容,fallback 到手写 SW + 手写 manifest
- **Drizzle 索引迁移**: SQLite 的 ALTER TABLE 不支持加索引外的复杂改动,但 CREATE INDEX 安全,迁移脚本只追加
- 不在本期: API 文档(OpenAPI)、结构化日志(pino)、邮件模板抽离 — 留给 v1.3
