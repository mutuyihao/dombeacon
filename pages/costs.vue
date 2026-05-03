<template>
  <div class="container mx-auto px-4 py-8 max-w-7xl">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-text-main mb-2">{{ $t('costs.title') }}</h1>
        <p class="text-sm text-text-secondary">{{ $t('costs.description') }}</p>
      </div>
      <div class="flex items-center gap-2">
        <select
          v-model="selectedYear"
          @change="fetchSummary"
          class="px-3 py-2 border border-card-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
        >
          <option v-for="y in availableYears" :key="y" :value="y">{{ y }}</option>
        </select>
        <button
          @click="openAddModal"
          class="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
        >
          <PlusIcon class="w-4 h-4" />
          {{ $t('costs.addCost') }}
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <LoadingSpinner size="lg" />
    </div>

    <!-- Summary Stats -->
    <div v-else class="grid gap-6">
      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-card border border-card-border rounded-lg p-6">
          <div class="flex items-center gap-2 text-text-secondary mb-2">
            <DollarSignIcon class="w-4 h-4" />
            <span class="text-sm">{{ $t('costs.totalSpent') }}</span>
          </div>
          <p class="text-2xl font-bold text-text-main">{{ formatCurrency(summary.total || 0) }}</p>
          <p class="text-xs text-text-secondary mt-1">{{ $t('costs.year', { year: selectedYear }) }}</p>
        </div>

        <div class="bg-card border border-card-border rounded-lg p-6">
          <div class="flex items-center gap-2 text-text-secondary mb-2">
            <FileTextIcon class="w-4 h-4" />
            <span class="text-sm">{{ $t('costs.totalRecords') }}</span>
          </div>
          <p class="text-2xl font-bold text-text-main">{{ summary.count || 0 }}</p>
          <p class="text-xs text-text-secondary mt-1">{{ $t('costs.transactions') }}</p>
        </div>

        <div class="bg-card border border-card-border rounded-lg p-6">
          <div class="flex items-center gap-2 text-text-secondary mb-2">
            <TrendingUpIcon class="w-4 h-4" />
            <span class="text-sm">{{ $t('costs.avgPerDomain') }}</span>
          </div>
          <p class="text-2xl font-bold text-text-main">{{ formatCurrency(avgPerDomain) }}</p>
          <p class="text-xs text-text-secondary mt-1">{{ $t('costs.perDomain') }}</p>
        </div>

        <div class="bg-card border border-card-border rounded-lg p-6">
          <div class="flex items-center gap-2 text-text-secondary mb-2">
            <CalendarIcon class="w-4 h-4" />
            <span class="text-sm">{{ $t('costs.thisMonth') }}</span>
          </div>
          <p class="text-2xl font-bold text-text-main">{{ formatCurrency(thisMonthTotal) }}</p>
          <p class="text-xs text-text-secondary mt-1">{{ currentMonthName }}</p>
        </div>
      </div>

      <!-- Cost Type Breakdown -->
      <div v-if="summary.byType && summary.byType.length > 0" class="bg-card border border-card-border rounded-lg p-6">
        <h2 class="text-lg font-semibold text-text-main mb-4">{{ $t('costs.byType') }}</h2>
        <div class="space-y-3">
          <div
            v-for="type in summary.byType"
            :key="type.costType"
            class="flex items-center justify-between"
          >
            <div class="flex items-center gap-2">
              <span :class="['w-2 h-2 rounded-full', getCostTypeColor(type.costType)]"></span>
              <span class="text-sm text-text-main">{{ $t(`costs.types.${type.costType}`) }}</span>
            </div>
            <div class="flex items-center gap-4">
              <span class="text-sm text-text-secondary">{{ type.count }} {{ $t('costs.transactions') }}</span>
              <span class="font-medium text-text-main">{{ formatCurrency(type.total) }}</span>
              <span class="text-xs text-text-tertiary w-12 text-right">
                {{ ((type.total / summary.total) * 100).toFixed(1) }}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Domains -->
      <div v-if="summary.topDomains && summary.topDomains.length > 0" class="bg-card border border-card-border rounded-lg p-6">
        <h2 class="text-lg font-semibold text-text-main mb-4">{{ $t('costs.topDomains') }}</h2>
        <div class="space-y-3">
          <div
            v-for="(d, idx) in summary.topDomains"
            :key="d.domainId"
            class="flex items-center justify-between"
          >
            <div class="flex items-center gap-3">
              <span class="text-text-tertiary text-sm w-6">{{ idx + 1 }}.</span>
              <span class="font-mono text-sm text-text-main">{{ d.domain }}</span>
            </div>
            <div class="flex items-center gap-4">
              <span class="text-sm text-text-secondary">{{ d.count }}x</span>
              <span class="font-medium text-text-main">{{ formatCurrency(d.total) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Costs Table -->
      <div class="bg-card border border-card-border rounded-lg p-6">
        <h2 class="text-lg font-semibold text-text-main mb-4">{{ $t('costs.recentCosts') }}</h2>

        <div v-if="costs.length === 0" class="text-center py-8">
          <DollarSignIcon class="w-12 h-12 mx-auto text-text-tertiary mb-2" />
          <p class="text-text-secondary text-sm">{{ $t('costs.noCosts') }}</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-card-border text-text-secondary text-left">
                <th class="py-2 px-2 font-medium">{{ $t('costs.domain') }}</th>
                <th class="py-2 px-2 font-medium">{{ $t('costs.type') }}</th>
                <th class="py-2 px-2 font-medium">{{ $t('costs.amount') }}</th>
                <th class="py-2 px-2 font-medium">{{ $t('costs.registrar') }}</th>
                <th class="py-2 px-2 font-medium">{{ $t('costs.paymentDate') }}</th>
                <th class="py-2 px-2 font-medium text-right">{{ $t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="cost in costs.slice(0, 20)"
                :key="cost.id"
                class="border-b border-card-border/50 hover:bg-card-border/20"
              >
                <td class="py-2 px-2 font-mono text-xs">{{ cost.domain }}</td>
                <td class="py-2 px-2">
                  <span :class="['px-2 py-0.5 text-xs rounded-full', getCostTypeBadgeClass(cost.costType)]">
                    {{ $t(`costs.types.${cost.costType}`) }}
                  </span>
                </td>
                <td class="py-2 px-2 font-medium">{{ formatCurrency(cost.amount, cost.currency) }}</td>
                <td class="py-2 px-2 text-text-secondary">{{ cost.registrar || '-' }}</td>
                <td class="py-2 px-2 text-text-secondary text-xs">{{ formatDate(cost.paymentDate) }}</td>
                <td class="py-2 px-2 text-right">
                  <button
                    @click="deleteCost(cost.id)"
                    class="p-1 text-text-tertiary hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    :title="$t('common.delete')"
                  >
                    <TrashIcon class="w-4 h-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Add Cost Modal -->
    <CostModal
      :is-open="modalOpen"
      :domains="domainsList"
      @close="closeModal"
      @save="handleSave"
    />

    <!-- Toast Notifications -->
    <Toast ref="toast" />

    <!-- Confirm Dialog -->
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
} from 'lucide-vue-next';

const { t } = useI18n();
const toast = ref(null);

const loading = ref(true);
const summary = ref({});
const costs = ref([]);
const domainsList = ref([]);
const modalOpen = ref(false);
const selectedYear = ref(new Date().getFullYear());
const deleteDialog = ref({
  isOpen: false,
  costId: null,
});

// Available years (last 5 years + next 1 year)
const availableYears = computed(() => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear + 1; i >= currentYear - 5; i--) {
    years.push(i);
  }
  return years;
});

// Average per domain
const avgPerDomain = computed(() => {
  if (!summary.value.topDomains || summary.value.topDomains.length === 0) return 0;
  return summary.value.total / summary.value.topDomains.length;
});

// This month total
const thisMonthTotal = computed(() => {
  if (!summary.value.byMonth) return 0;
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  const monthData = summary.value.byMonth.find(m => m.month === currentMonth);
  return monthData?.total || 0;
});

// Current month name
const currentMonthName = computed(() => {
  return new Date().toLocaleString('default', { month: 'long' });
});

// Fetch summary
const fetchSummary = async () => {
  loading.value = true;
  try {
    const response = await $fetch(`/api/costs/summary?year=${selectedYear.value}`);
    summary.value = response.data || {};

    const costsResponse = await $fetch('/api/costs');
    costs.value = costsResponse.data || [];
  } catch (error) {
    console.error('Failed to fetch summary:', error);
    toast.value?.show(t('costs.fetchError'), 'error');
  } finally {
    loading.value = false;
  }
};

// Fetch domains for modal
const fetchDomains = async () => {
  try {
    const response = await $fetch('/api/domains');
    domainsList.value = response.data || [];
  } catch (error) {
    console.error('Failed to fetch domains:', error);
  }
};

// Modal handlers
const openAddModal = () => {
  modalOpen.value = true;
};

const closeModal = () => {
  modalOpen.value = false;
};

const handleSave = async (costData) => {
  try {
    await $fetch('/api/costs', {
      method: 'POST',
      body: costData,
    });
    toast.value?.show(t('costs.addSuccess'), 'success');
    closeModal();
    await fetchSummary();
  } catch (error) {
    console.error('Failed to save cost:', error);
    toast.value?.show(error.data?.message || t('costs.addError'), 'error');
  }
};

// Delete cost
const deleteCost = (id) => {
  deleteDialog.value = {
    isOpen: true,
    costId: id,
  };
};

const confirmDelete = async () => {
  const id = deleteDialog.value.costId;
  try {
    await $fetch(`/api/costs/${id}`, {
      method: 'DELETE',
    });
    toast.value?.show(t('costs.deleteSuccess'), 'success');
    await fetchSummary();
  } catch (error) {
    console.error('Failed to delete cost:', error);
    toast.value?.show(t('costs.deleteError'), 'error');
  } finally {
    deleteDialog.value.isOpen = false;
    deleteDialog.value.costId = null;
  }
};

// Helper functions
const formatCurrency = (cents, currency = 'USD') => {
  const amount = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString();
};

const getCostTypeColor = (type) => {
  const colors = {
    REGISTRATION: 'bg-blue-500',
    RENEWAL: 'bg-green-500',
    TRANSFER: 'bg-purple-500',
    PRIVACY: 'bg-yellow-500',
    OTHER: 'bg-gray-500',
  };
  return colors[type] || 'bg-gray-500';
};

const getCostTypeBadgeClass = (type) => {
  const classes = {
    REGISTRATION: 'bg-blue-100 text-blue-700 border border-blue-200',
    RENEWAL: 'bg-green-100 text-green-700 border border-green-200',
    TRANSFER: 'bg-purple-100 text-purple-700 border border-purple-200',
    PRIVACY: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
    OTHER: 'bg-gray-100 text-gray-600 border border-gray-200',
  };
  return classes[type] || classes.OTHER;
};

// Load on mount
onMounted(() => {
  fetchSummary();
  fetchDomains();
});
</script>
