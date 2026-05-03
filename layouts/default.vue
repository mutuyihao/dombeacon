<template>
  <div class="min-h-screen bg-background text-text-main font-sans selection:bg-accent selection:text-white flex flex-col">
    <AppHeader />
    <main class="flex-1 container mx-auto px-4 py-6 max-w-7xl">
      <slot />
    </main>
    <footer class="text-center py-6 text-text-weak text-sm">
      Domain Ops Radar &copy; {{ new Date().getFullYear() }}
    </footer>
    <Toast />
  </div>
</template>
