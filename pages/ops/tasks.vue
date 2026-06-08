<template>
  <div class="flex min-h-full flex-col gap-6 md:h-full md:min-h-0 md:overflow-hidden">

    <!-- ─── PAGE HEADER ─────────────────────────────────────────────── -->
    <header class="shrink-0">
      <p class="eyebrow mb-2">System cadence</p>
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="headline-display text-3xl md:text-4xl">{{ $t('task.title') }}</h1>
          <p class="mt-2 max-w-2xl text-sm text-text-secondary">{{ $t('task.description') }}</p>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="trigger('hourly-scan')"
            :disabled="isTriggerDisabled('hourly-scan')"
            class="btn-ghost disabled:opacity-50"
          >
            <LoadingSpinner v-if="triggeringTask === 'hourly-scan'" size="sm" color="gray" />
            <span v-if="triggeringTask === 'hourly-scan'">{{ $t('task.queued') }}</span>
            <span v-else>{{ $t('task.triggerScan') }}</span>
          </button>
          <button
            @click="trigger('daily-summary')"
            :disabled="isTriggerDisabled('daily-summary')"
            class="btn-ghost disabled:opacity-50"
          >
            <LoadingSpinner v-if="triggeringTask === 'daily-summary'" size="sm" color="gray" />
            <span v-if="triggeringTask === 'daily-summary'">{{ $t('task.queued') }}</span>
            <span v-else>{{ $t('task.triggerSummary') }}</span>
          </button>
          <button
            @click="trigger('brand-watch')"
            :disabled="isTriggerDisabled('brand-watch')"
            class="btn-ghost disabled:opacity-50"
          >
            <LoadingSpinner v-if="triggeringTask === 'brand-watch'" size="sm" color="gray" />
            <span v-if="triggeringTask === 'brand-watch'">{{ $t('task.queued') }}</span>
            <span v-else>Trigger Brand Watch</span>
          </button>
        </div>
      </div>
    </header>

    <!-- ─── RUNNING BANNER ──────────────────────────────────────────── -->
    <div
      v-if="runningTasks.length || lastTrigger"
      class="surface-flat flex shrink-0 flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between"
    >
      <div>
        <p class="text-sm font-medium text-text-main">
          {{ runningTasks.length ? $t('task.runningNow') : $t('task.triggerAccepted') }}
        </p>
        <p class="mt-1 text-xs text-text-secondary">{{ $t('task.refreshHint') }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <span
          v-for="item in runningTasks"
          :key="item.taskName"
          class="rounded-full bg-card px-3 py-1 text-xs font-mono text-text-main shadow-soft"
        >
          {{ item.taskName }} · {{ $t('task.lockedUntil') }} {{ formatDate(item.lockedUntil) }}
        </span>
        <span
          v-if="!runningTasks.length && lastTrigger"
          class="rounded-full bg-card px-3 py-1 text-xs font-mono text-text-main shadow-soft"
        >
          {{ lastTrigger.taskName }} · {{ lastTrigger.status }}
        </span>
      </div>
    </div>

    <!-- ─── RUNS TABLE ──────────────────────────────────────────────── -->
    <div @scroll="onRunsScroll" class="relative min-h-[26rem] flex-1 overflow-y-auto rounded-[18px] border border-hairline bg-card/45 p-3 md:min-h-0 md:p-4">
      <div class="surface overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-hairline-strong text-left">
                <th class="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('task.taskName') }}</th>
                <th class="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('task.started') }}</th>
                <th class="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('task.duration') }}</th>
                <th class="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('task.result') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-hairline">
              <tr v-for="run in runsItems" :key="run.id" class="transition-colors hover:bg-surface-sunken">
                <td class="px-6 py-4 font-mono text-text-main">{{ run.taskName }}</td>
                <td class="px-6 py-4 font-mono text-text-secondary">{{ formatDate(run.startedAt) }}</td>
                <td class="px-6 py-4 font-mono text-text-secondary">
                  {{ run.finishedAt ? (new Date(run.finishedAt) - new Date(run.startedAt)) + 'ms' : $t('task.running') }}
                </td>
                <td class="px-6 py-4 text-text-secondary">
                  <div class="flex items-center justify-between gap-3">
                    <div class="max-w-88 truncate text-xs" :title="summarizeResult(run.result)">
                      {{ summarizeResult(run.result) }}
                    </div>
                    <button type="button" class="btn-text shrink-0 text-xs" @click="openDetail(run)">
                      {{ $t('common.view') }}
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="!runsItems.length">
                <td colspan="4" class="px-6 py-12 text-center text-sm text-text-secondary">{{ $t('task.noHistory') }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="runsNextCursor" class="border-t border-hairline p-4 text-center">
          <button type="button" class="btn-text" :disabled="runsLoadingMore" @click="loadMoreRuns">
            {{ runsLoadingMore ? $t('common.loading') : $t('common.loadMore') }}
          </button>
        </div>
      </div>
    </div>

    <TaskRunDetailModal :is-open="detailOpen" :run="selectedRun" @close="detailOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { format } from 'date-fns';

const { t } = useI18n();
const toast = useToast();

const PAGE_SIZE = 50;
const { data, refresh } = await useFetch('/api/tasks/runs', {
  query: { limit: PAGE_SIZE },
});

const runsItems = ref<any[]>([]);
const runsNextCursor = ref<number | null>(null);
const runsLoadingMore = ref(false);
const runningTasks = computed(() => data.value?.data?.running || []);
const triggeringTask = ref('');
const lastTrigger = ref<any | null>(null);

watchEffect(() => {
  runsItems.value = data.value?.data?.items || [];
  runsNextCursor.value = data.value?.data?.nextCursor ?? null;
});

const loadMoreRuns = async () => {
  if (runsLoadingMore.value) return;
  if (!runsNextCursor.value) return;

  runsLoadingMore.value = true;
  try {
    const resp: any = await $fetch('/api/tasks/runs', {
      query: { cursor: runsNextCursor.value, limit: PAGE_SIZE },
    });

    if (resp?.code !== 0) {
      toast.error(resp?.msg || t('task.triggerFailed'));
      return;
    }

    const items = resp?.data?.items || [];
    runsItems.value = runsItems.value.concat(items);
    runsNextCursor.value = resp?.data?.nextCursor ?? null;
  } catch (e) {
    toast.error(t('task.triggerFailed'));
  } finally {
    runsLoadingMore.value = false;
  }
};

const onRunsScroll = (event: Event) => {
  if (runsLoadingMore.value || !runsNextCursor.value) return;
  const el = event.target as HTMLElement;
  const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
  if (remaining < 240) {
    loadMoreRuns();
  }
};

const formatDate = (d: any) => {
  if (!d) return '-';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '-';
  return format(date, 'MM-dd HH:mm:ss');
};

const summarizeResult = (r: any) => {
  if (!r) return '-';
  if (typeof r !== 'object') return String(r);
  if (r.success === true && Object.keys(r).length === 1) return 'OK';
  if (typeof r.candidatesChecked === 'number' || typeof r.termsChecked === 'number') {
    const terms = typeof r.termsChecked === 'number' ? r.termsChecked : 0;
    const candidates = typeof r.candidatesChecked === 'number' ? r.candidatesChecked : 0;
    const registered = typeof r.registered === 'number' ? r.registered : 0;
    const ct = typeof r.ctDiscovered === 'number' ? r.ctDiscovered : 0;
    const error = typeof r.error === 'number' ? r.error : 0;
    return `${terms} terms / ${candidates} candidates / ${registered} registered / ${ct} CT / ${error} errors`;
  }
  if (typeof r.checked === 'number' || typeof r.fail === 'number' || typeof r.success === 'number') {
    const checked = typeof r.checked === 'number' ? r.checked : '?';
    const ok = typeof r.success === 'number' ? r.success : 0;
    const fail = typeof r.fail === 'number' ? r.fail : 0;
    return `${ok} ok / ${fail} fail (${checked} checked)`;
  }
  const keys = Object.keys(r);
  if (keys.length === 0) return '{}';
  return keys.slice(0, 3).join(', ') + (keys.length > 3 ? ` +${keys.length - 3}` : '');
};

const detailOpen = ref(false);
const selectedRun = ref<any | null>(null);

const openDetail = (run: any) => {
  selectedRun.value = run;
  detailOpen.value = true;
};

const isTaskRunning = (task: string) => {
  return runningTasks.value.some((i: any) => i.taskName === task);
};

const isTriggerDisabled = (task: string) => {
  return !!triggeringTask.value || isTaskRunning(task);
};

const trigger = async (task: string) => {
  if (isTriggerDisabled(task)) return;
  triggeringTask.value = task;
  try {
    const resp: any = await $fetch('/api/tasks/trigger', { method: 'POST', body: { task } });
    if (resp?.code !== 0) {
      toast.error(resp?.msg || t('task.triggerFailed'));
      return;
    }
    lastTrigger.value = resp.data;
    toast.success(t('task.triggered', { task }));
    await refresh();
    setTimeout(refresh, 1500);
    setTimeout(refresh, 5000);
  } catch (e) {
    toast.error(t('task.triggerFailed'));
  } finally {
    triggeringTask.value = '';
  }
};
</script>
