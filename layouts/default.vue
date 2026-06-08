<template>
  <div class="relative flex h-screen min-h-screen flex-col overflow-hidden bg-background text-text-main selection:bg-accent selection:text-white">
    <AppHeader />
    <main
      ref="mainEl"
      data-app-scroll
      class="container relative mx-auto flex min-h-0 w-full max-w-310 flex-1 flex-col overflow-y-auto px-6 py-12 md:px-10 md:py-16 lg:px-14"
    >
      <slot />
    </main>
    <footer class="mx-auto w-full max-w-310 shrink-0 px-6 md:px-10 lg:px-14">
      <div class="hairline mb-6" />
      <p class="pb-10 text-center text-xs font-medium tracking-wide text-text-tertiary">
        {{ $t('common.appName') }} &copy; {{ new Date().getFullYear() }}
      </p>
    </footer>
    <Toast />
  </div>
</template>

<script setup>
const route = useRoute();
const mainEl = ref(null);

watch(
  () => route.fullPath,
  () => {
    requestAnimationFrame(() => {
      mainEl.value?.scrollTo({ top: 0 });
    });
  },
);
</script>
