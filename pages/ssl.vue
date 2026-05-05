<template>
  <div class="container mx-auto px-4 py-8 max-w-7xl">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-text-main mb-2">{{ $t('ssl.title') }}</h1>
        <p class="text-sm text-text-secondary">{{ $t('ssl.description') }}</p>
      </div>
      <button
        @click="refreshAll"
        :disabled="refreshing"
        class="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
      >
        <RefreshCwIcon :class="['w-4 h-4', refreshing && 'animate-spin']" />
        {{ $t('ssl.refreshAll') }}
      </button>
    </div>

    <!-- Filter Tabs -->
    <div class="flex gap-2 mb-6 border-b border-card-border">
      <button
        v-for="filter in filters"
        :key="filter.value"
        @click="activeFilter = filter.value"
        :class="[
          'px-4 py-2 text-sm font-medium transition-colors border-b-2',
          activeFilter === filter.value
            ? 'text-accent border-accent'
            : 'text-text-secondary border-transparent hover:text-text-main'
        ]"
      >
        {{ $t(`ssl.filters.${filter.value}`) }}
        <span v-if="filter.count > 0" class="ml-1 text-xs">
          ({{ filter.count }})
        </span>
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <LoadingSpinner size="lg" />
    </div>

    <!-- SSL Status List -->
    <div v-else-if="filteredStatuses.length > 0" class="grid gap-4">
      <div
        v-for="status in filteredStatuses"
        :key="status.domainId"
        class="bg-card border border-card-border rounded-lg p-6 hover:shadow-md transition-shadow"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-3">
              <h3 class="text-lg font-semibold text-text-main">{{ status.domain }}</h3>

              <!-- SSL Status Badge -->
              <span
                :class="[
                  'px-2 py-0.5 text-xs rounded-full border',
                  getSSLStatusClass(status)
                ]"
              >
                {{ getSSLStatusText(status) }}
              </span>

              <!-- Priority Badge -->
              <span
                :class="[
                  'px-2 py-0.5 text-xs rounded-full',
                  getPriorityClass(status.priority)
                ]"
              >
                {{ $t(`domain.${String(status.priority || 'MEDIUM').toLowerCase()}`) }}
              </span>
            </div>

            <div class="space-y-2 text-sm">
              <!-- Issuer -->
              <div v-if="status.issuer" class="flex items-center gap-2 text-text-secondary">
                <ShieldCheckIcon class="w-4 h-4" />
                <span>{{ $t('ssl.issuer') }}: {{ status.issuer }}</span>
              </div>

              <!-- Valid Period -->
              <div v-if="status.validFrom && status.validTo" class="flex items-center gap-2 text-text-secondary">
                <CalendarIcon class="w-4 h-4" />
                <span>
                  {{ formatDate(status.validFrom) }} - {{ formatDate(status.validTo) }}
                </span>
              </div>

              <!-- Days Until Expiry -->
              <div v-if="status.daysUntilExpiry !== null" class="flex items-center gap-2">
                <ClockIcon class="w-4 h-4" />
                <span :class="getDaysUntilExpiryClass(status.daysUntilExpiry)">
                  {{ $t('ssl.daysUntilExpiry', { days: status.daysUntilExpiry }) }}
                </span>
              </div>

              <!-- Last Checked -->
              <div v-if="status.checkedAt" class="flex items-center gap-2 text-text-tertiary text-xs">
                <ClockIcon class="w-3 h-3" />
                <span>{{ $t('ssl.lastChecked') }}: {{ formatDateTime(status.checkedAt) }}</span>
              </div>

              <!-- Error Message -->
              <div v-if="status.lastError" class="flex items-start gap-2 text-status-dropping text-xs mt-2">
                <AlertCircleIcon class="w-4 h-4 mt-0.5" />
                <span>{{ getLastErrorText(status) }}</span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 ml-4">
            <button
              @click="checkSSL(status.domainId)"
              :disabled="checkingId === status.domainId"
              class="p-2 text-text-secondary hover:text-accent hover:bg-card-border/50 rounded transition-colors disabled:opacity-50"
              :title="$t('ssl.checkNow')"
            >
              <RefreshCwIcon v-if="checkingId !== status.domainId" class="w-4 h-4" />
              <LoadingSpinner v-else size="sm" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-16">
      <ShieldIcon class="w-16 h-16 mx-auto text-text-tertiary mb-4" />
      <p class="text-text-secondary">{{ $t('ssl.noData') }}</p>
    </div>

  </div>
</template>

<script setup>
import {
  RefreshCw as RefreshCwIcon,
  Shield as ShieldIcon,
  ShieldCheck as ShieldCheckIcon,
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  AlertCircle as AlertCircleIcon,
} from 'lucide-vue-next';

const { t } = useI18n();
const toast = useToast();

const loading = ref(true);
const refreshing = ref(false);
const checkingId = ref(null);
const sslStatuses = ref([]);
const activeFilter = ref('all');

// Filter definitions
const filters = computed(() => [
  { value: 'all', count: sslStatuses.value.length },
  { value: 'unchecked', count: sslStatuses.value.filter(s => !s.checkedAt).length },
  { value: 'expiring', count: sslStatuses.value.filter(s => s.checkedAt && s.hasSSL && s.daysUntilExpiry !== null && s.daysUntilExpiry < 30).length },
  { value: 'invalid', count: sslStatuses.value.filter(s => s.checkedAt && s.hasSSL && !s.isValid).length },
  { value: 'nossl', count: sslStatuses.value.filter(s => s.checkedAt && !s.hasSSL).length },
]);

// Filtered statuses
const filteredStatuses = computed(() => {
  switch (activeFilter.value) {
    case 'unchecked':
      return sslStatuses.value.filter(s => !s.checkedAt);
    case 'expiring':
      return sslStatuses.value.filter(s => s.checkedAt && s.hasSSL && s.daysUntilExpiry !== null && s.daysUntilExpiry < 30);
    case 'invalid':
      return sslStatuses.value.filter(s => s.checkedAt && s.hasSSL && !s.isValid);
    case 'nossl':
      return sslStatuses.value.filter(s => s.checkedAt && !s.hasSSL);
    default:
      return sslStatuses.value;
  }
});

// Fetch SSL statuses
const fetchSSLStatuses = async () => {
  loading.value = true;
  try {
    const response = await $fetch('/api/ssl');
    sslStatuses.value = response.data || [];
  } catch (error) {
    console.error('Failed to fetch SSL statuses:', error);
    toast.error(t('ssl.fetchError'));
  } finally {
    loading.value = false;
  }
};

// Check SSL for specific domain
const checkSSL = async (domainId) => {
  checkingId.value = domainId;
  try {
    await $fetch(`/api/ssl/${domainId}/check`, {
      method: 'POST',
    });
    toast.success(t('ssl.checkSuccess'));
    await fetchSSLStatuses();
  } catch (error) {
    console.error('Failed to check SSL:', error);
    toast.error(t('ssl.checkError'));
  } finally {
    checkingId.value = null;
  }
};

// Refresh all SSL statuses
const refreshAll = async () => {
  refreshing.value = true;
  try {
    // Trigger check for all domains
    const promises = sslStatuses.value.map(s =>
      $fetch(`/api/ssl/${s.domainId}/check`, { method: 'POST' })
    );
    await Promise.allSettled(promises);
    toast.success(t('ssl.refreshSuccess'));
    await fetchSSLStatuses();
  } catch (error) {
    console.error('Failed to refresh SSL statuses:', error);
    toast.error(t('ssl.refreshError'));
  } finally {
    refreshing.value = false;
  }
};

// Helper functions
const getSSLStatusClass = (status) => {
  if (!status.checkedAt) return 'bg-status-unknown/10 text-status-unknown border-status-unknown/20';
  if (!status.hasSSL) return 'bg-status-unknown/10 text-status-unknown border-status-unknown/20';
  if (!status.isValid) return 'bg-status-dropping/10 text-status-dropping border-status-dropping/20';
  if (status.daysUntilExpiry !== null && status.daysUntilExpiry < 30) {
    return 'bg-status-expiring/10 text-status-expiring border-status-expiring/20';
  }
  return 'bg-status-available/10 text-status-available border-status-available/20';
};

const getSSLStatusText = (status) => {
  if (!status.checkedAt) return t('ssl.status.unchecked');
  if (!status.hasSSL) return t('ssl.status.noSSL');
  if (!status.isValid) return t('ssl.status.invalid');
  if (status.daysUntilExpiry !== null && status.daysUntilExpiry < 30) {
    return t('ssl.status.expiring');
  }
  return t('ssl.status.valid');
};

const getLastErrorText = (status) => {
  if (status.hasSSL && status.lastError) {
    return t('ssl.retainedAfterError', { error: status.lastError });
  }
  return status.lastError;
};

const getPriorityClass = (priority) => {
  const classes = {
    HIGH: 'bg-priority-high/10 text-priority-high border border-priority-high/20',
    MEDIUM: 'bg-priority-medium/10 text-priority-medium border border-priority-medium/20',
    LOW: 'bg-priority-low/10 text-priority-low border border-priority-low/20',
  };
  return classes[priority] || classes.MEDIUM;
};

const getDaysUntilExpiryClass = (days) => {
  if (days < 7) return 'text-status-dropping font-semibold';
  if (days < 30) return 'text-status-expiring font-medium';
  return 'text-text-secondary';
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString();
};

const formatDateTime = (date) => {
  return new Date(date).toLocaleString();
};

// Load statuses on mount
onMounted(() => {
  fetchSSLStatuses();
});
</script>
