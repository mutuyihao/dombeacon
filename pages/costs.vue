<template>
  <div class="flex min-h-full flex-col gap-6 md:h-full md:min-h-0 md:overflow-hidden">

    <header class="shrink-0">
      <p class="eyebrow mb-2">Portfolio costs</p>
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="headline-display text-3xl md:text-4xl">{{ $t('costs.title') }}</h1>
          <p class="mt-2 max-w-2xl text-sm text-text-secondary">{{ $t('costs.description') }}</p>
        </div>
        <div class="flex items-center gap-3">
          <label class="flex items-center gap-2">
            <span class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Year</span>
            <select v-model="selectedYear" @change="fetchSummary" class="input-bare w-auto py-1 font-mono text-sm">
              <option v-for="y in availableYears" :key="y" :value="y">{{ y }}</option>
            </select>
          </label>
          <button @click="openAddModal" class="btn-primary">
            <PlusIcon class="h-4 w-4" />
            {{ $t('costs.addCost') }}
          </button>
        </div>
      </div>
    </header>

    <section class="min-h-[26rem] flex-1 overflow-y-auto rounded-[18px] border border-hairline bg-card/45 p-4 md:min-h-0 md:p-5">
    <div v-if="loading" class="flex justify-center py-16">
      <LoadingSpinner size="lg" />
    </div>

    <div v-else class="space-y-16">

      <!-- ─── METRIC STRIP ─────────────────────────────────────────── -->
      <section>
        <div class="grid grid-cols-2 divide-y divide-hairline lg:grid-cols-4 lg:divide-y-0">
          <div
            v-for="(stat, idx) in stats"
            :key="stat.key"
            :class="['flex flex-col px-1 py-6 lg:px-6 lg:first:pl-0', idx > 0 && 'lg:relative lg:before:absolute lg:before:left-0 lg:before:top-4 lg:before:bottom-4 lg:before:w-px lg:before:bg-hairline']"
          >
            <p class="eyebrow flex items-center justify-between">
              <span>{{ stat.label }}</span>
              <component :is="stat.icon" class="h-3.5 w-3.5 opacity-50" />
            </p>
            <p class="font-sans mt-5 text-[2.5rem] font-bold leading-none tracking-tight text-text-main" data-numeric>
              {{ stat.value }}
            </p>
            <p class="mt-3 text-[13px] text-text-secondary">{{ stat.hint }}</p>
          </div>
        </div>
      </section>

      <!-- ─── BY TYPE ─────────────────────────────────────────────── -->
      <section v-if="summary.byType && summary.byType.length > 0">
        <p class="eyebrow mb-3">Breakdown</p>
        <h2 class="headline-display text-2xl">{{ $t('costs.byType') }}</h2>
        <div class="hairline mt-4" />

        <div class="pt-2">
          <div
            v-for="type in summary.byType"
            :key="type.costType"
            class="metric-row"
          >
            <div class="flex min-w-0 items-center gap-3">
              <span :class="['h-1.5 w-1.5 rounded-full', getCostTypeDotClass(type.costType)]" />
              <p class="text-sm font-medium text-text-main">{{ $t(`costs.types.${type.costType}`) }}</p>
            </div>
            <div class="flex items-center gap-6">
              <span class="font-mono text-xs text-text-tertiary">{{ type.count }}× {{ $t('costs.transactions') }}</span>
              <span class="font-mono text-sm font-medium text-text-main">{{ formatCurrency(type.total) }}</span>
              <span class="w-12 text-right font-mono text-xs text-text-tertiary">
                {{ summary.total ? ((type.total / summary.total) * 100).toFixed(1) : '0.0' }}%
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- ─── TOP DOMAINS ─────────────────────────────────────────── -->
      <section v-if="summary.topDomains && summary.topDomains.length > 0">
        <p class="eyebrow mb-3">Top spend</p>
        <h2 class="headline-display text-2xl">{{ $t('costs.topDomains') }}</h2>
        <div class="hairline mt-4" />

        <div class="pt-2">
          <div
            v-for="(d, idx) in summary.topDomains"
            :key="d.domainId"
            class="metric-row"
          >
            <div class="flex min-w-0 items-center gap-3">
              <span class="font-mono text-xs text-text-tertiary" data-numeric>{{ String(idx + 1).padStart(2, '0') }}</span>
              <p class="font-mono text-sm font-medium text-text-main">{{ d.domain }}</p>
            </div>
            <div class="flex items-center gap-6">
              <span class="font-mono text-xs text-text-tertiary">{{ d.count }}×</span>
              <span class="font-mono text-sm font-medium text-text-main">{{ formatCurrency(d.total) }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- ─── RECENT COSTS TABLE ──────────────────────────────────── -->
      <section>
        <p class="eyebrow mb-3">Recent</p>
        <h2 class="headline-display text-2xl">{{ $t('costs.recentCosts') }}</h2>
        <div class="hairline mt-4" />

        <div v-if="costs.length === 0" class="py-16 text-center">
          <DollarSignIcon class="mx-auto mb-3 h-8 w-8 text-text-tertiary" />
          <p class="text-sm text-text-secondary">{{ $t('costs.noCosts') }}</p>
        </div>

        <div v-else class="overflow-x-auto pt-2">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-hairline-strong text-left">
                <th class="px-2 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('costs.domain') }}</th>
                <th class="px-2 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('costs.type') }}</th>
                <th class="px-2 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('costs.amount') }}</th>
                <th class="px-2 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('costs.registrar') }}</th>
                <th class="px-2 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('costs.paymentDate') }}</th>
                <th class="px-2 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-hairline">
              <tr
                v-for="cost in costs.slice(0, 20)"
                :key="cost.id"
                class="transition-colors hover:bg-surface-sunken"
              >
                <td class="px-2 py-3 font-mono text-xs text-text-main">{{ cost.domain }}</td>
                <td class="px-2 py-3">
                  <span :class="['flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]', getCostTypeToneClass(cost.costType)]">
                    <span :class="['h-1.5 w-1.5 rounded-full', getCostTypeDotClass(cost.costType)]" />
                    {{ $t(`costs.types.${cost.costType}`) }}
                  </span>
                </td>
                <td class="px-2 py-3 text-right font-mono font-medium text-text-main">{{ formatCurrency(cost.amount) }}</td>
                <td class="px-2 py-3 text-text-secondary">{{ cost.registrar || '—' }}</td>
                <td class="px-2 py-3 font-mono text-xs text-text-secondary">{{ formatDate(cost.paymentDate) }}</td>
                <td class="px-2 py-3 text-right">
                  <button
                    @click="deleteCost(cost.id)"
                    class="rounded-full p-1.5 text-text-tertiary transition-colors hover:bg-card hover:text-status-dropping"
                    :title="$t('common.delete')"
                  >
                    <TrashIcon class="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
    </section>

    <CostModal
      :is-open="modalOpen"
      :domains="domainsList"
      :currency="costCurrency"
      @close="closeModal"
      @save="handleSave"
    />
    <ConfirmDialog
      :is-open="deleteDialog.isOpen"
      :title="$t('costs.deleteCost')"
      :message="$t('costs.confirmDelete')"
      variant="danger"
      @confirm="confirmDelete"
      @cancel="deleteDialog.isOpen = false"
    />
  </div>
</template>

<script setup>
import {
  Plus as PlusIcon,
  DollarSign as DollarSignIcon,
  FileText as FileTextIcon,
  TrendingUp as TrendingUpIcon,
  Calendar as CalendarIcon,
  Trash as TrashIcon,
} from '@lucide/vue';
import { unwrapApiEnvelope } from '~/utils/api-envelope';

const { t } = useI18n();
const toast = useToast();

const loading = ref(true);
const summary = ref({});
const costs = ref([]);
const domainsList = ref([]);
const modalOpen = ref(false);
const selectedYear = ref(new Date().getFullYear());
const deleteDialog = ref({ isOpen: false, costId: null });

const availableYears = computed(() => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear + 1; i >= currentYear - 5; i--) years.push(i);
  return years;
});

const avgPerDomain = computed(() => {
  if (!summary.value.topDomains || summary.value.topDomains.length === 0) return 0;
  return summary.value.total / summary.value.topDomains.length;
});

const thisMonthTotal = computed(() => {
  if (!summary.value.byMonth) return 0;
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  const monthData = summary.value.byMonth.find((m) => m.month === currentMonth);
  return monthData?.total || 0;
});

const currentMonthName = computed(() => new Date().toLocaleString('default', { month: 'long' }));
const costCurrency = computed(() => summary.value.currency || 'USD');

const stats = computed(() => [
  {
    key: 'total',
    label: t('costs.totalSpent'),
    value: formatCurrency(summary.value.total || 0),
    hint: t('costs.year', { year: selectedYear.value }),
    icon: DollarSignIcon,
  },
  {
    key: 'count',
    label: t('costs.totalRecords'),
    value: summary.value.count || 0,
    hint: t('costs.transactions'),
    icon: FileTextIcon,
  },
  {
    key: 'avg',
    label: t('costs.avgPerDomain'),
    value: formatCurrency(avgPerDomain.value),
    hint: t('costs.perDomain'),
    icon: TrendingUpIcon,
  },
  {
    key: 'month',
    label: t('costs.thisMonth'),
    value: formatCurrency(thisMonthTotal.value),
    hint: currentMonthName.value,
    icon: CalendarIcon,
  },
]);

const fetchSummary = async () => {
  loading.value = true;
  try {
    const response = await $fetch(`/api/costs/summary?year=${selectedYear.value}`);
    summary.value = unwrapApiEnvelope(response, t('costs.fetchError')) || {};

    const costsResponse = await $fetch('/api/costs');
    costs.value = unwrapApiEnvelope(costsResponse, t('costs.fetchError')) || [];
  } catch (error) {
    toast.error(error?.message || error?.data?.msg || t('costs.fetchError'));
  } finally {
    loading.value = false;
  }
};

const fetchDomains = async () => {
  try {
    const response = await $fetch('/api/domains');
    const data = unwrapApiEnvelope(response, t('domain.loadError'));
    const items = data?.items ?? data ?? [];
    domainsList.value = Array.isArray(items) ? items : [];
  } catch (error) {
    toast.error(error?.message || error?.data?.msg || t('domain.loadError'));
  }
};

const openAddModal = () => { modalOpen.value = true; };
const closeModal = () => { modalOpen.value = false; };

const handleSave = async (costData) => {
  try {
    const response = await $fetch('/api/costs', { method: 'POST', body: costData });
    unwrapApiEnvelope(response, t('costs.addError'));
    toast.success(t('costs.addSuccess'));
    closeModal();
    await fetchSummary();
  } catch (error) {
    toast.error(error?.message || error?.data?.msg || t('costs.addError'));
  }
};

const deleteCost = (id) => {
  deleteDialog.value = { isOpen: true, costId: id };
};

const confirmDelete = async () => {
  const id = deleteDialog.value.costId;
  if (!id) {
    deleteDialog.value.isOpen = false;
    return;
  }
  try {
    const response = await $fetch(`/api/costs/${id}`, { method: 'DELETE' });
    unwrapApiEnvelope(response, t('costs.deleteError'));
    toast.success(t('costs.deleteSuccess'));
    await fetchSummary();
  } catch (error) {
    toast.error(error?.message || error?.data?.msg || t('costs.deleteError'));
  } finally {
    deleteDialog.value.isOpen = false;
    deleteDialog.value.costId = null;
  }
};

const formatCurrency = (cents, currency = costCurrency.value) => {
  const amount = (cents || 0) / 100;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
};

const formatDate = (date) => {
  if (!date) return '-';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString();
};

const getCostTypeDotClass = (type) => {
  const colors = {
    REGISTRATION: 'bg-status-registered',
    RENEWAL: 'bg-status-available',
    TRANSFER: 'bg-watch-owned',
    PRIVACY: 'bg-status-expiring',
    OTHER: 'bg-text-tertiary',
  };
  return colors[type] || 'bg-text-tertiary';
};

const getCostTypeToneClass = (type) => {
  const colors = {
    REGISTRATION: 'text-status-registered',
    RENEWAL: 'text-status-available',
    TRANSFER: 'text-watch-owned',
    PRIVACY: 'text-status-expiring',
    OTHER: 'text-text-secondary',
  };
  return colors[type] || 'text-text-secondary';
};

onMounted(() => {
  fetchSummary();
  fetchDomains();
});
</script>
