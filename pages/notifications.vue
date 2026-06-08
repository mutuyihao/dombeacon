<template>
  <div class="flex min-h-full flex-col gap-6 md:h-full md:min-h-0 md:overflow-hidden">
    <div class="shrink-0">
      <SubNavTabs :tabs="tabs" />
    </div>
    <div class="min-h-0 flex-1">
      <NuxtPage />
    </div>
  </div>
</template>

<script setup lang="ts">
const { t, locale } = useI18n();

const tabs = computed(() => {
  locale.value;
  return [
    { to: "/notifications", label: t("nav.notifications"), exact: true },
    { to: "/notifications/channels", label: t("settings.entryChannelsTitle") },
    { to: "/notifications/webhooks", label: t("nav.webhooks") },
    { to: "/notifications/serverchan", label: t("nav.serverchan") },
  ];
});
</script>
