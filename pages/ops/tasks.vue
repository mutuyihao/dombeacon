<template>
  <div class="space-y-6">
    <div class="flex flex-col md:flex-row justify-between md:items-end gap-3">
        <div>
          <h2 class="text-xl font-semibold">{{ $t('task.title') }}</h2>
          <p class="text-sm text-text-secondary mt-1">{{ $t('task.description') }}</p>
        </div>
        <div class="flex gap-2">
            <button
              @click="trigger('hourly-scan')"
              :disabled="isTriggerDisabled('hourly-scan')"
              class="px-4 py-2 bg-background border border-card-border rounded-lg text-sm font-medium hover:bg-card-border/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <span v-if="triggeringTask === 'hourly-scan'" class="inline-flex items-center gap-2">
                  <LoadingSpinner size="sm" color="gray" />
                  {{ $t('task.queued') }}
                </span>
                <span v-else>{{ $t('task.triggerScan') }}</span>
            </button>
            <button
              @click="trigger('daily-summary')"
              :disabled="isTriggerDisabled('daily-summary')"
              class="px-4 py-2 bg-background border border-card-border rounded-lg text-sm font-medium hover:bg-card-border/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <span v-if="triggeringTask === 'daily-summary'" class="inline-flex items-center gap-2">
                  <LoadingSpinner size="sm" color="gray" />
                  {{ $t('task.queued') }}
                </span>
                <span v-else>{{ $t('task.triggerSummary') }}</span>
            </button>
        </div>
    </div>

    <div
      v-if="runningTasks.length || lastTrigger"
      class="rounded-2xl border border-accent/20 bg-accent/5 p-4 text-sm"
    >
      <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="font-medium text-text-main">
            {{ runningTasks.length ? $t('task.runningNow') : $t('task.triggerAccepted') }}
          </p>
          <p class="mt-1 text-xs text-text-secondary">
            {{ $t('task.refreshHint') }}
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="item in runningTasks"
            :key="item.taskName"
            class="rounded-full bg-background px-3 py-1 text-xs font-medium text-text-main border border-card-border"
          >
            {{ item.taskName }} · {{ $t('task.lockedUntil') }} {{ formatDate(item.lockedUntil) }}
          </span>
          <span
            v-if="!runningTasks.length && lastTrigger"
            class="rounded-full bg-background px-3 py-1 text-xs font-medium text-text-main border border-card-border"
          >
            {{ lastTrigger.taskName }} · {{ lastTrigger.status }}
          </span>
        </div>
      </div>
    </div>

    <!-- Runs List -->
    <div class="bg-card border border-card-border rounded-2xl overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
                <thead class="bg-background text-text-secondary">
                    <tr>
                        <th class="px-6 py-3 font-medium">{{ $t('task.taskName') }}</th>
                        <th class="px-6 py-3 font-medium">{{ $t('task.started') }}</th>
                        <th class="px-6 py-3 font-medium">{{ $t('task.duration') }}</th>
                        <th class="px-6 py-3 font-medium">{{ $t('task.result') }}</th>
                    </tr>
                 </thead>
                 <tbody class="divide-y divide-card-border">
                     <tr v-for="run in runsItems" :key="run.id" class="hover:bg-background/50">
                         <td class="px-6 py-3 font-medium text-text-main">{{ run.taskName }}</td>
                         <td class="px-6 py-3 text-text-secondary">{{ formatDate(run.startedAt) }}</td>
                         <td class="px-6 py-3 text-text-secondary">
                              {{ run.finishedAt ? (new Date(run.finishedAt) - new Date(run.startedAt)) + 'ms' : $t('task.running') }}
                         </td>
                         <td class="px-6 py-3 text-text-secondary">
                              <div class="flex items-center justify-between gap-3">
                                <div class="text-xs text-text-secondary truncate max-w-[22rem]" :title="summarizeResult(run.result)">
                                  {{ summarizeResult(run.result) }}
                                </div>
                                <button
                                  type="button"
                                  class="text-xs text-accent hover:underline flex-shrink-0"
                                  @click="openDetail(run)"
                                >
                                  {{ $t('common.view') }}
                                </button>
                              </div>
                         </td>
                     </tr>
                     <tr v-if="!runsItems.length">
                         <td colspan="4" class="px-6 py-8 text-center text-text-secondary">{{ $t('task.noHistory') }}</td>
                     </tr>
                 </tbody>
             </table>
        </div>

        <div v-if="runsNextCursor" class="border-t border-card-border p-4 text-center">
          <button
            type="button"
            class="text-sm text-accent hover:underline disabled:opacity-50"
            :disabled="runsLoadingMore"
            @click="loadMoreRuns"
          >
            {{ runsLoadingMore ? $t('common.loading') : $t('common.loadMore') }}
          </button>
        </div>
    </div>

    <TaskRunDetailModal
      :is-open="detailOpen"
      :run="selectedRun"
      @close="detailOpen = false"
    />
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

const onWindowScroll = () => {
  if (runsLoadingMore.value || !runsNextCursor.value) return;
  const el = document.documentElement;
  const remaining = el.scrollHeight - window.scrollY - window.innerHeight;
  if (remaining < 240) {
    loadMoreRuns();
  }
};

onMounted(() => {
  if (typeof window === 'undefined') return;
  window.addEventListener('scroll', onWindowScroll, { passive: true });
});

onUnmounted(() => {
  if (typeof window === 'undefined') return;
  window.removeEventListener('scroll', onWindowScroll);
});

const formatDate = (d: any) => d ? format(new Date(d), 'MM-dd HH:mm:ss') : '--';

const summarizeResult = (r: any) => {
  if (!r) return '--';
  if (typeof r !== 'object') return String(r);
  if (r.success === true && Object.keys(r).length === 1) return 'OK';
  if (
    typeof r.checked === 'number' ||
    typeof r.fail === 'number' ||
    typeof r.success === 'number'
  ) {
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
    } catch(e) {
        toast.error(t('task.triggerFailed'));
    } finally {
        triggeringTask.value = '';
    }
};
</script>
