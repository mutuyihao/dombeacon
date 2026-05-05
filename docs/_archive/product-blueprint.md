Domain Watchlist 产品蓝图 vNext
自托管 DomBeacon（域灯）：域名机会、资产健康、证书与续费决策控制台
0. 总结结论

建议把产品从 Domain Watchlist 升级定位为：

面向个人、小团队、技术型域名投资者和内部资产维护者的自托管 DomBeacon（域灯）。它不是公开 SaaS，不是抢注平台，不是品牌保护系统，而是一个把 Wanted 域名机会、Owned 域名台账、SSL 证书健康、续费成本、通知行动流整合在一起的私有控制台。

这个方向比单纯“域名状态监控”更成立。你上传的报告里已经明确指出，现有市场空白是“同时管理想要的域名和已有域名的自托管工具，并且 UX 面向行动驱动而非表格驱动”。我的建议是：把这个空白进一步升级为“数字身份资产控制台”，但 v1 不要喊太大，产品内核仍然是域名行动队列。

新增功能里，中英双语、Webhook、Server酱、SSL 证书检测都应该纳入蓝图，但优先级不同：

新增方向	建议优先级	结论
中英双语	v1 Must	自托管开源/独立工具天然需要英文可传播，中文服务自用和国内渠道
Webhook 通知	v1 Should / v1.1 Must	邮件不够实时，Server酱/企业微信/飞书/Discord/Slack 是强补充
Server酱	v1.1 Must	国内个人开发者和自托管用户非常适配
SSL 证书检测	v1.1 Must	它是“域名资产健康”的自然延伸，但不能混入域名注册状态
成本/续费预算	v1.1 Should	是蓝海纵深，但先做轻量字段和预算提醒，不做完整财务系统
移动端/PWA	v1.1 Should	机会提醒收到后，手机上能确认和 snooze 很重要
1. 产品定位
1.1 推荐定位语
中文

Domain Watchlist 是一个自托管的域名机会与资产健康雷达，帮助你追踪想要的域名、管理已拥有域名、监控到期与 SSL 风险，并通过邮件、Webhook、Server酱等渠道提醒你今天该处理什么。

English

Domain Watchlist is a self-hosted DomBeacon (域灯) for tracking wanted domain opportunities, managing owned domain portfolios, monitoring expiration and SSL risks, and turning domain events into actionable alerts.

1.2 更短的产品心智

不要叫“域名监控工具”。建议对外心智是：

Self-hosted DomBeacon (域灯)

中文可以叫：

自托管域名运营雷达

它包含四件事：

机会雷达：Wanted domains 是否 available、pending delete、redemption。
资产台账：Owned domains 的状态、分组、标签、到期、历史。
健康监控：RDAP 扫描健康、SSL 证书健康、数据可信度。
行动系统：把事件变成 open / snooze / dismiss / resolved 的 action。
2. 产品边界
2.1 明确做什么

v1 到 v1.1 应该围绕：

域名 RDAP 状态扫描。
Wanted / Owned 两类 watch item。
Action queue。
SMTP 邮件。
Webhook 通知。
Server酱通知。
SSL 到期和失效检测。
中英双语。
批量导入、CSV 导出。
简单密码门禁。
轻量续费成本字段。
Docker 自托管单实例。
2.2 明确不做什么

继续坚持这些边界：

不做公开 SaaS。
不做多租户。
不做完整 RBAC。
不做团队协作流。
不做自动注册域名。
不做抢注/backorder 闭环。
不做品牌仿冒发现。
不做商标/法律证据工作流。
不做完整财务/P&L 系统。
不做大规模全网 expired domain 数据库。

你上传的报告里也强调，Domain Watchlist 是“追踪用户已选定目标域名”，不是让用户搜索他们还不知道的全网机会，这一点是非常关键的产品边界。

3. 用户与核心场景
3.1 用户 A：域名投资者

他们每天想知道：

我想要的域名有没有变成可注册？
有没有进入 pending delete？
有没有进入 redemption，说明机会窗口靠近？
我手上的域名哪些快到期？
本月续费压力是多少？
哪些域名不值得再续？
有没有 SSL 证书快过期导致站点风险？

核心 Job：

当我关注某些域名或持有一批域名时，我希望系统主动告诉我哪些今天需要行动，而不是让我每天手动查。

3.2 用户 B：内部域名资产维护者

他们每周想知道：

公司/项目/客户域名有没有快到期？
哪些域名扫描失败，需要人工确认？
哪些网站证书快过期或已失效？
哪些域名归属哪个项目、客户或用途？
是否能导出给财务、运维、老板看？

核心 Job：

当我负责一批域名资产时，我希望有一个可信台账，能提醒续费、证书和扫描异常，避免域名或网站因为低级遗漏出事故。

4. 蓝海机会判断
4.1 真正蓝海不在“域名炒作”

域名市场里，纯粹的好域名投机、全网 expired domain 搜索、droplist、backorder 都已经很成熟。你不应该去和 ExpiredDomains、DropCatch、Dynadot、NameJet 这种机会供给侧竞争。

真正的空间在：

小规模高价值域名组合的私有运营决策系统。

也就是 10–500 个域名的个人、小团队、开发者、独立站、工作室、内部 IT。这个群体不一定愿意上企业级服务，也不想把域名清单交给 SaaS，但又比 Excel 需要更多自动化。

4.2 成本/续费是很好的纵深

成本/续费方向有机会，但不要变成财务系统。报告里已经指出，续费成本侵蚀 ROI、多注册商定价差异、年度续费预算预测、“续不续”决策都是域名投资者的真实痛点。

建议产品心智从：

“发现域名机会”

升级为：

“管理域名机会与持有成本”

这比单纯监控更有差异化。

4.3 SSL 是自然扩展，不是偏题

SSL 证书不是域名注册状态，但它是域名资产健康的一部分。证书过期造成的业务影响往往比域名状态变化更直接。Let’s Encrypt 已在 2025 年关闭 OCSP 服务并转向 CRL，因此 v1.1 的证书检测应该以 TLS handshake 拿线上实际证书为主，不要把 OCSP 做成强依赖。

5. 产品模块蓝图
5.1 顶层模块

推荐导航结构：

Dashboard
Domains
Actions
Notifications
Settings

其中 Notifications 可以先放进 Settings，等 Webhook/Server酱/多渠道变强后再独立出来。

5.2 Dashboard：行动优先首页

Dashboard 不应该是统计面板，而是：

今天我该处理什么？

推荐布局：

顶部：系统健康
- Last successful scan
- Active domains
- Failed scans
- Open actions
- Notification health

第一块：Wanted Opportunities
- Available now
- Pending delete
- Redemption
- Recently changed

第二块：Owned Risks
- Expiring soon
- Grace period / redemption
- Scan failed
- Unsupported / unknown

第三块：SSL Health
- Certificate expired
- Expiring in 7 days
- Hostname mismatch
- TLS unreachable

第四块：Cost & Renewal
- Renewal due this month
- Estimated renewal cost
- High-cost domains approaching renewal
- Domains missing cost data

第五块：Recent Changes
- Status changed
- SSL changed
- Metadata changed
- Notification sent
6. 数据模型建议

不写代码，只定义产品概念。

6.1 Domain / Watch Item

每一条域名是一个 watch item：

字段	说明
domain	规范化域名
displayName	可选展示名
watchKind	OWNED / WANTED
priority	LOW / MEDIUM / HIGH
groupName	项目、客户、portfolio、用途
tags	灵活标签
note	备注
isActive	是否继续扫描
localeSensitiveName	可选，未来多语言显示名
createdAt / updatedAt	台账信息
6.2 Domain Status

建议拆成业务状态和扫描状态，不要全部塞进一个枚举。

业务状态
状态	含义
AVAILABLE	可注册
ACTIVE	已注册且正常
EXPIRING	即将到期，由 expiresAt 派生
EXPIRED_GRACE	过期宽限期
REDEMPTION	赎回期
PENDING_DELETE	待删除期
UNKNOWN	返回异常或无法判断
UNSUPPORTED	当前 TLD / RDAP 不支持

ICANN 的 EPP 状态码包括 autoRenewPeriod、redemptionPeriod、pendingDelete 等，这些应映射到更准确的生命周期状态，而不是继续用模糊的 DROPPING。

扫描状态
状态	含义
NEVER_CHECKED	从未扫描
OK	最近扫描成功
FAILED	最近扫描失败
STALE	长时间无成功扫描
RATE_LIMITED	可能被限速

报告里已经强调“扫描失败不覆盖业务状态”，这是正确的数据可信度原则。

6.3 SSL Status

SSL 不属于 domain status，而应是独立健康状态。

状态	含义
NOT_CHECKED	未启用 SSL 检测
VALID	证书有效
EXPIRING	即将到期
EXPIRED	已过期
HOSTNAME_MISMATCH	证书域名不匹配
UNTRUSTED	证书链不可信
UNREACHABLE	443/TLS 不可达
UNKNOWN	无法判断
6.4 Cost / Renewal Fields

先做轻量字段：

字段	说明
purchaseCost	购入成本
annualRenewalCost	年续费成本
currency	默认 USD，可选 CNY
registrar	注册商
autoRenewEnabled	是否自动续费
renewalDecision	KEEP / DROP / UNDECIDED
costNote	成本备注

不要做：

税务。
销售收入。
完整 P&L。
自动估值。
自动拉所有注册商价格。
7. Action Queue 设计
7.1 Action 是产品核心

Action queue 是你从“监控工具”升级为“决策系统”的关键。

报告里原本已经把 action queue 作为“行动优先 Dashboard 的技术基础”。现在要把 SSL、Webhook、成本也接入 action queue。

7.2 Action 类型
Action Type	来源	触发条件
WANTED_AVAILABLE	域名机会	WANTED + AVAILABLE
WANTED_PENDING_DELETE	域名机会	WANTED + PENDING_DELETE
WANTED_REDEMPTION	域名机会	WANTED + REDEMPTION
OWNED_EXPIRING	资产续费	OWNED + 到期 ≤ 30/14/7/1 天
OWNED_EXPIRED_GRACE	资产风险	OWNED + EXPIRED_GRACE
OWNED_REDEMPTION	资产风险	OWNED + REDEMPTION
SCAN_FAILED	系统健康	连续失败 N 次
SSL_EXPIRING	证书健康	SSL 到期 ≤ 14/7/3/1 天
SSL_EXPIRED	证书健康	证书已过期
SSL_HOSTNAME_MISMATCH	证书健康	域名不匹配
SSL_UNREACHABLE	证书健康	连续 TLS 失败
RENEWAL_COST_DUE	成本	本月续费预算触发
MISSING_METADATA	台账	关键 owned 域名缺 registrar/expiresAt/cost
7.3 Action 生命周期
open
snoozed
dismissed
resolved

规则：

underlying condition 消失后自动 resolved。
用户 snooze 后不再即时打扰，但仍出现在 digest。
dismissed 不等于永久忽略，条件重新出现可重新 open。
高优先级 action 不允许完全静默，至少进入 daily digest。
8. 通知系统蓝图
8.1 通知渠道分层
v1
SMTP Email
Daily digest
v1.1
Generic Webhook
Server酱 / ServerChan
Slack Incoming Webhook
Discord Webhook
Feishu / Lark Bot
WeCom / 企业微信 Bot
DingTalk Bot
v2
Apprise 兼容层或插件式通知适配器
Telegram / Bark / PushDeer / ntfy
通知模板市场/自定义模板

Slack Incoming Webhooks 的基本模式是给应用一个唯一 URL，然后通过 JSON payload 向频道发消息；Discord incoming webhook 也适合外部系统单向推送通知。 Server酱则适合国内个人开发者，把服务器事件推到微信、企业微信、手机客户端、钉钉群或飞书群；官方站点定位就是“一个请求通过 API 将消息推送到个人微信、企业微信、手机客户端和钉钉群、飞书群”。

8.2 Server酱支持方式

Server酱适合做成一等通知渠道，不要只当 generic webhook。

推荐配置项：

配置	说明
provider	serverchan
sendKey	用户填写
channel	可选，按 Server酱能力扩展
titleTemplate	标题模板
bodyTemplate	内容模板
enabledEvents	选择触发事件
quietHours	免打扰时间
testSend	测试发送

Server酱常见调用模型是基于 SendKey 发送标题和内容，生态 SDK 与示例里普遍使用 title/text 和 desp 这类字段。

8.3 Generic Webhook

Generic Webhook 是最重要的扩展点。

配置项：

配置	说明
URL	目标地址
method	默认 POST
headers	自定义 header
secret	可选签名密钥
payload format	compact / full
event filter	哪些 action 触发
retry policy	失败重试
timeout	默认 5–10 秒
disable on repeated failure	连续失败后自动停用
8.4 通知事件矩阵
事件	Email	Server酱	Webhook	Digest
WANTED_AVAILABLE	立即	立即	立即	是
WANTED_PENDING_DELETE	立即	立即	立即	是
OWNED_EXPIRING_30	可选	否	可选	是
OWNED_EXPIRING_7	立即	立即	立即	是
OWNED_REDEMPTION	立即	立即	立即	是
SSL_EXPIRING_14	可选	否	可选	是
SSL_EXPIRING_3	立即	立即	立即	是
SSL_EXPIRED	立即	立即	立即	是
SCAN_FAILED	连续 N 次后	可选	可选	是
DAILY_DIGEST	是	可选摘要	不建议	是
8.5 防骚扰规则

必须做：

同一 action 同一状态只通知一次。
阈值型提醒按 30/14/7/3/1 分层，每层只触发一次。
连续失败才通知，单次失败只记录。
Webhook 失败不要阻塞扫描。
通知渠道失败也要成为 action：NOTIFICATION_FAILED。
quiet hours 内只推高危事件。
daily digest 内容为空不发送。
9. 多语言设计
9.1 为什么中英双语要进 v1

这不是“锦上添花”。理由：

你自己使用中文，需要中文 UX。
自托管开源/独立产品传播需要英文 README、英文 UI。
域名术语本身英文很多，双语能减少理解歧义。
后续如果给海外用户、GitHub、Docker Hub、Product Hunt 展示，英文是基础门槛。

Nuxt 生态有成熟的 @nuxtjs/i18n 模块，支持 Vue I18n、路由本地化、懒加载翻译、SEO 标签本地化等能力。

9.2 v1 语言范围

至少支持：

zh-CN
en-US

建议不要一开始支持繁中、日语、韩语。等产品稳定后再加。

9.3 多语言范围

必须多语言化：

导航。
Dashboard 卡片。
表格列名。
状态枚举展示。
Action 类型展示。
通知模板。
设置页。
错误提示。
空状态。
导入导出说明。
README 中英双语。

可以暂缓：

rawSnapshot。
RDAP 原始字段。
技术 debug 错误全文。
用户自定义 note/tag/group。
9.4 状态命名双语建议
内部枚举	中文展示	英文展示
AVAILABLE	可注册	Available
ACTIVE	已注册	Active
EXPIRING	即将到期	Expiring
EXPIRED_GRACE	过期宽限期	Grace Period
REDEMPTION	赎回期	Redemption
PENDING_DELETE	待删除	Pending Delete
UNKNOWN	未知	Unknown
UNSUPPORTED	暂不支持	Unsupported
SCAN_FAILED	扫描失败	Scan Failed
SSL_VALID	证书有效	SSL Valid
SSL_EXPIRING	证书即将过期	SSL Expiring
SSL_EXPIRED	证书已过期	SSL Expired
SSL_MISMATCH	证书域名不匹配	SSL Hostname Mismatch
9.5 多语言产品原则
内部枚举永远用英文稳定值。
展示层根据 locale 转换。
通知模板也根据 locale。
每个通知渠道可以选择语言。
CSV 导出默认用当前 UI 语言，但保留英文枚举列。
文档中优先中英双语并列，不要只翻译 UI。
10. SSL 证书检测方案
10.1 产品边界

SSL 检测只回答：

这个域名对应的网站证书是否健康？

不回答：

是否被钓鱼。
是否被伪造。
是否所有子域名都安全。
是否满足企业合规标准。
是否需要法律证据。
10.2 v1.1 最小实现

每个 domain 可选启用 SSL check：

配置	默认
sslEnabled	false
sslHost	domain
sslPort	443
sslCheckInterval	24h
sslWarnDays	14, 7, 3, 1
sslSni	默认等于 sslHost
sslFollowWww	可选
sslVerifyChain	true
10.3 SSL Detail 展示

Domain Detail 增加：

SSL Certificate
- Status: Valid / Expiring / Expired / Mismatch / Unreachable
- Host: example.com:443
- Issuer
- Subject
- SANs
- Valid from
- Valid to
- Days remaining
- Last checked
- Last error
10.4 SSL Action
Action	触发
SSL_EXPIRING	剩余天数 ≤ 14/7/3/1
SSL_EXPIRED	当前时间超过 notAfter
SSL_HOSTNAME_MISMATCH	host 不在 SAN/CN
SSL_UNTRUSTED	证书链不可信
SSL_UNREACHABLE	连续 N 次握手失败
10.5 SSL 不要进入 v1.0 的原因

虽然 SSL 很有价值，但它会引入 host/port/SNI、网络可达性、证书链、重试、误报等复杂度。建议：

v1.0：先完成域名状态、action、通知、多语言框架。
v1.1：加入 SSL。
如果你非常想早上 SSL，可以做成 late v1，但不要压垮主线。
11. 成本与续费决策
11.1 产品机会

成本方向要服务于一个问题：

这个域名是否还值得继续持有？

它不是财务报表，而是续费决策辅助。

11.2 v1.1 功能

Dashboard 增加：

Renewal Cost
- Renewal due this month: 12 domains
- Estimated cost: $188
- Missing cost data: 8 domains
- High priority renewals: 3 domains

Domain List 增加列：

registrar
expiresAt
annualRenewalCost
currency
autoRenew
renewalDecision

Domain Detail 增加：

purchase cost
renewal cost
renewal history note
decision: keep / drop / undecided
11.3 不做什么

不要做：

自动价格爬虫。
自动注册商比价。
自动迁移建议。
销售流水。
税务。
收入利润表。

可以在 v2 后考虑“注册商价格参考表”，但只做手动维护或社区维护，不做强依赖。

12. 信息架构最终版
Dashboard
  - Opportunities
  - Risks
  - SSL Health
  - Renewal Cost
  - Scan Health
  - Recent Changes

Domains
  - All
  - Wanted
  - Owned
  - Expiring
  - SSL Issues
  - Scan Failed
  - Import
  - Export

Actions
  - Open
  - Snoozed
  - Dismissed
  - Resolved
  - By type
  - By priority

Notifications
  - Email SMTP
  - Webhook
  - ServerChan
  - Slack
  - Discord
  - Feishu / Lark
  - WeCom
  - DingTalk
  - Test notifications
  - Delivery logs

Settings
  - General
  - Language
  - Scan
  - Security
  - RDAP
  - SSL
  - Cost / Currency
  - Backup / Export
  - About

v1 可以把 Notifications 合并在 Settings 里；v1.1 后独立出来。

13. 移动端/PWA 方案

如果你说的“移动走”是指能在手机上方便处理，建议加一个轻量移动策略。

13.1 移动端不做完整管理

手机端只做：

查看 Dashboard。
查看 open actions。
查看域名详情摘要。
snooze / dismiss action。
点击复制域名。
点击打开注册商搜索。
查看 SSL / 到期风险。
触发手动刷新单个域名。

不做：

复杂批量导入。
CSV 导出。
大量设置。
调试 raw RDAP。
13.2 移动首页
Today
- 2 wanted opportunities
- 3 expiring owned domains
- 1 SSL expired
- 2 scan failures

High Priority
- example.com available
- mysite.com SSL expires in 3 days
- project.io expires in 7 days
13.3 通知到移动端

Server酱、企业微信、飞书、钉钉、PushDeer、Bark 都是移动端触达路径。建议 v1.1 至少实现 Server酱 + Generic Webhook，后续用 adapter 扩展。

14. 功能优先级最终版
v1.0 Must
功能	说明
数据模型重构	watchKind、priority、group、tags、note、isActive
状态模型重命名	DROPPING 改为 PENDING_DELETE
RDAP-first 扫描	gTLD 强覆盖，ccTLD best-effort
扫描失败不覆盖状态	保留 last known business status
Action Queue	open / snooze / dismiss / resolved
Dashboard 行动优先	opportunities / risks / scan health
Domain List 筛选	watchKind、status、priority、group、tag、active
Domain Detail	metadata、latest status、history、debug
批量导入	newline / CSV
CSV 导出	当前筛选结果
SMTP 通知	即时通知 + daily digest
中英双语框架	zh-CN / en-US
可选密码门禁	页面 + 写 API
Docker 稳定化	锁 Node 版本，解决 ABI 风险
Git baseline	先提交当前可用版本
v1.0 Should
功能	说明
Notification delivery log	记录通知发送成败
Import preview	导入前预览和校验
Empty states	中英双语引导
Basic mobile layout	Dashboard / Actions 可手机访问
Manual expiresAt override	RDAP 缺失时手动补
v1.1 Must
功能	说明
SSL 证书检测	host:443，证书到期、失效、mismatch
SSL actions	SSL_EXPIRING / SSL_EXPIRED / SSL_MISMATCH
Generic Webhook	POST JSON payload
Server酱通知	一等渠道
Webhook delivery retry	防止偶发失败
通知模板中英双语	邮件和 Webhook 文案
续费成本字段	purchaseCost、annualRenewalCost、currency
Renewal dashboard	本月续费预算
批量操作	批量暂停、分组、标签、删除
v1.2 / v2
功能	说明
注册商只读同步	自动拉 owned 到期日
多 endpoint SSL	www、apex、自定义 host
Cost intelligence	持有成本、续费预算、drop 建议
Webhook adapter marketplace	Bark、PushDeer、ntfy、Telegram
PWA	手机安装、快速处理 action
备份/恢复	SQLite backup、JSON export/import
WHOIS fallback	针对少数 TLD 定向补洞
简单本地多用户	仅本地实例，不做 SaaS 多租户
15. 开发拆解建议
阶段 0：先固化 baseline

目标：不继续在未提交状态上发散。

交付：

当前 MVP 全量 git commit。
README 写清当前能力和限制。
Docker build 可复现。
Node 版本固定。
better-sqlite3 依赖重建策略明确。
阶段 1：产品重构核心

交付：

watchKind。
priority / group / tags / note。
状态模型升级。
Action queue。
Dashboard 改版。
批量导入。
CSV 导出。
中英双语基础框架。
阶段 2：通知系统升级

交付：

SMTP 重构为 notification provider。
Email provider。
Generic webhook provider。
Server酱 provider。
通知日志。
测试通知。
防骚扰规则。
阶段 3：SSL 健康监控

交付：

sslEnabled / sslHost / sslPort。
SSL latest / history。
SSL actions。
SSL notifications。
Domain Detail SSL 卡片。
Dashboard SSL risk 区块。
阶段 4：成本与续费

交付：

annualRenewalCost。
purchaseCost。
currency。
renewalDecision。
本月续费预算。
缺失成本数据提示。
CSV 导入导出支持成本字段。
阶段 5：移动与发布

交付：

移动端 Dashboard。
移动端 Actions。
PWA manifest。
中英文 README。
Docker Hub / GHCR 发布。
示例 docker-compose。
示例通知配置文档。
16. PRD 级页面说明
Dashboard

目标：回答“今天该做什么”。

必须展示：

Wanted opportunities。
Owned renewal risks。
SSL risks。
Scan health。
Notification health。
Renewal cost summary。
Recent changes。
Domains

目标：成为所有 watch item 的主列表。

筛选：

watchKind。
status。
SSL status。
priority。
group。
tags。
registrar。
active。
expiresAt range。
renewalDecision。

批量操作：

set watchKind。
set priority。
set group。
add tags。
pause / resume。
delete。
export。
Domain Detail

目标：单个域名的事实源。

信息层级：

Header：domain、watchKind、priority、status。
Actions：refresh、edit、pause、delete。
Registration status：RDAP latest。
SSL health：证书信息。
Cost & renewal：续费成本和决策。
Metadata：group、tags、note。
Timeline：domain status、SSL、actions、notifications。
Debug：RDAP raw、SSL raw summary、errors。
Actions

目标：替代“用户自己筛列表”。

视图：

Open。
Snoozed。
Resolved。
High priority。
By type。
By watchKind。

每个 action：

domain。
action type。
severity。
reason。
createdAt。
dueAt。
source condition。
suggested next step。
snooze / dismiss / open detail。
Notifications

目标：所有通知渠道一处管理。

页面：

Channels。
Templates。
Event rules。
Quiet hours。
Delivery logs。
Test send。
Settings

目标：实例级配置。

包括：

Language。
Security。
Scan。
RDAP。
SSL。
Cost/currency。
Backup。
About。
17. 通知文案模板
中文：Wanted Available

标题：

[Domain Watchlist] 机会出现：{{domain}} 可注册

正文：

域名：{{domain}}
类型：Wanted
状态：可注册
检查时间：{{checkedAt}}
优先级：{{priority}}

建议动作：
请立即前往注册商确认并注册。系统只负责提醒，不执行自动注册。
English：Wanted Available
[Domain Watchlist] Opportunity: {{domain}} is available

Domain: {{domain}}
Type: Wanted
Status: Available
Checked at: {{checkedAt}}
Priority: {{priority}}

Suggested action:
Go to your registrar and verify availability. This tool does not register domains automatically.
中文：SSL Expiring
[Domain Watchlist] 证书即将过期：{{domain}}

域名：{{domain}}
证书主机：{{sslHost}}:{{sslPort}}
剩余天数：{{daysRemaining}}
到期时间：{{notAfter}}
颁发者：{{issuer}}

建议动作：
请检查证书自动续期是否正常，或手动续签证书。
Server酱短标题建议

Server酱移动通知标题要短：

域名机会：example.com 可注册
证书风险：example.com 3天后过期
续费提醒：example.com 7天后到期
18. 风险清单
风险	说明	应对
范围膨胀	SSL、Webhook、成本都会拉大范围	分 v1/v1.1，不同时做完
状态语义不清	DROPPING 容易误导	改为 PENDING_DELETE
用户误以为能抢注	工具只是提醒	UI 写清“不自动注册/不保证抢到”
Webhook 泄密	URL 和 token 敏感	只服务端保存，前端脱敏展示
Server酱额度限制	免费额度有限	支持防骚扰、digest、测试发送
SSL 误报	网络波动/CDN/SNI	连续失败才告警，高危立即告警
多语言维护成本	文案散落难维护	v1 起就建立 i18n key 规范
成本字段填写率低	用户懒得填	允许 CSV 导入、缺失提示，不强制
RDAP ccTLD 覆盖	部分 TLD 不支持	标注 unsupported，后续定向 fallback
SQLite 并发	扫描写入锁	扫描队列、限流、WAL、批量写入
19. 最终路线图
v1.0：可用的自托管域名行动系统

目标：

替代 Excel + 手动查询 + 分散邮件提醒。

包含：

RDAP-first。
Wanted / Owned。
Action queue。
Dashboard。
Domain list/detail。
CSV import/export。
SMTP。
Daily digest。
中英双语。
Password gate。
Docker stable。
v1.1：资产健康与多渠道提醒

目标：

从域名状态监控升级为域名资产健康控制台。

包含：

SSL 检测。
Webhook。
Server酱。
Notification logs。
Cost fields。
Renewal cost summary。
Mobile-friendly actions。
Batch operations。
v1.2：决策增强

目标：

从健康控制台升级为轻量决策系统。

包含：

Renewal decision workflow。
Missing metadata cleanup。
Basic portfolio quality score。
Registrar read-only sync 评估。
Multi-host SSL。
Better import mapping。
Backup/restore。
v2：私有 Domain Ops 系统

目标：

仍然自托管，但成为域名组合运营中枢。

包含：

注册商只读同步。
成本趋势。
TLD support matrix。
WHOIS fallback for selected TLD。
通知插件生态。
PWA。
简单本地用户。
API for local automation。
20. 最应该立即改的产品方案

按你现在的 MVP 状态，我建议下一步不要先做 SSL，也不要先做成本，而是按这个顺序：

先提交 git baseline。
重命名产品心智：Domain Watchlist → DomBeacon（域灯）。
重构数据模型：watchKind、priority、group、tags、note。
重构状态模型：DROPPING → PENDING_DELETE，扫描状态独立。
做 Action Queue。
做中英双语框架。
做 SMTP 通知的事件规则和去重。
再加 Generic Webhook。
再加 Server酱。
再加 SSL 检测。
最后加续费成本字段。

一句话：

v1 先把“域名行动系统”做稳；v1.1 再把“证书 + Webhook + Server酱 + 成本”接入同一个 action queue。

这条路线最稳，也最容易从 MVP 变成一个真正能用、能发布、能长期演进的产品。
