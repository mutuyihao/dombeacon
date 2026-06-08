<template>
  <div class="flex min-h-full flex-col gap-6 md:h-full md:min-h-0 md:overflow-hidden">

    <header class="shrink-0">
      <p class="eyebrow mb-2">Channels</p>
      <h1 class="headline-display text-3xl md:text-4xl">{{ $t('settings.entryChannelsTitle') }}</h1>
      <p class="mt-2 max-w-2xl text-sm text-text-secondary">{{ $t('settings.entryChannelsDescription') }}</p>
    </header>

    <div class="min-h-0 flex-1 space-y-12 overflow-y-auto pr-2">
    <section>
      <p class="eyebrow mb-3">Email</p>
      <h2 class="headline-display text-3xl">{{ $t('settings.notifications') }}</h2>
      <div class="hairline mt-6" />

      <form @submit.prevent="save" class="space-y-8 pt-8">
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
            <input v-model.number="form.smtpConfig.port" type="number" placeholder="587" class="input-bare font-mono" />
          </div>
          <div>
            <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">{{ $t('settings.username') }}</label>
            <input v-model="form.smtpConfig.user" type="text" class="input-bare" />
          </div>
          <div>
            <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">{{ $t('settings.password') }}</label>
            <input
              v-model="form.smtpConfig.pass"
              type="password"
              :placeholder="form.smtpConfig.passConfigured ? $t('settings.passwordConfigured') : ''"
              class="input-bare"
            />
          </div>
          <div class="md:col-span-2">
            <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">{{ $t('settings.fromEmail') }}</label>
            <input v-model="form.smtpConfig.from" type="email" placeholder="noreply@domain.com" class="input-bare" />
          </div>
        </div>

        <div class="hairline" />

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label class="flex cursor-pointer items-center gap-3 text-sm text-text-secondary">
            <input v-model="form.instantEnabled" type="checkbox" class="h-4 w-4 accent-accent" />
            {{ $t('settings.instantNotification') }}
          </label>
          <label class="flex cursor-pointer items-center gap-3 text-sm text-text-secondary">
            <input v-model="form.dailyEnabled" type="checkbox" class="h-4 w-4 accent-accent" />
            {{ $t('settings.dailySummary') }}
          </label>
        </div>

        <div class="hairline" />

        <div>
          <p class="eyebrow mb-3">Risk event presets</p>
          <div class="grid gap-4 xl:grid-cols-2">
            <article
              v-for="eventDef in riskEventDefinitions"
              :key="eventDef.key"
              class="surface-flat p-5"
            >
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 class="headline-display text-2xl">{{ eventDef.label }}</h3>
                  <p class="mt-2 max-w-xl text-sm leading-6 text-text-secondary">{{ eventDef.description }}</p>
                </div>
                <NuxtLink :to="eventDef.to" class="btn-text text-xs">
                  Review
                </NuxtLink>
              </div>

              <div class="mt-5 grid gap-3 sm:grid-cols-2">
                <label
                  v-for="channel in channelDefinitions"
                  :key="`${eventDef.key}-${channel.key}`"
                  class="rounded-2xl border border-hairline bg-card px-4 py-3"
                >
                  <span class="flex items-center justify-between gap-3">
                    <span class="text-sm font-medium text-text-main">{{ channel.label }}</span>
                    <input
                      v-model="form.eventChannelPresets[eventDef.key][channel.key]"
                      type="checkbox"
                      class="h-4 w-4 accent-accent"
                    />
                  </span>
                  <span class="mt-2 block font-mono text-[11px] text-text-tertiary">
                    {{ formatDeliveryCell(eventDef.key, channel.name) }}
                  </span>
                  <span
                    class="mt-2 flex items-start gap-2 text-xs leading-5"
                    :class="diagnosticTextClass(eventDef.key, channel.name)"
                  >
                    <span
                      class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      :class="diagnosticDotClass(eventDef.key, channel.name)"
                    />
                    <span>{{ channelDiagnostic(eventDef.key, channel.name).message || 'No diagnostic data yet.' }}</span>
                  </span>
                </label>
              </div>

              <div class="mt-4 rounded-2xl bg-surface-sunken px-4 py-3 text-xs leading-5 text-text-secondary">
                <p>
                  {{ eventDelivery(eventDef.key).dedupeKeysLastWindow || 0 }}
                  dedupe keys active in {{ riskDeliverySummary.dedupeWindowHours || 24 }}h.
                </p>
                <p class="mt-1 font-mono text-text-tertiary">
                  Last dedupe: {{ formatDate(eventDelivery(eventDef.key).lastDedupeAt || eventDelivery(eventDef.key).lastSentAt) }}
                </p>
              </div>
            </article>
          </div>
          <p class="mt-3 text-xs leading-5 text-text-tertiary">
            Presets gate risk fan-out before channel-specific filters. Webhook and ServerChan `eventTypes` still apply inside enabled channels.
          </p>
        </div>

        <div class="flex justify-end">
          <button type="submit" class="btn-primary disabled:opacity-50" :disabled="saving">
            {{ saving ? $t('settings.saving') : $t('settings.saveSettings') }}
          </button>
        </div>
      </form>
    </section>

    <section>
      <p class="eyebrow mb-3">Web push</p>
      <h2 class="headline-display text-3xl">{{ $t('settings.pushTitle') }}</h2>
      <p class="mt-2 max-w-2xl text-sm text-text-secondary">{{ $t('settings.pushDescription') }}</p>
      <div class="hairline mt-6" />

      <div class="pt-8">
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
          <button v-if="pushState === 'subscribed'" type="button" @click="onUnsubscribe" class="btn-ghost">
            {{ $t('settings.pushUnsubscribe') }}
          </button>
          <button
            v-else-if="pushState !== 'denied'"
            type="button"
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
  </div>
</template>

<script setup>
const { t } = useI18n();
const toast = useToast();
const { data, refresh } = await useFetch('/api/notifications/config');
const saving = ref(false);

const riskEventDefinitions = [
  {
    key: 'SECURITY_FINDING_HIGH',
    label: 'High security findings',
    description: 'New high-severity DNS/RDAP findings on active owned domains.',
    to: '/ops/security',
  },
  {
    key: 'BRAND_WATCH_REGISTERED',
    label: 'Registered Brand Watch hits',
    description: 'Newly registered RDAP or CT lookalikes that still need review.',
    to: '/brand-watch',
  },
];

const channelDefinitions = [
  { key: 'email', name: 'EMAIL', label: 'Email' },
  { key: 'webhook', name: 'WEBHOOK', label: 'Webhook' },
  { key: 'serverchan', name: 'SERVERCHAN', label: 'ServerChan' },
  { key: 'push', name: 'PUSH', label: 'Web Push' },
];

const defaultEventChannelPresets = () =>
  Object.fromEntries(
    riskEventDefinitions.map((eventDef) => [
      eventDef.key,
      Object.fromEntries(channelDefinitions.map((channel) => [channel.key, true])),
    ]),
  );

const normalizeEventChannelPresets = (value) => {
  const presets = defaultEventChannelPresets();
  const input = value || {};
  riskEventDefinitions.forEach((eventDef) => {
    channelDefinitions.forEach((channel) => {
      if (typeof input?.[eventDef.key]?.[channel.key] === 'boolean') {
        presets[eventDef.key][channel.key] = input[eventDef.key][channel.key];
      }
    });
  });
  return presets;
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
    passConfigured: false,
    from: '',
  },
  eventChannelPresets: defaultEventChannelPresets(),
});

watch(
  data,
  (value) => {
    const d = value?.data;
    if (!d) return;
    form.targetEmail = d.targetEmail || '';
    form.instantEnabled = Boolean(d.instantEnabled);
    form.dailyEnabled = Boolean(d.dailyEnabled);
    form.smtpConfig = {
      ...form.smtpConfig,
      ...(d.smtpConfig || {}),
      pass: '',
      passConfigured: Boolean(d.smtpConfig?.passConfigured),
    };
    form.eventChannelPresets = normalizeEventChannelPresets(d.eventChannelPresets);
  },
  { immediate: true },
);

const riskDeliverySummary = computed(() => data.value?.data?.riskDeliverySummary || {
  dedupeWindowHours: 24,
  events: {},
});

const eventDelivery = (eventType) => riskDeliverySummary.value.events?.[eventType] || {};

const channelDelivery = (eventType, channelName) =>
  eventDelivery(eventType).channels?.[channelName] || {
    total: 0,
    sent: 0,
    failed: 0,
    pending: 0,
    diagnostic: {},
  };

const channelDiagnostic = (eventType, channelName) =>
  channelDelivery(eventType, channelName).diagnostic || {};

const diagnosticSeverity = (eventType, channelName) =>
  channelDiagnostic(eventType, channelName).severity || 'warning';

const diagnosticTextClass = (eventType, channelName) => {
  const severity = diagnosticSeverity(eventType, channelName);
  if (severity === 'ok') return 'text-status-available';
  if (severity === 'disabled') return 'text-text-tertiary';
  return 'text-status-dropping';
};

const diagnosticDotClass = (eventType, channelName) => {
  const severity = diagnosticSeverity(eventType, channelName);
  if (severity === 'ok') return 'bg-status-available';
  if (severity === 'disabled') return 'bg-text-tertiary';
  return 'bg-status-dropping';
};

const formatDeliveryCell = (eventType, channelName) => {
  const cell = channelDelivery(eventType, channelName);
  const failed = Number(cell.failed || 0);
  const pending = Number(cell.pending || 0);
  const suffix = [
    failed ? `${failed} failed` : '',
    pending ? `${pending} pending` : '',
  ].filter(Boolean).join(' / ');
  return `${Number(cell.sent || 0)} sent${suffix ? ` / ${suffix}` : ''}`;
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const save = async () => {
  saving.value = true;
  try {
    const response = await $fetch('/api/notifications/config', {
      method: 'POST',
      body: form,
    });
    if (response?.code !== 0) throw new Error(response?.msg || t('settings.saveError'));
    await refresh();
    toast.success(t('settings.saveSuccess'));
    form.smtpConfig.pass = '';
    form.smtpConfig.passConfigured =
      form.smtpConfig.passConfigured || Boolean(form.smtpConfig.pass);
  } catch (e) {
    toast.error(e?.message || t('settings.saveError'));
  } finally {
    saving.value = false;
  }
};

const {
  state: pushState,
  errorMessage: pushError,
  refreshState,
  subscribe,
  unsubscribe,
} = usePushSubscription();

onMounted(() => {
  refreshState();
});

const onSubscribe = async () => {
  const ok = await subscribe();
  if (ok) toast.success(t('settings.pushSubscribed'));
  else if (pushError.value) toast.error(pushError.value);
};

const onUnsubscribe = async () => {
  const ok = await unsubscribe();
  if (ok) toast.success(t('settings.pushUnsubscribed'));
};
</script>
