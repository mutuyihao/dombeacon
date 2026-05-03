<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
        <h2 class="text-xl font-semibold">Background Tasks</h2>
        <div class="flex gap-2">
            <button @click="trigger('hourly-scan')" :disabled="loading" class="px-4 py-2 bg-white border border-card-border rounded-lg text-sm font-medium hover:bg-gray-50">
                Trigger Scan
            </button>
            <button @click="trigger('daily-summary')" :disabled="loading" class="px-4 py-2 bg-white border border-card-border rounded-lg text-sm font-medium hover:bg-gray-50">
                Trigger Summary
            </button>
        </div>
    </div>

    <!-- Runs List -->
    <div class="bg-card border border-card-border rounded-2xl overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
                <thead class="bg-background text-text-secondary">
                    <tr>
                        <th class="px-6 py-3 font-medium">Task</th>
                        <th class="px-6 py-3 font-medium">Started</th>
                        <th class="px-6 py-3 font-medium">Duration</th>
                        <th class="px-6 py-3 font-medium">Result</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-card-border">
                    <tr v-for="run in runs" :key="run.id" class="hover:bg-background/50">
                        <td class="px-6 py-3 font-medium text-text-main">{{ run.taskName }}</td>
                        <td class="px-6 py-3 text-text-secondary">{{ formatDate(run.startedAt) }}</td>
                        <td class="px-6 py-3 text-text-secondary">
                             {{ run.finishedAt ? (new Date(run.finishedAt) - new Date(run.startedAt)) + 'ms' : 'Running' }}
                        </td>
                        <td class="px-6 py-3 text-text-secondary">
                             <pre class="text-xs max-w-xs overflow-hidden">{{ JSON.stringify(run.result, null, 2) }}</pre>
                        </td>
                    </tr>
                    <tr v-if="!runs.length">
                        <td colspan="4" class="px-6 py-8 text-center text-text-secondary">No task history yet.</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
  </div>
</template>

<script setup>
import { format } from 'date-fns';
const { data, refresh } = await useFetch('/api/tasks/runs');
const runs = computed(() => data.value?.data?.items || []);
const loading = ref(false);

const formatDate = (d) => format(new Date(d), 'MM-dd HH:mm:ss');

const trigger = async (task) => {
    loading.value = true;
    try {
        await $fetch('/api/tasks/trigger', { method: 'POST', body: { task } });
        setTimeout(refresh, 1000); // Wait a bit for start
        alert(`${task} triggered`);
    } catch(e) { alert('Failed'); }
    finally { loading.value = false; }
};
</script>
