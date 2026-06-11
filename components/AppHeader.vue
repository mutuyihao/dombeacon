<template>
  <header
    :class="[
      'sticky top-0 z-50 transition-all duration-300',
      scrolled
        ? 'bg-card/80 backdrop-blur-xl shadow-[0_1px_0_var(--hairline)]'
        : 'bg-background',
    ]"
  >
    <div class="mx-auto flex h-16 max-w-310 items-center justify-between px-6 md:px-10 lg:px-14">
      <!-- Logo -->
      <NuxtLink to="/" class="group flex items-center gap-3">
        <div class="relative flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white shadow-[0_2px_8px_-2px_rgba(79,70,229,0.3)] transition-shadow duration-200 group-hover:shadow-[0_4px_16px_-4px_rgba(79,70,229,0.4)]">
          <RadarIcon class="h-[18px] w-[18px]" />
        </div>
        <div class="flex items-baseline gap-3 leading-none">
          <p class="font-sans text-[1.15rem] font-bold tracking-tight text-text-main">
            {{ $t('common.appName') }}
          </p>
          <p v-if="locale === 'en'" class="hidden text-[10px] font-semibold uppercase tracking-[0.22em] text-text-tertiary md:block">
            Signal Watch
          </p>
        </div>
      </NuxtLink>

      <!-- Desktop nav -->
      <nav class="hidden items-center gap-1 lg:flex">
        <NuxtLink
          v-for="item in primaryNav"
          :key="item.to"
          :to="item.to"
          :class="[
            'relative rounded-lg px-3.5 py-2 text-[13px] font-medium transition-all duration-200',
            isNavActive(item)
              ? 'text-accent bg-accent-glow'
              : 'text-text-secondary hover:text-text-main hover:bg-surface-sunken',
          ]"
        >
          {{ getNavLabel(item) }}
        </NuxtLink>

        <div ref="moreRoot" class="relative">
          <button
            type="button"
            :class="[
              'relative rounded-lg px-3.5 py-2 text-[13px] font-medium transition-all duration-200',
              isSecondaryActive
                ? 'text-accent bg-accent-glow'
                : 'text-text-secondary hover:text-text-main hover:bg-surface-sunken',
            ]"
            @click="moreOpen = !moreOpen"
          >
            {{ $t('nav.more') }}
            <ChevronDownIcon :class="['ml-1 inline-block h-3.5 w-3.5 transition-transform duration-200', moreOpen && 'rotate-180']" />
          </button>

          <transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="-translate-y-2 scale-95 opacity-0"
            enter-to-class="translate-y-0 scale-100 opacity-100"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="translate-y-0 scale-100 opacity-100"
            leave-to-class="-translate-y-2 scale-95 opacity-0"
          >
            <div
              v-if="moreOpen"
              class="surface-elevated absolute right-0 top-full mt-2 w-56 overflow-hidden p-1.5"
            >
              <NuxtLink
                v-for="item in secondaryNav"
                :key="item.to"
                :to="item.to"
                :class="[
                  'block rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150',
                  isNavActive(item)
                    ? 'text-accent bg-accent-glow'
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

      <!-- Actions -->
      <div class="hidden items-center gap-0.5 lg:flex">
        <button
          type="button"
          @click="toggleTheme"
          class="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-all duration-200 hover:bg-surface-sunken hover:text-text-main"
          :title="$t('settings.themeToggle')"
        >
          <MoonIcon v-if="isDark" class="h-4 w-4" />
          <SunIcon v-else class="h-4 w-4" />
        </button>
        <button
          type="button"
          @click="toggleLocale"
          class="flex h-9 w-9 items-center justify-center rounded-lg text-[11px] font-bold tracking-wider text-text-secondary transition-all duration-200 hover:bg-surface-sunken hover:text-text-main"
          :title="$t('common.switchLanguage')"
        >
          {{ locale === 'zh' ? 'ZH' : 'EN' }}
        </button>
      </div>

      <!-- Mobile toggle -->
      <button
        type="button"
        class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-main transition-colors hover:bg-surface-sunken lg:hidden"
        :aria-label="mobileOpen ? $t('common.close') : $t('common.menu')"
        :aria-expanded="mobileOpen ? 'true' : 'false'"
        @click="mobileOpen = !mobileOpen"
      >
        <XIcon v-if="mobileOpen" class="h-5 w-5" />
        <MenuIcon v-else class="h-5 w-5" />
      </button>
    </div>
  </header>

  <!-- Mobile overlay -->
  <transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="mobileOpen" class="fixed inset-0 z-60 lg:hidden">
      <div class="absolute inset-0 bg-background/80 backdrop-blur-md" @click="mobileOpen = false" />

      <div class="absolute left-0 right-0 top-16 px-4">
        <div class="surface-elevated p-2">
          <div class="space-y-0.5">
            <NuxtLink
              v-for="item in allNav"
              :key="item.to"
              :to="item.to"
              :class="[
                'block rounded-lg px-3.5 py-3 text-sm font-medium transition-all duration-150',
                isNavActive(item)
                  ? 'text-accent bg-accent-glow'
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
              class="flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-text-main transition-colors hover:bg-surface-sunken"
              @click="toggleTheme"
            >
              <MoonIcon v-if="isDark" class="h-4 w-4" />
              <SunIcon v-else class="h-4 w-4" />
              <span class="text-xs">{{ isDark ? $t('settings.dark') : $t('settings.light') }}</span>
            </button>
            <button
              type="button"
              class="flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-text-main transition-colors hover:bg-surface-sunken"
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
  ChevronDown as ChevronDownIcon,
  Languages as LanguagesIcon,
  Menu as MenuIcon,
  Moon as MoonIcon,
  Radar as RadarIcon,
  Sun as SunIcon,
  X as XIcon,
} from '@lucide/vue';

const route = useRoute();
const { locale, setLocale, t } = useI18n();
const { resolved, toggle: toggleTheme } = useTheme();
const isDark = computed(() => resolved.value === 'dark');

const primaryNav = [
  { to: '/', labelKey: 'nav.dashboard' },
  { to: '/domains', labelKey: 'nav.domains' },
  { to: '/risk', labelKey: 'nav.risk' },
  { to: '/actions', labelKey: 'nav.actions' },
  { to: '/ssl', labelKey: 'nav.ssl' },
];

const secondaryNav = [
  { to: '/costs', labelKey: 'nav.costs' },
  { to: '/notifications', labelKey: 'nav.notifications' },
  { to: '/tasks', labelKey: 'nav.tasks' },
  { to: '/import', labelKey: 'nav.import' },
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
