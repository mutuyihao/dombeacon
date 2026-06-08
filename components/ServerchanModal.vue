<template>
  <BaseModal
    :is-open="isOpen"
    :title="$t('serverchan.addServerchan')"
    eyebrow="Server酱"
    size="lg"
    @close="$emit('close')"
  >
    <form @submit.prevent="handleSubmit" class="space-y-6">
      <div>
        <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">
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
        <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">
          {{ $t('serverchan.sendKey') }} <span class="text-status-dropping">*</span>
        </label>
        <input
          v-model="form.sendKey"
          type="text"
          required
          class="input-bare font-mono"
          :placeholder="$t('serverchan.sendKeyPlaceholder')"
        />
        <p class="mt-1.5 text-xs text-text-tertiary">
          {{ $t('serverchan.sendKeyHint') }}
        </p>
      </div>

      <div class="surface-flat flex items-start gap-3 p-4">
        <InfoIcon class="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <div class="text-xs text-text-main">
          <p class="font-semibold mb-1">{{ $t('serverchan.howToGetSendKey') }}</p>
          <pre class="whitespace-pre-wrap font-sans leading-5 text-text-secondary">{{ $t('serverchan.sendKeyGuide') }}</pre>
        </div>
      </div>

      <div>
        <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-3">
          {{ $t('serverchan.eventTypes') }}
        </p>
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

      <label class="flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
        <input v-model="form.enabled" type="checkbox" class="h-4 w-4 accent-accent" />
        {{ $t('serverchan.enabled') }}
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
import { Info as InfoIcon } from 'lucide-vue-next';

const props = defineProps({
  isOpen: Boolean,
  config: Object,
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
  'BRAND_WATCH_REGISTERED',
];

const eventLabels = {
  WANTED_AVAILABLE: 'Wanted Domain Available',
  WANTED_DROPPING: 'Wanted Domain Dropping',
  OWNED_EXPIRING: 'Owned Domain Expiring',
  SSL_EXPIRING: 'SSL Expiring Soon',
  SSL_INVALID: 'SSL Invalid',
  STATUS_CHANGE: 'Status Change',
  DROPPING_ALERT: 'Dropping Alert',
  DAILY_SUMMARY: 'Daily Summary',
  SECURITY_FINDING_HIGH: 'High Security Finding',
  BRAND_WATCH_REGISTERED: 'Registered Brand Watch Hit',
};

const eventLabel = (event) => eventLabels[event] || event;

const form = ref({
  name: '',
  sendKey: '',
  eventTypes: [],
  enabled: true,
});

const parseEventTypes = (value) => {
  if (Array.isArray(value)) return value;
  try {
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
};

watch(() => props.config, (config) => {
  if (config) {
    form.value = {
      name: config.name || '',
      sendKey: '',
      eventTypes: parseEventTypes(config.eventTypes).map((event) =>
        String(event || '').toUpperCase(),
      ),
      enabled: config.enabled ?? true,
    };
  } else {
    form.value = {
      name: '',
      sendKey: '',
      eventTypes: [],
      enabled: true,
    };
  }
}, { immediate: true });

const handleSubmit = async () => {
  if (!form.value.name || !form.value.sendKey) return;

  const configData = {
    name: form.value.name,
    sendKey: form.value.sendKey,
    eventTypes: form.value.eventTypes,
    enabled: form.value.enabled,
  };

  emit('save', configData);
};
</script>
