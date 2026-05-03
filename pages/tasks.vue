<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
        <h2 class="text-xl font-semibold">{{ $t('task.title') }}</h2>
        <div class="flex gap-2">
            <button
              @click="trigger('hourly-scan')"
              :disabled="loading"
              class="px-4 py-2 bg-white border border-card-border rounded-lg text-sm font-medium hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {{ $t('task.triggerScan') }}
            </button>
            <button
              @click="trigger('daily-summary')"
              :disabled="loading"
              class="px-4 py-2 bg-white border border-card-border rounded-lg text-sm font-medium hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {{ $t('task.triggerSummary') }}
            </button>
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
                    <tr v-for="run in runs" :key="run.id" class="hover:bg-background/50">
                        <td class="px-6 py-3 font-medium text-text-main">{{ run.taskName }}</td>
                        <td class="px-6 py-3 text-text-secondary">{{ formatDate(run.startedAt) }}</td>
                        <td class="px-6 py-3 text-text-secondary">
                             {{ run.finishedAt ? (new Date(run.finishedAt) - new Date(run.startedAt)) + 'ms' : $t('task.running') }}
                        </td>
                        <td class="px-6 py-3 text-text-secondary">
                             <pre class="text-xs max-w-xs overflow-hidden">{{ JSON.stringify(run.result, null, 2) }}</pre>
                        </td>
                    </tr>
                    <tr v-if="!runs.length">
                        <td colspan="4" class="px-6 py-8 text-center text-text-secondary">{{ $t('task.noHistory') }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
  </div>
</template>

<script setup>
import { format } from 'date-fns';

const { t } = useI18n();
const toast = useToast();
const { data, refresh } = await useFetch('/api/tasks/runs');
const runs = computed(() => data.value?.data?.items || []);
const loading = ref(false);

const formatDate = (d) => format(new Date(d), 'MM-dd HH:mm:ss');

const trigger = async (task) => {
    loading.value = true;
    try {
        await $fetch('/api/tasks/trigger', { method: 'POST', body: { task } });
        setTimeout(refresh, 1000);
        toast.success(`${task} ${t('task.triggered')}`);
    } catch(e) {
        toast.error(t('task.triggerFailed'));
    } finally {
        loading.value = false;
    }
};
</script>
