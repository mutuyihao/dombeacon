<template>
  <article class="surface group relative h-full min-h-48 overflow-hidden p-5 pb-12 transition-shadow hover:shadow-elevated">
    <span
      v-if="domain.priority && domain.priority !== 'LOW'"
      :class="['absolute left-0 top-6 h-6 w-0.5 rounded-r-full', priorityAccentClass]"
    />

    <header class="flex items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <h3 class="font-mono truncate text-[14.5px] font-semibold tracking-tight text-text-main">
          {{ domain.domain }}
        </h3>
        <p class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
          <span :class="watchKindToneClass">
            {{ domain.watchKind === 'OWNED' ? $t('domain.owned') : $t('domain.wanted') }}
          </span>
          <span v-if="domain.priority" class="text-text-tertiary">·</span>
          <span v-if="domain.priority" :class="priorityToneClass">
            {{ $t(`domain.${domain.priority.toLowerCase()}`) }}
          </span>
        </p>
      </div>

      <span :class="['flex shrink-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]', statusToneClass]">
        <span :class="['h-1.5 w-1.5 rounded-full', statusDotClass]" />
        {{ domain.status ? $t(`domain.status.${domain.status.toLowerCase()}`) : $t('domain.status.unknown') }}
      </span>
    </header>

    <div class="hairline mt-4" />

    <dl class="mt-1">
      <div class="flex items-center justify-between border-b border-hairline py-2.5 last:border-b-0">
        <dt class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Expires</dt>
        <dd class="font-mono text-sm font-medium text-text-main">{{ formatDate(domain.expiresAt) }}</dd>
      </div>
      <div class="flex items-center justify-between py-2.5">
        <dt class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Checked</dt>
        <dd class="font-mono text-sm font-medium text-text-main">{{ formatDate(domain.checkedAt, true) }}</dd>
      </div>
    </dl>

    <div class="mt-2 min-h-4">
      <div v-if="domain.tags && domain.tags.length" class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-secondary">
        <span v-for="tag in domain.tags" :key="tag" class="font-mono">#{{ tag }}</span>
      </div>
    </div>

    <div
      v-if="showSecuritySummary"
      :class="['mt-3 flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs', riskPanelClass]"
    >
      <span class="flex min-w-0 items-center gap-2">
        <ShieldAlertIcon class="h-3.5 w-3.5 shrink-0" />
        <span class="truncate font-semibold uppercase tracking-[0.14em]">Security</span>
      </span>
      <span class="shrink-0 font-mono font-semibold" data-numeric>
        {{ riskLabel }}
      </span>
    </div>

    <div class="absolute bottom-3 right-3 z-20 flex gap-0.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
      <button
        @click.stop="$emit('refresh', domain.id)"
        :disabled="refreshing || deleting"
        class="rounded-full p-2 text-text-tertiary transition-colors hover:bg-surface-sunken hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
        :title="$t('domain.checkNow')"
      >
        <RefreshCwIcon :class="['h-3.5 w-3.5', refreshing && 'animate-spin']" />
      </button>
      <button
        @click.stop="$emit('delete', domain.id)"
        :disabled="refreshing || deleting"
        class="rounded-full p-2 text-text-tertiary transition-colors hover:bg-surface-sunken hover:text-status-dropping disabled:cursor-not-allowed disabled:opacity-50"
        :title="$t('common.delete')"
      >
        <Loader2Icon v-if="deleting" class="h-3.5 w-3.5 animate-spin" />
        <Trash2Icon v-else class="h-3.5 w-3.5" />
      </button>
    </div>

    <NuxtLink :to="`/domains/${domain.id}`" class="absolute inset-0 z-10" @click.stop />
  </article>
</template>

<script setup>
import { Loader2 as Loader2Icon, RefreshCw as RefreshCwIcon, ShieldAlert as ShieldAlertIcon, Trash2 as Trash2Icon } from 'lucide-vue-next';
import { format } from 'date-fns';

const props = defineProps({
  domain: {
    type: Object,
    required: true,
  },
  refreshing: {
    type: Boolean,
    default: false,
  },
  deleting: {
    type: Boolean,
    default: false,
  },
});

defineEmits(['refresh', 'delete']);

const statusToneClass = computed(() => {
  switch (props.domain.status) {
    case 'AVAILABLE': return 'text-status-available';
    case 'REGISTERED': return 'text-status-registered';
    case 'EXPIRING': return 'text-status-expiring';
    case 'PENDING_DELETE': return 'text-status-dropping';
    default: return 'text-status-unknown';
  }
});

const statusDotClass = computed(() => {
  switch (props.domain.status) {
    case 'AVAILABLE': return 'bg-status-available';
    case 'REGISTERED': return 'bg-status-registered';
    case 'EXPIRING': return 'bg-status-expiring';
    case 'PENDING_DELETE': return 'bg-status-dropping';
    default: return 'bg-status-unknown';
  }
});

const watchKindToneClass = computed(() =>
  props.domain.watchKind === 'OWNED' ? 'text-watch-owned' : 'text-watch-wanted',
);

const priorityToneClass = computed(() => {
  switch (props.domain.priority) {
    case 'HIGH': return 'text-priority-high';
    case 'MEDIUM': return 'text-priority-medium';
    case 'LOW': return 'text-priority-low';
    default: return 'text-priority-low';
  }
});

const priorityAccentClass = computed(() => {
  switch (props.domain.priority) {
    case 'HIGH': return 'bg-priority-high';
    case 'MEDIUM': return 'bg-priority-medium';
    default: return 'bg-card-border';
  }
});

const showSecuritySummary = computed(() =>
  props.domain.watchKind === 'OWNED' &&
  (props.domain.lastSecurityScanAt || props.domain.openFindingsCount > 0),
);

const riskPanelClass = computed(() => {
  if (props.domain.openFindingsCount <= 0) {
    return 'border-status-available/20 bg-status-available/5 text-status-available';
  }
  switch (props.domain.highestSeverity || props.domain.riskSummary?.highestSeverity) {
    case 'HIGH':
      return 'border-status-dropping/25 bg-status-dropping/10 text-status-dropping';
    case 'MEDIUM':
      return 'border-status-expiring/25 bg-status-expiring/10 text-status-expiring';
    default:
      return 'border-accent/20 bg-accent/5 text-accent';
  }
});

const riskLabel = computed(() => {
  const count = Number(props.domain.openFindingsCount || 0);
  if (count <= 0) return 'clear';
  return `${count} open`;
});

const formatDate = (d, time = false) => {
  if (!d) return '—';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  return format(date, time ? 'MM-dd HH:mm' : 'yyyy-MM-dd');
};
</script>
