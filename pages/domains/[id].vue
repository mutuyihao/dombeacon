<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <div class="flex items-center gap-2 text-sm text-text-secondary mb-2">
        <NuxtLink to="/domains" class="hover:text-accent">Domains</NuxtLink>
        <span>/</span>
        <span>Details</span>
    </div>

    <div v-if="pending" class="py-10 text-center">Loading...</div>
    <div v-else-if="error || !data" class="py-10 text-center text-red-500">Error loading domain</div>

    <div v-else class="space-y-6">
        <!-- Header Card -->
        <div class="bg-card border border-card-border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 class="text-2xl font-semibold text-text-main mb-2">{{ domain.domain }}</h1>
                <div class="flex items-center gap-3">
                     <span class="px-3 py-1 rounded-full text-sm font-medium border bg-white" :style="{ borderColor: getStatusColor(latest?.status), color: getStatusColor(latest?.status) }">
                        {{ latest?.status || 'UNKNOWN' }}
                     </span>
                     <span class="text-sm text-text-secondary" v-if="latest?.registrar">via {{ latest.registrar }}</span>
                </div>
            </div>
            <div class="flex gap-2">
                 <button @click="refreshDomain" :disabled="refreshing" class="px-4 py-2 bg-white border border-card-border rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                    {{ refreshing ? 'Checking...' : 'Refresh Status' }}
                 </button>
                 <button @click="deleteDomain" class="px-4 py-2 text-red-600 bg-white border border-card-border rounded-lg text-sm font-medium hover:bg-red-50 transition-colors">
                    Delete
                 </button>
            </div>
        </div>

        <!-- Info Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Key Dates & Info -->
            <div class="bg-card border border-card-border rounded-2xl p-6">
                <h3 class="font-medium text-text-main mb-4 border-b border-card-border pb-2">Information</h3>
                <dl class="space-y-3 text-sm">
                    <div class="flex justify-between">
                        <dt class="text-text-secondary">Expires At</dt>
                        <dd class="font-mono text-text-main">{{ formatDate(latest?.expiresAt) }}</dd>
                    </div>
                     <div class="flex justify-between">
                        <dt class="text-text-secondary">Last Checked</dt>
                        <dd class="font-mono text-text-main">{{ formatDate(latest?.checkedAt, true) }}</dd>
                    </div>
                     <div class="flex justify-between">
                        <dt class="text-text-secondary">Created At</dt>
                        <dd class="font-mono text-text-main">{{ formatDate(domain.createdAt) }}</dd>
                    </div>
                    <div class="pt-2">
                        <dt class="text-text-secondary mb-1">Nameservers</dt>
                        <dd class="text-text-main flex flex-wrap gap-1">
                            <span v-for="ns in latest?.nameservers || []" :key="ns" class="px-2 py-1 bg-background rounded text-xs">{{ ns }}</span>
                        </dd>
                    </div>
                </dl>
            </div>

            <!-- Notes & Tags -->
            <div class="bg-card border border-card-border rounded-2xl p-6">
                 <h3 class="font-medium text-text-main mb-4 border-b border-card-border pb-2">Meta</h3>
                 <div class="mb-4">
                     <p class="text-sm text-text-secondary mb-1">Note</p>
                     <p class="text-text-main bg-background p-3 rounded-lg text-sm min-h-[60px]">{{ domain.note || 'No notes' }}</p>
                 </div>
                 <div>
                     <p class="text-sm text-text-secondary mb-1">Tags</p>
                     <div class="flex flex-wrap gap-2">
                         <span v-for="tag in domain.tags" :key="tag" class="px-2 py-1 bg-background border border-card-border rounded text-xs text-text-secondary">
                             {{ tag }}
                         </span>
                     </div>
                 </div>
            </div>
        </div>

        <!-- Raw Data -->
         <div class="bg-card border border-card-border rounded-2xl p-6">
             <h3 class="font-medium text-text-main mb-4 border-b border-card-border pb-2">Timeline</h3>
             <div class="space-y-0 max-h-60 overflow-y-auto pr-2">
                 <div v-for="item in history" :key="item.id" class="flex gap-4 py-3 border-b border-card-border last:border-0 text-sm">
                     <div class="w-32 text-text-secondary font-mono text-xs">{{ formatDate(item.checkedAt, true) }}</div>
                     <div class="font-medium" :style="{ color: getStatusColor(item.status) }">{{ item.status }}</div>
                     <div class="flex-1 text-right text-text-weak text-xs">{{ item.parseReason }}</div>
                 </div>
             </div>
         </div>
         
         <div class="bg-card border border-card-border rounded-2xl p-6">
            <h3 class="font-medium text-text-main mb-4 border-b border-card-border pb-2">Raw Snapshot</h3>
            <pre class="bg-background p-4 rounded-lg overflow-x-auto text-xs text-text-secondary font-mono max-h-60">{{ latest?.rawSnapshot || 'No snapshot data' }}</pre>
         </div>
    </div>
  </div>
</template>

<script setup>
import { format } from 'date-fns';
const route = useRoute();
const id = route.params.id;

const { data, pending, error, refresh } = await useFetch(`/api/domains/${id}`);

const domain = computed(() => data.value?.data?.domain);
const latest = computed(() => data.value?.data?.latest);
const history = computed(() => data.value?.data?.history);
const refreshing = ref(false);

const formatDate = (d, time = false) => {
    if(!d) return '--';
    return format(new Date(d), time ? 'yyyy-MM-dd HH:mm' : 'yyyy-MM-dd');
};

const getStatusColor = (status) => {
    switch (status) {
        case 'AVAILABLE': return '#7C8B7A';
        case 'REGISTERED': return '#7A7F8C';
        case 'EXPIRING': return '#A08C7C';
        case 'DROPPING': return '#8C6F6F';
        default: return '#8A8780';
    }
};

const refreshDomain = async () => {
    refreshing.value = true;
    try {
        await $fetch(`/api/domains/${id}/refresh`, { method: 'POST' });
        refresh();
    } catch(e) { alert('Refresh failed'); }
    finally { refreshing.value = false; }
};

const deleteDomain = async () => {
    if(!confirm('Delete this domain?')) return;
    try {
        await $fetch(`/api/domains/${id}`, { method: 'DELETE' });
        navigateTo('/domains');
    } catch(e) { alert('Delete failed'); }
};
</script>
