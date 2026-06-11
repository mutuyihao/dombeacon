<template>
  <div class="flex min-h-[60vh] items-center justify-center px-4">
    <div class="w-full max-w-md space-y-6 text-center">
      <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-sunken">
        <WifiOffIcon class="h-5 w-5 text-text-secondary" />
      </div>
      <p class="eyebrow">Connection lost</p>
      <h1 class="headline-display text-3xl">{{ $t('offline.title') }}</h1>
      <p class="text-sm leading-relaxed text-text-secondary">{{ $t('offline.description') }}</p>
      <div class="flex flex-col items-center justify-center gap-3 pt-4 sm:flex-row">
        <button @click="retry" class="btn-primary">
          {{ $t('offline.retry') }}
        </button>
        <NuxtLink to="/" class="btn-ghost">
          {{ $t('offline.goHome') }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import { WifiOff as WifiOffIcon } from '@lucide/vue';

const retry = () => {
  if (import.meta.client) {
    window.location.reload();
  }
};
</script>
