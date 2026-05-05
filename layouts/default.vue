<template>
  <div class="relative flex min-h-screen flex-col overflow-x-hidden font-sans text-text-main selection:bg-accent selection:text-white">
    <div aria-hidden="true" class="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background">
      <div class="absolute inset-0 bg-app-grid opacity-45" />
      <div class="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,rgba(255,254,250,0.82),transparent_64%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(83,199,188,0.12),transparent_60%)]" />
      <div class="absolute -top-40 left-1/2 h-80 w-[42rem] -translate-x-1/2 rounded-full bg-[var(--app-aura-primary)] blur-3xl" />
      <div class="absolute bottom-[-8rem] left-[-10rem] h-72 w-72 rounded-full bg-[var(--app-aura-secondary)] blur-3xl" />
    </div>
    <AppHeader />
    <main class="container relative z-10 mx-auto max-w-[1180px] flex-1 px-5 py-7 md:px-8 md:py-10">
      <slot />
    </main>
    <footer class="relative z-10 py-7 text-center text-xs font-medium tracking-wide text-text-weak">
      {{ $t('common.appName') }} &copy; {{ new Date().getFullYear() }}
    </footer>
    <Toast />
  </div>
</template>
