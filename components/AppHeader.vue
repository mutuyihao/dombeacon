<template>
  <header
    :class="[
      'sticky top-0 z-50 transition-colors duration-200',
      scrolled ? 'bg-background/85 backdrop-blur-md' : 'bg-background',
    ]"
  >
    <div class="mx-auto flex h-14 max-w-310 items-center justify-between px-6 md:px-10 lg:px-14">
      <NuxtLink to="/" class="group flex items-center gap-3">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
          <RadarIcon class="h-4 w-4" />
        </div>
        <div class="flex items-baseline gap-3 leading-none">
          <p class="font-display text-[1.125rem] font-medium tracking-[-0.025em] text-text-main">
            {{ $t('common.appName') }}
          </p>
          <p v-if="locale === 'en'" class="hidden text-[10px] font-semibold uppercase tracking-[0.22em] text-text-tertiary md:block">
            Signal Watch
          </p>
        </div>
      </NuxtLink>

      <nav class="hidden items-center gap-8 lg:flex">
        <NuxtLink
          v-for="item in primaryNav"
          :key="item.to"
          :to="item.to"
          :class="[
            'relative py-2 text-sm font-medium transition-colors',
            isNavActive(item)
              ? 'text-text-main'
              : 'text-text-secondary hover:text-text-main',
          ]"
        >
          {{ getNavLabel(item) }}
          <span
            v-if="isNavActive(item)"
            class="absolute -bottom-px left-0 right-0 h-0.5 bg-accent"
          />
        </NuxtLink>

        <div ref="moreRoot" class="relative">
          <button
            type="button"
            :class="[
              'relative py-2 text-sm font-medium transition-colors',
              isSecondaryActive ? 'text-text-main' : 'text-text-secondary hover:text-text-main',
            ]"
            @click="moreOpen = !moreOpen"
          >
            {{ $t('nav.more') }}
            <span
              v-if="isSecondaryActive"
              class="absolute -bottom-px left-0 right-0 h-0.5 bg-accent"
            />
          </button>

          <transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="-translate-y-1 opacity-0"
            enter-to-class="translate-y-0 opacity-100"
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="translate-y-0 opacity-100"
            leave-to-class="-translate-y-1 opacity-0"
          >
            <div
              v-if="moreOpen"
              class="surface absolute right-0 top-full mt-3 w-56 p-2"
            >
              <NuxtLink
                v-for="item in secondaryNav"
                :key="item.to"
                :to="item.to"
                :class="[
                  'block rounded-lg px-3 py-2 text-sm transition-colors',
                  isNavActive(item)
                    ? 'text-accent'
                    : 'text-text-secondary hover:bg-surface-sunken hover:text-text-main',
                ]"
                @click="moreOpen = false"
              >
                {{ getNavLabel(item) }}
              </NuxtLink>
            </div>
          </transition>
        </div>
      </nav>

      <div class="hidden items-center gap-1 lg:flex">
        <button
          type="button"
          @click="toggleTheme"
          class="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-sunken hover:text-text-main"
          :title="$t('settings.themeToggle')"
        >
          <MoonIcon v-if="isDark" class="h-4 w-4" />
          <SunIcon v-else class="h-4 w-4" />
        </button>
        <button
          type="button"
          @click="toggleLocale"
          class="flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-semibold tracking-wider text-text-secondary transition-colors hover:bg-surface-sunken hover:text-text-main"
          :title="$t('common.switchLanguage')"
        >
          {{ locale === 'zh' ? 'ZH' : 'EN' }}
        </button>
      </div>

      <button
        type="button"
        class="inline-flex h-9 w-9 items-center justify-center rounded-full text-text-main transition-colors hover:bg-surface-sunken lg:hidden"
        :aria-label="mobileOpen ? $t('common.close') : $t('common.menu')"
        :aria-expanded="mobileOpen ? 'true' : 'false'"
        @click="mobileOpen = !mobileOpen"
      >
        <XIcon v-if="mobileOpen" class="h-5 w-5" />
        <MenuIcon v-else class="h-5 w-5" />
      </button>
    </div>

    <div v-if="scrolled" class="hairline" />
  </header>

  <transition
    enter-active-class="transition duration-150 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-100 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="mobileOpen" class="fixed inset-0 z-60 lg:hidden">
      <div class="absolute inset-0 bg-background/85 backdrop-blur-sm" @click="mobileOpen = false" />

      <div class="absolute left-0 right-0 top-14 px-6">
        <div class="surface mt-3 p-2">
          <div class="space-y-0.5">
            <NuxtLink
              v-for="item in allNav"
              :key="item.to"
              :to="item.to"
              :class="[
                'block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isNavActive(item)
                  ? 'text-accent'
                  : 'text-text-secondary hover:bg-surface-sunken hover:text-text-main',
              ]"
              @click="mobileOpen = false"
            >
              {{ getNavLabel(item) }}
            </NuxtLink>
          </div>
          <div class="hairline my-2" />
          <div class="flex items-center gap-1 px-1">
            <button
              type="button"
              class="flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-text-main transition-colors hover:bg-surface-sunken"
              @click="toggleTheme"
            >
              <MoonIcon v-if="isDark" class="h-4 w-4" />
              <SunIcon v-else class="h-4 w-4" />
              <span class="text-xs">{{ isDark ? $t('settings.dark') : $t('settings.light') }}</span>
            </button>
            <button
              type="button"
              class="flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-text-main transition-colors hover:bg-surface-sunken"
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
const { locale, setLocale, t } = useI18n();
const { resolved, toggle: toggleTheme } = useTheme();
const isDark = computed(() => resolved.value === 'dark');

const primaryNav = [
  { to: '/', labelKey: 'nav.dashboard' },
  { to: '/domains', labelKey: 'nav.domains' },
  { to: '/brand-watch', label: 'Brand Watch' },
  { to: '/ops/security', label: 'Risk' },
  { to: '/ops/actions', labelKey: 'nav.actions', aliases: ['/actions'] },
  { to: '/ssl', labelKey: 'nav.ssl' },
];

const secondaryNav = [
  { to: '/data/costs', labelKey: 'nav.costs', aliases: ['/costs'] },
  { to: '/notifications', labelKey: 'nav.notifications' },
  { to: '/ops/tasks', labelKey: 'nav.tasks', aliases: ['/tasks'] },
  { to: '/data/import', labelKey: 'nav.import', aliases: ['/import'] },
  { to: '/settings', labelKey: 'nav.settings' },
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
const moreRoot = ref(null);
const scrolled = ref(false);
let scrollTarget = null;

const getNavLabel = (item) => item.label || t(item.labelKey);

const handleScroll = () => {
  scrolled.value = (scrollTarget?.scrollTop ?? window.scrollY) > 4;
};

const handleDocumentClick = (event) => {
  if (!moreOpen.value) return;
  if (moreRoot.value?.contains(event.target)) return;
  moreOpen.value = false;
};

const handleKeydown = (event) => {
  if (event.key === 'Escape') {
    moreOpen.value = false;
    mobileOpen.value = false;
  }
};

onMounted(() => {
  scrollTarget = document.querySelector('[data-app-scroll]');
  (scrollTarget || window).addEventListener('scroll', handleScroll, { passive: true });
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('keydown', handleKeydown);
  handleScroll();
});

onBeforeUnmount(() => {
  (scrollTarget || window).removeEventListener('scroll', handleScroll);
  document.removeEventListener('click', handleDocumentClick);
  document.removeEventListener('keydown', handleKeydown);
  scrollTarget = null;
});

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
