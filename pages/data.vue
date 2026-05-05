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
    { to: "/data/import", label: t("nav.import") },
  ];
});
</script>
