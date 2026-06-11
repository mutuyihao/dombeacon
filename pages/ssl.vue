<template>
  <div class="flex min-h-full flex-col gap-8 md:h-full md:min-h-0 md:overflow-hidden">

    <!-- ─── PAGE HEADER ─────────────────────────────────────────────── -->
    <header class="shrink-0">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="eyebrow mb-3 text-accent">Certificate radar</p>
          <h1 class="headline-display text-3xl md:text-4xl">{{ $t('ssl.title') }}</h1>
          <p class="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary">{{ $t('ssl.description') }}</p>
        </div>
        <button
          @click="refreshAll"
          :disabled="refreshing"
          class="btn-ghost gap-2 rounded-xl border border-hairline-strong px-4 py-2.5 text-[13px]"
        >
          <RefreshCwIcon :class="['h-3.5 w-3.5 transition-transform duration-500', refreshing && 'animate-spin']" />
          <span>{{ $t('ssl.refreshAll') }}</span>
        </button>
      </div>
    </header>

    <!-- ─── FILTER TABS ─────────────────────────────────────────────── -->
    <nav class="tab-bar shrink-0 overflow-x-auto no-scrollbar">
      <button
        v-for="filter in filters"
        :key="filter.value"
        type="button"
        @click="activeFilter = filter.value"
        :class="['tab-item', activeFilter === filter.value && 'is-active']"
      >
        {{ $t(`ssl.filters.${filter.value}`) }}
        <span v-if="filter.count > 0" class="ml-1.5 rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] font-semibold text-text-secondary" data-numeric>
          {{ filter.count }}
        </span>
      </button>
    </nav>

    <!-- ─── SSL LIST ────────────────────────────────────────────────── -->
    <section class="relative min-h-[26rem] flex-1 overflow-y-auto rounded-2xl border border-hairline bg-card/60 p-4 pr-5 md:min-h-0">
      <!-- Loading -->
      <div v-if="loading" class="space-y-2 pt-1">
        <div v-for="i in 5" :key="i" class="h-[84px] animate-pulse rounded-xl bg-surface-sunken" />
      </div>

      <!-- Data rows -->
      <div v-else-if="filteredStatuses.length > 0" class="-mt-1">
        <article
          v-for="status in filteredStatuses"
          :key="status.domainId"
          class="group grid grid-cols-1 items-center gap-x-8 gap-y-3 rounded-xl border-b border-hairline px-3 py-6 transition-all duration-200 last:border-b-0 hover:bg-surface-sunken/40 lg:grid-cols-[minmax(0,1fr)_auto_auto]"
        >
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h3 class="font-mono truncate text-[15px] font-bold tracking-tight text-text-main">
                {{ status.domain }}
              </h3>
              <span :class="['inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em]', getStatusBadgeClass(status)]">
                <span :class="['h-1.5 w-1.5 rounded-full', getStatusDotClass(status)]" />
                {{ getSSLStatusText(status) }}
              </span>
              <span :class="['text-[11px] font-semibold uppercase tracking-[0.12em]', getPriorityToneClass(status.priority)]">
                · {{ $t(`domain.${String(status.priority || 'MEDIUM').toLowerCase()}`) }}
              </span>
            </div>

            <dl class="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-text-secondary">
              <div v-if="status.issuer" class="flex items-center gap-1.5">
                <ShieldCheckIcon class="h-3.5 w-3.5 text-text-tertiary" />
                <span>{{ $t('ssl.issuer') }}: {{ status.issuer }}</span>
              </div>
              <div v-if="isDifferentCheckedHost(status)" class="flex items-center gap-1.5 font-mono">
                <GlobeIcon class="h-3.5 w-3.5 text-text-tertiary" />
                <span>{{ $t('ssl.checkedHost') }}: {{ status.checkedHost }}</span>
              </div>
              <div v-if="status.validFrom && status.validTo" class="flex items-center gap-1.5 font-mono">
                <CalendarIcon class="h-3.5 w-3.5 text-text-tertiary" />
                <span>{{ formatDate(status.validFrom) }} – {{ formatDate(status.validTo) }}</span>
              </div>
              <div v-if="status.checkedAt" class="flex items-center gap-1.5 text-text-tertiary">
                <ClockIcon class="h-3.5 w-3.5" />
                <span>{{ $t('ssl.lastChecked') }}: {{ formatDateTime(status.checkedAt) }}</span>
              </div>
            </dl>

            <p v-if="status.lastError" class="mt-2.5 flex items-start gap-1.5 text-xs text-status-dropping">
              <AlertCircleIcon class="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{{ getLastErrorText(status) }}</span>
            </p>
            <p v-if="status.validationError" class="mt-2 flex items-start gap-1.5 text-xs text-status-expiring">
              <AlertCircleIcon class="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{{ $t('ssl.validationError') }}: {{ status.validationError }}</span>
            </p>
          </div>

          <!-- Days counter -->
          <div v-if="status.daysUntilExpiry !== null" class="text-right">
            <p :class="['font-sans text-3xl font-bold tracking-tight leading-none', getDaysToneClass(status.daysUntilExpiry)]" data-numeric>
              {{ status.daysUntilExpiry }}
            </p>
            <p class="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">
              {{ $t('ssl.daysShort') }}
            </p>
          </div>

          <!-- Refresh button -->
          <button
            @click="checkSSL(status.domainId)"
            :disabled="checkingId === status.domainId"
            class="rounded-xl p-2.5 text-text-tertiary transition-all duration-200 hover:bg-card hover:text-accent hover:shadow-sm disabled:opacity-50"
            :title="$t('ssl.checkNow')"
          >
            <RefreshCwIcon v-if="checkingId !== status.domainId" class="h-4 w-4" />
            <LoadingSpinner v-else size="sm" />
          </button>
        </article>
      </div>

      <!-- Empty -->
      <div v-else class="flex flex-col items-center justify-center py-24">
        <div class="mb-4 rounded-2xl bg-surface-sunken p-4">
          <ShieldIcon class="h-8 w-8 text-text-tertiary" />
        </div>
        <p class="text-sm text-text-secondary">{{ $t('ssl.noData') }}</p>
      </div>
    </section>

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
  Globe as GlobeIcon,
} from 'lucide-vue-next';
import { unwrapApiEnvelope } from '~/utils/api-envelope';

const { t } = useI18n();
const toast = useToast();

const refreshing = ref(false);
const checkingId = ref(null);
const activeFilter = ref('all');

const { data: sslData, status, refresh: refreshData } = await useAsyncData('ssl-statuses', () =>
  $fetch('/api/ssl'),
);

const loading = computed(() => status.value === 'pending');
const sslStatuses = computed(() => sslData.value?.data || []);

const filters = computed(() => [
  { value: 'all', count: sslStatuses.value.length },
  { value: 'unchecked', count: sslStatuses.value.filter((s) => !s.checkedAt).length },
  { value: 'expiring', count: sslStatuses.value.filter((s) => s.checkedAt && s.hasSSL && s.daysUntilExpiry !== null && s.daysUntilExpiry < 30).length },
  { value: 'invalid', count: sslStatuses.value.filter((s) => s.checkedAt && s.hasSSL && !s.isValid).length },
  { value: 'nossl', count: sslStatuses.value.filter((s) => s.checkedAt && !s.hasSSL).length },
]);

const filteredStatuses = computed(() => {
  switch (activeFilter.value) {
    case 'unchecked': return sslStatuses.value.filter((s) => !s.checkedAt);
    case 'expiring': return sslStatuses.value.filter((s) => s.checkedAt && s.hasSSL && s.daysUntilExpiry !== null && s.daysUntilExpiry < 30);
    case 'invalid': return sslStatuses.value.filter((s) => s.checkedAt && s.hasSSL && !s.isValid);
    case 'nossl': return sslStatuses.value.filter((s) => s.checkedAt && !s.hasSSL);
    default: return sslStatuses.value;
  }
});

const checkSSL = async (domainId) => {
  checkingId.value = domainId;
  try {
    const response = await $fetch(`/api/ssl/${domainId}/check`, { method: 'POST' });
    const result = unwrapApiEnvelope(response, t('ssl.checkError'));
    if (result?.error) {
      toast.warning(t('ssl.checkWarning', { error: result.error }));
    } else if (result?.validationError) {
      toast.warning(t('ssl.checkWarning', { error: result.validationError }));
    } else {
      toast.success(t('ssl.checkSuccess'));
    }
    await refreshData();
  } catch (error) {
    toast.error(error?.message || error?.data?.msg || t('ssl.checkError'));
  } finally {
    checkingId.value = null;
  }
};

const refreshAll = async () => {
  refreshing.value = true;
  try {
    const response = await $fetch('/api/ssl/check-all', { method: 'POST' });
    const data = unwrapApiEnvelope(response, t('ssl.refreshError'));
    const failed = data?.failed || 0;
    if (failed > 0) {
      toast.warning(t('ssl.refreshPartial', { failed }));
    } else {
      toast.success(t('ssl.refreshSuccess'));
    }
    await refreshData();
  } catch (error) {
    toast.error(error?.message || error?.data?.msg || t('ssl.refreshError'));
  } finally {
    refreshing.value = false;
  }
};

const getStatusBadgeClass = (status) => {
  if (!status.checkedAt) return 'bg-surface-sunken text-status-unknown';
  if (!status.hasSSL) return 'bg-surface-sunken text-status-unknown';
  if (!status.isValid) return 'bg-status-dropping/10 text-status-dropping';
  if (status.daysUntilExpiry !== null && status.daysUntilExpiry < 30) return 'bg-status-expiring/10 text-status-expiring';
  return 'bg-status-available/10 text-status-available';
};

const getStatusDotClass = (status) => {
  if (!status.checkedAt) return 'bg-status-unknown';
  if (!status.hasSSL) return 'bg-status-unknown';
  if (!status.isValid) return 'bg-status-dropping';
  if (status.daysUntilExpiry !== null && status.daysUntilExpiry < 30) return 'bg-status-expiring';
  return 'bg-status-available';
};

const getSSLStatusText = (status) => {
  if (!status.checkedAt) return t('ssl.status.unchecked');
  if (!status.hasSSL) return t('ssl.status.noSSL');
  if (!status.isValid) return t('ssl.status.invalid');
  if (status.daysUntilExpiry !== null && status.daysUntilExpiry < 30) return t('ssl.status.expiring');
  return t('ssl.status.valid');
};

const getLastErrorText = (status) => {
  if (status.hasSSL && status.lastError) {
    return t('ssl.retainedAfterError', { error: status.lastError });
  }
  return status.lastError;
};

const isDifferentCheckedHost = (status) =>
  status.checkedHost && status.domain && status.checkedHost !== status.domain;

const getPriorityToneClass = (priority) => {
  switch (priority) {
    case 'HIGH': return 'text-priority-high';
    case 'MEDIUM': return 'text-priority-medium';
    case 'LOW': return 'text-priority-low';
    default: return 'text-priority-low';
  }
};

const getDaysToneClass = (days) => {
  if (days < 7) return 'text-status-dropping';
  if (days < 30) return 'text-status-expiring';
  return 'text-text-main';
};

const formatDate = (date) => {
  if (!date) return '-';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString();
};

const formatDateTime = (date) => {
  if (!date) return '-';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString();
};
</script>
