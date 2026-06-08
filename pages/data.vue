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
    { to: "/data/import", label: t("nav.import") },
    { to: "/data/costs", label: t("nav.costs") },
  ];
});
</script>
