<template>
  <header class="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-card-border">
    <div class="container mx-auto px-4 h-16 flex items-center justify-between max-w-7xl">
      <div class="flex items-center gap-2">
        <!-- Logo Icon -->
        <div class="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white">
          <RadarIcon class="w-5 h-5" />
        </div>
        <h1 class="text-lg font-semibold tracking-tight">{{ $t('common.appName') }}</h1>
      </div>

      <nav class="hidden md:flex items-center gap-6 text-sm font-medium text-text-secondary">
        <NuxtLink to="/domains" active-class="text-accent" class="hover:text-text-main transition-colors">
          {{ $t('nav.domains') }}
        </NuxtLink>
        <NuxtLink to="/actions" active-class="text-accent" class="hover:text-text-main transition-colors">
          {{ $t('nav.actions') }}
        </NuxtLink>
        <NuxtLink to="/tasks" active-class="text-accent" class="hover:text-text-main transition-colors">
          {{ $t('nav.tasks') }}
        </NuxtLink>
        <NuxtLink to="/webhooks" active-class="text-accent" class="hover:text-text-main transition-colors">
          {{ $t('nav.webhooks') }}
        </NuxtLink>
        <NuxtLink to="/settings" active-class="text-accent" class="hover:text-text-main transition-colors">
          {{ $t('nav.settings') }}
        </NuxtLink>

        <!-- Language Switcher -->
        <button
          @click="toggleLocale"
          class="flex items-center gap-1 px-2 py-1 rounded hover:bg-card-border/50 transition-colors"
          :title="$t('common.switchLanguage')"
        >
          <LanguagesIcon class="w-4 h-4" />
          <span class="text-xs">{{ locale === 'zh' ? '中' : 'EN' }}</span>
        </button>
      </nav>

      <!-- Mobile Menu Button (Stub) -->
      <button class="md:hidden text-text-main">
        <MenuIcon class="w-6 h-6" />
      </button>
    </div>
  </header>
</template>

<script setup>
import { Radar as RadarIcon, Menu as MenuIcon, Languages as LanguagesIcon } from 'lucide-vue-next';

const { locale, setLocale } = useI18n();

const toggleLocale = () => {
  const newLocale = locale.value === 'zh' ? 'en' : 'zh';
  setLocale(newLocale);
};
</script>
