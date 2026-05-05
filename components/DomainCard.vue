<template>
  <div class="glass-panel glass-panel-hover group relative min-h-[13.75rem] overflow-hidden rounded-[1.35rem] p-5">
    <div :class="['absolute left-5 top-0 h-[2px] w-14 rounded-full', priorityAccentClass]" />

    <div class="mb-6 flex items-start justify-between gap-4">
      <div class="min-w-0 flex-1">
        <h3 class="truncate font-mono text-lg font-semibold tracking-[-0.035em] text-text-main">
          {{ domain.domain }}
        </h3>
        <div class="mt-2 flex flex-wrap items-center gap-2">
          <span :class="['rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]', watchKindClass]">
            {{ domain.watchKind === 'OWNED' ? $t('domain.owned') : $t('domain.wanted') }}
          </span>
          <span v-if="domain.priority" :class="['rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]', priorityClass]">
            {{ $t(`domain.${domain.priority.toLowerCase()}`) }}
          </span>
        </div>
      </div>

      <span :class="['inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', statusClass]">
        <span :class="['h-1.5 w-1.5 rounded-full', statusDotClass]" />
        {{ domain.status ? $t(`domain.status.${domain.status.toLowerCase()}`) : $t('domain.status.unknown') }}
      </span>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="rounded-2xl bg-background/52 p-3">
        <p class="eyebrow text-[9px] tracking-[0.18em]">Expires</p>
        <p class="mt-2 font-mono text-sm font-semibold text-text-main">
          {{ formatDate(domain.expiresAt) }}
        </p>
      </div>
      <div class="rounded-2xl bg-background/52 p-3">
        <p class="eyebrow text-[9px] tracking-[0.18em]">Checked</p>
        <p class="mt-2 font-mono text-sm font-semibold text-text-main">
          {{ formatDate(domain.checkedAt, true) }}
        </p>
      </div>
    </div>

    <div class="mt-4 flex min-h-6 flex-wrap items-center gap-1.5 pr-16">
      <span
        v-for="tag in domain.tags"
        :key="tag"
        class="rounded-full bg-background/60 px-2 py-0.5 text-[10px] font-medium text-text-secondary"
      >
        {{ tag }}
      </span>
    </div>

    <div class="absolute bottom-4 right-4 z-20 flex gap-1 opacity-80 transition-opacity md:opacity-0 md:group-hover:opacity-100">
      <button
        @click.stop="$emit('refresh', domain.id)"
        :disabled="refreshing || deleting"
        class="rounded-xl p-1.5 text-text-secondary hover:bg-background/80 hover:text-accent active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50"
        :title="$t('domain.checkNow')"
      >
        <RefreshCwIcon :class="['h-4 w-4', refreshing && 'animate-spin']" />
      </button>
      <button
        @click.stop="$emit('delete', domain.id)"
        :disabled="refreshing || deleting"
        class="rounded-xl p-1.5 text-text-secondary hover:bg-background/80 hover:text-status-dropping active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50"
        :title="$t('common.delete')"
      >
        <Loader2Icon v-if="deleting" class="h-4 w-4 animate-spin" />
        <Trash2Icon v-else class="h-4 w-4" />
      </button>
    </div>

    <NuxtLink :to="`/domains/${domain.id}`" class="absolute inset-0 z-10" @click.stop />
  </div>
</template>

<script setup>
import { Loader2 as Loader2Icon, RefreshCw as RefreshCwIcon, Trash2 as Trash2Icon } from 'lucide-vue-next';
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

const statusClass = computed(() => {
  switch (props.domain.status) {
    case 'AVAILABLE': return 'bg-status-available/10 text-status-available';
    case 'REGISTERED': return 'bg-status-registered/10 text-status-registered';
    case 'EXPIRING': return 'bg-status-expiring/10 text-status-expiring';
    case 'PENDING_DELETE': return 'bg-status-dropping/10 text-status-dropping';
    default: return 'bg-status-unknown/10 text-status-unknown';
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

const watchKindClass = computed(() => {
  return props.domain.watchKind === 'OWNED'
    ? 'bg-watch-owned/10 text-watch-owned'
    : 'bg-watch-wanted/10 text-watch-wanted';
});

const priorityClass = computed(() => {
  switch (props.domain.priority) {
    case 'HIGH': return 'bg-priority-high/10 text-priority-high';
    case 'MEDIUM': return 'bg-priority-medium/10 text-priority-medium';
    case 'LOW': return 'bg-priority-low/10 text-priority-low';
    default: return 'bg-priority-low/10 text-priority-low';
  }
});

const priorityAccentClass = computed(() => {
  switch (props.domain.priority) {
    case 'HIGH': return 'bg-priority-high';
    case 'MEDIUM': return 'bg-priority-medium';
    case 'LOW': return 'bg-priority-low';
    default: return 'bg-card-border';
  }
});

const formatDate = (d, time = false) => {
  if (!d) return '--';
  return format(new Date(d), time ? 'MM-dd HH:mm' : 'yyyy-MM-dd');
};
</script>
