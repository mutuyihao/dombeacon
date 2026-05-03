# 续费成本追踪实现文档

## 概述

续费成本追踪功能允许 Domain Ops Radar 用户管理和追踪域名相关的所有费用，包括注册、续费、转移、隐私保护等。提供详细的成本统计和分析。

## 功能特性

### 核心功能
- ✅ 成本记录管理（增删查）
- ✅ 多种成本类型（注册/续费/转移/隐私保护/其他）
- ✅ 多货币支持（USD/EUR/GBP/CNY/JPY/CAD/AUD）
- ✅ 年度成本统计
- ✅ 按类型分类统计
- ✅ 按月份分布
- ✅ 按域名排行
- ✅ 按注册商分析
- ✅ 实时统计仪表板
- ✅ 双语支持（中英文）

### 支持的成本类型
1. **REGISTRATION** - 注册费用
2. **RENEWAL** - 续费费用
3. **TRANSFER** - 转移费用
4. **PRIVACY** - 隐私保护费用
5. **OTHER** - 其他费用

## 数据库设计

### domainCosts 表

```sql
CREATE TABLE domain_costs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id INTEGER REFERENCES domains(id) ON DELETE CASCADE NOT NULL,
  cost_type TEXT NOT NULL, -- 'REGISTRATION' | 'RENEWAL' | 'TRANSFER' | 'PRIVACY' | 'OTHER'
  amount INTEGER NOT NULL, -- 以分为单位（USD * 100）
  currency TEXT NOT NULL DEFAULT 'USD', -- ISO 4217 货币代码
  registrar TEXT,
  payment_date TIMESTAMP NOT NULL,
  period_start TIMESTAMP,
  period_end TIMESTAMP,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**字段说明**:
- `id` - 主键
- `domain_id` - 域名 ID（外键）
- `cost_type` - 成本类型
- `amount` - 金额（以分为单位，避免浮点数精度问题）
- `currency` - 货币代码（USD、EUR 等）
- `registrar` - 注册商
- `payment_date` - 付款日期
- `period_start` - 服务起始日期
- `period_end` - 服务结束日期
- `note` - 备注

### domainBudgets 表（预留）

```sql
CREATE TABLE domain_budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  period TEXT NOT NULL DEFAULT 'YEARLY', -- 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP,
  alert_threshold INTEGER DEFAULT 80, -- 百分比
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

预留用于未来的预算管理功能。

## 后端实现

### 1. API 端点

#### GET /api/costs
获取所有成本记录

**查询参数**:
- `domainId` (可选) - 按域名筛选

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "domainId": 5,
      "domain": "example.com",
      "costType": "RENEWAL",
      "amount": 1299,
      "currency": "USD",
      "registrar": "GoDaddy",
      "paymentDate": "2026-04-15T00:00:00Z",
      "periodStart": "2026-04-15T00:00:00Z",
      "periodEnd": "2027-04-15T00:00:00Z",
      "note": "Annual renewal"
    }
  ]
}
```

#### POST /api/costs
创建新的成本记录

**请求体**:
```json
{
  "domainId": 5,
  "costType": "RENEWAL",
  "amount": 1299,
  "currency": "USD",
  "registrar": "GoDaddy",
  "paymentDate": "2026-04-15",
  "periodStart": "2026-04-15",
  "periodEnd": "2027-04-15",
  "note": "Annual renewal"
}
```

**验证**:
- `domainId` 必填
- `costType` 必填，必须是有效类型
- `amount` 必填，非负整数（以分为单位）
- `paymentDate` 必填

#### DELETE /api/costs/:id
删除成本记录

**响应**:
```json
{
  "success": true
}
```

#### GET /api/costs/summary
获取成本统计

**查询参数**:
- `year` (可选) - 年份，默认为当前年份

**响应**:
```json
{
  "success": true,
  "data": {
    "year": 2026,
    "total": 12990,
    "count": 10,
    "byType": [
      { "costType": "RENEWAL", "total": 9990, "count": 8 },
      { "costType": "REGISTRATION", "total": 3000, "count": 2 }
    ],
    "byMonth": [
      { "month": "01", "total": 1299, "count": 1 },
      { "month": "04", "total": 5996, "count": 5 }
    ],
    "topDomains": [
      { "domainId": 5, "domain": "example.com", "total": 2598, "count": 2 }
    ],
    "byRegistrar": [
      { "registrar": "GoDaddy", "total": 7794, "count": 6 },
      { "registrar": "Namecheap", "total": 5196, "count": 4 }
    ]
  }
}
```

### 2. 金额存储策略

为避免浮点数精度问题，所有金额以"分"（cents）为单位存储：

```typescript
// 输入: $12.99
// 存储: 1299 (cents)

// 显示
const formatCurrency = (cents, currency = 'USD') => {
  const amount = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};
```

### 3. 统计聚合

使用 SQL 聚合函数计算统计数据：

```typescript
// 按类型统计
const byType = await db
  .select({
    costType: domainCosts.costType,
    total: sql<number>`SUM(${domainCosts.amount})`,
    count: sql<number>`COUNT(*)`,
  })
  .from(domainCosts)
  .where(/* date range */)
  .groupBy(domainCosts.costType);

// 按月份统计
const byMonth = await db
  .select({
    month: sql<string>`strftime('%m', ...)`,
    total: sql<number>`SUM(${domainCosts.amount})`,
    count: sql<number>`COUNT(*)`,
  })
  .from(domainCosts)
  .groupBy(sql`strftime('%m', ...)`);
```

## 前端实现

### 1. 成本管理页面 (`pages/costs.vue`)

**功能模块**:

#### 统计卡片
- **总支出** - 当年所有成本总和
- **记录总数** - 当年交易笔数
- **平均每域名** - 平均每个域名支出
- **本月支出** - 当月支出

#### 成本类型分布
- 显示各类型的支出金额和占比
- 彩色标识区分类型
- 横条形图视觉效果

#### 域名支出排行
- Top 10 支出最多的域名
- 显示域名、交易次数和总金额

#### 近期成本表格
- 显示最近 20 条成本记录
- 包含域名、类型、金额、注册商、日期
- 删除操作按钮

### 2. 添加成本模态框 (`components/CostModal.vue`)

**表单字段**:
- **域名** (必填) - 从已有域名中选择
- **类型** (必填) - 5 种成本类型
- **金额** (必填) - 支持小数（自动转换为分）
- **货币** - 7 种主流货币
- **注册商** - 文本输入
- **付款日期** (必填) - 日期选择器
- **服务起始日期** - 可选
- **服务结束日期** - 可选
- **备注** - 文本域

**金额转换**:
```typescript
// 输入: 12.99 (USD)
// 存储: 1299 (cents)
const amountInCents = Math.round(parseFloat(form.value.amount) * 100);
```

### 3. 国际化

**支持的成本类型翻译**:

中文:
- REGISTRATION → 注册
- RENEWAL → 续费
- TRANSFER → 转移
- PRIVACY → 隐私保护
- OTHER → 其他

英文:
- REGISTRATION → Registration
- RENEWAL → Renewal
- TRANSFER → Transfer
- PRIVACY → Privacy Protection
- OTHER → Other

## 使用场景

### 场景 1: 记录域名续费

**步骤**:
1. 访问 `/costs` 页面
2. 点击「添加成本」按钮
3. 选择域名（如 example.com）
4. 选择类型「续费」
5. 输入金额（如 12.99）
6. 选择货币（如 USD）
7. 输入注册商（如 GoDaddy）
8. 选择付款日期
9. 输入服务期间（可选）
10. 添加备注（可选）
11. 保存

### 场景 2: 查看年度支出

**步骤**:
1. 访问 `/costs` 页面
2. 在年份下拉菜单选择年份
3. 查看顶部 4 个统计卡片
4. 浏览成本类型分布
5. 查看域名支出排行
6. 检查近期成本记录

### 场景 3: 分析支出趋势

**功能**:
- **类型分布** - 了解各类成本占比
- **域名排行** - 识别高成本域名
- **月度数据** - 通过 byMonth 数据查看月度趋势
- **注册商对比** - 通过 byRegistrar 分析最佳注册商

### 场景 4: 删除错误记录

**步骤**:
1. 在成本表格中找到错误记录
2. 点击删除按钮
3. 在确认对话框中确认
4. 记录被删除并刷新统计

## 数据展示

### 仪表板预览

```
┌──────────────────────────────────────────────────┐
│ 成本管理                              [2026 ▼] [+] │
├──────────────────────────────────────────────────┤
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐    │
│ │ $129.90│ │   10   │ │ $25.98 │ │ $59.96 │    │
│ │ 总支出 │ │ 记录数 │ │ 均/域名│ │ 本月   │    │
│ └────────┘ └────────┘ └────────┘ └────────┘    │
├──────────────────────────────────────────────────┤
│ 按类型分布                                         │
│ ● 续费       8笔  $99.92    77%                  │
│ ● 注册       2笔  $29.98    23%                  │
├──────────────────────────────────────────────────┤
│ 支出排行                                           │
│ 1. example.com    2x  $25.98                     │
│ 2. test.com       1x  $12.99                     │
└──────────────────────────────────────────────────┘
```

### 颜色编码

**成本类型颜色**:
- REGISTRATION - 蓝色 (#3B82F6)
- RENEWAL - 绿色 (#10B981)
- TRANSFER - 紫色 (#8B5CF6)
- PRIVACY - 黄色 (#F59E0B)
- OTHER - 灰色 (#6B7280)

## 性能优化

### 1. 索引优化

建议添加索引：
```sql
CREATE INDEX idx_costs_domain_id ON domain_costs(domain_id);
CREATE INDEX idx_costs_payment_date ON domain_costs(payment_date);
CREATE INDEX idx_costs_cost_type ON domain_costs(cost_type);
```

### 2. 数据缓存

```typescript
// 使用 useState 缓存成本统计
const summary = useState('cost-summary', () => ({}));
```

### 3. 分页加载

近期成本表格仅显示前 20 条，避免大量数据加载：
```typescript
costs.value.slice(0, 20)
```

## 安全考虑

### 1. 金额验证

```typescript
// 后端验证
if (typeof amount !== "number" || amount < 0) {
  throw createError({
    statusCode: 400,
    message: "Amount must be a non-negative number",
  });
}
```

### 2. 数据完整性

- 使用外键约束确保 `domain_id` 有效
- 删除域名时级联删除成本记录
- 验证成本类型枚举值

### 3. 权限控制

- 成本数据为敏感信息
- 需要认证后才能访问
- 仅管理员可删除记录

## 故障排查

### 问题 1: 金额显示不正确

**原因**: 金额未正确转换为分

**解决**:
```typescript
// 确保转换为分
const amountInCents = Math.round(parseFloat(amount) * 100);

// 显示时除以 100
const display = cents / 100;
```

### 问题 2: 统计数据不一致

**原因**: 时区问题或日期范围错误

**解决**:
```typescript
// 使用明确的日期范围
const startDate = new Date(year, 0, 1);  // 1月1日
const endDate = new Date(year, 11, 31, 23, 59, 59); // 12月31日 23:59:59
```

### 问题 3: 添加成本失败

**原因**: 必填字段缺失或格式错误

**解决**:
- 检查 domainId、costType、amount、paymentDate 是否提供
- 验证 costType 是否为有效值
- 确保 amount 是数字

## 文件清单

### 新增文件
- `server/db/schema.ts` - 添加 `domainCosts` 和 `domainBudgets` 表
- `server/api/costs/index.get.ts` - 获取成本列表
- `server/api/costs/index.post.ts` - 创建成本记录
- `server/api/costs/[id].delete.ts` - 删除成本记录
- `server/api/costs/summary.get.ts` - 获取成本统计
- `pages/costs.vue` - 成本管理页面
- `components/CostModal.vue` - 添加成本模态框

### 修改文件
- `components/AppHeader.vue` - 添加成本管理导航
- `i18n/locales/en-US.json` - 添加英文翻译
- `i18n/locales/zh-CN.json` - 添加中文翻译

## 下一步计划

### 短期优化
1. **预算管理** - 实现 `domainBudgets` 表的功能
2. **预算告警** - 接近预算时发送通知
3. **成本导出** - 导出成本记录为 CSV

### 中期功能
1. **图表可视化** - 使用 Chart.js 显示趋势图
2. **成本预测** - 基于历史数据预测未来支出
3. **比价功能** - 对比不同注册商价格

### 长期规划
1. **自动同步** - 从注册商 API 自动同步成本
2. **税务报表** - 生成年度成本报告
3. **多账户管理** - 支持多个团队/项目分别管理

## 总结

续费成本追踪功能已完整实现，包括：
- ✅ 完整的成本记录管理
- ✅ 多种成本类型支持
- ✅ 多货币支持
- ✅ 详细的统计分析
- ✅ 用户友好的 UI
- ✅ 双语支持
- ✅ 实时数据更新

**v1.1 进度**: 95% → 100% (成本追踪功能完成)

**下一步**: v1.1 全部完成，进入 v1.2 规划

---

*文档版本: 1.0*
*最后更新: 2026-05-03*
*作者: Domain Ops Radar Team*
