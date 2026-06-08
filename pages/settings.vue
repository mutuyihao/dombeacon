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
          <h2 class="font-display mt-5 text-lg font-medium tracking-[-0.025em] text-text-main">{{ entry.title }}</h2>
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

    <section>
      <p class="eyebrow mb-3">Delivery</p>
      <h2 class="headline-display text-2xl">{{ $t('settings.notifications') }}</h2>
      <div class="hairline mt-6" />

      <form @submit.prevent="save" class="space-y-6 pt-6">
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div class="md:col-span-2">
            <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">{{ $t('settings.targetEmail') }}</label>
            <input v-model="form.targetEmail" type="email" class="input-bare" required />
          </div>
          <div>
            <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">{{ $t('settings.smtpHost') }}</label>
            <input v-model="form.smtpConfig.host" type="text" placeholder="smtp.gmail.com" class="input-bare font-mono" />
          </div>
          <div>
            <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">{{ $t('settings.smtpPort') }}</label>
            <input v-model="form.smtpConfig.port" type="number" placeholder="587" class="input-bare font-mono" />
          </div>
          <div>
            <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">{{ $t('settings.username') }}</label>
            <input v-model="form.smtpConfig.user" type="text" class="input-bare" />
          </div>
          <div>
            <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">{{ $t('settings.password') }}</label>
            <input v-model="form.smtpConfig.pass" type="password" class="input-bare" />
          </div>
          <div class="md:col-span-2">
            <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">{{ $t('settings.fromEmail') }}</label>
            <input v-model="form.smtpConfig.from" type="email" placeholder="noreply@domain.com" class="input-bare" />
          </div>
        </div>

        <div class="hairline" />

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label class="flex cursor-pointer items-center gap-3 text-sm text-text-secondary">
            <input v-model="form.instantEnabled" type="checkbox" class="h-4 w-4 accent-accent" />
            {{ $t('settings.instantNotification') }}
          </label>
          <label class="flex cursor-pointer items-center gap-3 text-sm text-text-secondary">
            <input v-model="form.dailyEnabled" type="checkbox" class="h-4 w-4 accent-accent" />
            {{ $t('settings.dailySummary') }}
          </label>
        </div>

        <div class="flex justify-end">
          <button type="submit" class="btn-primary disabled:opacity-50" :disabled="saving">
            <Loader2Icon v-if="saving" class="h-4 w-4 animate-spin" />
            <span>{{ saving ? $t('settings.saving') : $t('settings.saveSettings') }}</span>
          </button>
        </div>
      </form>
    </section>

    <!-- ─── WEB PUSH ────────────────────────────────────────────────── -->
    <section>
      <p class="eyebrow mb-3">Web push</p>
      <h2 class="headline-display text-2xl">{{ $t('settings.pushTitle') }}</h2>
      <p class="mt-2 max-w-2xl text-sm text-text-secondary">{{ $t('settings.pushDescription') }}</p>
      <div class="hairline mt-6" />

      <div class="pt-6">
        <p v-if="pushState === 'unsupported'" class="text-sm text-text-secondary">
          {{ $t('settings.pushUnsupported') }}
        </p>
        <p v-else-if="pushState === 'not-configured'" class="text-sm text-text-secondary">
          {{ $t('settings.pushNotConfigured') }}
        </p>
        <div v-else class="flex items-start justify-between gap-6">
          <div>
            <p class="text-sm font-medium text-text-main">
              <span v-if="pushState === 'subscribed'">{{ $t('settings.pushSubscribed') }}</span>
              <span v-else-if="pushState === 'denied'">{{ $t('settings.pushDenied') }}</span>
              <span v-else>{{ $t('settings.pushIdle') }}</span>
            </p>
            <p v-if="pushError" class="mt-1 text-xs text-status-dropping">{{ pushError }}</p>
          </div>
          <button v-if="pushState === 'subscribed'" @click="onUnsubscribe" class="btn-ghost">
            {{ $t('settings.pushUnsubscribe') }}
          </button>
          <button
            v-else-if="pushState !== 'denied'"
            @click="onSubscribe"
            :disabled="pushState === 'subscribing'"
            class="btn-primary disabled:opacity-50"
          >
            {{ pushState === 'subscribing' ? $t('settings.pushSubscribing') : $t('settings.pushSubscribe') }}
          </button>
        </div>
      </div>
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
} from 'lucide-vue-next';

const { t } = useI18n();
const toast = useToast();
const { data } = await useFetch('/api/notifications/config');
const { data: preferencesData, refresh: refreshPreferences } = await useFetch('/api/settings/preferences');
const saving = ref(false);
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
    to: '/data/import',
    title: t('settings.entryImportTitle'),
    description: t('settings.entryImportDescription'),
    icon: UploadCloudIcon,
    color: 'text-accent',
  },
  {
    to: '/ops/tasks',
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
    to: '/data/costs',
    title: t('settings.entryCostsTitle'),
    description: t('settings.entryCostsDescription'),
    icon: DollarSignIcon,
    color: 'text-priority-low',
  },
]);

const { canInstall, installed, install, refreshInstalled } = usePwaInstall();
const pwaCanInstall = computed(() => canInstall.value);
const pwaInstalled = computed(() => installed.value);

const {
  state: pushState,
  errorMessage: pushError,
  refreshState,
  subscribe,
  unsubscribe,
} = usePushSubscription();

onMounted(() => {
  refreshState();
  refreshInstalled();
});

const onInstallPwa = async () => {
  await install();
};

const onSubscribe = async () => {
  const ok = await subscribe();
  if (ok) toast.success(t('settings.pushSubscribed'));
  else if (pushError.value) toast.error(pushError.value);
};

const onUnsubscribe = async () => {
  const ok = await unsubscribe();
  if (ok) toast.success(t('settings.pushUnsubscribed'));
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
    if (response?.code !== 0) throw new Error(response?.msg || t('settings.saveError'));
    await refreshPreferences();
    toast.success(t('settings.saveSuccess'));
  } catch (e) {
    toast.error(e?.message || t('settings.saveError'));
  } finally {
    preferencesSaving.value = false;
  }
};

const form = reactive({
  targetEmail: '',
  instantEnabled: false,
  dailyEnabled: false,
  smtpConfig: {
    host: '',
    port: 587,
    user: '',
    pass: '',
    from: '',
  },
});

watchEffect(() => {
  if (data.value && data.value.data) {
    const d = data.value.data;
    form.targetEmail = d.targetEmail || '';
    form.instantEnabled = d.instantEnabled || false;
    form.dailyEnabled = d.dailyEnabled || false;
    if (d.smtpConfig) {
      form.smtpConfig = { ...form.smtpConfig, ...d.smtpConfig };
    }
  }
});

const save = async () => {
  saving.value = true;
  try {
    await $fetch('/api/notifications/config', { method: 'POST', body: form });
    toast.success(t('settings.saveSuccess'));
  } catch (e) {
    toast.error(t('settings.saveError'));
  } finally {
    saving.value = false;
  }
};
</script>
