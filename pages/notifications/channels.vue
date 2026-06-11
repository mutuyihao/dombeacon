<template>
  <div class="flex min-h-full flex-col gap-4 md:h-full md:min-h-0 md:overflow-hidden">

    <header class="shrink-0">
      <p class="eyebrow mb-2">Channels</p>
      <h1 class="headline-display text-3xl md:text-4xl">{{ $t('settings.entryChannelsTitle') }}</h1>
      <p class="mt-2 max-w-2xl text-sm text-text-secondary">{{ $t('settings.entryChannelsDescription') }}</p>
    </header>

    <div class="min-h-0 flex-1 space-y-6 overflow-y-auto pr-2">
    <section class="rounded-[18px] border border-hairline bg-card/55 p-4 md:p-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="eyebrow mb-3">Routing</p>
          <h2 class="headline-display text-3xl">通知路由</h2>
          <p class="mt-2 max-w-2xl text-sm text-text-secondary">
            选择允许发送通知的渠道，并确认启用渠道是否已完成必要配置。
          </p>
        </div>
        <button type="button" class="btn-primary disabled:opacity-50" :disabled="saving" @click="save">
          {{ saving ? $t('settings.saving') : $t('settings.saveSettings') }}
        </button>
      </div>
      <div class="hairline mt-5" />

      <div class="grid grid-cols-1 gap-3 pt-5 md:grid-cols-2 xl:grid-cols-4">
        <label
          v-for="channel in channelCards"
          :key="channel.key"
          class="group flex cursor-pointer flex-col gap-4 rounded-2xl border border-hairline bg-surface-sunken/35 p-4 transition-colors hover:border-accent/35 hover:bg-card/70"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <input v-model="form.channelSettings[channel.key]" type="checkbox" class="mt-0.5 h-4 w-4 accent-accent" />
              <div>
                <p class="text-sm font-semibold text-text-main">{{ channel.label }}</p>
                <p class="mt-1 text-xs text-text-tertiary">{{ channel.destinationText }}</p>
              </div>
            </div>
            <span :class="channel.statusClass">
              {{ channel.statusLabel }}
            </span>
          </div>
          <p class="min-h-8 text-xs leading-relaxed text-text-secondary">
            {{ channel.message }}
          </p>
        </label>
      </div>

      <p class="mt-4 text-xs text-text-tertiary">
        已启用但配置不完整的渠道会被跳过，避免产生误导性的失败通知。
      </p>
    </section>

    <section class="rounded-[18px] border border-hairline bg-card/55 p-4 md:p-6">
      <p class="eyebrow mb-3">Email</p>
      <h2 class="headline-display text-3xl">{{ $t('settings.notifications') }}</h2>
      <div class="hairline mt-5" />

      <form @submit.prevent="save" class="space-y-6 pt-6">
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div class="md:col-span-2">
            <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">{{ $t('settings.targetEmail') }}</label>
            <input v-model="form.targetEmail" type="email" class="input-bare" :required="form.channelSettings.email" />
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

        <div class="flex justify-end">
          <button type="submit" class="btn-primary disabled:opacity-50" :disabled="saving">
            {{ saving ? $t('settings.saving') : $t('settings.saveSettings') }}
          </button>
        </div>
      </form>
    </section>

    <section class="rounded-[18px] border border-hairline bg-card/55 p-4 md:p-6">
      <p class="eyebrow mb-3">Web push</p>
      <h2 class="headline-display text-3xl">{{ $t('settings.pushTitle') }}</h2>
      <p class="mt-2 max-w-2xl text-sm text-text-secondary">{{ $t('settings.pushDescription') }}</p>
      <div class="hairline mt-5" />

      <div class="pt-6">
        <p v-if="pushState === 'unsupported'" class="text-sm text-text-secondary">
          {{ $t('settings.pushUnsupported') }}
        </p>
        <p v-else-if="pushState === 'not-configured'" class="text-sm text-text-secondary">
          {{ $t('settings.pushNotConfigured') }}
        </p>
        <div v-else class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
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

    <section class="rounded-[18px] border border-hairline bg-card/55 p-4 md:p-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="eyebrow mb-3">Webhook</p>
          <h2 class="headline-display text-3xl">{{ $t('webhook.title') }}</h2>
          <p class="mt-2 max-w-2xl text-sm text-text-secondary">{{ $t('webhook.noWebhooksHint') }}</p>
        </div>
        <button @click="openWebhookModal" class="btn-primary">
          <PlusIcon class="h-4 w-4" />
          {{ $t('webhook.addWebhook') }}
        </button>
      </div>
      <div class="hairline mt-5" />

      <div v-if="webhooksLoading" class="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>

      <div v-else-if="webhooks.length > 0" class="divide-y divide-hairline pt-1">
        <article
          v-for="webhook in webhooks"
          :key="webhook.id"
          class="group grid grid-cols-1 items-start gap-x-8 gap-y-3 py-5 transition-colors hover:bg-surface-sunken/50 lg:grid-cols-[minmax(0,1fr)_auto]"
        >
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h3 class="font-sans text-xl font-bold tracking-tight text-text-main">{{ webhook.name }}</h3>
              <span :class="['flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em]', webhook.enabled ? 'text-status-available' : 'text-status-unknown']">
                <span :class="['h-1.5 w-1.5 rounded-full', webhook.enabled ? 'bg-status-available' : 'bg-status-unknown']" />
                {{ webhook.enabled ? $t('webhook.enabled') : $t('webhook.disabled') }}
              </span>
            </div>

            <div class="mt-3 space-y-2 text-sm">
              <div class="flex items-center gap-2 text-text-secondary">
                <LinkIcon class="h-3.5 w-3.5 text-text-tertiary" />
                <span class="font-mono text-xs font-semibold text-text-main">{{ webhook.method }}</span>
                <span class="truncate font-mono text-xs">{{ webhook.url }}</span>
              </div>

              <div v-if="parseEventTypes(webhook.eventTypes).length" class="flex items-start gap-2 text-text-secondary">
                <BellIcon class="mt-0.5 h-3.5 w-3.5 text-text-tertiary" />
                <div class="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  <span v-for="eventName in parseEventTypes(webhook.eventTypes)" :key="eventName" class="font-mono">
                    {{ formatWebhookEvent(eventName) }}
                  </span>
                </div>
              </div>

              <div v-if="webhook.headerCount" class="flex items-center gap-2 text-text-tertiary">
                <CodeIcon class="h-3.5 w-3.5" />
                <span class="text-xs">{{ webhook.headerCount }} custom headers</span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-1">
            <button
              @click="testWebhook(webhook.id)"
              :disabled="webhookTestingId === webhook.id"
              class="rounded-full p-2 text-text-tertiary transition-colors hover:bg-card hover:text-accent disabled:opacity-50"
              :title="$t('webhook.testWebhook')"
            >
              <PlayIcon v-if="webhookTestingId !== webhook.id" class="h-4 w-4" />
              <LoadingSpinner v-else size="sm" />
            </button>
            <button
              @click="deleteWebhook(webhook.id)"
              class="rounded-full p-2 text-text-tertiary transition-colors hover:bg-card hover:text-status-dropping"
              :title="$t('webhook.deleteWebhook')"
            >
              <TrashIcon class="h-4 w-4" />
            </button>
          </div>
        </article>
      </div>

      <div v-else class="py-12 text-center">
        <WebhookIcon class="mx-auto mb-4 h-8 w-8 text-text-tertiary" />
        <p class="mb-6 text-sm text-text-secondary">{{ $t('webhook.noWebhooks') }}</p>
        <button @click="openWebhookModal" class="btn-primary">
          <PlusIcon class="h-4 w-4" />
          {{ $t('webhook.addWebhook') }}
        </button>
      </div>
    </section>

    <section class="rounded-[18px] border border-hairline bg-card/55 p-4 md:p-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="eyebrow mb-3">Server酱</p>
          <h2 class="headline-display text-3xl">{{ $t('serverchan.title') }}</h2>
          <p class="mt-2 max-w-2xl text-sm text-text-secondary">{{ $t('serverchan.noServerchanHint') }}</p>
        </div>
        <button @click="openServerchanModal()" class="btn-primary">
          <PlusIcon class="h-4 w-4" />
          {{ $t('serverchan.addServerchan') }}
        </button>
      </div>
      <div class="hairline mt-5" />

      <div v-if="serverchanLoading" class="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>

      <div v-else-if="serverchanList.length > 0" class="divide-y divide-hairline pt-1">
        <article
          v-for="config in serverchanList"
          :key="config.id"
          class="group grid grid-cols-1 items-start gap-x-8 gap-y-3 py-5 transition-colors hover:bg-surface-sunken/50 lg:grid-cols-[minmax(0,1fr)_auto]"
        >
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h3 class="font-sans text-xl font-bold tracking-tight text-text-main">{{ config.name }}</h3>
              <span :class="['flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em]', config.enabled ? 'text-status-available' : 'text-status-unknown']">
                <span :class="['h-1.5 w-1.5 rounded-full', config.enabled ? 'bg-status-available' : 'bg-status-unknown']" />
                {{ config.enabled ? $t('serverchan.enabled') : $t('serverchan.disabled') }}
              </span>
            </div>

            <div class="mt-3 space-y-2 text-sm">
              <div class="flex items-center gap-2 text-text-secondary">
                <KeyIcon class="h-3.5 w-3.5 text-text-tertiary" />
                <span class="font-mono text-xs">{{ config.sendKeyMasked || '****' }}</span>
              </div>

              <div v-if="parseEventTypes(config.eventTypes).length" class="flex items-start gap-2 text-text-secondary">
                <BellIcon class="mt-0.5 h-3.5 w-3.5 text-text-tertiary" />
                <div class="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  <span v-for="eventName in parseEventTypes(config.eventTypes)" :key="eventName" class="font-mono">
                    {{ $t(`serverchan.events.${eventName}`) }}
                  </span>
                </div>
              </div>

              <div class="flex items-start gap-2 text-text-secondary">
                <CodeIcon class="mt-0.5 h-3.5 w-3.5 text-text-tertiary" />
                <div class="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  <span
                    v-for="item in serverchanOptionSummary(config.options)"
                    :key="item"
                    class="font-mono"
                  >
                    {{ item }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-1">
            <button
              @click="openServerchanModal(config)"
              class="rounded-full p-2 text-text-tertiary transition-colors hover:bg-card hover:text-accent"
              :title="$t('serverchan.editServerchan')"
            >
              <PencilIcon class="h-4 w-4" />
            </button>
            <button
              @click="testServerchan(config.id)"
              :disabled="serverchanTestingId === config.id"
              class="rounded-full p-2 text-text-tertiary transition-colors hover:bg-card hover:text-accent disabled:opacity-50"
              :title="$t('serverchan.testServerchan')"
            >
              <PlayIcon v-if="serverchanTestingId !== config.id" class="h-4 w-4" />
              <LoadingSpinner v-else size="sm" />
            </button>
            <button
              @click="deleteServerchan(config.id)"
              class="rounded-full p-2 text-text-tertiary transition-colors hover:bg-card hover:text-status-dropping"
              :title="$t('serverchan.deleteServerchan')"
            >
              <TrashIcon class="h-4 w-4" />
            </button>
          </div>
        </article>
      </div>

      <div v-else class="py-12 text-center">
        <MessageSquareIcon class="mx-auto mb-4 h-8 w-8 text-text-tertiary" />
        <p class="mb-6 text-sm text-text-secondary">{{ $t('serverchan.noServerchan') }}</p>
        <button @click="openServerchanModal()" class="btn-primary">
          <PlusIcon class="h-4 w-4" />
          {{ $t('serverchan.addServerchan') }}
        </button>
      </div>
    </section>
    </div>

    <WebhookModal :is-open="webhookModalOpen" :webhook="editingWebhook" @close="closeWebhookModal" @save="handleWebhookSave" />
    <ServerchanModal :is-open="serverchanModalOpen" :config="editingServerchan" @close="closeServerchanModal" @save="handleServerchanSave" />
    <ConfirmDialog
      :is-open="webhookDeleteDialog.isOpen"
      :title="$t('webhook.deleteWebhook')"
      :message="$t('webhook.confirmDelete')"
      variant="danger"
      @confirm="confirmWebhookDelete"
      @cancel="webhookDeleteDialog.isOpen = false"
    />
    <ConfirmDialog
      :is-open="serverchanDeleteDialog.isOpen"
      :title="$t('serverchan.deleteServerchan')"
      :message="$t('serverchan.confirmDelete')"
      variant="danger"
      @confirm="confirmServerchanDelete"
      @cancel="serverchanDeleteDialog.isOpen = false"
    />
  </div>
</template>

<script setup>
import {
  Plus as PlusIcon,
  Link as LinkIcon,
  Bell as BellIcon,
  Code as CodeIcon,
  Play as PlayIcon,
  Trash as TrashIcon,
  Pencil as PencilIcon,
  Webhook as WebhookIcon,
  Key as KeyIcon,
  MessageSquare as MessageSquareIcon,
} from 'lucide-vue-next';
import { unwrapApiEnvelope } from '~/utils/api-envelope';

const { t } = useI18n();
const toast = useToast();
const { data, refresh } = await useFetch('/api/notifications/config');
const saving = ref(false);

const channelSettingDefaults = {
  email: false,
  webhook: false,
  serverchan: false,
  push: false,
};
const channelNameByKey = {
  email: 'EMAIL',
  webhook: 'WEBHOOK',
  serverchan: 'SERVERCHAN',
  push: 'PUSH',
};
const channelLabels = {
  email: 'Email',
  webhook: 'Webhook',
  serverchan: 'ServerChan',
  push: 'Web push',
};
const channelRequiredHints = {
  email: '需要填写目标邮箱、SMTP Host 和发件邮箱。',
  webhook: '需要至少一个启用的 Webhook 目的地。',
  serverchan: '需要至少一个启用的 ServerChan 配置。',
  push: '需要配置 VAPID 密钥，并完成浏览器推送订阅。',
};
const normalizeChannelSettings = (value = {}) =>
  Object.keys(channelSettingDefaults).reduce((acc, key) => {
    acc[key] = Boolean(value?.[key]);
    return acc;
  }, { ...channelSettingDefaults });

const webhooksLoading = ref(true);
const webhooks = ref([]);
const webhookModalOpen = ref(false);
const editingWebhook = ref(null);
const webhookTestingId = ref(null);
const webhookDeleteDialog = ref({ isOpen: false, webhookId: null });

const serverchanLoading = ref(true);
const serverchanList = ref([]);
const serverchanModalOpen = ref(false);
const editingServerchan = ref(null);
const serverchanTestingId = ref(null);
const serverchanDeleteDialog = ref({ isOpen: false, configId: null });

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
  channelSettings: normalizeChannelSettings(),
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
    form.channelSettings = normalizeChannelSettings(d.channelSettings);
  },
  { immediate: true },
);

const channelCards = computed(() => {
  const diagnostics = data.value?.data?.channelDiagnostics || {};
  return Object.keys(channelSettingDefaults).map((key) => {
    const diagnostic = diagnostics[channelNameByKey[key]] || {};
    const enabled = Boolean(form.channelSettings[key]);
    const configured = Boolean(diagnostic.configured);
    const destinationCount = Number(diagnostic.destinationCount || 0);
    return {
      key,
      label: channelLabels[key],
      destinationText:
        destinationCount > 0 ? `${destinationCount} 个目的地` : '未配置目的地',
      message: enabled
        ? configured
          ? `已找到 ${destinationCount || 1} 个可用目的地。`
          : channelRequiredHints[key]
        : '此渠道不会发送通知，也不会生成失败通知。',
      statusLabel: !enabled ? '未启用' : configured ? '已就绪' : '缺少配置',
      statusClass: [
        'shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]',
        !enabled
          ? 'border-hairline bg-card/60 text-text-tertiary'
          : configured
            ? 'border-status-available/30 bg-status-available/10 text-status-available'
            : 'border-status-dropping/30 bg-status-dropping/10 text-status-dropping',
      ],
    };
  });
});

const save = async () => {
  saving.value = true;
  try {
    const response = await $fetch('/api/notifications/config', {
      method: 'POST',
      body: form,
    });
    unwrapApiEnvelope(response, t('settings.saveError'));
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

const parseEventTypes = (json) => {
  if (Array.isArray(json)) return json;
  if (!json) return [];
  try { return JSON.parse(json); } catch { return []; }
};

const formatWebhookEvent = (event) => {
  const key = `webhook.events.${String(event).toLowerCase()}`;
  const value = t(key);
  return value === key ? event : value;
};

const fetchWebhooks = async () => {
  webhooksLoading.value = true;
  try {
    const response = await $fetch('/api/webhooks');
    webhooks.value = unwrapApiEnvelope(response, t('webhook.addError')) || [];
  } catch (error) {
    toast.error(error?.message || error?.data?.msg || t('webhook.addError'));
  } finally {
    webhooksLoading.value = false;
  }
};

const openWebhookModal = () => {
  editingWebhook.value = null;
  webhookModalOpen.value = true;
};

const closeWebhookModal = () => {
  webhookModalOpen.value = false;
  editingWebhook.value = null;
};

const handleWebhookSave = async (webhookData) => {
  try {
    const response = await $fetch('/api/webhooks', { method: 'POST', body: webhookData });
    unwrapApiEnvelope(response, t('webhook.addError'));
    toast.success(t('webhook.addSuccess'));
    closeWebhookModal();
    await fetchWebhooks();
    await refresh();
  } catch (error) {
    toast.error(error?.message || error?.data?.message || t('webhook.addError'));
  }
};

const testWebhook = async (id) => {
  webhookTestingId.value = id;
  try {
    const response = await $fetch(`/api/webhooks/${id}/test`, { method: 'POST' });
    const result = unwrapApiEnvelope(response, t('webhook.testFailed'));
    if (result?.ok) toast.success(t('webhook.testSuccess'));
    else toast.error(result?.error || t('webhook.testFailed'));
  } catch (error) {
    toast.error(error?.message || error?.data?.msg || t('webhook.testFailed'));
  } finally {
    webhookTestingId.value = null;
  }
};

const deleteWebhook = (id) => {
  webhookDeleteDialog.value = { isOpen: true, webhookId: id };
};

const confirmWebhookDelete = async () => {
  const id = webhookDeleteDialog.value.webhookId;
  if (!id) {
    webhookDeleteDialog.value.isOpen = false;
    return;
  }
  try {
    const response = await $fetch(`/api/webhooks/${id}`, { method: 'DELETE' });
    unwrapApiEnvelope(response, t('webhook.deleteError'));
    toast.success(t('webhook.deleteSuccess'));
    await fetchWebhooks();
    await refresh();
  } catch (error) {
    toast.error(error?.message || error?.data?.msg || t('webhook.deleteError'));
  } finally {
    webhookDeleteDialog.value.isOpen = false;
    webhookDeleteDialog.value.webhookId = null;
  }
};

const fetchServerchan = async () => {
  serverchanLoading.value = true;
  try {
    const response = await $fetch('/api/serverchan');
    serverchanList.value = unwrapApiEnvelope(response, t('serverchan.addError')) || [];
  } catch (error) {
    toast.error(error?.message || error?.data?.msg || t('serverchan.addError'));
  } finally {
    serverchanLoading.value = false;
  }
};

const serverchanChannelLabel = (channel) => {
  const keyByChannel = {
    9: 'serviceAccount',
    98: 'android',
    88: 'webhook',
    18: 'pushdeer',
    66: 'wecomApp',
    1: 'wecomBot',
    8: 'bark',
    2: 'dingtalk',
    3: 'feishu',
  };
  const key = keyByChannel[Number(channel)] || 'default';
  return t(`serverchan.channels.${key}`);
};

const serverchanOptionSummary = (options = {}) => {
  const items = [serverchanChannelLabel(options.channel)];
  if (options.noip) items.push(t('serverchan.ipHidden'));
  if (options.openid) items.push(t('serverchan.openidConfigured'));
  if (options.tags) items.push(t('serverchan.tagsSummary', { tags: options.tags }));
  if (options.titlePrefix) items.push(t('serverchan.titlePrefixSummary', { prefix: options.titlePrefix }));
  if (options.timeoutMs && options.timeoutMs !== 10000) {
    items.push(t('serverchan.timeoutSummary', { timeout: options.timeoutMs }));
  }
  return items;
};

const openServerchanModal = (config = null) => {
  editingServerchan.value = config;
  serverchanModalOpen.value = true;
};

const closeServerchanModal = () => {
  serverchanModalOpen.value = false;
  editingServerchan.value = null;
};

const handleServerchanSave = async (configData) => {
  try {
    const response = editingServerchan.value
      ? await $fetch(`/api/serverchan/${editingServerchan.value.id}`, { method: 'PATCH', body: configData })
      : await $fetch('/api/serverchan', { method: 'POST', body: configData });
    unwrapApiEnvelope(response, t('serverchan.saveError'));
    toast.success(editingServerchan.value ? t('serverchan.updateSuccess') : t('serverchan.addSuccess'));
    closeServerchanModal();
    await fetchServerchan();
    await refresh();
  } catch (error) {
    toast.error(error?.message || error?.data?.msg || t('serverchan.saveError'));
  }
};

const testServerchan = async (id) => {
  serverchanTestingId.value = id;
  try {
    const response = await $fetch(`/api/serverchan/${id}/test`, { method: 'POST' });
    const ok = unwrapApiEnvelope(response, t('serverchan.testFailed'));
    if (ok === true || ok?.ok === true) {
      toast.success(t('serverchan.testSuccess'));
    } else {
      toast.error(response?.data?.error || response?.msg || t('serverchan.testFailed'));
    }
  } catch (error) {
    toast.error(error?.data?.data?.error || error?.data?.msg || error?.message || t('serverchan.testFailed'));
  } finally {
    serverchanTestingId.value = null;
  }
};

const deleteServerchan = (id) => {
  serverchanDeleteDialog.value = { isOpen: true, configId: id };
};

const confirmServerchanDelete = async () => {
  const id = serverchanDeleteDialog.value.configId;
  if (!id) {
    serverchanDeleteDialog.value.isOpen = false;
    return;
  }
  try {
    const response = await $fetch(`/api/serverchan/${id}`, { method: 'DELETE' });
    unwrapApiEnvelope(response, t('serverchan.deleteError'));
    toast.success(t('serverchan.deleteSuccess'));
    await fetchServerchan();
    await refresh();
  } catch (error) {
    toast.error(error?.message || error?.data?.msg || t('serverchan.deleteError'));
  } finally {
    serverchanDeleteDialog.value.isOpen = false;
    serverchanDeleteDialog.value.configId = null;
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
  fetchWebhooks();
  fetchServerchan();
});

const onSubscribe = async () => {
  const ok = await subscribe();
  if (ok) {
    toast.success(t('settings.pushSubscribed'));
    await refresh();
  } else if (pushError.value) toast.error(pushError.value);
};

const onUnsubscribe = async () => {
  const ok = await unsubscribe();
  if (ok) {
    toast.success(t('settings.pushUnsubscribed'));
    await refresh();
  }
};
</script>
