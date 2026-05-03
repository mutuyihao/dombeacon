<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Breadcrumb -->
    <div class="flex items-center gap-2 text-sm text-text-secondary mb-2">
        <NuxtLink to="/domains" class="hover:text-accent transition-colors">{{ $t('nav.domains') }}</NuxtLink>
        <span>/</span>
        <span>{{ $t('domain.viewDetails') }}</span>
    </div>

    <!-- Loading State -->
    <div v-if="pending" class="py-20 text-center">
      <LoadingSpinner size="lg" />
      <p class="mt-4 text-text-secondary">{{ $t('common.loading') }}</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error || !data" class="py-20 text-center">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
        <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p class="text-red-500">{{ $t('domain.loadError') }}</p>
    </div>

    <div v-else class="space-y-6">
        <!-- Header Card -->
        <div class="bg-card border border-card-border rounded-2xl p-6 shadow-sm">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div class="flex-1">
                    <h1 class="text-2xl font-semibold text-text-main mb-3 select-all">{{ domain.domain }}</h1>
                    <div class="flex flex-wrap items-center gap-2">
                        <!-- Status Badge -->
                        <span v-if="latest?.status" :class="['px-3 py-1 rounded-full text-sm font-medium border', statusClass(latest.status)]">
                            {{ $t(`domain.status.${latest.status.toLowerCase()}`) }}
                        </span>
                        <span v-else class="px-3 py-1 rounded-full text-sm font-medium border bg-[#8A8780]/10 text-[#8A8780] border-[#8A8780]/20">
                            {{ $t('domain.status.unknown') }}
                        </span>

                        <!-- Watch Kind Badge -->
                        <span :class="['px-2 py-0.5 rounded text-xs font-medium', watchKindClass]">
                            {{ domain.watchKind === 'OWNED' ? $t('domain.owned') : $t('domain.wanted') }}
                        </span>

                        <!-- Priority Badge -->
                        <span v-if="domain.priority" :class="['px-2 py-0.5 rounded text-xs font-medium', priorityClass]">
                            {{ $t(`domain.${domain.priority.toLowerCase()}`) }}
                        </span>

                        <!-- Registrar -->
                        <span v-if="latest?.registrar" class="text-sm text-text-secondary">
                            {{ $t('domain.registrar') }}: {{ latest.registrar }}
                        </span>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="flex gap-2 w-full md:w-auto">
                    <button
                        @click="openEditModal"
                        class="flex-1 md:flex-none px-4 py-2 bg-white border border-card-border rounded-lg text-sm font-medium hover:bg-gray-50 transition-all active:scale-95"
                    >
                        {{ $t('common.edit') }}
                    </button>
                    <button
                        @click="refreshDomain"
                        :disabled="refreshing"
                        class="flex-1 md:flex-none px-4 py-2 bg-white border border-card-border rounded-lg text-sm font-medium hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span v-if="refreshing" class="flex items-center gap-2 justify-center">
                            <LoadingSpinner size="sm" color="gray" />
                            {{ $t('domain.checking') }}
                        </span>
                        <span v-else>{{ $t('domain.checkNow') }}</span>
                    </button>
                    <button
                        @click="confirmDelete"
                        class="flex-1 md:flex-none px-4 py-2 text-red-600 bg-white border border-card-border rounded-lg text-sm font-medium hover:bg-red-50 transition-all active:scale-95"
                    >
                        {{ $t('common.delete') }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Info Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Key Dates & Info -->
            <div class="bg-card border border-card-border rounded-2xl p-6 shadow-sm">
                <h3 class="font-medium text-text-main mb-4 border-b border-card-border pb-2">{{ $t('domain.information') }}</h3>
                <dl class="space-y-3 text-sm">
                    <div class="flex justify-between items-center py-2 border-b border-card-border/50 last:border-0">
                        <dt class="text-text-secondary flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {{ $t('domain.expiresAt') }}
                        </dt>
                        <dd class="font-mono text-text-main font-medium">{{ formatDate(latest?.expiresAt) }}</dd>
                    </div>
                    <div class="flex justify-between items-center py-2 border-b border-card-border/50 last:border-0">
                        <dt class="text-text-secondary flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {{ $t('domain.lastChecked') }}
                        </dt>
                        <dd class="font-mono text-text-main">{{ formatDate(latest?.checkedAt, true) }}</dd>
                    </div>
                    <div class="flex justify-between items-center py-2 border-b border-card-border/50 last:border-0">
                        <dt class="text-text-secondary flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                            </svg>
                            {{ $t('common.createdAt') }}
                        </dt>
                        <dd class="font-mono text-text-main">{{ formatDate(domain.createdAt) }}</dd>
                    </div>
                    <div class="pt-3">
                        <dt class="text-text-secondary mb-2 flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                            </svg>
                            {{ $t('domain.nameservers') }}
                        </dt>
                        <dd class="text-text-main flex flex-wrap gap-1">
                            <span v-if="latest?.nameservers && latest.nameservers.length > 0" v-for="ns in latest.nameservers" :key="ns" class="px-2 py-1 bg-background rounded text-xs font-mono">{{ ns }}</span>
                            <span v-else class="text-text-weak text-xs">{{ $t('domain.noNameservers') }}</span>
                        </dd>
                    </div>
                </dl>
            </div>

            <!-- Notes & Tags -->
            <div class="bg-card border border-card-border rounded-2xl p-6 shadow-sm">
                 <h3 class="font-medium text-text-main mb-4 border-b border-card-border pb-2">{{ $t('domain.metadata') }}</h3>
                 <div class="mb-4">
                     <p class="text-sm text-text-secondary mb-2 flex items-center gap-2">
                         <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                         </svg>
                         {{ $t('domain.note') }}
                     </p>
                     <p class="text-text-main bg-background p-3 rounded-lg text-sm min-h-[60px]">{{ domain.note || $t('domain.noNotes') }}</p>
                 </div>
                 <div>
                     <p class="text-sm text-text-secondary mb-2 flex items-center gap-2">
                         <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                         </svg>
                         {{ $t('domain.tags') }}
                     </p>
                     <div class="flex flex-wrap gap-2">
                         <span v-if="domain.tags && domain.tags.length > 0" v-for="tag in domain.tags" :key="tag" class="px-2 py-1 bg-background border border-card-border rounded text-xs text-text-secondary">
                             {{ tag }}
                         </span>
                         <span v-else class="text-text-weak text-xs">{{ $t('domain.noTags') }}</span>
                     </div>
                 </div>
            </div>
        </div>

        <!-- Timeline -->
         <div class="bg-card border border-card-border rounded-2xl p-6 shadow-sm">
             <h3 class="font-medium text-text-main mb-4 border-b border-card-border pb-2 flex items-center gap-2">
                 <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                 </svg>
                 {{ $t('domain.timeline') }}
             </h3>
             <div v-if="history && history.length > 0" class="space-y-0 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                 <div v-for="item in history" :key="item.id" class="flex gap-4 py-3 border-b border-card-border/50 last:border-0 text-sm hover:bg-background/50 transition-colors rounded px-2 -mx-2">
                     <div class="w-36 text-text-secondary font-mono text-xs flex-shrink-0">{{ formatDate(item.checkedAt, true) }}</div>
                     <div class="font-medium flex-shrink-0" :style="{ color: getStatusColor(item.status) }">
                         {{ $t(`domain.status.${item.status.toLowerCase()}`) }}
                     </div>
                     <div class="flex-1 text-right text-text-weak text-xs truncate" :title="item.parseReason">{{ item.parseReason || '--' }}</div>
                 </div>
             </div>
             <div v-else class="text-center py-8 text-text-secondary">
                 {{ $t('domain.noHistory') }}
             </div>
         </div>

         <!-- Raw Snapshot -->
         <div class="bg-card border border-card-border rounded-2xl p-6 shadow-sm">
            <h3 class="font-medium text-text-main mb-4 border-b border-card-border pb-2 flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                {{ $t('domain.rawSnapshot') }}
            </h3>
            <pre class="bg-background p-4 rounded-lg overflow-x-auto text-xs text-text-secondary font-mono max-h-96 custom-scrollbar">{{ latest?.rawSnapshot || $t('domain.noSnapshot') }}</pre>
         </div>
    </div>

    <!-- Confirm Delete Dialog -->
    <ConfirmDialog
      :is-open="deleteDialog.isOpen"
      :title="$t('domain.deleteDomain')"
      :message="$t('domain.confirmDelete')"
      :confirm-text="$t('common.delete')"
      :cancel-text="$t('common.cancel')"
      variant="danger"
      @confirm="handleDelete"
      @cancel="deleteDialog.isOpen = false"
    />
  </div>
</template>

<script setup>
import { format } from 'date-fns';

const { t } = useI18n();
const toast = useToast();
const route = useRoute();
const id = route.params.id;

const { data, pending, error, refresh } = await useFetch(`/api/domains/${id}`);

const domain = computed(() => data.value?.data?.domain);
const latest = computed(() => data.value?.data?.latest);
const history = computed(() => data.value?.data?.history);
const refreshing = ref(false);
const deleteDialog = ref({
  isOpen: false
});

const formatDate = (d, time = false) => {
    if(!d) return '--';
    return format(new Date(d), time ? 'yyyy-MM-dd HH:mm' : 'yyyy-MM-dd');
};

const getStatusColor = (status) => {
    switch (status) {
        case 'AVAILABLE': return '#7C8B7A';
        case 'REGISTERED': return '#7A7F8C';
        case 'EXPIRING': return '#A08C7C';
        case 'PENDING_DELETE': return '#8C6F6F';
        default: return '#8A8780';
    }
};

const statusClass = (status) => {
  switch (status) {
    case 'AVAILABLE': return 'bg-[#7C8B7A]/10 text-[#7C8B7A] border-[#7C8B7A]/20';
    case 'REGISTERED': return 'bg-[#7A7F8C]/10 text-[#7A7F8C] border-[#7A7F8C]/20';
    case 'EXPIRING': return 'bg-[#A08C7C]/10 text-[#A08C7C] border-[#A08C7C]/20';
    case 'PENDING_DELETE': return 'bg-[#8C6F6F]/10 text-[#8C6F6F] border-[#8C6F6F]/20';
    default: return 'bg-[#8A8780]/10 text-[#8A8780] border-[#8A8780]/20';
  }
};

const watchKindClass = computed(() => {
  return domain.value?.watchKind === 'OWNED'
    ? 'bg-[#7A7F8C]/10 text-[#7A7F8C] border border-[#7A7F8C]/20'
    : 'bg-[#7C8B7A]/10 text-[#7C8B7A] border border-[#7C8B7A]/20';
});

const priorityClass = computed(() => {
  switch (domain.value?.priority) {
    case 'HIGH': return 'bg-[#8C6F6F]/10 text-[#8C6F6F] border border-[#8C6F6F]/20';
    case 'MEDIUM': return 'bg-[#A08C7C]/10 text-[#A08C7C] border border-[#A08C7C]/20';
    case 'LOW': return 'bg-[#8A8780]/10 text-[#8A8780] border border-[#8A8780]/20';
    default: return 'bg-[#8A8780]/10 text-[#8A8780] border border-[#8A8780]/20';
  }
});

const refreshDomain = async () => {
    refreshing.value = true;
    try {
        await $fetch(`/api/domains/${id}/refresh`, { method: 'POST' });
        toast.success(t('domain.scanSuccess'));
        refresh();
    } catch(e) {
        toast.error(t('domain.scanError'));
    } finally {
        refreshing.value = false;
    }
};

const confirmDelete = () => {
    deleteDialog.value.isOpen = true;
};

const handleDelete = async () => {
    deleteDialog.value.isOpen = false;
    try {
        await $fetch(`/api/domains/${id}`, { method: 'DELETE' });
        toast.success(t('domain.deleteSuccess'));
        navigateTo('/domains');
    } catch(e) {
        toast.error(t('domain.deleteError'));
    }
};

const openEditModal = () => {
    toast.info(t('domain.editNotImplemented'));
};
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: var(--color-background);
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--color-card-border);
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-weak);
}
</style>
