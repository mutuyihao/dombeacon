<template>
  <div class="flex min-h-full flex-col gap-4 md:h-full md:min-h-0 md:overflow-hidden">

    <!-- ─── PAGE HEADER ─────────────────────────────────────────────── -->
    <header class="shrink-0">
      <p class="eyebrow mb-2">{{ $t('notification.deliveryEyebrow') }}</p>
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="headline-display text-3xl md:text-4xl">{{ $t('notification.title') }}</h1>
          <p class="mt-2 max-w-2xl text-sm text-text-secondary">{{ $t('notification.description') }}</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" @click="toggleArchivedView" :disabled="loading || bulkWorking" class="btn-ghost disabled:opacity-50">
            {{ showArchived ? $t('notification.viewActive') : $t('notification.viewArchived') }}
          </button>
          <button v-if="canArchiveFailed" type="button" @click="archiveFailedRecords" :disabled="bulkWorking" class="btn-ghost disabled:opacity-50">
            {{ $t('notification.archiveFailed') }}
          </button>
          <button v-if="canClearFailed" type="button" @click="clearFailedRecords" :disabled="bulkWorking" class="btn-ghost text-status-dropping disabled:opacity-50">
            {{ $t('notification.clearFailed') }}
          </button>
          <button v-if="canClearArchived" type="button" @click="clearArchivedRecords" :disabled="bulkWorking" class="btn-ghost text-status-dropping disabled:opacity-50">
            {{ $t('notification.clearArchived') }}
          </button>
          <button @click="refreshEvents" :disabled="loading || bulkWorking" class="btn-ghost disabled:opacity-50">
            <RefreshIcon class="h-4 w-4" :class="{ 'animate-spin': loading }" />
            {{ $t('notification.refresh') }}
          </button>
        </div>
      </div>
    </header>

    <!-- ─── FILTERS ─────────────────────────────────────────────────── -->
    <section class="shrink-0 rounded-[18px] border border-hairline bg-card/55 p-3 md:p-4">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div class="min-w-0">
          <p class="eyebrow mb-3">{{ $t('notification.attentionQueue') }}</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="preset in statusPresets"
              :key="preset.value || 'all'"
              type="button"
              @click="applyStatusPreset(preset.value)"
              :class="[
                'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                filters.status === preset.value
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-hairline bg-card text-text-secondary hover:border-hairline-strong hover:text-text-main',
              ]"
            >
              {{ preset.label }}
            </button>
          </div>
          <p class="mt-2 text-xs leading-5 text-text-tertiary">
            {{ $t('notification.attentionHint') }}
          </p>
        </div>

        <div class="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-3 xl:w-[42rem]">
          <div>
            <label class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
              {{ $t('notification.channel') }}
            </label>
            <select v-model="filters.channel" @change="resetAndFetch" class="input-bare">
              <option value="">{{ $t('common.all') }}</option>
              <option value="EMAIL">{{ $t('notification.channels.email') }}</option>
              <option value="WEBHOOK">{{ $t('notification.channels.webhook') }}</option>
              <option value="SERVERCHAN">{{ $t('notification.channels.serverchan') }}</option>
              <option value="PUSH">{{ $t('notification.channels.push') }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
              {{ $t('notification.eventType') }}
            </label>
            <select v-model="filters.eventType" @change="resetAndFetch" class="input-bare">
              <option value="">{{ $t('common.all') }}</option>
              <option v-for="eventType in notificationEventOptions" :key="eventType" :value="eventType">
                {{ formatEventType(eventType) }}
              </option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
              {{ $t('notification.dateRange') }}
            </label>
            <select v-model="dateRange" @change="applyDateRange" class="input-bare">
              <option value="">{{ $t('common.all') }}</option>
              <option value="24h">{{ $t('notification.last24h') }}</option>
              <option value="7d">{{ $t('notification.last7d') }}</option>
              <option value="30d">{{ $t('notification.last30d') }}</option>
            </select>
          </div>
        </div>
      </div>

      <div class="mt-3 flex items-center justify-between border-t border-hairline pt-3 text-xs">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-text-secondary">
            {{ $t('notification.totalCount', { count: total }) }}
          </span>
          <span v-if="showArchived" class="rounded-full border border-hairline px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">
            {{ $t('notification.archivedRecords') }}
          </span>
        </div>
        <button v-if="hasNonDefaultFilters" @click="clearFilters" class="btn-text text-xs">
          {{ $t('notification.clearFilters') }}
        </button>
      </div>
    </section>

    <!-- ─── LOADING ─────────────────────────────────────────────────── -->
    <section class="relative min-h-[26rem] flex-1 overflow-y-auto rounded-[18px] border border-hairline bg-card/45 p-2 pr-3 md:min-h-0 md:p-3 md:pr-4">
    <div v-if="loading && events.length === 0" class="flex justify-center py-16">
      <LoadingSpinner size="lg" />
    </div>

    <!-- ─── EVENTS TABLE ────────────────────────────────────────────── -->
    <div v-else-if="events.length > 0">
      <div class="surface overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-hairline-strong">
                <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('notification.time') }}</th>
                <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('notification.channel') }}</th>
                <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('notification.eventType') }}</th>
                <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('notification.domain') }}</th>
                <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('notification.status') }}</th>
                <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-hairline">
              <tr
                v-for="event in events"
                :key="event.id"
                class="cursor-pointer transition-colors hover:bg-surface-sunken"
                @click="openDetail(event)"
              >
                <td class="whitespace-nowrap px-4 py-3 font-mono text-xs text-text-secondary">
                  {{ formatTime(event.createdAt) }}
                </td>
                <td class="px-4 py-3">
                  <span :class="['text-[11px] font-semibold uppercase tracking-[0.14em]', channelToneClass(event.channel)]">
                    {{ formatChannel(event.channel) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-text-main">
                  <span class="text-xs">{{ formatEventType(event.eventType) }}</span>
                  <span v-if="event.retryOf" class="ml-1 text-xs text-text-tertiary">
                    ({{ $t('notification.retryOf', { id: event.retryOf }) }})
                  </span>
                </td>
                <td class="px-4 py-3 font-mono text-xs text-text-main">
                  {{ event.domain || '-' }}
                </td>
                <td class="px-4 py-3">
                  <span :class="['flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]', statusToneClass(event.status)]">
                    <span :class="['h-1.5 w-1.5 rounded-full', statusDotClass(event.status)]" />
                    {{ formatStatus(event.status) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-right">
                  <button
                    v-if="event.status === 'FAILED' && !event.archivedAt"
                    @click.stop="retryEvent(event)"
                    :disabled="retryingId === event.id"
                    class="btn-text text-xs disabled:opacity-50"
                  >
                    <span v-if="retryingId !== event.id">{{ $t('notification.retry') }}</span>
                    <LoadingSpinner v-else size="sm" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="hasMore" class="border-t border-hairline p-4 text-center">
          <button @click="loadMore" :disabled="loading" class="btn-text text-xs disabled:opacity-50">
            {{ loading ? $t('common.loading') : $t('notification.loadMore') }}
          </button>
        </div>
      </div>
    </div>

    <!-- ─── EMPTY ───────────────────────────────────────────────────── -->
    <div v-else class="py-24 text-center">
      <BellIcon class="mx-auto mb-4 h-8 w-8 text-text-tertiary" />
      <p class="text-sm text-text-secondary">{{ emptyMessage }}</p>
    </div>
    </section>

    <NotificationDetailModal
      :is-open="detailOpen"
      :event="selectedEvent"
      @close="closeDetail"
      @retry="retryEvent"
    />

  </div>
</template>

<script setup>
import {
  RefreshCw as RefreshIcon,
  Bell as BellIcon,
} from '@lucide/vue';
import { unwrapApiEnvelope } from '~/utils/api-envelope';

const { t } = useI18n();
const toast = useToast();

const loading = ref(false);
const events = ref([]);
const total = ref(0);
const page = ref(1);
const limit = ref(50);
const DEFAULT_STATUS = 'FAILED';
const notificationEventOptions = [
  'STATUS_CHANGE',
  'WANTED_AVAILABLE',
  'WANTED_DROPPING',
  'OWNED_EXPIRING',
  'SSL_EXPIRING',
  'SSL_INVALID',
  'EXPIRING_SOON',
  'SCAN_FAILED',
  'DAILY_SUMMARY',
  'DROPPING_ALERT',
  'SECURITY_FINDING_HIGH',
];

const detailOpen = ref(false);
const selectedEvent = ref(null);
const retryingId = ref(null);
const showArchived = ref(false);
const bulkWorking = ref(false);

const filters = ref({
  channel: '',
  status: DEFAULT_STATUS,
  eventType: '',
  from: '',
  to: '',
});

const dateRange = ref('');

const statusPresets = computed(() => [
  { value: DEFAULT_STATUS, label: t('notification.statuses.failed') },
  { value: 'PENDING', label: t('notification.statuses.pending') },
  { value: 'SENT', label: t('notification.statuses.sent') },
  { value: '', label: t('notification.allHistory') },
]);

const hasMore = computed(() => events.value.length < total.value);
const canArchiveFailed = computed(() =>
  !showArchived.value && filters.value.status === DEFAULT_STATUS && total.value > 0,
);
const canClearFailed = computed(() =>
  !showArchived.value && filters.value.status === DEFAULT_STATUS && total.value > 0,
);
const canClearArchived = computed(() => showArchived.value && total.value > 0);

const hasSecondaryFilters = computed(() =>
  Boolean(filters.value.channel || filters.value.eventType || filters.value.from || filters.value.to || dateRange.value),
);

const hasNonDefaultFilters = computed(() =>
  showArchived.value || hasSecondaryFilters.value || filters.value.status !== DEFAULT_STATUS,
);

const emptyMessage = computed(() => {
  if (showArchived.value) return t('notification.noArchivedEvents');
  if (filters.value.status === DEFAULT_STATUS && !hasSecondaryFilters.value) {
    return t('notification.noFailedEvents');
  }
  if (hasNonDefaultFilters.value) return t('notification.noMatchingEvents');
  return t('notification.noEvents');
});

const buildQueryParams = () => {
  const params = { page: page.value, limit: limit.value };
  Object.entries(filters.value).forEach(([key, value]) => {
    if (value) params[key] = value;
  });
  if (showArchived.value) params.archived = '1';
  return params;
};

const fetchEvents = async () => {
  loading.value = true;
  try {
    const response = await $fetch('/api/notifications', {
      query: buildQueryParams(),
    });
    const payload = unwrapApiEnvelope(response, t('notification.fetchError')) || {};
    const items = Array.isArray(payload.items) ? payload.items : [];
    if (page.value === 1) {
      events.value = items;
    } else {
      events.value = [...events.value, ...items];
    }
    total.value = Number(payload.total || 0);
  } catch (error) {
    toast.error(error?.message || t('notification.fetchError'));
  } finally {
    loading.value = false;
  }
};

const refreshEvents = () => {
  page.value = 1;
  events.value = [];
  fetchEvents();
};

const resetAndFetch = refreshEvents;

const loadMore = () => {
  if (loading.value || !hasMore.value) return;
  page.value += 1;
  fetchEvents();
};

const applyStatusPreset = (status) => {
  if (filters.value.status === status) return;
  filters.value.status = status;
  resetAndFetch();
};

const applyDateRange = () => {
  const now = new Date();
  let from = '';
  if (dateRange.value === '24h') {
    from = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  } else if (dateRange.value === '7d') {
    from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  } else if (dateRange.value === '30d') {
    from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }
  filters.value.from = from;
  resetAndFetch();
};

const clearFilters = () => {
  filters.value = { channel: '', status: DEFAULT_STATUS, eventType: '', from: '', to: '' };
  dateRange.value = '';
  showArchived.value = false;
  resetAndFetch();
};

const toggleArchivedView = () => {
  showArchived.value = !showArchived.value;
  resetAndFetch();
};

const buildRecordMutationBody = () => ({
  status: filters.value.status,
  channel: filters.value.channel || undefined,
  eventType: filters.value.eventType || undefined,
  from: filters.value.from || undefined,
  to: filters.value.to || undefined,
});

const runBulkNotificationAction = async ({ endpoint, body, confirmKey, successKey, errorKey }) => {
  if (!window.confirm(t(confirmKey))) return;
  bulkWorking.value = true;
  try {
    const response = await $fetch(endpoint, {
      method: 'POST',
      body,
    });
    unwrapApiEnvelope(response, t(errorKey));
    toast.success(t(successKey));
    refreshEvents();
  } catch (error) {
    toast.error(error?.message || error?.data?.msg || t(errorKey));
  } finally {
    bulkWorking.value = false;
  }
};

const archiveFailedRecords = () => {
  runBulkNotificationAction({
    endpoint: '/api/notifications/archive',
    body: { ...buildRecordMutationBody(), status: DEFAULT_STATUS },
    confirmKey: 'notification.archiveFailedConfirm',
    successKey: 'notification.archiveSuccess',
    errorKey: 'notification.archiveError',
  });
};

const clearFailedRecords = () => {
  runBulkNotificationAction({
    endpoint: '/api/notifications/clear',
    body: { ...buildRecordMutationBody(), status: DEFAULT_STATUS },
    confirmKey: 'notification.clearFailedConfirm',
    successKey: 'notification.clearSuccess',
    errorKey: 'notification.clearError',
  });
};

const clearArchivedRecords = () => {
  runBulkNotificationAction({
    endpoint: '/api/notifications/clear',
    body: { ...buildRecordMutationBody(), archived: true },
    confirmKey: 'notification.clearArchivedConfirm',
    successKey: 'notification.clearSuccess',
    errorKey: 'notification.clearError',
  });
};

const openDetail = (event) => {
  selectedEvent.value = event;
  detailOpen.value = true;
};

const closeDetail = () => {
  detailOpen.value = false;
  selectedEvent.value = null;
};

const retryEvent = async (event) => {
  retryingId.value = event.id;
  try {
    const response = await $fetch(`/api/notifications/${event.id}/retry`, {
      method: 'POST',
    });
    const retryResult = unwrapApiEnvelope(response, t('notification.retryFailed'));
    if (retryResult?.ok) {
      toast.success(t('notification.retrySuccess'));
    } else {
      toast.error(t('notification.retryFailed'));
    }
    if (detailOpen.value) closeDetail();
    resetAndFetch();
  } catch (error) {
    toast.error(error?.message || error?.data?.msg || t('notification.retryFailed'));
  } finally {
    retryingId.value = null;
  }
};

const formatTime = (ts) => {
  if (!ts) return '-';
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const formatEventType = (type) => {
  if (!type) return '';
  const key = `notification.events.${type.toLowerCase()}`;
  const translated = t(key);
  return translated === key ? type : translated;
};

const formatStatus = (status) => {
  if (!status) return '-';
  const key = `notification.statuses.${String(status).toLowerCase()}`;
  const translated = t(key);
  return translated === key ? status : translated;
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

const channelToneClass = (channel) => {
  switch (channel) {
    case 'EMAIL': return 'text-accent';
    case 'WEBHOOK': return 'text-status-registered';
    case 'SERVERCHAN': return 'text-status-expiring';
    case 'PUSH': return 'text-status-available';
    default: return 'text-status-unknown';
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

onMounted(() => {
  fetchEvents();
});
</script>
