<template>
  <BaseModal
    :is-open="isOpen"
    :title="config ? $t('serverchan.editServerchan') : $t('serverchan.addServerchan')"
    eyebrow="Server酱"
    size="xl"
    @close="$emit('close')"
  >
    <form @submit.prevent="handleSubmit" class="space-y-6">
      <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div class="space-y-5">
          <section class="surface-flat p-4">
            <p class="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
              {{ $t('serverchan.basicConfig') }}
            </p>

            <div class="space-y-4">
              <div>
                <label class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                  {{ $t('serverchan.name') }} <span class="text-status-dropping">*</span>
                </label>
                <input
                  v-model="form.name"
                  type="text"
                  required
                  class="input-bare"
                  :placeholder="$t('serverchan.name')"
                />
              </div>

              <div>
                <label class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                  {{ $t('serverchan.sendKey') }} <span class="text-status-dropping">*</span>
                </label>
                <input
                  v-model="form.sendKey"
                  type="text"
                  required
                  class="input-bare font-mono"
                  :placeholder="config ? (config.sendKeyMasked || $t('serverchan.sendKeyPlaceholder')) : $t('serverchan.sendKeyPlaceholder')"
                />
                <p class="mt-1.5 text-xs text-text-tertiary">
                  {{ $t('serverchan.sendKeyHint') }}
                </p>
              </div>

              <label class="flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
                <input v-model="form.enabled" type="checkbox" class="h-4 w-4 accent-accent" />
                {{ $t('serverchan.enabled') }}
              </label>
            </div>
          </section>

          <section class="surface-flat p-4">
            <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                  {{ $t('serverchan.deliveryOptions') }}
                </p>
                <p class="mt-1 text-xs leading-5 text-text-secondary">
                  {{ $t('serverchan.deliveryOptionsDescription') }}
                </p>
              </div>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <div>
                <label class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                  {{ $t('serverchan.channel') }}
                </label>
                <select v-model="form.options.channel" class="input-bare">
                  <option
                    v-for="channel in channelOptions"
                    :key="channel.value || 'default'"
                    :value="channel.value"
                  >
                    {{ channel.label }}
                  </option>
                </select>
                <p class="mt-1.5 text-xs text-text-tertiary">{{ selectedChannelHint }}</p>
              </div>

              <div>
                <label class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                  {{ $t('serverchan.timeoutMs') }}
                </label>
                <input
                  v-model.number="form.options.timeoutMs"
                  type="number"
                  min="3000"
                  max="30000"
                  step="1000"
                  class="input-bare font-mono"
                />
                <p class="mt-1.5 text-xs text-text-tertiary">{{ $t('serverchan.timeoutHint') }}</p>
              </div>

              <div>
                <label class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                  {{ $t('serverchan.openid') }}
                </label>
                <input
                  v-model="form.options.openid"
                  type="text"
                  class="input-bare font-mono"
                  :placeholder="$t('serverchan.openidPlaceholder')"
                />
                <p class="mt-1.5 text-xs text-text-tertiary">{{ $t('serverchan.openidHint') }}</p>
              </div>

              <div>
                <label class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                  {{ $t('serverchan.tags') }}
                </label>
                <input
                  v-model="form.options.tags"
                  type="text"
                  class="input-bare"
                  :placeholder="$t('serverchan.tagsPlaceholder')"
                />
                <p class="mt-1.5 text-xs text-text-tertiary">{{ $t('serverchan.tagsHint') }}</p>
              </div>

              <div>
                <label class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                  {{ $t('serverchan.titlePrefix') }}
                </label>
                <input
                  v-model="form.options.titlePrefix"
                  type="text"
                  maxlength="24"
                  class="input-bare"
                  :placeholder="$t('serverchan.titlePrefixPlaceholder')"
                />
                <p class="mt-1.5 text-xs text-text-tertiary">{{ $t('serverchan.titlePrefixHint') }}</p>
              </div>

              <label class="surface-sunken flex cursor-pointer items-start gap-3 rounded-xl px-3 py-3 text-sm text-text-secondary">
                <input v-model="form.options.noip" type="checkbox" class="mt-0.5 h-4 w-4 accent-accent" />
                <span>
                  <span class="block font-medium text-text-main">{{ $t('serverchan.hideIp') }}</span>
                  <span class="mt-1 block text-xs leading-5 text-text-tertiary">{{ $t('serverchan.hideIpHint') }}</span>
                </span>
              </label>
            </div>
          </section>

          <section class="surface-flat p-4">
            <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                  {{ $t('serverchan.eventTypes') }}
                </p>
                <p class="mt-1 text-xs text-text-tertiary">{{ $t('serverchan.allEventsHint') }}</p>
              </div>
              <div class="flex gap-2">
                <button type="button" class="btn-ghost px-3 py-1.5 text-xs" @click="selectAllEvents">
                  {{ $t('serverchan.selectAllEvents') }}
                </button>
                <button type="button" class="btn-ghost px-3 py-1.5 text-xs" @click="clearEvents">
                  {{ $t('serverchan.clearEvents') }}
                </button>
              </div>
            </div>

            <div class="grid max-h-56 gap-1 overflow-y-auto md:grid-cols-2">
              <label
                v-for="event in availableEvents"
                :key="event"
                class="flex cursor-pointer items-center gap-2 rounded-md p-2 transition-colors hover:bg-card"
              >
                <input
                  type="checkbox"
                  :value="event"
                  v-model="form.eventTypes"
                  class="h-4 w-4 accent-accent"
                />
                <span class="text-sm text-text-main">{{ eventLabel(event) }}</span>
              </label>
            </div>
          </section>
        </div>

        <aside class="space-y-4">
          <div class="surface-flat flex items-start gap-3 p-4">
            <InfoIcon class="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <div class="text-xs text-text-main">
              <p class="mb-1 font-semibold">{{ $t('serverchan.howToGetSendKey') }}</p>
              <pre class="whitespace-pre-wrap font-sans leading-5 text-text-secondary">{{ $t('serverchan.sendKeyGuide') }}</pre>
            </div>
          </div>

          <div class="surface-flat p-4">
            <p class="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
              {{ $t('serverchan.apiGuideTitle') }}
            </p>
            <ul class="space-y-2 text-xs leading-5 text-text-secondary">
              <li v-for="item in apiGuideItems" :key="item">{{ item }}</li>
            </ul>
          </div>
        </aside>
      </div>

      <div class="hairline" />

      <div class="flex items-center justify-end gap-3">
        <button type="button" class="btn-ghost" @click="$emit('close')">
          {{ $t('common.cancel') }}
        </button>
        <button type="submit" class="btn-primary disabled:opacity-50" :disabled="!canSubmit">
          {{ $t('common.save') }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { Info as InfoIcon } from '@lucide/vue';

const props = defineProps({
  isOpen: Boolean,
  config: Object,
});

const emit = defineEmits(['close', 'save']);

const { t } = useI18n();

const availableEvents = [
  'WANTED_AVAILABLE',
  'WANTED_DROPPING',
  'OWNED_EXPIRING',
  'SSL_EXPIRING',
  'SSL_INVALID',
  'STATUS_CHANGE',
  'DROPPING_ALERT',
  'DAILY_SUMMARY',
  'SECURITY_FINDING_HIGH',
];

const channelOptions = computed(() => [
  { value: '', label: t('serverchan.channels.default'), hint: t('serverchan.channelHints.default') },
  { value: '9', label: t('serverchan.channels.serviceAccount'), hint: t('serverchan.channelHints.serviceAccount') },
  { value: '98', label: t('serverchan.channels.android'), hint: t('serverchan.channelHints.android') },
  { value: '88', label: t('serverchan.channels.webhook'), hint: t('serverchan.channelHints.webhook') },
  { value: '18', label: t('serverchan.channels.pushdeer'), hint: t('serverchan.channelHints.pushdeer') },
  { value: '66', label: t('serverchan.channels.wecomApp'), hint: t('serverchan.channelHints.wecomApp') },
  { value: '1', label: t('serverchan.channels.wecomBot'), hint: t('serverchan.channelHints.wecomBot') },
  { value: '8', label: t('serverchan.channels.bark'), hint: t('serverchan.channelHints.bark') },
  { value: '2', label: t('serverchan.channels.dingtalk'), hint: t('serverchan.channelHints.dingtalk') },
  { value: '3', label: t('serverchan.channels.feishu'), hint: t('serverchan.channelHints.feishu') },
]);

const apiGuideItems = computed(() => [
  t('serverchan.apiGuide.title'),
  t('serverchan.apiGuide.desp'),
  t('serverchan.apiGuide.short'),
  t('serverchan.apiGuide.noip'),
  t('serverchan.apiGuide.channel'),
  t('serverchan.apiGuide.openid'),
  t('serverchan.apiGuide.tags'),
]);

const defaultOptions = () => ({
  channel: '',
  noip: false,
  openid: '',
  tags: '',
  titlePrefix: '',
  timeoutMs: 10000,
});

const form = ref({
  name: '',
  sendKey: '',
  eventTypes: [],
  enabled: true,
  options: defaultOptions(),
});

const parseEventTypes = (value) => {
  if (Array.isArray(value)) return value;
  try {
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
};

const normalizeOptionsForForm = (options = {}) => ({
  channel: options.channel ? String(options.channel) : '',
  noip: Boolean(options.noip),
  openid: options.openid || '',
  tags: options.tags || '',
  titlePrefix: options.titlePrefix || '',
  timeoutMs: options.timeoutMs || 10000,
});

watch(() => props.config, (config) => {
  if (config) {
    form.value = {
      name: config.name || '',
      sendKey: '',
      eventTypes: parseEventTypes(config.eventTypes).map((event) =>
        String(event || '').toUpperCase(),
      ),
      enabled: config.enabled ?? true,
      options: normalizeOptionsForForm(config.options || {}),
    };
  } else {
    form.value = {
      name: '',
      sendKey: '',
      eventTypes: [],
      enabled: true,
      options: defaultOptions(),
    };
  }
}, { immediate: true });

const eventLabel = (event) => {
  const key = `serverchan.events.${event}`;
  const value = t(key);
  return value === key ? event : value;
};

const selectedChannelHint = computed(() =>
  channelOptions.value.find((channel) => channel.value === form.value.options.channel)?.hint ||
  t('serverchan.channelHints.default'),
);

const canSubmit = computed(() => Boolean(form.value.name && (form.value.sendKey || props.config)));

const selectAllEvents = () => {
  form.value.eventTypes = [...availableEvents];
};

const clearEvents = () => {
  form.value.eventTypes = [];
};

const handleSubmit = async () => {
  if (!canSubmit.value) return;

  const channel = Number(form.value.options.channel);
  const configData = {
    name: form.value.name,
    sendKey: form.value.sendKey,
    eventTypes: form.value.eventTypes,
    enabled: form.value.enabled,
    options: {
      channel: Number.isFinite(channel) && channel > 0 ? channel : null,
      noip: Boolean(form.value.options.noip),
      openid: String(form.value.options.openid || '').trim(),
      tags: String(form.value.options.tags || '').trim(),
      titlePrefix: String(form.value.options.titlePrefix || '').trim(),
      timeoutMs: Number(form.value.options.timeoutMs) || 10000,
    },
  };

  emit('save', configData);
};
</script>
