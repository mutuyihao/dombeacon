<template>
  <div class="flex min-h-full flex-col gap-6 md:h-full md:min-h-0 md:overflow-hidden">

    <!-- ─── PAGE HEADER ─────────────────────────────────────────────── -->
    <header class="shrink-0">
      <p class="eyebrow mb-2">Delivery log</p>
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="headline-display text-3xl md:text-4xl">{{ $t('notification.title') }}</h1>
          <p class="mt-2 max-w-2xl text-sm text-text-secondary">{{ $t('notification.description') }}</p>
        </div>
        <button @click="fetchEvents" :disabled="loading" class="btn-ghost disabled:opacity-50">
          <RefreshIcon class="h-4 w-4" :class="{ 'animate-spin': loading }" />
          {{ $t('notification.refresh') }}
        </button>
      </div>
    </header>

    <!-- ─── FILTERS ─────────────────────────────────────────────────── -->
    <section class="shrink-0">
      <p class="eyebrow mb-5">Filters</p>
      <div class="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">
            {{ $t('notification.channel') }}
          </label>
          <select v-model="filters.channel" @change="resetAndFetch" class="input-bare">
            <option value="">{{ $t('common.all') }}</option>
            <option value="EMAIL">Email</option>
            <option value="WEBHOOK">Webhook</option>
            <option value="SERVERCHAN">Server酱</option>
            <option value="PUSH">Web Push</option>
          </select>
        </div>
        <div>
          <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">
            {{ $t('notification.status') }}
          </label>
          <select v-model="filters.status" @change="resetAndFetch" class="input-bare">
            <option value="">{{ $t('common.all') }}</option>
            <option value="SENT">{{ $t('notification.statuses.sent') }}</option>
            <option value="FAILED">{{ $t('notification.statuses.failed') }}</option>
            <option value="PENDING">{{ $t('notification.statuses.pending') }}</option>
          </select>
        </div>
        <div>
          <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">
            {{ $t('notification.eventType') }}
          </label>
          <select v-model="filters.eventType" @change="resetAndFetch" class="input-bare">
            <option value="">{{ $t('common.all') }}</option>
            <option value="STATUS_CHANGE">{{ $t('notification.events.status_change') }}</option>
            <option value="WANTED_AVAILABLE">{{ $t('notification.events.wanted_available') }}</option>
            <option value="EXPIRING_SOON">{{ $t('notification.events.expiring_soon') }}</option>
            <option value="DAILY_SUMMARY">{{ $t('notification.events.daily_summary') }}</option>
            <option value="DROPPING_ALERT">{{ $t('notification.events.dropping_alert') }}</option>
          </select>
        </div>
        <div>
          <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">
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

      <div v-if="hasActiveFilters" class="mt-6 flex items-center justify-between text-xs">
        <span class="text-text-secondary">
          {{ $t('notification.totalCount', { count: total }) }}
        </span>
        <button @click="clearFilters" class="btn-text text-xs">
          {{ $t('notification.clearFilters') }}
        </button>
      </div>
    </section>

    <!-- ─── LOADING ─────────────────────────────────────────────────── -->
    <section class="relative min-h-[26rem] flex-1 overflow-y-auto rounded-[18px] border border-hairline bg-card/45 p-3 md:min-h-0 md:p-4">
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
                <th class="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('notification.time') }}</th>
                <th class="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('notification.channel') }}</th>
                <th class="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('notification.eventType') }}</th>
                <th class="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('notification.domain') }}</th>
                <th class="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('notification.status') }}</th>
                <th class="px-6 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-hairline">
              <tr
                v-for="event in events"
                :key="event.id"
                class="cursor-pointer transition-colors hover:bg-surface-sunken"
                @click="openDetail(event)"
              >
                <td class="px-6 py-4 whitespace-nowrap font-mono text-xs text-text-secondary">
                  {{ formatTime(event.createdAt) }}
                </td>
                <td class="px-6 py-4">
                  <span :class="['text-[11px] font-semibold uppercase tracking-[0.14em]', channelToneClass(event.channel)]">
                    {{ event.channel }}
                  </span>
                </td>
                <td class="px-6 py-4 text-text-main">
                  <span class="text-xs">{{ formatEventType(event.eventType) }}</span>
                  <span v-if="event.retryOf" class="ml-1 text-xs text-text-tertiary">
                    ({{ $t('notification.retryOf', { id: event.retryOf }) }})
                  </span>
                </td>
                <td class="px-6 py-4 font-mono text-xs text-text-main">
                  {{ event.domain || '—' }}
                </td>
                <td class="px-6 py-4">
                  <span :class="['flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]', statusToneClass(event.status)]">
                    <span :class="['h-1.5 w-1.5 rounded-full', statusDotClass(event.status)]" />
                    {{ formatStatus(event.status) }}
                  </span>
                </td>
                <td class="px-6 py-4 text-right">
                  <button
                    v-if="event.status === 'FAILED'"
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
      <p class="text-sm text-text-secondary">{{ $t('notification.noEvents') }}</p>
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
} from 'lucide-vue-next';

const { t } = useI18n();
const toast = useToast();

const loading = ref(false);
const events = ref([]);
const total = ref(0);
const page = ref(1);
const limit = ref(50);

const detailOpen = ref(false);
const selectedEvent = ref(null);
const retryingId = ref(null);

const filters = ref({
  channel: '',
  status: '',
  eventType: '',
  from: '',
  to: '',
});

const dateRange = ref('');

const hasMore = computed(() => events.value.length < total.value);

const hasActiveFilters = computed(() => {
  return Object.values(filters.value).some((v) => v !== '') || dateRange.value !== '';
});

const buildQueryParams = () => {
  const params = { page: page.value, limit: limit.value };
  Object.entries(filters.value).forEach(([key, value]) => {
    if (value) params[key] = value;
  });
  return params;
};

const fetchEvents = async () => {
  loading.value = true;
  try {
    const response = await $fetch('/api/notifications', {
      query: buildQueryParams(),
    });
    if (response?.code !== 0) {
      throw new Error(response?.msg || t('notification.fetchError'));
    }

    const payload = response?.data || {};
    const items = Array.isArray(payload.items) ? payload.items : [];
    if (page.value === 1) {
      events.value = items;
    } else {
      events.value = [...events.value, ...items];
    }
    total.value = Number(payload.total || 0);
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    toast.error(error?.message || t('notification.fetchError'));
  } finally {
    loading.value = false;
  }
};

const resetAndFetch = () => {
  page.value = 1;
  events.value = [];
  fetchEvents();
};

const loadMore = () => {
  if (loading.value || !hasMore.value) return;
  page.value += 1;
  fetchEvents();
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
  filters.value = { channel: '', status: '', eventType: '', from: '', to: '' };
  dateRange.value = '';
  resetAndFetch();
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
    if (response.data?.ok) {
      toast.success(t('notification.retrySuccess'));
    } else {
      toast.error(t('notification.retryFailed'));
    }
    if (detailOpen.value) closeDetail();
    resetAndFetch();
  } catch (error) {
    console.error('Retry failed:', error);
    toast.error(error?.data?.msg || t('notification.retryFailed'));
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
