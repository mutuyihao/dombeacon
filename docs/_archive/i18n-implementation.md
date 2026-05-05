# i18n Implementation Guide / 国际化实现指南

## Overview / 概述

DomBeacon (域灯) now supports full bilingual interface (Chinese & English) using @nuxtjs/i18n module.

DomBeacon（域灯）现已支持完整的中英文双语界面，使用 @nuxtjs/i18n 模块实现。

## Features / 功能特性

### Supported Languages / 支持的语言

- **Chinese (Simplified)** - 中文（简体）- `zh-CN`
- **English (US)** - 英语（美国）- `en-US`

### Default Language / 默认语言

- **Default**: Chinese (zh-CN)
- **默认**：中文

### Language Switching / 语言切换

- Click the language button in the header (中/EN)
- 点击页面顶部的语言按钮（中/EN）
- Language preference is saved in a cookie
- 语言偏好保存在 Cookie 中

## Technical Implementation / 技术实现

### Module Configuration / 模块配置

**File**: `nuxt.config.ts`

```typescript
i18n: {
  locales: [
    { code: "en", iso: "en-US", file: "en-US.json", name: "English" },
    { code: "zh", iso: "zh-CN", file: "zh-CN.json", name: "中文" },
  ],
  lazy: true,
  langDir: "locales",
  defaultLocale: "zh",
  strategy: "no_prefix",
  detectBrowserLanguage: {
    useCookie: true,
    cookieKey: "i18n_redirected",
    redirectOn: "root",
  },
}
```

### Translation Files / 翻译文件

**Location**: `i18n/locales/`

- `i18n/locales/zh-CN.json` - Chinese translations
- `i18n/locales/en-US.json` - English translations

**Note**: The @nuxtjs/i18n module automatically prepends `i18n/` to the `langDir` path.

**注意**：@nuxtjs/i18n 模块会自动在 `langDir` 路径前添加 `i18n/` 前缀。

### Translation Structure / 翻译结构

```json
{
  "common": {
    "appName": "域名运维雷达",
    "loading": "加载中...",
    "save": "保存",
    ...
  },
  "nav": {
    "domains": "域名",
    "actions": "行动队列",
    ...
  },
  "domain": {
    "addDomain": "添加域名",
    "status": {
      "available": "可注册",
      "registered": "已注册",
      ...
    },
    ...
  },
  ...
}
```

### Usage in Components / 组件中的使用

#### Template / 模板

```vue
<template>
  <h1>{{ $t('common.appName') }}</h1>
  <button>{{ $t('domain.addDomain') }}</button>
  <span>{{ $t('domain.status.available') }}</span>
</template>
```

#### Script / 脚本

```vue
<script setup>
const { t, locale, setLocale } = useI18n();

// Use translation
const message = t('common.loading');

// Get current locale
console.log(locale.value); // 'zh' or 'en'

// Switch locale
const toggleLocale = () => {
  const newLocale = locale.value === 'zh' ? 'en' : 'zh';
  setLocale(newLocale);
};
</script>
```

## Translated Components / 已翻译的组件

### Core Components / 核心组件

- ✅ `AppHeader.vue` - Navigation and language switcher
- ✅ `AddDomainModal.vue` - Domain creation form
- ✅ `DomainCard.vue` - Domain display card

### Pages / 页面

- ✅ `pages/domains/index.vue` - Domain list page
- ✅ `pages/actions.vue` - Action queue page
- ✅ `pages/login.vue` - Login page

### Styling / 样式

- ✅ `assets/css/main.css` - Bilingual CSS comments

## Translation Coverage / 翻译覆盖范围

### Common Terms / 通用术语
- App name, buttons, status, priority
- Navigation menu items
- Form labels and placeholders

### Domain Management / 域名管理
- Domain operations (add, edit, delete)
- Status types (available, registered, expiring, etc.)
- Priority levels (high, medium, low)
- Watch types (owned, wanted)

### Action Queue / 行动队列
- Action types (available, dropping, expiring, scan failed)
- Action status (open, snoozed, dismissed, resolved)
- Action operations (snooze, dismiss, resolve)

### Authentication / 认证
- Login form
- Password validation
- Error messages

## Docker Build / Docker 构建

The i18n configuration works correctly in Docker environments:

i18n 配置在 Docker 环境中正常工作：

```bash
# Build
docker-compose build

# Run
docker-compose up -d

# Access
http://localhost:8080
```

## Adding New Translations / 添加新翻译

### 1. Add to Translation Files / 添加到翻译文件

**zh-CN.json**:
```json
{
  "mySection": {
    "myKey": "我的翻译"
  }
}
```

**en-US.json**:
```json
{
  "mySection": {
    "myKey": "My Translation"
  }
}
```

### 2. Use in Component / 在组件中使用

```vue
<template>
  <div>{{ $t('mySection.myKey') }}</div>
</template>
```

## Best Practices / 最佳实践

### 1. Organize by Feature / 按功能组织

Group related translations under the same section:

将相关翻译归类到同一部分：

```json
{
  "domain": {
    "addDomain": "...",
    "editDomain": "...",
    "deleteDomain": "..."
  }
}
```

### 2. Use Nested Objects / 使用嵌套对象

For related items like status types:

对于相关项目如状态类型：

```json
{
  "domain": {
    "status": {
      "available": "...",
      "registered": "..."
    }
  }
}
```

### 3. Avoid Duplicate Keys / 避免重复键

Each key should appear only once in the same object:

每个键在同一对象中只能出现一次：

```json
// ❌ Wrong
{
  "status": { "available": "..." },
  "status": { "expiring": "..." }
}

// ✅ Correct
{
  "status": {
    "available": "...",
    "expiring": "..."
  }
}
```

### 4. Keep Keys Consistent / 保持键名一致

Use the same key structure across all language files:

在所有语言文件中使用相同的键结构：

```json
// Both zh-CN.json and en-US.json should have:
{
  "common": {
    "save": "..."
  }
}
```

## Troubleshooting / 故障排除

### Build Error: ENOENT locales file / 构建错误：找不到翻译文件

**Problem**: `ENOENT: no such file or directory, open '.../i18n/locales/en-US.json'`

**Solution**: Ensure translation files are in `i18n/locales/` directory, not just `locales/`.

**解决方案**：确保翻译文件在 `i18n/locales/` 目录中，而不是仅在 `locales/` 中。

### Duplicate Key Warning / 重复键警告

**Problem**: `Duplicate key "status" in object literal`

**Solution**: Merge duplicate keys into a single object.

**解决方案**：将重复的键合并到单个对象中。

### Translation Not Showing / 翻译未显示

**Problem**: Text shows as key instead of translation (e.g., "common.save")

**Solution**: 
1. Check if the key exists in translation files
2. Verify the key path is correct
3. Clear Nuxt cache: `rm -rf .nuxt .output`

**解决方案**：
1. 检查翻译文件中是否存在该键
2. 验证键路径是否正确
3. 清除 Nuxt 缓存：`rm -rf .nuxt .output`

## Future Enhancements / 未来增强

- [ ] Add more languages (Japanese, Korean, etc.)
- [ ] Implement language detection based on browser settings
- [ ] Add language-specific date/time formatting
- [ ] Support RTL languages (Arabic, Hebrew)
- [ ] Add translation management UI

## References / 参考资料

- [@nuxtjs/i18n Documentation](https://i18n.nuxtjs.org/)
- [Vue I18n Documentation](https://vue-i18n.intlify.dev/)
- [Nuxt 3 Documentation](https://nuxt.com/)
