<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold text-text-main">{{ $t('settings.title') }}</h1>
      <p class="mt-1 text-sm text-text-secondary">{{ $t('settings.description') }}</p>
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <NuxtLink
        v-for="entry in settingsEntries"
        :key="entry.to"
        :to="entry.to"
        class="group rounded-2xl border border-card-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"
      >
        <div class="flex items-start justify-between gap-4">
          <span :class="['rounded-2xl p-3', entry.bg]">
            <component :is="entry.icon" :class="['h-5 w-5', entry.color]" />
          </span>
          <ArrowRightIcon class="h-4 w-4 text-text-tertiary transition-transform group-hover:translate-x-0.5" />
        </div>
        <h2 class="mt-4 text-sm font-semibold text-text-main">{{ entry.title }}</h2>
        <p class="mt-1 text-xs leading-5 text-text-secondary">{{ entry.description }}</p>
      </NuxtLink>
    </div>

    <!-- Appearance / App -->
    <div class="bg-card border border-card-border rounded-2xl p-6 shadow-sm">
      <h3 class="font-medium text-text-main mb-4 border-b border-card-border pb-2">
        {{ $t('settings.appearance') }}
      </h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <div class="text-sm font-medium">{{ $t('settings.theme') }}</div>
          <div class="flex gap-2">
            <button
              type="button"
              @click="setThemeMode('system')"
              :class="[
                'px-3 py-2 rounded-xl border text-sm font-medium transition-colors',
                themeMode === 'system'
                  ? 'bg-background border-card-border text-text-main'
                  : 'border-card-border text-text-secondary hover:bg-card-border/30',
              ]"
            >
              {{ $t('settings.system') }}
            </button>
            <button
              type="button"
              @click="setThemeMode('light')"
              :class="[
                'px-3 py-2 rounded-xl border text-sm font-medium transition-colors',
                themeMode === 'light'
                  ? 'bg-background border-card-border text-text-main'
                  : 'border-card-border text-text-secondary hover:bg-card-border/30',
              ]"
            >
              {{ $t('settings.light') }}
            </button>
            <button
              type="button"
              @click="setThemeMode('dark')"
              :class="[
                'px-3 py-2 rounded-xl border text-sm font-medium transition-colors',
                themeMode === 'dark'
                  ? 'bg-background border-card-border text-text-main'
                  : 'border-card-border text-text-secondary hover:bg-card-border/30',
              ]"
            >
              {{ $t('settings.dark') }}
            </button>
          </div>
          <div class="text-xs text-text-secondary">
            {{ $t('settings.themeHint', { mode: themeResolvedLabel }) }}
          </div>
        </div>

        <div class="space-y-2">
          <div class="text-sm font-medium">{{ $t('settings.installAppTitle') }}</div>
          <div class="text-xs text-text-secondary">
            {{ $t('settings.installAppHint') }}
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="onInstallPwa"
              :disabled="!pwaCanInstall"
              class="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ $t('settings.installNow') }}
            </button>
            <span class="text-xs text-text-weak font-mono">
              <template v-if="pwaInstalled">{{ $t('settings.installed') }}</template>
              <template v-else-if="pwaCanInstall">{{ $t('settings.installAvailable') }}</template>
              <template v-else>{{ $t('settings.installUnavailable') }}</template>
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-card border border-card-border rounded-2xl p-6 shadow-sm">
      <h3 class="font-medium text-text-main mb-4 border-b border-card-border pb-2">{{ $t('settings.notifications') }}</h3>
      <form @submit.prevent="save" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="md:col-span-2">
                  <label class="block text-sm font-medium mb-1">{{ $t('settings.targetEmail') }}</label>
                  <input v-model="form.targetEmail" type="email" class="w-full px-3 py-2 bg-background border border-card-border rounded-lg" required>
              </div>

              <div>
                  <label class="block text-sm font-medium mb-1">{{ $t('settings.smtpHost') }}</label>
                  <input v-model="form.smtpConfig.host" type="text" placeholder="smtp.gmail.com" class="w-full px-3 py-2 bg-background border border-card-border rounded-lg">
              </div>
              <div>
                  <label class="block text-sm font-medium mb-1">{{ $t('settings.smtpPort') }}</label>
                  <input v-model="form.smtpConfig.port" type="number" placeholder="587" class="w-full px-3 py-2 bg-background border border-card-border rounded-lg">
              </div>

              <div>
                  <label class="block text-sm font-medium mb-1">{{ $t('settings.username') }}</label>
                  <input v-model="form.smtpConfig.user" type="text" class="w-full px-3 py-2 bg-background border border-card-border rounded-lg">
              </div>
               <div>
                  <label class="block text-sm font-medium mb-1">{{ $t('settings.password') }}</label>
                  <input v-model="form.smtpConfig.pass" type="password" class="w-full px-3 py-2 bg-background border border-card-border rounded-lg">
              </div>

               <div class="md:col-span-2">
                  <label class="block text-sm font-medium mb-1">{{ $t('settings.fromEmail') }}</label>
                  <input v-model="form.smtpConfig.from" type="email" placeholder="noreply@domain.com" class="w-full px-3 py-2 bg-background border border-card-border rounded-lg">
              </div>
          </div>

          <div class="border-t border-card-border pt-4 mt-2 grid grid-cols-2 gap-4">
              <label class="flex items-center gap-2 cursor-pointer">
                  <input v-model="form.instantEnabled" type="checkbox" class="w-4 h-4 text-accent rounded border-card-border">
                  <span class="text-sm">{{ $t('settings.instantNotification') }}</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                  <input v-model="form.dailyEnabled" type="checkbox" class="w-4 h-4 text-accent rounded border-card-border">
                  <span class="text-sm">{{ $t('settings.dailySummary') }}</span>
              </label>
          </div>

          <div class="flex justify-end pt-4">
              <button
                type="submit"
                class="px-6 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="saving"
              >
                  <span v-if="saving" class="flex items-center gap-2">
                    <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {{ $t('settings.saving') }}
                  </span>
                  <span v-else>{{ $t('settings.saveSettings') }}</span>
              </button>
          </div>
      </form>
    </div>

    <!-- Web Push Notifications -->
    <div class="bg-card border border-card-border rounded-2xl p-6 shadow-sm">
      <h3 class="font-medium text-text-main mb-2 border-b border-card-border pb-2">
        {{ $t('settings.pushTitle') }}
      </h3>
      <p class="text-xs text-text-secondary mb-4">{{ $t('settings.pushDescription') }}</p>

      <div v-if="pushState === 'unsupported'" class="text-sm text-text-secondary">
        {{ $t('settings.pushUnsupported') }}
      </div>
      <div v-else-if="pushState === 'not-configured'" class="text-sm text-text-secondary">
        {{ $t('settings.pushNotConfigured') }}
      </div>
      <div v-else class="flex items-center justify-between">
        <div>
          <div class="text-sm font-medium text-text-main">
            <span v-if="pushState === 'subscribed'">{{ $t('settings.pushSubscribed') }}</span>
            <span v-else-if="pushState === 'denied'">{{ $t('settings.pushDenied') }}</span>
            <span v-else>{{ $t('settings.pushIdle') }}</span>
          </div>
          <div v-if="pushError" class="text-xs text-status-dropping mt-1">{{ pushError }}</div>
        </div>
        <button
          v-if="pushState === 'subscribed'"
          @click="onUnsubscribe"
          class="px-4 py-2 rounded-xl border border-card-border text-text-main text-sm font-medium hover:bg-card-border/30 transition-colors"
        >
          {{ $t('settings.pushUnsubscribe') }}
        </button>
        <button
          v-else-if="pushState !== 'denied'"
          @click="onSubscribe"
          :disabled="pushState === 'subscribing'"
          class="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-50"
        >
          {{ pushState === 'subscribing' ? $t('settings.pushSubscribing') : $t('settings.pushSubscribe') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  ArrowRight as ArrowRightIcon,
  BellRing as BellRingIcon,
  Clock3 as Clock3Icon,
  DollarSign as DollarSignIcon,
  UploadCloud as UploadCloudIcon,
} from 'lucide-vue-next';

const { t } = useI18n();
const toast = useToast();
const { data } = await useFetch('/api/notifications/config');
const saving = ref(false);

const { mode: themeModeState, resolved: themeResolvedState, setMode } = useTheme();
const themeMode = computed(() => themeModeState.value);
const themeResolved = computed(() => themeResolvedState.value);
const themeResolvedLabel = computed(() =>
  themeResolved.value === "dark" ? t("settings.dark") : t("settings.light"),
);

const setThemeMode = (m) => {
  setMode(m);
};

const settingsEntries = computed(() => [
  {
    to: '/data/import',
    title: t('settings.entryImportTitle'),
    description: t('settings.entryImportDescription'),
    icon: UploadCloudIcon,
    bg: 'bg-accent/10',
    color: 'text-accent',
  },
  {
    to: '/tasks',
    title: t('settings.entryTasksTitle'),
    description: t('settings.entryTasksDescription'),
    icon: Clock3Icon,
    bg: 'bg-status-expiring/10',
    color: 'text-status-expiring',
  },
  {
    to: '/notifications',
    title: t('settings.entryChannelsTitle'),
    description: t('settings.entryChannelsDescription'),
    icon: BellRingIcon,
    bg: 'bg-status-registered/10',
    color: 'text-status-registered',
  },
  {
    to: '/costs',
    title: t('settings.entryCostsTitle'),
    description: t('settings.entryCostsDescription'),
    icon: DollarSignIcon,
    bg: 'bg-priority-low/10',
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

const form = reactive({
    targetEmail: '',
    instantEnabled: false,
    dailyEnabled: false,
    smtpConfig: {
        host: '',
        port: 587,
        user: '',
        pass: '',
        from: ''
    }
});

// Load init data
watchEffect(() => {
    if (data.value && data.value.data) {
        const d = data.value.data;
        form.targetEmail = d.targetEmail || '';
        form.instantEnabled = d.instantEnabled || false;
        form.dailyEnabled = d.dailyEnabled || false;
        if(d.smtpConfig) {
            form.smtpConfig = { ...form.smtpConfig, ...d.smtpConfig };
        }
    }
});

const save = async () => {
    saving.value = true;
    try {
        await $fetch('/api/notifications/config', { method: 'POST', body: form });
        toast.success(t('settings.saveSuccess'));
    } catch(e) {
        toast.error(t('settings.saveError'));
    } finally {
        saving.value = false;
    }
};
</script>
