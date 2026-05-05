<template>
  <div class="space-y-6">
    <div>
      <SubNavTabs :tabs="tabs" />
    </div>
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
const { t, locale } = useI18n();

const tabs = computed(() => {
  locale.value;
  return [
    { to: "/notifications", label: t("nav.notifications"), exact: true },
    { to: "/notifications/webhooks", label: t("nav.webhooks") },
    { to: "/notifications/serverchan", label: t("nav.serverchan") },
  ];
});
</script>
