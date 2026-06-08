<template>
  <div class="flex min-h-full flex-col gap-6 md:h-full md:min-h-0 md:overflow-hidden">

    <!-- ─── PAGE HEADER ─────────────────────────────────────────────── -->
    <header class="shrink-0">
      <p class="eyebrow mb-2">Action queue</p>
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="headline-display text-3xl md:text-4xl">{{ $t('action.title') }}</h1>
          <p class="mt-2 max-w-2xl text-sm text-text-secondary">{{ $t('action.description') }}</p>
        </div>
        <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
          <label class="flex items-center gap-2">
            <span class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('common.status') }}</span>
            <select v-model="statusFilter" class="input-bare w-auto py-1 text-sm">
              <option value="">{{ $t('common.all') }}</option>
              <option value="OPEN">{{ $t('action.status.open') }}</option>
              <option value="SNOOZED">{{ $t('action.status.snoozed') }}</option>
              <option value="DISMISSED">{{ $t('action.status.dismissed') }}</option>
              <option value="RESOLVED">{{ $t('action.status.resolved') }}</option>
            </select>
          </label>
          <label class="flex items-center gap-2">
            <span class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('common.priority') }}</span>
            <select v-model="priorityFilter" class="input-bare w-auto py-1 text-sm">
              <option value="">{{ $t('common.all') }}</option>
              <option value="HIGH">{{ $t('domain.high') }}</option>
              <option value="MEDIUM">{{ $t('domain.medium') }}</option>
              <option value="LOW">{{ $t('domain.low') }}</option>
            </select>
          </label>
        </div>
      </div>
    </header>

    <!-- ─── LOADING / EMPTY ─────────────────────────────────────────── -->
    <section class="relative min-h-[26rem] flex-1 overflow-y-auto rounded-[18px] border border-hairline bg-card/45 p-3 pr-4 md:min-h-0 md:p-4 md:pr-5">
    <div v-if="loading && !actions.length" class="space-y-1">
      <div v-for="i in 5" :key="i" class="h-24 animate-pulse rounded-2xl bg-surface-sunken" />
    </div>

    <div v-else-if="!actions || actions.length === 0" class="py-24 text-center">
      <p class="text-sm text-text-secondary">{{ $t('action.noActions') }}</p>
    </div>

    <!-- ─── ACTION CARDS ────────────────────────────────────────────── -->
    <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="action in actions"
        :key="action.id"
        class="surface group relative overflow-hidden p-6 transition-shadow hover:shadow-elevated"
      >
        <span :class="['absolute left-0 top-6 h-6 w-0.5 rounded-r-full', priorityAccentClass(action.priority)]" />

        <header class="flex items-start justify-between gap-4">
          <div class="min-w-0 flex-1">
            <NuxtLink
              :to="action.domain?.id ? `/domains/${action.domain.id}` : '/domains'"
              class="font-display block truncate text-xl font-medium tracking-[-0.025em] text-text-main transition-colors hover:text-accent"
            >
              {{ action.domain?.domain || '-' }}
            </NuxtLink>
            <p class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.16em]">
              <span :class="actionTypeToneClass(action.actionType)">
                {{ $t(`action.types.${action.actionType.toLowerCase()}`) }}
              </span>
              <span class="text-text-tertiary">·</span>
              <span :class="priorityToneClass(action.priority)">
                {{ $t(`domain.${action.priority.toLowerCase()}`) }}
              </span>
            </p>
          </div>

          <span :class="['flex shrink-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]', statusToneClass(action.status)]">
            <span :class="['h-1.5 w-1.5 rounded-full', statusDotClass(action.status)]" />
            {{ $t(`action.status.${action.status.toLowerCase()}`) }}
          </span>
        </header>

        <div class="hairline mt-5" />

        <dl class="mt-1 space-y-0">
          <div class="flex items-center justify-between border-b border-hairline py-2.5 text-xs">
            <dt class="text-text-tertiary uppercase tracking-[0.14em]">{{ $t('action.triggeredAt') }}</dt>
            <dd class="font-mono text-text-main">{{ formatDate(action.triggeredAt) }}</dd>
          </div>
          <div v-if="action.snoozedUntil" class="flex items-center justify-between border-b border-hairline py-2.5 text-xs">
            <dt class="text-text-tertiary uppercase tracking-[0.14em]">{{ $t('action.snoozedUntil') }}</dt>
            <dd class="font-mono text-text-main">{{ formatDate(action.snoozedUntil) }}</dd>
          </div>
          <div v-if="action.metadata?.expiresAt" class="flex items-center justify-between border-b border-hairline py-2.5 text-xs">
            <dt class="text-text-tertiary uppercase tracking-[0.14em]">{{ $t('domain.expiresAt') }}</dt>
            <dd class="font-mono text-text-main">{{ formatDate(action.metadata.expiresAt) }}</dd>
          </div>
          <div v-if="action.metadata?.daysUntilExpiry !== undefined && action.metadata?.daysUntilExpiry !== null" class="flex items-center justify-between border-b border-hairline py-2.5 text-xs">
            <dt class="text-text-tertiary uppercase tracking-[0.14em]">SSL</dt>
            <dd class="font-mono text-text-main">{{ $t('ssl.daysUntilExpiry', { days: action.metadata.daysUntilExpiry }) }}</dd>
          </div>
          <div v-if="action.metadata?.issuer" class="flex items-center justify-between py-2.5 text-xs">
            <dt class="text-text-tertiary uppercase tracking-[0.14em]">{{ $t('ssl.issuer') }}</dt>
            <dd class="truncate font-mono text-text-main">{{ action.metadata.issuer }}</dd>
          </div>
        </dl>

        <div class="mt-5 flex items-center gap-2">
          <button
            v-if="action.status === 'OPEN'"
            @click="snoozeAction(action.id)"
            :disabled="isActionPending(action.id)"
            class="btn-ghost flex-1 px-3 py-1.5 text-xs disabled:opacity-50"
          >
            {{ $t('action.snooze') }}
          </button>
          <button
            v-if="action.status === 'OPEN'"
            @click="dismissAction(action.id)"
            :disabled="isActionPending(action.id)"
            class="btn-ghost flex-1 px-3 py-1.5 text-xs disabled:opacity-50"
          >
            {{ $t('action.dismiss') }}
          </button>
          <button
            v-if="action.status === 'OPEN' || action.status === 'SNOOZED'"
            @click="resolveAction(action.id)"
            :disabled="isActionPending(action.id)"
            class="btn-primary flex-1 justify-center px-3 py-1.5 text-xs disabled:opacity-50"
          >
            {{ isActionPending(action.id) ? $t('common.loading') : $t('action.resolve') }}
          </button>
        </div>
      </article>
    </div>
    </section>

    <!-- ─── PAGINATION ──────────────────────────────────────────────── -->
    <div v-if="total > 0" class="shrink-0 space-y-3">
      <div class="hairline" />
      <div class="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p class="text-text-secondary">
          {{ $t('action.pageInfo', { start: pageStart, end: pageEnd, total, page, pages: totalPages }) }}
        </p>
        <div class="flex flex-wrap items-center gap-x-5 gap-y-2">
          <label class="flex items-center gap-2 text-text-secondary">
            <span class="text-xs uppercase tracking-[0.14em]">{{ $t('filter.pageSize') }}</span>
            <select v-model.number="limit" class="input-bare w-auto py-1 pr-1 text-sm">
              <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
            </select>
          </label>
          <button class="btn-ghost px-3 py-1.5 disabled:opacity-40" :disabled="!canPrev" @click="page--">
            {{ $t('common.previous') }}
          </button>
          <button class="btn-ghost px-3 py-1.5 disabled:opacity-40" :disabled="!canNext" @click="page++">
            {{ $t('common.next') }}
          </button>
        </div>
      </div>
    </div>

    <!-- ─── SNOOZE DIALOG ───────────────────────────────────────────── -->
    <BaseModal :is-open="snoozeDialog.isOpen" :title="$t('action.snooze')" eyebrow="Defer" size="sm" @close="snoozeDialog.isOpen = false">
      <div class="space-y-6">
        <div>
          <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">
            {{ $t('action.snoozeDays') }}
          </label>
          <input v-model.number="snoozeDialog.days" type="number" min="1" max="365" class="input-bare font-mono" />
        </div>
        <div class="flex items-center justify-end gap-3">
          <button type="button" class="btn-ghost" @click="snoozeDialog.isOpen = false">
            {{ $t('common.cancel') }}
          </button>
          <button
            type="button"
            class="btn-primary disabled:opacity-50"
            :disabled="isActionPending(snoozeDialog.actionId)"
            @click="confirmSnooze"
          >
            {{ isActionPending(snoozeDialog.actionId) ? $t('common.loading') : $t('common.confirm') }}
          </button>
        </div>
      </div>
    </BaseModal>

  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { format } from 'date-fns';

const { t } = useI18n();
const toast = useToast();

const loading = ref(true);
const actions = ref([]);
const total = ref(0);
const page = ref(1);
const limit = ref(50);
const pageSizeOptions = [24, 50, 100];
const statusFilter = ref('');
const priorityFilter = ref('');
const pendingActionIds = ref(new Set());
const snoozeDialog = ref({ isOpen: false, actionId: null, days: 7 });

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
    if (response?.code !== 0) throw new Error(response?.msg || 'Failed to fetch actions');
    actions.value = response?.data?.items || [];
    total.value = response?.data?.total || 0;
    page.value = response?.data?.page || page.value;
  } catch (error) {
    console.error('Failed to fetch actions:', error);
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
  if (page.value === 1) fetchActions();
  else page.value = 1;
});

watch(page, fetchActions);

watch(totalPages, (pages) => {
  if (page.value > pages) page.value = pages;
});

onMounted(fetchActions);

const snoozeAction = (id) => {
  snoozeDialog.value = { isOpen: true, actionId: id, days: 7 };
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

  const snoozeDays = Math.min(365, Math.max(1, Number.parseInt(days, 10) || 7));
  const snoozedUntil = new Date();
  snoozedUntil.setDate(snoozedUntil.getDate() + snoozeDays);

  setActionPending(actionId, true);
  try {
    const resp = await $fetch(`/api/actions/${actionId}`, {
      method: 'PATCH',
      body: { status: 'SNOOZED', snoozedUntil: snoozedUntil.toISOString() },
    });
    if (resp?.code !== 0) throw new Error(resp?.msg || 'Failed to snooze');
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
      method: 'PATCH',
      body: { status: 'DISMISSED' },
    });
    if (resp?.code !== 0) throw new Error(resp?.msg || 'Failed to dismiss');
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
      method: 'PATCH',
      body: { status: 'RESOLVED' },
    });
    if (resp?.code !== 0) throw new Error(resp?.msg || 'Failed to resolve');
    toast.success(t('action.resolveSuccess'));
    await fetchActions();
  } catch (error) {
    toast.error(t('action.resolveError'));
  } finally {
    setActionPending(id, false);
  }
};

const formatDate = (d) => {
  if (!d) return '-';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '-';
  return format(date, 'yyyy-MM-dd HH:mm');
};

const priorityAccentClass = (priority) => {
  switch (priority) {
    case 'HIGH': return 'bg-priority-high';
    case 'MEDIUM': return 'bg-priority-medium';
    default: return 'bg-card-border';
  }
};

const priorityToneClass = (priority) => {
  switch (priority) {
    case 'HIGH': return 'text-priority-high';
    case 'MEDIUM': return 'text-priority-medium';
    case 'LOW': return 'text-priority-low';
    default: return 'text-priority-low';
  }
};

const statusToneClass = (status) => {
  switch (status) {
    case 'OPEN': return 'text-status-expiring';
    case 'SNOOZED': return 'text-status-unknown';
    case 'DISMISSED': return 'text-status-registered';
    case 'RESOLVED': return 'text-status-available';
    default: return 'text-status-unknown';
  }
};

const statusDotClass = (status) => {
  switch (status) {
    case 'OPEN': return 'bg-status-expiring';
    case 'SNOOZED': return 'bg-status-unknown';
    case 'DISMISSED': return 'bg-status-registered';
    case 'RESOLVED': return 'bg-status-available';
    default: return 'bg-status-unknown';
  }
};

const actionTypeToneClass = (type) => {
  switch (type) {
    case 'WANTED_AVAILABLE': return 'text-status-available';
    case 'WANTED_DROPPING':
    case 'SSL_INVALID': return 'text-status-dropping';
    case 'OWNED_EXPIRING':
    case 'SSL_EXPIRING': return 'text-status-expiring';
    case 'SCAN_FAILED': return 'text-status-unknown';
    default: return 'text-status-unknown';
  }
};
</script>
