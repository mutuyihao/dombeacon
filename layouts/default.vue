<template>
  <div :class="shellClass">
    <AppHeader />
    <main
      ref="mainEl"
      data-app-scroll
      :class="mainClass"
    >
      <slot />
    </main>
    <footer class="mx-auto w-full max-w-310 shrink-0 px-6 md:px-10 lg:px-14">
      <div class="hairline mb-6" />
      <p class="pb-8 text-center text-xs font-medium tracking-wide text-text-tertiary">
        {{ $t('common.appName') }} &copy; {{ new Date().getFullYear() }}
      </p>
    </footer>
    <Toast />
  </div>
</template>

<script setup>
const route = useRoute();
const mainEl = ref(null);
const documentScrollRoutes = new Set(['/']);
const usesDocumentScroll = computed(() => documentScrollRoutes.has(route.path));

const shellClass = computed(() => [
  'relative flex min-h-screen flex-col bg-background text-text-main selection:bg-accent/20 selection:text-accent',
  usesDocumentScroll.value ? '' : 'h-screen overflow-hidden',
]);

const mainClass = computed(() => [
  'container relative mx-auto flex w-full max-w-310 flex-col px-6 py-10 md:px-10 md:py-14 lg:px-14',
  usesDocumentScroll.value ? 'flex-none' : 'min-h-0 flex-1 overflow-y-auto',
]);

watch(
  () => route.fullPath,
  () => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0 });
      if (!usesDocumentScroll.value) {
        mainEl.value?.scrollTo({ top: 0 });
      }
    });
  },
);
</script>
