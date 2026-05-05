<template>
  <div class="min-h-[60vh] flex items-center justify-center px-4">
    <div class="max-w-md w-full bg-card border border-card-border rounded-2xl p-8 shadow-sm text-center space-y-4">
      <div class="mx-auto w-16 h-16 rounded-full bg-card-border/40 flex items-center justify-center">
        <WifiOffIcon class="w-8 h-8 text-text-secondary" />
      </div>
      <h1 class="text-xl font-semibold text-text-main">{{ $t('offline.title') }}</h1>
      <p class="text-sm text-text-secondary leading-relaxed">{{ $t('offline.description') }}</p>
      <div class="flex flex-col sm:flex-row gap-2 justify-center pt-2">
        <button
          @click="retry"
          class="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors"
        >
          {{ $t('offline.retry') }}
        </button>
        <NuxtLink
          to="/"
          class="px-4 py-2 rounded-xl border border-card-border text-text-main text-sm font-medium hover:bg-card-border/30 transition-colors"
        >
          {{ $t('offline.goHome') }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import { WifiOff as WifiOffIcon } from 'lucide-vue-next';

const retry = () => {
  if (import.meta.client) {
    window.location.reload();
  }
};
</script>
