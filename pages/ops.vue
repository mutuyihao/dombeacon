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
  // Ensure tab labels react to locale changes.
  locale.value;
  return [
    { to: "/ops/security", label: "Risk", exact: true },
    { to: "/ops/findings", label: "Findings" },
    { to: "/ops/actions", label: t("nav.actions") },
    { to: "/ops/tasks", label: t("nav.tasks") },
  ];
});
</script>
