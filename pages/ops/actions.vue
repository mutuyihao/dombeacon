<template>
  <div class="space-y-6">
    <div class="flex flex-col md:flex-row justify-between md:items-end gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-text-main">{{ $t('action.title') }}</h1>
        <p class="text-sm text-text-secondary mt-1">{{ $t('action.description') }}</p>
      </div>
      <div class="flex gap-2">
        <select
          v-model="statusFilter"
          class="px-3 py-2 bg-card border border-card-border rounded-lg text-sm focus:outline-none focus:border-accent"
        >
          <option value="">{{ $t('common.all') }} {{ $t('common.status') }}</option>
          <option value="OPEN">{{ $t('action.status.open') }}</option>
          <option value="SNOOZED">{{ $t('action.status.snoozed') }}</option>
          <option value="DISMISSED">{{ $t('action.status.dismissed') }}</option>
          <option value="RESOLVED">{{ $t('action.status.resolved') }}</option>
        </select>
        <select
          v-model="priorityFilter"
          class="px-3 py-2 bg-card border border-card-border rounded-lg text-sm focus:outline-none focus:border-accent"
        >
          <option value="">{{ $t('common.all') }} {{ $t('common.priority') }}</option>
          <option value="HIGH">{{ $t('domain.high') }}</option>
          <option value="MEDIUM">{{ $t('domain.medium') }}</option>
          <option value="LOW">{{ $t('domain.low') }}</option>
        </select>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && !actions.length" class="text-center py-12 text-text-secondary">
      {{ $t('common.loading') }}
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!actions || actions.length === 0"
      class="text-center py-12 text-text-secondary"
    >
      <p>{{ $t('action.noActions') }}</p>
    </div>

    <!-- Actions Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="action in actions"
        :key="action.id"
        :class="[
          'bg-card border border-card-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow',
          priorityBorderClass(action.priority),
        ]"
      >
        <!-- Header -->
        <div class="flex justify-between items-start mb-3">
          <div class="flex-1">
            <NuxtLink
              :to="`/domains/${action.domain.id}`"
              class="text-lg font-medium text-text-main hover:text-accent transition-colors"
            >
              {{ action.domain.domain }}
            </NuxtLink>
            <div class="flex items-center gap-2 mt-1">
              <span :class="['px-2 py-0.5 rounded text-[10px] font-medium', actionTypeClass(action.actionType)]">
                {{ $t(`action.types.${action.actionType.toLowerCase()}`) }}
              </span>
              <span :class="['px-2 py-0.5 rounded text-[10px] font-medium', priorityClass(action.priority)]">
                {{ $t(`domain.${action.priority.toLowerCase()}`) }}
              </span>
            </div>
          </div>
          <span :class="['px-2.5 py-0.5 rounded-full text-xs font-medium border', statusClass(action.status)]">
            {{ $t(`action.status.${action.status.toLowerCase()}`) }}
          </span>
        </div>

        <!-- Metadata -->
        <div class="text-sm text-text-secondary mb-4">
          <p>{{ $t('action.triggeredAt') }}: {{ formatDate(action.triggeredAt) }}</p>
          <p v-if="action.snoozedUntil">{{ $t('action.snoozedUntil') }}: {{ formatDate(action.snoozedUntil) }}</p>
          <p v-if="action.metadata?.expiresAt">{{ $t('domain.expiresAt') }}: {{ formatDate(action.metadata.expiresAt) }}</p>
          <p v-if="action.metadata?.daysUntilExpiry !== undefined && action.metadata?.daysUntilExpiry !== null">
            SSL: {{ $t('ssl.daysUntilExpiry', { days: action.metadata.daysUntilExpiry }) }}
          </p>
          <p v-if="action.metadata?.issuer">
            {{ $t('ssl.issuer') }}: {{ action.metadata.issuer }}
          </p>
        </div>

        <!-- Actions -->
        <div class="flex gap-2">
          <button
            v-if="action.status === 'OPEN'"
            @click="snoozeAction(action.id)"
            :disabled="isActionPending(action.id)"
            class="flex-1 px-3 py-1.5 text-xs bg-background hover:bg-accent/10 border border-card-border rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ $t('action.snooze') }}
          </button>
          <button
            v-if="action.status === 'OPEN'"
            @click="dismissAction(action.id)"
            :disabled="isActionPending(action.id)"
            class="flex-1 px-3 py-1.5 text-xs bg-background hover:bg-accent/10 border border-card-border rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ $t('action.dismiss') }}
          </button>
          <button
            v-if="action.status === 'OPEN' || action.status === 'SNOOZED'"
            @click="resolveAction(action.id)"
            :disabled="isActionPending(action.id)"
            class="flex-1 px-3 py-1.5 text-xs bg-accent hover:bg-accent-hover text-white rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isActionPending(action.id) ? $t('common.loading') : $t('action.resolve') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div
      v-if="total > 0"
      class="flex flex-col gap-3 rounded-2xl border border-card-border bg-card px-4 py-3 text-sm shadow-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="text-text-secondary">
        {{ $t('action.pageInfo', { start: pageStart, end: pageEnd, total, page, pages: totalPages }) }}
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <label class="flex items-center gap-2 text-text-secondary">
          <span>{{ $t('filter.pageSize') }}</span>
          <select
            v-model.number="limit"
            class="rounded-lg border border-card-border bg-background px-2 py-1 text-text-main focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
          </select>
        </label>

        <button
          type="button"
          class="rounded-lg border border-card-border bg-background px-3 py-1.5 font-medium text-text-main transition-colors hover:border-accent/40 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!canPrev"
          @click="page--"
        >
          {{ $t('common.previous') }}
        </button>
        <button
          type="button"
          class="rounded-lg border border-card-border bg-background px-3 py-1.5 font-medium text-text-main transition-colors hover:border-accent/40 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!canNext"
          @click="page++"
        >
          {{ $t('common.next') }}
        </button>
      </div>
    </div>

    <!-- Snooze Dialog -->
    <TransitionRoot appear :show="snoozeDialog.isOpen" as="template">
      <Dialog as="div" @close="snoozeDialog.isOpen = false" class="relative z-50">
        <TransitionChild
          as="template"
          enter="duration-200 ease-out"
          enter-from="opacity-0"
          enter-to="opacity-100"
          leave="duration-150 ease-in"
          leave-from="opacity-100"
          leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </TransitionChild>

        <div class="fixed inset-0 overflow-y-auto">
          <div class="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              as="template"
              enter="duration-200 ease-out"
              enter-from="opacity-0 scale-95"
              enter-to="opacity-100 scale-100"
              leave="duration-150 ease-in"
              leave-from="opacity-100 scale-100"
              leave-to="opacity-0 scale-95"
            >
              <DialogPanel
                class="w-full max-w-sm transform overflow-hidden rounded-2xl bg-card p-6 text-left align-middle shadow-xl transition-all border border-card-border"
              >
                <DialogTitle as="h3" class="text-lg font-medium text-text-main mb-4">
                  {{ $t('action.snooze') }}
                </DialogTitle>

                <div class="mb-6">
                  <label class="block text-sm font-medium text-text-secondary mb-2">
                    {{ $t('action.snoozeDays') }}
                  </label>
                  <input
                    v-model.number="snoozeDialog.days"
                    type="number"
                    min="1"
                    max="365"
                    class="w-full px-3 py-2 bg-background border border-card-border rounded-lg focus:outline-none focus:border-accent transition-colors"
                  />
                </div>

                <div class="flex justify-end gap-3">
                  <button
                    type="button"
                    class="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-black/5 rounded-lg transition-all active:scale-95"
                    @click="snoozeDialog.isOpen = false"
                  >
                    {{ $t('common.cancel') }}
                  </button>
                  <button
                    type="button"
                    class="px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    :disabled="isActionPending(snoozeDialog.actionId)"
                    @click="confirmSnooze"
                  >
                    {{ isActionPending(snoozeDialog.actionId) ? $t('common.loading') : $t('common.confirm') }}
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { format } from "date-fns";
import { TransitionRoot, TransitionChild, Dialog, DialogPanel, DialogTitle } from '@headlessui/vue';

const { t } = useI18n();
const toast = useToast();

const loading = ref(true);
const actions = ref([]);
const total = ref(0);
const page = ref(1);
const limit = ref(50);
const pageSizeOptions = [24, 50, 100];
const statusFilter = ref("");
const priorityFilter = ref("");
const pendingActionIds = ref(new Set());
const snoozeDialog = ref({
  isOpen: false,
  actionId: null,
  days: 7
});

const fetchActions = async () => {
  loading.value = true;
  try {
    const response = await $fetch('/api/actions', {
      query: {
        page: page.value,
        limit: limit.value,
        status: statusFilter.value || undefined,
        priority: priorityFilter.value || undefined,
      },
    });
    if (response?.code !== 0) {
      throw new Error(response?.msg || "Failed to fetch actions");
    }
    actions.value = response?.data?.items || [];
    total.value = response?.data?.total || 0;
    page.value = response?.data?.page || page.value;
  } catch (error) {
    console.error("Failed to fetch actions:", error);
  } finally {
    loading.value = false;
  }
};

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)));
const pageStart = computed(() => (total.value === 0 ? 0 : (page.value - 1) * limit.value + 1));
const pageEnd = computed(() => Math.min(total.value, page.value * limit.value));
const canPrev = computed(() => page.value > 1);
const canNext = computed(() => page.value < totalPages.value);

watch([statusFilter, priorityFilter, limit], () => {
  if (page.value === 1) {
    fetchActions();
  } else {
    page.value = 1;
  }
});

watch(page, fetchActions);

watch(totalPages, (pages) => {
  if (page.value > pages) page.value = pages;
});

onMounted(fetchActions);

const snoozeAction = (id) => {
  snoozeDialog.value = {
    isOpen: true,
    actionId: id,
    days: 7
  };
};

const setActionPending = (id, pending) => {
  const next = new Set(pendingActionIds.value);
  if (pending) next.add(id);
  else next.delete(id);
  pendingActionIds.value = next;
};

const isActionPending = (id) => pendingActionIds.value.has(id);

const confirmSnooze = async () => {
  const { actionId, days } = snoozeDialog.value;
  snoozeDialog.value.isOpen = false;
  if (!actionId || isActionPending(actionId)) return;

  const snoozedUntil = new Date();
  snoozedUntil.setDate(snoozedUntil.getDate() + parseInt(days));

  setActionPending(actionId, true);
  try {
    const resp = await $fetch(`/api/actions/${actionId}`, {
      method: "PATCH",
      body: { status: "SNOOZED", snoozedUntil: snoozedUntil.toISOString() },
    });
    if (resp?.code !== 0) throw new Error(resp?.msg || "Failed to snooze");
    toast.success(t('action.snoozeSuccess'));
    await fetchActions();
  } catch (error) {
    toast.error(t('action.snoozeError'));
  } finally {
    setActionPending(actionId, false);
  }
};

const dismissAction = async (id) => {
  if (isActionPending(id)) return;
  setActionPending(id, true);
  try {
    const resp = await $fetch(`/api/actions/${id}`, {
      method: "PATCH",
      body: { status: "DISMISSED" },
    });
    if (resp?.code !== 0) throw new Error(resp?.msg || "Failed to dismiss");
    toast.success(t('action.dismissSuccess'));
    await fetchActions();
  } catch (error) {
    toast.error(t('action.dismissError'));
  } finally {
    setActionPending(id, false);
  }
};

const resolveAction = async (id) => {
  if (isActionPending(id)) return;
  setActionPending(id, true);
  try {
    const resp = await $fetch(`/api/actions/${id}`, {
      method: "PATCH",
      body: { status: "RESOLVED" },
    });
    if (resp?.code !== 0) throw new Error(resp?.msg || "Failed to resolve");
    toast.success(t('action.resolveSuccess'));
    await fetchActions();
  } catch (error) {
    toast.error(t('action.resolveError'));
  } finally {
    setActionPending(id, false);
  }
};

const formatDate = (d) => {
  if (!d) return "--";
  return format(new Date(d), "yyyy-MM-dd HH:mm");
};

const formatActionType = (type) => {
  const map = {
    WANTED_AVAILABLE: "Available",
    WANTED_DROPPING: "Dropping",
    OWNED_EXPIRING: "Expiring",
    SCAN_FAILED: "Scan Failed",
  };
  return map[type] || type;
};

const priorityBorderClass = (priority) => {
  switch (priority) {
    case "HIGH":
      return "border-l-[3px] border-l-priority-high";
    case "MEDIUM":
      return "border-l-[3px] border-l-priority-medium";
    case "LOW":
      return "border-l-[3px] border-l-priority-low";
    default:
      return "";
  }
};

const priorityClass = (priority) => {
  switch (priority) {
    case "HIGH":
      return "bg-priority-high/10 text-priority-high border border-priority-high/20";
    case "MEDIUM":
      return "bg-priority-medium/10 text-priority-medium border border-priority-medium/20";
    case "LOW":
      return "bg-priority-low/10 text-priority-low border border-priority-low/20";
    default:
      return "bg-priority-low/10 text-priority-low border border-priority-low/20";
  }
};

const statusClass = (status) => {
  switch (status) {
    case "OPEN":
      return "bg-status-expiring/10 text-status-expiring border-status-expiring/20";
    case "SNOOZED":
      return "bg-status-unknown/10 text-status-unknown border-status-unknown/20";
    case "DISMISSED":
      return "bg-status-registered/10 text-status-registered border-status-registered/20";
    case "RESOLVED":
      return "bg-status-available/10 text-status-available border-status-available/20";
    default:
      return "bg-status-unknown/10 text-status-unknown border-status-unknown/20";
  }
};

const actionTypeClass = (type) => {
  switch (type) {
    case "WANTED_AVAILABLE":
      return "bg-status-available/10 text-status-available border border-status-available/20";
    case "WANTED_DROPPING":
      return "bg-status-dropping/10 text-status-dropping border border-status-dropping/20";
    case "OWNED_EXPIRING":
      return "bg-status-expiring/10 text-status-expiring border border-status-expiring/20";
    case "SSL_EXPIRING":
      return "bg-status-expiring/10 text-status-expiring border border-status-expiring/20";
    case "SSL_INVALID":
      return "bg-status-dropping/10 text-status-dropping border border-status-dropping/20";
    case "SCAN_FAILED":
      return "bg-status-unknown/10 text-status-unknown border border-status-unknown/20";
    default:
      return "bg-status-unknown/10 text-status-unknown border border-status-unknown/20";
  }
};
</script>
