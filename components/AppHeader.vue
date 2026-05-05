<template>
  <header class="sticky top-0 z-50 px-4 pt-4">
    <div class="glass-panel container mx-auto flex h-[4.25rem] max-w-[1180px] items-center justify-between rounded-[1.15rem] px-3.5 sm:px-5">
      <NuxtLink to="/" class="group flex items-center gap-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent/30">
        <div class="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-[0.9rem] bg-accent text-white shadow-[0_18px_34px_-24px_var(--color-accent)]">
          <div class="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.42),transparent_32%)]" />
          <RadarIcon class="relative h-5 w-5" />
        </div>
        <div class="leading-none">
          <p class="font-display text-[1.35rem] font-semibold tracking-[-0.035em] text-text-main">{{ $t('common.appName') }}</p>
          <p class="mt-1 hidden text-[10px] font-bold uppercase tracking-[0.32em] text-text-secondary sm:block">Signal Watch</p>
        </div>
      </NuxtLink>

      <nav class="hidden items-center gap-1 rounded-full bg-background/55 p-1 text-sm font-semibold text-text-secondary lg:flex">
        <NuxtLink
          v-for="item in primaryNav"
          :key="item.to"
          :to="item.to"
          :class="[
            'rounded-full px-3.5 py-1.5 whitespace-nowrap transition-all',
            isNavActive(item)
              ? 'bg-accent/10 text-accent shadow-[inset_0_0_0_1px_rgba(14,107,111,0.12)]'
              : 'hover:bg-card/90 hover:text-text-main',
          ]"
        >
          {{ $t(item.labelKey) }}
        </NuxtLink>

        <div class="relative">
          <button
            type="button"
            :class="[
              'rounded-full px-3.5 py-1.5 whitespace-nowrap transition-all',
              isSecondaryActive
                ? 'bg-accent/10 text-accent shadow-[inset_0_0_0_1px_rgba(14,107,111,0.12)]'
                : 'hover:bg-card/90 hover:text-text-main',
            ]"
            @click="moreOpen = !moreOpen"
          >
            More
          </button>

          <transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="translate-y-1 opacity-0"
            enter-to-class="translate-y-0 opacity-100"
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="translate-y-0 opacity-100"
            leave-to-class="translate-y-1 opacity-0"
          >
            <div
              v-if="moreOpen"
              class="glass-panel absolute right-0 top-full mt-2 w-52 rounded-[1rem] p-2"
            >
              <NuxtLink
                v-for="item in secondaryNav"
                :key="item.to"
                :to="item.to"
                :class="[
                  'block rounded-xl px-3 py-2 text-sm transition-colors',
                  isNavActive(item)
                    ? 'bg-accent/10 text-accent'
                    : 'text-text-secondary hover:bg-background/70 hover:text-text-main',
                ]"
                @click="moreOpen = false"
              >
                {{ $t(item.labelKey) }}
              </NuxtLink>
            </div>
          </transition>
        </div>
      </nav>

      <div class="hidden items-center gap-2 lg:flex">
        <button
          type="button"
          @click="toggleTheme"
          class="flex items-center gap-1.5 rounded-full bg-background/55 px-3 py-2 text-xs font-semibold text-text-secondary hover:bg-card hover:text-text-main"
          :title="$t('settings.themeToggle')"
        >
          <MoonIcon v-if="isDark" class="h-4 w-4" />
          <SunIcon v-else class="h-4 w-4" />
          <span>{{ isDark ? $t('settings.dark') : $t('settings.light') }}</span>
        </button>

        <button
          type="button"
          @click="toggleLocale"
          class="flex items-center gap-1.5 rounded-full bg-background/55 px-3 py-2 text-xs font-semibold text-text-secondary hover:bg-card hover:text-text-main"
          :title="$t('common.switchLanguage')"
        >
          <LanguagesIcon class="h-4 w-4" />
          <span>{{ locale === 'zh' ? 'ZH' : 'EN' }}</span>
        </button>
      </div>

      <button
        type="button"
        class="inline-flex h-10 w-10 items-center justify-center rounded-[0.9rem] bg-background/65 text-text-main transition-colors hover:bg-card lg:hidden"
        :aria-label="mobileOpen ? $t('common.close') : $t('common.menu')"
        :aria-expanded="mobileOpen ? 'true' : 'false'"
        @click="mobileOpen = !mobileOpen"
      >
        <XIcon v-if="mobileOpen" class="h-6 w-6" />
        <MenuIcon v-else class="h-6 w-6" />
      </button>
    </div>
  </header>

  <transition
    enter-active-class="transition duration-150 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-100 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="mobileOpen" class="fixed inset-0 z-[60] lg:hidden">
      <div class="absolute inset-0 bg-background/78 backdrop-blur-md" @click="mobileOpen = false" />

      <div class="absolute left-0 right-0 top-20 px-4 pb-4">
        <div class="glass-panel rounded-[1.35rem] p-4">
          <div class="space-y-1 text-sm font-medium text-text-secondary">
            <NuxtLink
              v-for="item in allNav"
              :key="item.to"
              :to="item.to"
              :class="[
                'block rounded-xl px-3 py-2.5 hover:bg-background/70 hover:text-text-main',
                isNavActive(item) && 'bg-accent/10 text-accent',
              ]"
              @click="mobileOpen = false"
            >
              {{ $t(item.labelKey) }}
            </NuxtLink>
          </div>

          <div class="my-3 h-px bg-card-border/70" />

          <div class="flex items-center justify-between gap-3">
            <button
              type="button"
              class="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-background/55 px-3 py-2 text-text-main hover:bg-card"
              @click="toggleTheme"
            >
              <MoonIcon v-if="isDark" class="h-4 w-4" />
              <SunIcon v-else class="h-4 w-4" />
              <span class="text-xs">{{ isDark ? $t('settings.dark') : $t('settings.light') }}</span>
            </button>

            <button
              type="button"
              class="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-background/55 px-3 py-2 text-text-main hover:bg-card"
              @click="toggleLocale"
            >
              <LanguagesIcon class="h-4 w-4" />
              <span class="text-xs">{{ locale === 'zh' ? 'ZH' : 'EN' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import {
  Languages as LanguagesIcon,
  Menu as MenuIcon,
  Moon as MoonIcon,
  Radar as RadarIcon,
  Sun as SunIcon,
  X as XIcon,
} from 'lucide-vue-next';

const route = useRoute();
const { locale, setLocale } = useI18n();
const { resolved, toggle: toggleTheme } = useTheme();
const isDark = computed(() => resolved.value === 'dark');

const primaryNav = [
  { to: '/', labelKey: 'nav.dashboard' },
  { to: '/domains', labelKey: 'nav.domains' },
  { to: '/actions', labelKey: 'nav.actions', aliases: ['/ops/actions'] },
  { to: '/ssl', labelKey: 'nav.ssl' },
];

const secondaryNav = [
  { to: '/costs', labelKey: 'nav.costs', aliases: ['/data/costs'] },
  { to: '/notifications', labelKey: 'nav.notifications' },
  { to: '/settings', labelKey: 'nav.settings', aliases: ['/data/import', '/tasks', '/ops/tasks'] },
];

const allNav = computed(() => [...primaryNav, ...secondaryNav]);

const isNavActive = (item) => {
  const paths = [item.to, ...(item.aliases || [])];
  return paths.some((path) =>
    path === '/'
      ? route.path === '/'
      : route.path === path || route.path.startsWith(`${path}/`),
  );
};

const isSecondaryActive = computed(() => secondaryNav.some((item) => isNavActive(item)));
const mobileOpen = ref(false);
const moreOpen = ref(false);

watch(
  () => route.fullPath,
  () => {
    mobileOpen.value = false;
    moreOpen.value = false;
  },
);

const toggleLocale = () => {
  const newLocale = locale.value === 'zh' ? 'en' : 'zh';
  setLocale(newLocale);
};
</script>
