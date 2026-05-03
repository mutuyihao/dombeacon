<template>
  <div class="container mx-auto px-4 py-8 max-w-7xl">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-semibold text-text-main">{{ $t('action.title') }}</h1>
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
    <div v-if="loading" class="text-center py-12 text-text-secondary">
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
        </div>

        <!-- Actions -->
        <div class="flex gap-2">
          <button
            v-if="action.status === 'OPEN'"
            @click="snoozeAction(action.id)"
            class="flex-1 px-3 py-1.5 text-xs bg-background hover:bg-accent/10 border border-card-border rounded-lg transition-all active:scale-95"
          >
            {{ $t('action.snooze') }}
          </button>
          <button
            v-if="action.status === 'OPEN'"
            @click="dismissAction(action.id)"
            class="flex-1 px-3 py-1.5 text-xs bg-background hover:bg-accent/10 border border-card-border rounded-lg transition-all active:scale-95"
          >
            {{ $t('action.dismiss') }}
          </button>
          <button
            v-if="action.status === 'OPEN' || action.status === 'SNOOZED'"
            @click="resolveAction(action.id)"
            class="flex-1 px-3 py-1.5 text-xs bg-accent hover:bg-accent-hover text-white rounded-lg transition-all active:scale-95"
          >
            {{ $t('action.resolve') }}
          </button>
        </div>
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
                    class="px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition-all active:scale-95"
                    @click="confirmSnooze"
                  >
                    {{ $t('common.confirm') }}
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
const statusFilter = ref("");
const priorityFilter = ref("");
const snoozeDialog = ref({
  isOpen: false,
  actionId: null,
  days: 7
});

const fetchActions = async () => {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    if (statusFilter.value) params.append("status", statusFilter.value);
    if (priorityFilter.value) params.append("priority", priorityFilter.value);

    const response = await $fetch(`/api/actions?${params.toString()}`);
    actions.value = response.actions || [];
  } catch (error) {
    console.error("Failed to fetch actions:", error);
  } finally {
    loading.value = false;
  }
};

watch([statusFilter, priorityFilter], fetchActions);

onMounted(fetchActions);

const snoozeAction = (id) => {
  snoozeDialog.value = {
    isOpen: true,
    actionId: id,
    days: 7
  };
};

const confirmSnooze = async () => {
  const { actionId, days } = snoozeDialog.value;
  snoozeDialog.value.isOpen = false;

  const snoozedUntil = new Date();
  snoozedUntil.setDate(snoozedUntil.getDate() + parseInt(days));

  try {
    await $fetch(`/api/actions/${actionId}`, {
      method: "PATCH",
      body: { status: "SNOOZED", snoozedUntil: snoozedUntil.toISOString() },
    });
    toast.success(t('action.snoozeSuccess'));
    await fetchActions();
  } catch (error) {
    toast.error(t('action.snoozeError'));
  }
};

const dismissAction = async (id) => {
  try {
    await $fetch(`/api/actions/${id}`, {
      method: "PATCH",
      body: { status: "DISMISSED" },
    });
    toast.success(t('action.dismissSuccess'));
    await fetchActions();
  } catch (error) {
    toast.error(t('action.dismissError'));
  }
};

const resolveAction = async (id) => {
  try {
    await $fetch(`/api/actions/${id}`, {
      method: "PATCH",
      body: { status: "RESOLVED" },
    });
    toast.success(t('action.resolveSuccess'));
    await fetchActions();
  } catch (error) {
    toast.error(t('action.resolveError'));
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
      return "border-l-[3px] border-l-[#8C6F6F]";
    case "MEDIUM":
      return "border-l-[3px] border-l-[#A08C7C]";
    case "LOW":
      return "border-l-[3px] border-l-[#8A8780]";
    default:
      return "";
  }
};

const priorityClass = (priority) => {
  switch (priority) {
    case "HIGH":
      return "bg-[#8C6F6F]/10 text-[#8C6F6F] border border-[#8C6F6F]/20";
    case "MEDIUM":
      return "bg-[#A08C7C]/10 text-[#A08C7C] border border-[#A08C7C]/20";
    case "LOW":
      return "bg-[#8A8780]/10 text-[#8A8780] border border-[#8A8780]/20";
    default:
      return "bg-[#8A8780]/10 text-[#8A8780] border border-[#8A8780]/20";
  }
};

const statusClass = (status) => {
  switch (status) {
    case "OPEN":
      return "bg-[#A08C7C]/10 text-[#A08C7C] border-[#A08C7C]/20";
    case "SNOOZED":
      return "bg-[#8A8780]/10 text-[#8A8780] border-[#8A8780]/20";
    case "DISMISSED":
      return "bg-[#7A7F8C]/10 text-[#7A7F8C] border-[#7A7F8C]/20";
    case "RESOLVED":
      return "bg-[#7C8B7A]/10 text-[#7C8B7A] border-[#7C8B7A]/20";
    default:
      return "bg-[#8A8780]/10 text-[#8A8780] border-[#8A8780]/20";
  }
};

const actionTypeClass = (type) => {
  switch (type) {
    case "WANTED_AVAILABLE":
      return "bg-[#7C8B7A]/10 text-[#7C8B7A] border border-[#7C8B7A]/20";
    case "WANTED_DROPPING":
      return "bg-[#8C6F6F]/10 text-[#8C6F6F] border border-[#8C6F6F]/20";
    case "OWNED_EXPIRING":
      return "bg-[#A08C7C]/10 text-[#A08C7C] border border-[#A08C7C]/20";
    case "SCAN_FAILED":
      return "bg-[#8A8780]/10 text-[#8A8780] border border-[#8A8780]/20";
    default:
      return "bg-[#8A8780]/10 text-[#8A8780] border border-[#8A8780]/20";
  }
};
</script>
