# DomBeacon

**语言**：中文 | [English](./README.en.md)

DomBeacon 是一个自托管的域名运维信标，用于跟踪想要注册的域名、管理已持有域名组合、监控域名 / SSL / DNS 风险，并把关键事件转换为可处理的提醒和待办。

## 功能概览

- **域名跟踪**：`WANTED` 域名用于监控可注册、赎回期、待删除等机会信号；`OWNED` 域名用于监控到期时间和运行健康状态。
- **RDAP 状态历史**：通过 ICANN RDAP bootstrap 自动发现 RDAP 服务，保存最新状态和历史快照。
- **行动队列**：把重要事件转换为待处理事项，支持打开、延后、忽略和解决。
- **SSL 监控**：跟踪证书颁发者、有效期、无效链路，以及 30 天内即将过期的证书。
- **DNS / RDAP 安全发现**：监控 DNS 姿态、NS/MX 漂移、SPF、DMARC、CAA、DNSSEC、注册商锁等风险，支持批量分流、保存视图和快捷键处理。
- **通知能力**：支持邮件、Webhook、ServerChan 和浏览器 Web Push，带风险事件渠道预设、投递历史和重试能力。
- **审计日志**：记录配置变更、域名变更、扫描、风险发现更新和通知配置变更。
- **成本跟踪**：保存每个域名的成本，并在偏好设置中选择展示币种。
- **PWA 支持**：可安装 UI，内置手写 Service Worker 和 Web Push 订阅流程。

## Docker 快速开始

这个项目默认用本仓库的 `docker-compose.yml` 本地构建镜像。Compose 会把宿主机 `./data` 挂载到容器内 `/app/data`，SQLite 数据库默认写入 `./data/app.db`；端口默认只绑定到 `127.0.0.1:8080`，不会直接暴露到外网。

1. 克隆项目。

   ```bash
   git clone <repo>
   cd dombeacon
   ```

2. 准备本地配置和数据目录。

   ```bash
   cp .env.example .env
   mkdir data
   ```

3. 编辑 `.env`，至少设置一个长期稳定的 `SECRET_ENCRYPTION_KEY`。

   ```env
   SECRET_ENCRYPTION_KEY=replace-with-a-stable-random-secret
   ```

   可以用下面任意一种方式生成：

   ```bash
   openssl rand -base64 32
   ```

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

4. 如果只在本机访问 `http://localhost:8080`，访问控制可以先留空。只要把服务暴露到局域网、公网、反向代理或任何非可信网络，就必须在 `.env` 中启用 Basic Auth 或 Bearer Token。

   ```env
   BASIC_AUTH_USERNAME=admin
   BASIC_AUTH_PASSWORD=change-me
   # 或者：
   DOMBEACON_API_TOKEN=replace-with-a-long-random-token
   ```

5. 构建并启动服务。

   ```bash
   docker compose up -d --build
   ```

   如果你的环境仍使用旧版 Compose，可以把 `docker compose` 换成 `docker-compose`。

6. 检查运行状态。

   ```bash
   docker compose ps
   docker compose logs -f app
   ```

7. 打开 `http://localhost:8080`。

常用维护命令：

```bash
# 停止服务，保留 ./data 数据
docker compose down

# 拉取代码后重建并滚动启动
git pull
docker compose up -d --build
```

不要删除 `.env` 中的 `SECRET_ENCRYPTION_KEY`，也不要在迁移或重装时更换它；否则数据库中已加密的通知密钥无法解密。

## 访问模型

DomBeacon 面向可信自托管环境设计。示例 `docker-compose.yml` 默认只绑定到 `127.0.0.1:8080`。

如果需要暴露到 localhost 之外，请放在 VPN 或可信反向代理之后，并至少启用一种访问控制：

- 配置 `BASIC_AUTH_USERNAME` 和 `BASIC_AUTH_PASSWORD` 启用 Basic Auth。
- 配置 `DOMBEACON_API_TOKEN` 启用 Bearer Token。
- 外层网关已经完成强认证时，可以由外层承担访问控制，但仍建议保留应用层认证。

## 部署说明

DomBeacon 当前假设单实例应用访问一个 SQLite 数据库文件。不要直接通过 Docker Compose `replicas` 横向扩容，除非所有实例共享同一个可写数据库文件，并且重新评估调度器语义。多实例部署建议把数据存储和锁迁移到 PostgreSQL 等服务型数据库。

备份 SQLite 数据库时，可以先停止容器，或使用 SQLite online backup 工具，然后复制 `DATABASE_PATH` 指向的文件，例如 `./data/app.db`。同时必须保存匹配的 `SECRET_ENCRYPTION_KEY`，否则数据库中已加密的通知密钥无法恢复。

## 配置说明

`.env.example` 是完整配置模板；`.env` 是本地实际配置，不应提交真实密钥。

### 必填变量

| 变量 | 什么时候必须配置 | 用途 |
| --- | --- | --- |
| `SECRET_ENCRYPTION_KEY` | 生产环境必须配置；只要使用 SMTP、Webhook、ServerChan、Web Push 等会写入敏感字段的功能，也必须配置 | 加密数据库中保存的通知密钥、密码、订阅凭据。此值必须长期稳定，丢失后旧加密数据无法解密 |

### 条件必填变量

| 变量 | 什么时候必须配置 | 用途 |
| --- | --- | --- |
| `BASIC_AUTH_USERNAME` + `BASIC_AUTH_PASSWORD` | 应用暴露到非可信网络时必须配置，除非改用 `DOMBEACON_API_TOKEN` 或外层已经有强认证 | 启用 Basic Auth 访问控制。两个变量必须同时设置才生效 |
| `DOMBEACON_API_TOKEN` | 应用暴露到非可信网络时必须配置，除非改用 Basic Auth 或外层已经有强认证 | 启用 Bearer Token 访问控制，请求头格式为 `Authorization: Bearer <token>` |
| `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` + `VAPID_SUBJECT` | 需要浏览器 Web Push 通知时必须配置；不使用 Web Push 时可留空 | Web Push 订阅和推送所需的 VAPID 凭据，三者必须配套 |
| `BASE_URL` | 生产部署、反向代理域名、邮件或通知中需要正确链接时必须配置为外部访问地址 | 生成邮件、通知正文和回调链接 |
| `TRUST_PROXY_HEADERS` | 只有部署在可信反向代理后，并且代理会正确覆盖 `X-Forwarded-For` / `X-Real-IP` 时才设为 `true` | 影响审计日志客户端 IP 和 API 限流客户端识别。不要在不可信代理后开启 |
| `ALLOW_PRIVATE_WEBHOOK_TARGETS` | 只有需要 Webhook 投递到可信内网、回环或私有地址时才设为 `true` | 默认防 SSRF；开启后会放宽私网目标限制 |
| `ALLOW_SINGLE_LABEL_DOMAINS` | 只有需要监控 `localhost`、`intranet` 等内部单标签主机名时才设为 `true` | 默认要求域名包含点号，避免把普通字符串当公网域名 |
| `AUTH_PROTECT_HEALTH` | 只有希望 `/api/health` 也走应用认证时才设为 `true` | 默认健康检查不鉴权，便于 Docker / 反向代理探活 |
| `DISABLE_API_RATE_LIMIT` | 只有上游已有可信限流器时才可设为 `true` | 禁用内置 API 写操作限流 |

### 可选变量

| 变量 | 默认值 | 用途 |
| --- | --- | --- |
| `PORT` | `3000` | Nuxt / Nitro 监听端口。Docker Compose 示例把宿主机 `8080` 映射到容器内 `3000` |
| `DATABASE_PATH` | `./data/app.db` | SQLite 数据库文件路径。相对路径按进程工作目录解析，目录会自动创建 |
| `SQLITE_JOURNAL_MODE` | `DELETE` | SQLite journal 模式。兼容性优先用 `DELETE`；需要更好并发读写时可评估 `WAL` |
| `ENABLE_SCHEDULER` | `1` | 是否启用内置定时任务。设为 `0` 或 `false` 可关闭后台扫描和每日汇总 |
| `SCHEDULER_TIMEZONE` | `UTC` | 调度器使用的 IANA 时区，例如 `Asia/Shanghai` |
| `SCAN_BATCH_SIZE` | `5` | 每批扫描的域名数量。`WANTED` 只跑 RDAP；`OWNED` 额外跑 SSL 和 DNS 安全检查 |
| `SCAN_BATCH_DELAY_MS` | `1000` | 每批扫描之间的等待时间，单位毫秒 |
| `RATE_LIMIT_MUTATION_WINDOW_MS` | `60000` | 普通写操作限流窗口，单位毫秒 |
| `RATE_LIMIT_MUTATION_MAX` | `120` | 每个客户端在普通写操作窗口内允许的最大请求数 |
| `RATE_LIMIT_HEAVY_WINDOW_MS` | `300000` | 重操作限流窗口，单位毫秒 |
| `RATE_LIMIT_DOMAINS_CREATE_MAX` | `30` | 创建域名接口每个客户端窗口内最大请求数 |
| `RATE_LIMIT_DOMAINS_IMPORT_MAX` | `5` | 批量导入域名接口每个客户端窗口内最大请求数 |
| `RATE_LIMIT_SSL_CHECK_ALL_MAX` | `3` | 全量 SSL 检查接口每个客户端窗口内最大请求数 |
| `RATE_LIMIT_TASK_TRIGGER_MAX` | `5` | 手动触发后台任务接口每个客户端窗口内最大请求数 |
| `LOG_LEVEL` | `info` | 日志级别，可选 `debug`、`info`、`warn`、`error` |
| `LOG_FORMAT` | `text` | 日志格式，可选 `text` 或 `json`。容器日志采集建议使用 `json` |

SMTP 目标邮箱、Host、账号、密码等通过 UI 配置，并加密存储在数据库中。Web Push 的 VAPID 密钥生成方式见 [docs/pwa-and-push.md](docs/pwa-and-push.md)。

## 使用方式

### 添加域名

1. 进入 `/domains`。
2. 点击“添加域名”。
3. 选择 `OWNED` 表示已持有域名，或选择 `WANTED` 表示想要跟踪的域名。
4. 按需设置优先级、备注、分组和标签。

### 管理行动队列

行动队列展示需要处理的事件：

- `WANTED_AVAILABLE`：想要的域名变为可注册。
- `WANTED_DROPPING`：想要的域名进入赎回期或待删除阶段。
- `OWNED_EXPIRING`：已持有域名进入到期窗口。
- `SSL_EXPIRING`：已持有域名的证书即将过期。
- `SSL_INVALID`：已持有域名的证书链无效。
- `SCAN_FAILED`：RDAP 扫描失败。

行动项可以延后、忽略或标记为已解决。

### 处理安全发现

使用 `/risk` 查看聚合风险仪表盘，使用 `/risk/findings` 处理风险发现队列。队列支持 URL 过滤、保存 `security-findings` 视图、可见行批量生命周期更新和键盘快捷键：

- `J/K`：上下移动。
- `X`：选择。
- `R`：重新打开。
- `S`：延后。
- `D`：忽略。
- `E`：解决。

## API 与文档

- [docs/README.md](docs/README.md)：文档索引。
- [docs/api.md](docs/api.md)：API 端点说明。
- [docs/development/product-roadmap.md](docs/development/product-roadmap.md)：当前产品计划。

## 本地开发

1. 安装依赖。

   ```bash
   pnpm install
   ```

2. 准备数据库。

   ```bash
   pnpm exec drizzle-kit push
   ```

3. 启动开发服务器。

   ```bash
   pnpm dev
   ```

4. 打开 `http://localhost:3000`。

## 验证

```bash
pnpm test
pnpm build
```

## 技术栈

- Nuxt 4、Vue 3、Nitro
- SQLite、Drizzle ORM、better-sqlite3
- Tailwind CSS v4
- `@nuxtjs/i18n`
- 内置支持时区的调度器和数据库锁
- Nodemailer、web-push

## 许可证

MIT

## 致谢

本项目开发过程中获得了 [LINUX DO](https://linux.do/latest) 社区佬友的帮助，本产品会在社区发布，感谢社区的支持。