<template>
  <nav class="flex p-1 bg-card border border-card-border rounded-xl overflow-x-auto max-w-full">
    <NuxtLink
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      :class="[
        'px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
        isActive(tab)
          ? 'bg-background text-text-main shadow-sm'
          : 'text-text-secondary hover:text-text-main',
      ]"
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
