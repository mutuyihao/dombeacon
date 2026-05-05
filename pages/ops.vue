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
  // Ensure tab labels react to locale changes.
  locale.value;
  return [
    { to: "/actions", label: t("nav.actions") },
    { to: "/tasks", label: t("nav.tasks") },
  ];
});
</script>
