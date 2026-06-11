# DomBeacon

DomBeacon is a self-hosted domain ops beacon for tracking wanted domain
opportunities, managing owned domain portfolios, monitoring domain/SSL/DNS
risks, and turning domain events into actionable alerts.

## Features

- **Domain tracking**: Monitor `WANTED` domains for availability and dropping
  signals, and `OWNED` domains for expiry and operational health.
- **RDAP status history**: Store latest and historical RDAP snapshots using
  ICANN RDAP bootstrap discovery.
- **Action queue**: Convert meaningful events into open, snoozed, dismissed,
  or resolved work items.
- **SSL monitoring**: Track certificate issuer, validity window, invalid
  chains, and certificates expiring in fewer than 30 days.
- **DNS/RDAP security findings**: Track DNS posture, nameserver/MX drift,
  SPF/DMARC/CAA/DNSSEC signals, and registrar-lock gaps with bulk triage,
  saved queue views, and keyboard shortcuts.
- **Notifications**: Send events through email, webhooks, ServerChan, and Web
  Push, with risk event channel presets, delivery history, and retry support.
- **Audit logs**: Record config changes, domain mutations, scans, finding
  updates, and notification changes.
- **Cost tracking**: Store per-domain costs and choose the display currency in
  settings preferences.
- **PWA support**: Installable UI with a hand-rolled service worker and Web
  Push subscription flow.

## Quick Start (Docker)

1. Clone and prepare the workspace.

   ```bash
   git clone <repo>
   cd dombeacon
   cp .env.example .env
   mkdir data
   ```

2. Set runtime secrets in `.env`.

   ```env
   SECRET_ENCRYPTION_KEY=your-random-storage-secret
   BASIC_AUTH_USERNAME=admin
   BASIC_AUTH_PASSWORD=change-me
   ```

3. Run the app.

   ```bash
   docker-compose up -d
   ```

4. Open `http://localhost:8080`.

## Access Model

DomBeacon is designed for trusted self-hosted deployments. The Docker Compose
example binds to `127.0.0.1:8080` by default. To expose it outside localhost,
put it behind a VPN/reverse proxy and enable either `BASIC_AUTH_USERNAME` plus
`BASIC_AUTH_PASSWORD`, or `DOMBEACON_API_TOKEN` for Bearer-token access.

## Deployment Notes

DomBeacon currently assumes a single application instance using one SQLite
database file. Do not scale the Docker Compose service with `replicas` unless
all instances share the same writable database file and scheduler semantics are
revisited; for multi-instance deployments, move the datastore and locks to a
server database such as PostgreSQL.

Back up the SQLite database by stopping the container or using SQLite's online
backup tooling, then copying `DATABASE_PATH` such as `./data/app.db`. Keep the
matching `SECRET_ENCRYPTION_KEY`; encrypted notification secrets cannot be
recovered without it.

## Configuration

`.env.example` 是完整配置模板；`.env` 是本地实际配置，不应提交真实密钥。

### 必填项

| 变量 | 什么时候必须配置 | 用途 |
| --- | --- | --- |
| `SECRET_ENCRYPTION_KEY` | 生产环境必须配置；只要使用 SMTP、Webhook、ServerChan、Web Push 等会写入敏感字段的功能，也必须配置 | 加密数据库中保存的通知密钥、密码、订阅凭据。此值必须长期稳定，丢失后旧加密数据无法解密。 |

### 条件必填项

| 变量 | 什么时候必须配置 | 用途 |
| --- | --- | --- |
| `BASIC_AUTH_USERNAME` + `BASIC_AUTH_PASSWORD` | 应用暴露到非可信网络时必须配置，除非改用 `DOMBEACON_API_TOKEN` 或外层已经有强认证 | 启用 Basic Auth 访问控制。两个变量必须同时设置才生效。 |
| `DOMBEACON_API_TOKEN` | 应用暴露到非可信网络时必须配置，除非改用 Basic Auth 或外层已经有强认证 | 启用 Bearer Token 访问控制，请求头格式为 `Authorization: Bearer <token>`。 |
| `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` + `VAPID_SUBJECT` | 需要浏览器 Web Push 通知时必须配置；不使用 Web Push 时可留空 | Web Push 订阅和推送所需的 VAPID 凭据，三者必须配套。 |
| `BASE_URL` | 生产部署、反向代理域名、邮件/通知中需要正确链接时必须配置为外部访问地址 | 生成邮件、通知正文和回调链接。 |
| `TRUST_PROXY_HEADERS` | 只有部署在可信反向代理后，并且代理会正确覆盖 `X-Forwarded-For` / `X-Real-IP` 时才设为 `true` | 影响审计日志客户端 IP 和 API 限流客户端识别。不要在不可信代理后开启。 |
| `ALLOW_PRIVATE_WEBHOOK_TARGETS` | 只有需要 Webhook 投递到可信内网、回环或私有地址时才可设为 `true` | 默认防 SSRF；开启后会放宽私网目标限制。 |
| `ALLOW_SINGLE_LABEL_DOMAINS` | 只有需要监控 `localhost`、`intranet` 等内部单标签主机名时才设为 `true` | 默认要求域名包含点号，避免把普通字符串当公网域名。 |
| `AUTH_PROTECT_HEALTH` | 只有希望 `/api/health` 也走应用认证时才设为 `true` | 默认健康检查不鉴权，便于 Docker/反向代理探活。 |
| `DISABLE_API_RATE_LIMIT` | 只有上游已有可信限流器时才可设为 `true` | 禁用内置 API 写操作限流。 |

### 可选项

| 变量 | 默认值 | 用途 |
| --- | --- | --- |
| `PORT` | `3000` | Nuxt/Nitro 监听端口。Docker Compose 示例把宿主机 `8080` 映射到容器内 `3000`。 |
| `DATABASE_PATH` | `./data/app.db` | SQLite 数据库文件路径。相对路径按进程工作目录解析，目录会自动创建。 |
| `SQLITE_JOURNAL_MODE` | `DELETE` | SQLite journal 模式。兼容性优先用 `DELETE`；需要更好并发读写时可评估 `WAL`。 |
| `ENABLE_SCHEDULER` | `1` | 是否启用内置定时任务。设为 `0` 或 `false` 可关闭后台扫描和每日汇总。 |
| `SCHEDULER_TIMEZONE` | `UTC` | 调度器使用的 IANA 时区，例如 `Asia/Shanghai`。 |
| `SCAN_BATCH_SIZE` | `5` | 每批扫描的域名数量。`WANTED` 只跑 RDAP；`OWNED` 额外跑 SSL 和 DNS 安全检查。 |
| `SCAN_BATCH_DELAY_MS` | `1000` | 每批扫描之间的等待时间，单位毫秒。 |
| `RATE_LIMIT_MUTATION_WINDOW_MS` | `60000` | 普通写操作限流窗口，单位毫秒。 |
| `RATE_LIMIT_MUTATION_MAX` | `120` | 每个客户端在普通写操作窗口内允许的最大请求数。 |
| `RATE_LIMIT_HEAVY_WINDOW_MS` | `300000` | 重操作限流窗口，单位毫秒。 |
| `RATE_LIMIT_DOMAINS_CREATE_MAX` | `30` | 创建域名接口每个客户端窗口内最大请求数。 |
| `RATE_LIMIT_DOMAINS_IMPORT_MAX` | `5` | 批量导入域名接口每个客户端窗口内最大请求数。 |
| `RATE_LIMIT_SSL_CHECK_ALL_MAX` | `3` | 全量 SSL 检查接口每个客户端窗口内最大请求数。 |
| `RATE_LIMIT_TASK_TRIGGER_MAX` | `5` | 手动触发后台任务接口每个客户端窗口内最大请求数。 |
| `LOG_LEVEL` | `info` | 日志级别，可选 `debug`、`info`、`warn`、`error`。 |
| `LOG_FORMAT` | `text` | 日志格式，可选 `text` 或 `json`。容器日志采集建议用 `json`。 |

SMTP 目标邮箱、Host、账号、密码等通过 UI 配置，并加密存储在数据库中。Web Push 的 VAPID 密钥生成方式见 [docs/pwa-and-push.md](docs/pwa-and-push.md)。

## Usage

### Adding Domains

1. Navigate to `/domains`.
2. Click "Add Domain".
3. Select `OWNED` for domains you control or `WANTED` for domains you track.
4. Set priority, notes, group, and tags as needed.

### Managing Actions

The action queue shows events requiring attention:

- `WANTED_AVAILABLE`: a wanted domain became registrable.
- `WANTED_DROPPING`: a wanted domain entered redemption or pending-delete.
- `OWNED_EXPIRING`: an owned domain is inside the expiry window.
- `SSL_EXPIRING`: an owned-domain certificate expires soon.
- `SSL_INVALID`: an owned-domain certificate chain is invalid.
- `SCAN_FAILED`: a RDAP scan failed.

Actions can be snoozed, dismissed, or resolved.

### Security Findings

Use `/risk` for the aggregate risk dashboard and `/risk/findings` for
the triage queue. The queue supports URL filters, saved `security-findings`
views, visible-row bulk lifecycle updates, and keyboard triage shortcuts:
`J/K` move, `X` select, `R` reopen, `S` snooze, `D` dismiss, and `E` resolve.

## API and Docs

See [docs/README.md](docs/README.md) for the documentation index,
[docs/api.md](docs/api.md) for endpoint details, and
[docs/development/product-roadmap.md](docs/development/product-roadmap.md) for
the current product plan.

## Development Setup

1. Install dependencies.

   ```bash
   pnpm install
   ```

2. Prepare the database.

   ```bash
   pnpm exec drizzle-kit push
   ```

3. Run the dev server.

   ```bash
   pnpm dev
   ```

4. Open `http://localhost:3000`.

## Verification

```bash
pnpm test
pnpm build
```

## Tech Stack

- Nuxt 4, Vue 3, Nitro
- SQLite, Drizzle ORM, better-sqlite3
- Tailwind CSS v4
- `@nuxtjs/i18n`
- Built-in timezone-aware scheduler with DB locks
- Nodemailer, web-push

## License

MIT
