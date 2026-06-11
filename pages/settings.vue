<template>
  <div class="mx-auto max-w-5xl space-y-12 pb-2 md:space-y-14">

    <!-- ─── HERO ─────────────────────────────────────────────────────── -->
    <header>
      <p class="eyebrow mb-2">Configuration</p>
      <h1 class="headline-display text-3xl md:text-4xl">{{ $t('settings.title') }}</h1>
      <p class="mt-2 max-w-2xl text-sm text-text-secondary">{{ $t('settings.description') }}</p>
    </header>

    <!-- ─── ENTRY GRID — minimal hairline-divided cards ────────────── -->
    <section>
      <p class="eyebrow mb-5">Quick links</p>
      <div class="grid grid-cols-1 gap-px overflow-hidden rounded-2xl bg-hairline shadow-soft md:grid-cols-2 xl:grid-cols-4">
        <NuxtLink
          v-for="entry in settingsEntries"
          :key="entry.to"
          :to="entry.to"
          class="group flex flex-col bg-card p-5 transition-colors hover:bg-surface-sunken"
        >
          <div class="flex items-start justify-between">
            <component :is="entry.icon" :class="['h-5 w-5', entry.color]" />
            <ArrowRightIcon class="h-4 w-4 text-text-tertiary transition-transform group-hover:translate-x-0.5" />
          </div>
          <h2 class="font-sans mt-5 text-lg font-bold tracking-tight text-text-main">{{ entry.title }}</h2>
          <p class="mt-2 text-xs leading-5 text-text-secondary">{{ entry.description }}</p>
        </NuxtLink>
      </div>
    </section>

    <!-- ─── APPEARANCE ──────────────────────────────────────────────── -->
    <section>
      <p class="eyebrow mb-3">Appearance</p>
      <h2 class="headline-display text-2xl">{{ $t('settings.appearance') }}</h2>
      <div class="hairline mt-6" />

      <div class="grid grid-cols-1 gap-8 pt-6 md:grid-cols-2">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('settings.theme') }}</p>
          <div class="mt-4 inline-flex rounded-full bg-surface-sunken p-1">
            <button
              v-for="opt in ['system', 'light', 'dark']"
              :key="opt"
              type="button"
              @click="setThemeMode(opt)"
              :class="[
                'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                themeMode === opt ? 'bg-card text-text-main shadow-soft' : 'text-text-secondary hover:text-text-main',
              ]"
            >
              {{ $t(`settings.${opt}`) }}
            </button>
          </div>
          <p class="mt-3 text-xs text-text-tertiary">
            {{ $t('settings.themeHint', { mode: themeResolvedLabel }) }}
          </p>
        </div>

        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('settings.installAppTitle') }}</p>
          <p class="mt-3 max-w-md text-xs text-text-secondary">{{ $t('settings.installAppHint') }}</p>
          <div class="mt-4 flex items-center gap-3">
            <button
              type="button"
              @click="onInstallPwa"
              :disabled="!pwaCanInstall"
              class="btn-primary disabled:opacity-50"
            >
              {{ $t('settings.installNow') }}
            </button>
            <span class="text-xs text-text-tertiary font-mono">
              <template v-if="pwaInstalled">{{ $t('settings.installed') }}</template>
              <template v-else-if="pwaCanInstall">{{ $t('settings.installAvailable') }}</template>
              <template v-else>{{ $t('settings.installUnavailable') }}</template>
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── COST PREFERENCES ────────────────────────────────────────── -->
    <section>
      <p class="eyebrow mb-3">Ledger</p>
      <h2 class="headline-display text-2xl">{{ $t('settings.costPreferences') }}</h2>
      <p class="mt-2 max-w-2xl text-sm text-text-secondary">{{ $t('settings.costCurrencyHint') }}</p>
      <div class="hairline mt-6" />

      <form @submit.prevent="savePreferences" class="space-y-6 pt-6">
        <div class="max-w-xs">
          <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">
            {{ $t('settings.costCurrency') }}
          </label>
          <select v-model="preferences.costCurrency" class="input-bare font-mono">
            <option v-for="currency in supportedCostCurrencies" :key="currency" :value="currency">
              {{ currency }}
            </option>
          </select>
        </div>

        <div class="flex justify-end">
          <button type="submit" class="btn-primary disabled:opacity-50" :disabled="preferencesSaving">
            <Loader2Icon v-if="preferencesSaving" class="h-4 w-4 animate-spin" />
            <span>{{ preferencesSaving ? $t('settings.saving') : $t('settings.saveSettings') }}</span>
          </button>
        </div>
      </form>
    </section>

  </div>
</template>

<script setup>
import {
  ArrowRight as ArrowRightIcon,
  BellRing as BellRingIcon,
  Clock3 as Clock3Icon,
  DollarSign as DollarSignIcon,
  Loader2 as Loader2Icon,
  UploadCloud as UploadCloudIcon,
} from '@lucide/vue';
import { unwrapApiEnvelope } from '~/utils/api-envelope';

const { t } = useI18n();
const toast = useToast();
const { data: preferencesData, refresh: refreshPreferences } = await useFetch('/api/settings/preferences');
const preferencesSaving = ref(false);

const { mode: themeModeState, resolved: themeResolvedState, setMode } = useTheme();
const themeMode = computed(() => themeModeState.value);
const themeResolved = computed(() => themeResolvedState.value);
const themeResolvedLabel = computed(() =>
  themeResolved.value === 'dark' ? t('settings.dark') : t('settings.light'),
);

const setThemeMode = (m) => setMode(m);

const settingsEntries = computed(() => [
  {
    to: '/import',
    title: t('settings.entryImportTitle'),
    description: t('settings.entryImportDescription'),
    icon: UploadCloudIcon,
    color: 'text-accent',
  },
  {
    to: '/tasks',
    title: t('settings.entryTasksTitle'),
    description: t('settings.entryTasksDescription'),
    icon: Clock3Icon,
    color: 'text-status-expiring',
  },
  {
    to: '/notifications/channels',
    title: t('settings.entryChannelsTitle'),
    description: t('settings.entryChannelsDescription'),
    icon: BellRingIcon,
    color: 'text-status-registered',
  },
  {
    to: '/costs',
    title: t('settings.entryCostsTitle'),
    description: t('settings.entryCostsDescription'),
    icon: DollarSignIcon,
    color: 'text-priority-low',
  },
]);

const { canInstall, installed, install, refreshInstalled } = usePwaInstall();
const pwaCanInstall = computed(() => canInstall.value);
const pwaInstalled = computed(() => installed.value);

onMounted(() => {
  refreshInstalled();
});

const onInstallPwa = async () => {
  await install();
};

const supportedCostCurrencies = computed(() =>
  preferencesData.value?.data?.supportedCostCurrencies || ['USD', 'EUR', 'GBP', 'CNY', 'JPY', 'CAD', 'AUD'],
);

const preferences = reactive({
  costCurrency: 'USD',
});

watchEffect(() => {
  const data = preferencesData.value?.data;
  if (!data) return;
  preferences.costCurrency = data.costCurrency || 'USD';
});

const savePreferences = async () => {
  preferencesSaving.value = true;
  try {
    const response = await $fetch('/api/settings/preferences', {
      method: 'POST',
      body: { costCurrency: preferences.costCurrency },
    });
    unwrapApiEnvelope(response, t('settings.saveError'));
    await refreshPreferences();
    toast.success(t('settings.saveSuccess'));
  } catch (e) {
    toast.error(e?.message || t('settings.saveError'));
  } finally {
    preferencesSaving.value = false;
  }
};

</script>
