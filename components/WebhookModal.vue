<template>
  <BaseModal
    :is-open="isOpen"
    :title="webhook ? $t('webhook.editWebhook') : $t('webhook.addWebhook')"
    eyebrow="Webhook"
    size="lg"
    @close="$emit('close')"
  >
    <form @submit.prevent="handleSubmit" class="space-y-6">
      <div>
        <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">
          {{ $t('webhook.name') }} <span class="text-status-dropping">*</span>
        </label>
        <input
          v-model="form.name"
          type="text"
          required
          class="input-bare"
          :placeholder="$t('webhook.name')"
        />
      </div>

      <div>
        <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">
          {{ $t('webhook.url') }} <span class="text-status-dropping">*</span>
        </label>
        <input
          v-model="form.url"
          type="url"
          required
          class="input-bare font-mono"
          placeholder="https://example.com/webhook"
        />
      </div>

      <div>
        <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">
          {{ $t('webhook.method') }}
        </label>
        <select v-model="form.method" class="input-bare">
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
        </select>
      </div>

      <div>
        <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
              {{ $t('webhook.eventTypes') }}
            </p>
            <p class="mt-1 text-xs text-text-tertiary">{{ $t('webhook.allEventsHint') }}</p>
          </div>
          <div class="flex gap-2">
            <button type="button" class="btn-ghost px-3 py-1.5 text-xs" @click="selectAllEvents">
              {{ $t('webhook.selectAllEvents') }}
            </button>
            <button type="button" class="btn-ghost px-3 py-1.5 text-xs" @click="clearEvents">
              {{ $t('webhook.clearEvents') }}
            </button>
          </div>
        </div>
        <div class="surface-flat max-h-48 space-y-1 overflow-y-auto p-3">
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
      </div>

      <div>
        <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-3">
          {{ $t('webhook.headers') }}
        </p>
        <div class="space-y-3">
          <div
            v-for="(header, index) in form.headers"
            :key="index"
            class="flex items-end gap-3"
          >
            <input
              v-model="header.key"
              type="text"
              :placeholder="$t('webhook.headerKey')"
              class="input-bare flex-1 font-mono"
            />
            <input
              v-model="header.value"
              type="text"
              :placeholder="$t('webhook.headerValue')"
              class="input-bare flex-1 font-mono"
            />
            <button
              type="button"
              @click="removeHeader(index)"
              class="rounded-full p-2 text-text-tertiary transition-colors hover:bg-surface-sunken hover:text-status-dropping"
            >
              <XIcon class="h-4 w-4" />
            </button>
          </div>
          <button type="button" @click="addHeader" class="btn-text">
            <PlusIcon class="h-4 w-4" />
            {{ $t('webhook.addHeader') }}
          </button>
        </div>
      </div>

      <label class="flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
        <input v-model="form.enabled" type="checkbox" class="h-4 w-4 accent-accent" />
        {{ $t('webhook.enabled') }}
      </label>

      <div class="hairline" />

      <div class="flex items-center justify-end gap-3">
        <button type="button" class="btn-ghost" @click="$emit('close')">
          {{ $t('common.cancel') }}
        </button>
        <button type="submit" class="btn-primary disabled:opacity-50" :disabled="saving">
          {{ saving ? $t('common.loading') : $t('common.save') }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { Plus as PlusIcon, X as XIcon } from 'lucide-vue-next';

const props = defineProps({
  isOpen: Boolean,
  webhook: Object,
});

const emit = defineEmits(['close', 'save']);

const { t } = useI18n();
const saving = ref(false);

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

const eventLabel = (event) => {
  const key = `webhook.events.${String(event).toLowerCase()}`;
  const value = t(key);
  return value === key ? event : value;
};

const form = ref({
  name: '',
  url: '',
  method: 'POST',
  eventTypes: [],
  headers: [],
  enabled: true,
});

const parseJson = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const parseEventTypes = (value) => {
  if (Array.isArray(value)) return value;
  return parseJson(value, []);
};

watch(() => props.webhook, (webhook) => {
  if (webhook) {
    form.value = {
      name: webhook.name || '',
      url: webhook.url || '',
      method: webhook.method || 'POST',
      eventTypes: parseEventTypes(webhook.eventTypes).map((event) =>
        String(event || '').toUpperCase(),
      ),
      headers: [],
      enabled: webhook.enabled ?? true,
    };
  } else {
    form.value = {
      name: '',
      url: '',
      method: 'POST',
      eventTypes: [],
      headers: [],
      enabled: true,
    };
  }
}, { immediate: true });

const addHeader = () => {
  form.value.headers.push({ key: '', value: '' });
};

const removeHeader = (index) => {
  form.value.headers.splice(index, 1);
};

const selectAllEvents = () => {
  form.value.eventTypes = [...availableEvents];
};

const clearEvents = () => {
  form.value.eventTypes = [];
};

const handleSubmit = async () => {
  if (!form.value.name || !form.value.url) return;

  const headers = {};
  form.value.headers.forEach((h) => {
    if (h.key && h.value) headers[h.key] = h.value;
  });

  const webhookData = {
    name: form.value.name,
    url: form.value.url,
    method: form.value.method,
    eventTypes: form.value.eventTypes,
    headers: Object.keys(headers).length > 0 ? headers : null,
    enabled: form.value.enabled,
  };

  emit('save', webhookData);
};
</script>
