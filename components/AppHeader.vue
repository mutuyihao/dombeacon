<template>
  <header class="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-card-border">
    <div class="container mx-auto px-4 h-16 flex items-center justify-between max-w-7xl">
      <div class="flex items-center gap-2">
        <!-- Logo Icon -->
        <div class="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white">
          <GlobeIcon class="w-5 h-5" />
        </div>
        <h1 class="text-lg font-semibold tracking-tight">Domain Watchlist</h1>
      </div>

      <nav class="hidden md:flex items-center gap-6 text-sm font-medium text-text-secondary">
        <NuxtLink to="/domains" active-class="text-accent" class="hover:text-text-main transition-colors">Domains</NuxtLink>
        <NuxtLink to="/tasks" active-class="text-accent" class="hover:text-text-main transition-colors">Tasks</NuxtLink>
        <NuxtLink to="/settings" active-class="text-accent" class="hover:text-text-main transition-colors">Settings</NuxtLink>
      </nav>

      <!-- Mobile Menu Button (Stub) -->
      <button class="md:hidden text-text-main">
        <MenuIcon class="w-6 h-6" />
      </button>
    </div>
  </header>
</template>

<script setup>
import { Globe as GlobeIcon, Menu as MenuIcon } from 'lucide-vue-next';
</script>
