<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-text-main">{{ $t('settings.entryChannelsTitle') }}</h1>
        <p class="mt-1 text-sm text-text-secondary">{{ $t('settings.entryChannelsDescription') }}</p>
      </div>
    </div>

    <div class="rounded-2xl border border-card-border bg-card p-6 shadow-sm">
      <h2 class="font-medium text-text-main mb-4 border-b border-card-border pb-2">
        {{ $t('settings.notifications') }}
      </h2>
      <form @submit.prevent="save" class="space-y-4">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div class="md:col-span-2">
            <label class="block text-sm font-medium mb-1">{{ $t('settings.targetEmail') }}</label>
            <input v-model="form.targetEmail" type="email" class="w-full rounded-lg border border-card-border bg-background px-3 py-2" required>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">{{ $t('settings.smtpHost') }}</label>
            <input v-model="form.smtpConfig.host" type="text" placeholder="smtp.gmail.com" class="w-full rounded-lg border border-card-border bg-background px-3 py-2">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">{{ $t('settings.smtpPort') }}</label>
            <input v-model.number="form.smtpConfig.port" type="number" placeholder="587" class="w-full rounded-lg border border-card-border bg-background px-3 py-2">
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">{{ $t('settings.username') }}</label>
            <input v-model="form.smtpConfig.user" type="text" class="w-full rounded-lg border border-card-border bg-background px-3 py-2">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">{{ $t('settings.password') }}</label>
            <input
              v-model="form.smtpConfig.pass"
              type="password"
              :placeholder="form.smtpConfig.passConfigured ? $t('settings.passwordConfigured') : ''"
              class="w-full rounded-lg border border-card-border bg-background px-3 py-2"
            >
          </div>

          <div class="md:col-span-2">
            <label class="block text-sm font-medium mb-1">{{ $t('settings.fromEmail') }}</label>
            <input v-model="form.smtpConfig.from" type="email" placeholder="noreply@domain.com" class="w-full rounded-lg border border-card-border bg-background px-3 py-2">
          </div>
        </div>

        <div class="grid grid-cols-1 gap-3 border-t border-card-border pt-4 sm:grid-cols-2">
          <label class="flex items-center gap-2 cursor-pointer">
            <input v-model="form.instantEnabled" type="checkbox" class="h-4 w-4 rounded border-card-border text-accent">
            <span class="text-sm">{{ $t('settings.instantNotification') }}</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input v-model="form.dailyEnabled" type="checkbox" class="h-4 w-4 rounded border-card-border text-accent">
            <span class="text-sm">{{ $t('settings.dailySummary') }}</span>
          </label>
        </div>

        <div class="flex justify-end pt-2">
          <button
            type="submit"
            class="rounded-xl bg-accent px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            :disabled="saving"
          >
            {{ saving ? $t('settings.saving') : $t('settings.saveSettings') }}
          </button>
        </div>
      </form>
    </div>

    <div class="rounded-2xl border border-card-border bg-card p-6 shadow-sm">
      <h2 class="font-medium text-text-main mb-2 border-b border-card-border pb-2">
        {{ $t('settings.pushTitle') }}
      </h2>
      <p class="mb-4 text-xs text-text-secondary">{{ $t('settings.pushDescription') }}</p>

      <div v-if="pushState === 'unsupported'" class="text-sm text-text-secondary">
        {{ $t('settings.pushUnsupported') }}
      </div>
      <div v-else-if="pushState === 'not-configured'" class="text-sm text-text-secondary">
        {{ $t('settings.pushNotConfigured') }}
      </div>
      <div v-else class="flex items-center justify-between gap-4">
        <div>
          <div class="text-sm font-medium text-text-main">
            <span v-if="pushState === 'subscribed'">{{ $t('settings.pushSubscribed') }}</span>
            <span v-else-if="pushState === 'denied'">{{ $t('settings.pushDenied') }}</span>
            <span v-else>{{ $t('settings.pushIdle') }}</span>
          </div>
          <div v-if="pushError" class="mt-1 text-xs text-status-dropping">{{ pushError }}</div>
        </div>
        <button
          v-if="pushState === 'subscribed'"
          type="button"
          @click="onUnsubscribe"
          class="rounded-xl border border-card-border px-4 py-2 text-sm font-medium text-text-main transition-colors hover:bg-card-border/30"
        >
          {{ $t('settings.pushUnsubscribe') }}
        </button>
        <button
          v-else-if="pushState !== 'denied'"
          type="button"
          @click="onSubscribe"
          :disabled="pushState === 'subscribing'"
          class="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {{ pushState === 'subscribing' ? $t('settings.pushSubscribing') : $t('settings.pushSubscribe') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const { t } = useI18n();
const toast = useToast();
const { data } = await useFetch('/api/notifications/config');
const saving = ref(false);

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
});

watchEffect(() => {
  const d = data.value?.data;
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
});

const save = async () => {
  saving.value = true;
  try {
    const response = await $fetch('/api/notifications/config', {
      method: 'POST',
      body: form,
    });
    if (response?.code !== 0) throw new Error(response?.msg || t('settings.saveError'));
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
