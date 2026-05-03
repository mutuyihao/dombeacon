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
            class="flex-1 px-3 py-1.5 text-xs bg-background hover:bg-accent/10 border border-card-border rounded-lg transition-colors"
          >
            {{ $t('action.snooze') }}
          </button>
          <button
            v-if="action.status === 'OPEN'"
            @click="dismissAction(action.id)"
            class="flex-1 px-3 py-1.5 text-xs bg-background hover:bg-accent/10 border border-card-border rounded-lg transition-colors"
          >
            {{ $t('action.dismiss') }}
          </button>
          <button
            v-if="action.status === 'OPEN' || action.status === 'SNOOZED'"
            @click="resolveAction(action.id)"
            class="flex-1 px-3 py-1.5 text-xs bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors"
          >
            {{ $t('action.resolve') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { format } from "date-fns";

const { t } = useI18n();

const loading = ref(true);
const actions = ref([]);
const statusFilter = ref("");
const priorityFilter = ref("");

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

const snoozeAction = async (id) => {
  const days = prompt(t('action.snoozeDays'), "7");
  if (!days) return;

  const snoozedUntil = new Date();
  snoozedUntil.setDate(snoozedUntil.getDate() + parseInt(days));

  try {
    await $fetch(`/api/actions/${id}`, {
      method: "PATCH",
      body: { status: "SNOOZED", snoozedUntil: snoozedUntil.toISOString() },
    });
    await fetchActions();
  } catch (error) {
    alert(t('action.snoozeError'));
  }
};

const dismissAction = async (id) => {
  try {
    await $fetch(`/api/actions/${id}`, {
      method: "PATCH",
      body: { status: "DISMISSED" },
    });
    await fetchActions();
  } catch (error) {
    alert(t('action.dismissError'));
  }
};

const resolveAction = async (id) => {
  try {
    await $fetch(`/api/actions/${id}`, {
      method: "PATCH",
      body: { status: "RESOLVED" },
    });
    await fetchActions();
  } catch (error) {
    alert(t('action.resolveError'));
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
