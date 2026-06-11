<template>
  <div class="flex min-h-full flex-col gap-6 pb-2">
    <div class="shrink-0">
      <SubNavTabs :tabs="tabs" />
    </div>
    <div class="flex-1">
      <NuxtPage />
    </div>
  </div>
</template>

<script setup lang="ts">
const { t, locale } = useI18n();

const tabs = computed(() => {
  // Ensure tab labels react to locale changes.
  locale.value;
  return [
    { to: "/risk", label: t("nav.riskOverview"), exact: true },
    { to: "/risk/findings", label: t("nav.findings") },
  ];
});
</script>
