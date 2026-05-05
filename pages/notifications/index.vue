<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-text-main mb-2">{{ $t('notification.title') }}</h1>
        <p class="text-sm text-text-secondary">{{ $t('notification.description') }}</p>
      </div>
      <button
        @click="fetchEvents"
        :disabled="loading"
        class="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
      >
        <RefreshIcon class="w-4 h-4" :class="{ 'animate-spin': loading }" />
        {{ $t('notification.refresh') }}
      </button>
    </div>

    <!-- Filters -->
    <div class="bg-card border border-card-border rounded-lg p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
        <!-- Channel Filter -->
        <div>
          <label class="block text-xs font-medium text-text-secondary mb-1">
            {{ $t('notification.channel') }}
          </label>
          <select
            v-model="filters.channel"
            @change="resetAndFetch"
            class="w-full px-3 py-2 text-sm border border-card-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            <option value="">{{ $t('common.all') }}</option>
            <option value="EMAIL">Email</option>
            <option value="WEBHOOK">Webhook</option>
            <option value="SERVERCHAN">Server酱</option>
            <option value="PUSH">Web Push</option>
          </select>
        </div>

        <!-- Status Filter -->
        <div>
          <label class="block text-xs font-medium text-text-secondary mb-1">
            {{ $t('notification.status') }}
          </label>
          <select
            v-model="filters.status"
            @change="resetAndFetch"
            class="w-full px-3 py-2 text-sm border border-card-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            <option value="">{{ $t('common.all') }}</option>
            <option value="SENT">{{ $t('notification.statuses.sent') }}</option>
            <option value="FAILED">{{ $t('notification.statuses.failed') }}</option>
            <option value="PENDING">{{ $t('notification.statuses.pending') }}</option>
          </select>
        </div>

        <!-- Event Type Filter -->
        <div>
          <label class="block text-xs font-medium text-text-secondary mb-1">
            {{ $t('notification.eventType') }}
          </label>
          <select
            v-model="filters.eventType"
            @change="resetAndFetch"
            class="w-full px-3 py-2 text-sm border border-card-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            <option value="">{{ $t('common.all') }}</option>
            <option value="STATUS_CHANGE">{{ $t('notification.events.status_change') }}</option>
            <option value="WANTED_AVAILABLE">{{ $t('notification.events.wanted_available') }}</option>
            <option value="EXPIRING_SOON">{{ $t('notification.events.expiring_soon') }}</option>
            <option value="DAILY_SUMMARY">{{ $t('notification.events.daily_summary') }}</option>
            <option value="DROPPING_ALERT">{{ $t('notification.events.dropping_alert') }}</option>
          </select>
        </div>

        <!-- Date Range -->
        <div>
          <label class="block text-xs font-medium text-text-secondary mb-1">
            {{ $t('notification.dateRange') }}
          </label>
          <select
            v-model="dateRange"
            @change="applyDateRange"
            class="w-full px-3 py-2 text-sm border border-card-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            <option value="">{{ $t('common.all') }}</option>
            <option value="24h">{{ $t('notification.last24h') }}</option>
            <option value="7d">{{ $t('notification.last7d') }}</option>
            <option value="30d">{{ $t('notification.last30d') }}</option>
          </select>
        </div>
      </div>

      <div v-if="hasActiveFilters" class="mt-3 flex items-center justify-between">
        <span class="text-xs text-text-secondary">
          {{ $t('notification.totalCount', { count: total }) }}
        </span>
        <button
          @click="clearFilters"
          class="text-xs text-accent hover:underline"
        >
          {{ $t('notification.clearFilters') }}
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && events.length === 0" class="flex justify-center py-12">
      <LoadingSpinner size="lg" />
    </div>

    <!-- Events List -->
    <div v-else-if="events.length > 0" class="bg-card border border-card-border rounded-lg overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-card-border/30">
            <tr>
              <th class="px-4 py-3 text-left font-medium text-text-secondary">{{ $t('notification.time') }}</th>
              <th class="px-4 py-3 text-left font-medium text-text-secondary">{{ $t('notification.channel') }}</th>
              <th class="px-4 py-3 text-left font-medium text-text-secondary">{{ $t('notification.eventType') }}</th>
              <th class="px-4 py-3 text-left font-medium text-text-secondary">{{ $t('notification.domain') }}</th>
              <th class="px-4 py-3 text-left font-medium text-text-secondary">{{ $t('notification.status') }}</th>
              <th class="px-4 py-3 text-right font-medium text-text-secondary">{{ $t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="event in events"
              :key="event.id"
              class="border-t border-card-border hover:bg-card-border/20 transition-colors cursor-pointer"
              @click="openDetail(event)"
            >
              <td class="px-4 py-3 text-text-secondary whitespace-nowrap">
                {{ formatTime(event.createdAt) }}
              </td>
              <td class="px-4 py-3">
                <span
                  :class="[
                    'px-2 py-0.5 text-xs rounded-full font-medium',
                    channelClass(event.channel)
                  ]"
                >
                  {{ event.channel }}
                </span>
              </td>
              <td class="px-4 py-3 text-text-main">
                <span class="text-xs">{{ formatEventType(event.eventType) }}</span>
                <span v-if="event.retryOf" class="ml-1 text-xs text-text-secondary">
                  ({{ $t('notification.retryOf', { id: event.retryOf }) }})
                </span>
              </td>
              <td class="px-4 py-3 text-text-main font-mono text-xs">
                {{ event.domain || '—' }}
              </td>
              <td class="px-4 py-3">
                <span
                  :class="[
                    'px-2 py-0.5 text-xs rounded-full font-medium',
                    statusClass(event.status)
                  ]"
                >
                  {{ formatStatus(event.status) }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <button
                  v-if="event.status === 'FAILED'"
                  @click.stop="retryEvent(event)"
                  :disabled="retryingId === event.id"
                  class="px-3 py-1 text-xs text-accent hover:bg-accent/10 rounded transition-colors disabled:opacity-50"
                >
                  <span v-if="retryingId !== event.id">{{ $t('notification.retry') }}</span>
                  <LoadingSpinner v-else size="sm" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Load More -->
      <div v-if="hasMore" class="border-t border-card-border p-4 text-center">
        <button
          @click="loadMore"
          :disabled="loading"
          class="px-4 py-2 text-sm text-accent hover:bg-accent/10 rounded-lg transition-colors disabled:opacity-50"
        >
          {{ loading ? $t('common.loading') : $t('notification.loadMore') }}
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-16">
      <BellIcon class="w-16 h-16 mx-auto text-text-tertiary mb-4" />
      <p class="text-text-secondary">{{ $t('notification.noEvents') }}</p>
    </div>

    <!-- Detail Modal -->
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
  return Object.values(filters.value).some(v => v !== '') || dateRange.value !== '';
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
    toast.error(error.data?.msg || t('notification.retryFailed'));
  } finally {
    retryingId.value = null;
  }
};

const formatTime = (ts) => {
  if (!ts) return '';
  return new Date(ts).toLocaleString();
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

const channelClass = (channel) => {
  switch (channel) {
    case 'EMAIL': return 'bg-accent/10 text-accent border border-accent/20';
    case 'WEBHOOK': return 'bg-status-registered/10 text-status-registered border border-status-registered/20';
    case 'SERVERCHAN': return 'bg-status-expiring/10 text-status-expiring border border-status-expiring/20';
    case 'PUSH': return 'bg-status-available/10 text-status-available border border-status-available/20';
    default: return 'bg-status-unknown/10 text-status-unknown border border-status-unknown/20';
  }
};

const statusClass = (status) => {
  switch (status) {
    case 'SENT': return 'bg-status-available/10 text-status-available border border-status-available/20';
    case 'FAILED': return 'bg-status-dropping/10 text-status-dropping border border-status-dropping/20';
    case 'PENDING': return 'bg-status-expiring/10 text-status-expiring border border-status-expiring/20';
    default: return 'bg-status-unknown/10 text-status-unknown border border-status-unknown/20';
  }
};

onMounted(() => {
  fetchEvents();
});
</script>
