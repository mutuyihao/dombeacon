<template>
  <nav class="tab-bar overflow-x-auto no-scrollbar">
    <NuxtLink
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      :class="['tab-item', isActive(tab) && 'is-active']"
    >
      {{ tab.label }}
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
type Tab = {
  to: string;
  label: string;
  exact?: boolean;
};

const props = defineProps<{
  tabs: Tab[];
}>();

const route = useRoute();

const isActive = (tab: Tab) => {
  if (tab.exact) return route.path === tab.to;
  return route.path === tab.to || route.path.startsWith(`${tab.to}/`);
};
</script>
