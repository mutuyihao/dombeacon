<template>
  <BaseModal
    :is-open="isOpen"
    :title="$t('notification.detailTitle')"
    :eyebrow="$t('notification.deliveryEyebrow')"
    size="lg"
    @close="$emit('close')"
  >
    <div v-if="event" class="space-y-6">
      <div class="flex flex-wrap items-center gap-4 text-[11px] font-semibold uppercase tracking-[0.16em]">
        <span :class="statusToneClass(event.status)" class="flex items-center gap-1.5">
          <span :class="['h-1.5 w-1.5 rounded-full', statusDotClass(event.status)]" />
          {{ formatStatus(event.status) }}
        </span>
        <span class="text-text-tertiary">·</span>
        <span class="text-text-main">{{ formatChannel(event.channel) }}</span>
        <span class="text-text-tertiary">·</span>
        <span class="text-text-secondary">{{ formatEventType(event.eventType) }}</span>
      </div>

      <dl class="text-sm">
        <div class="flex items-center justify-between border-b border-hairline py-3">
          <dt class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">ID</dt>
          <dd class="font-mono text-text-main">{{ event.id }}</dd>
        </div>
        <div v-if="event.domain" class="flex items-center justify-between border-b border-hairline py-3">
          <dt class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('notification.domain') }}</dt>
          <dd class="font-mono text-text-main">{{ event.domain }}</dd>
        </div>
        <div v-if="event.actionId" class="flex items-center justify-between border-b border-hairline py-3">
          <dt class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('notification.actionId') }}</dt>
          <dd class="font-mono text-text-main">{{ event.actionId }}</dd>
        </div>
        <div class="flex items-center justify-between border-b border-hairline py-3">
          <dt class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('notification.createdAt') }}</dt>
          <dd class="text-text-main">{{ formatTime(event.createdAt) }}</dd>
        </div>
        <div v-if="event.sentAt" class="flex items-center justify-between border-b border-hairline py-3">
          <dt class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('notification.sentAt') }}</dt>
          <dd class="text-text-main">{{ formatTime(event.sentAt) }}</dd>
        </div>
        <div v-if="event.failedAt" class="flex items-center justify-between border-b border-hairline py-3">
          <dt class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('notification.failedAt') }}</dt>
          <dd class="text-text-main">{{ formatTime(event.failedAt) }}</dd>
        </div>
        <div v-if="event.retryOf" class="flex items-center justify-between py-3">
          <dt class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('notification.retryOfLabel') }}</dt>
          <dd class="font-mono text-text-main">#{{ event.retryOf }}</dd>
        </div>
      </dl>

      <div v-if="event.errorMessage">
        <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-status-dropping mb-2">
          {{ $t('notification.errorMessage') }}
        </p>
        <pre class="surface-flat whitespace-pre-wrap p-4 font-mono text-xs leading-5 text-text-main">{{ event.errorMessage }}</pre>
      </div>

      <div v-if="event.metadata">
        <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-2">
          {{ $t('notification.metadata') }}
        </p>
        <pre class="surface-flat overflow-x-auto whitespace-pre-wrap p-4 font-mono text-xs leading-5 text-text-main">{{ formattedMetadata }}</pre>
      </div>
    </div>

    <div class="hairline mt-6" />

    <div class="mt-6 flex items-center justify-end gap-3">
      <button type="button" class="btn-ghost" @click="$emit('close')">
        {{ $t('common.close') }}
      </button>
      <button
        v-if="event && event.status === 'FAILED' && !event.archivedAt"
        @click="$emit('retry', event)"
        class="btn-primary"
      >
        {{ $t('notification.retry') }}
      </button>
    </div>
  </BaseModal>
</template>

<script setup>
const props = defineProps({
  isOpen: Boolean,
  event: Object,
});

defineEmits(['close', 'retry']);

const { t } = useI18n();

const formattedMetadata = computed(() => {
  if (!props.event?.metadata) return '';
  try {
    return JSON.stringify(JSON.parse(props.event.metadata), null, 2);
  } catch {
    return props.event.metadata;
  }
});

const formatTime = (ts) => {
  if (!ts) return '-';
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const formatStatus = (status) => {
  if (!status) return '-';
  const key = `notification.statuses.${String(status).toLowerCase()}`;
  const value = t(key);
  return value === key ? status : value;
};

const formatEventType = (eventType) => {
  if (!eventType) return '-';
  const key = `notification.events.${String(eventType).toLowerCase()}`;
  const value = t(key);
  return value === key ? eventType : value;
};

const formatChannel = (channel) => {
  switch (channel) {
    case 'EMAIL': return t('notification.channels.email');
    case 'WEBHOOK': return t('notification.channels.webhook');
    case 'SERVERCHAN': return t('notification.channels.serverchan');
    case 'PUSH': return t('notification.channels.push');
    default: return channel || '-';
  }
};

const statusToneClass = (status) => {
  switch (status) {
    case 'SENT': return 'text-status-available';
    case 'FAILED': return 'text-status-dropping';
    case 'PENDING': return 'text-status-expiring';
    default: return 'text-status-unknown';
  }
};

const statusDotClass = (status) => {
  switch (status) {
    case 'SENT': return 'bg-status-available';
    case 'FAILED': return 'bg-status-dropping';
    case 'PENDING': return 'bg-status-expiring';
    default: return 'bg-status-unknown';
  }
};
</script>
