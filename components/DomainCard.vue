<template>
  <div class="bg-card border border-card-border rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow hover:border-accent/20 group relative">
    <div class="flex justify-between items-start mb-3">
      <h3 class="text-lg font-medium text-text-main truncate pr-2 select-all">{{ domain.domain }}</h3>
      <span :class="['px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide border', statusClass]">
        {{ domain.status }}
      </span>
    </div>

    <div class="space-y-2 mb-4">
      <div class="flex items-center text-sm text-text-secondary gap-2">
        <ClockIcon class="w-4 h-4 text-text-weak" />
        <span v-if="domain.expiresAt">Exp: {{ formatDate(domain.expiresAt) }}</span>
        <span v-else>Exp: --</span>
      </div>
       <div class="flex items-center text-sm text-text-secondary gap-2">
        <RefreshCwIcon class="w-4 h-4 text-text-weak" />
        <span>Checked: {{ formatDate(domain.checkedAt, true) }}</span>
      </div>
    </div>

    <div class="flex items-center gap-2 flex-wrap min-h-[24px]">
      <span v-for="tag in domain.tags" :key="tag" class="text-[10px] bg-white border border-card-border px-1.5 py-0.5 rounded text-text-secondary">
        {{ tag }}
      </span>
    </div>
    
    <!-- Actions -->
    <div class="absolute bottom-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
       <button @click.stop="$emit('refresh', domain.id)" class="p-1.5 hover:bg-white rounded-lg text-text-secondary hover:text-accent transition-colors" title="Refresh">
         <RefreshCwIcon class="w-4 h-4" />
       </button>
       <button @click.stop="$emit('delete', domain.id)" class="p-1.5 hover:bg-white rounded-lg text-text-secondary hover:text-red-500 transition-colors" title="Delete">
         <Trash2Icon class="w-4 h-4" />
       </button>
    </div>
    
    <NuxtLink :to="`/domains/${domain.id}`" class="absolute inset-0 z-10" @click.stop />
  </div>
</template>

<script setup>
import { Clock as ClockIcon, RefreshCw as RefreshCwIcon, Trash2 as Trash2Icon } from 'lucide-vue-next';
import { format } from 'date-fns';

const props = defineProps({
  domain: Object
});

const statusClass = computed(() => {
  switch (props.domain.status) {
    case 'AVAILABLE': return 'bg-[#7C8B7A]/10 text-[#7C8B7A] border-[#7C8B7A]/20';
    case 'REGISTERED': return 'bg-[#7A7F8C]/10 text-[#7A7F8C] border-[#7A7F8C]/20';
    case 'EXPIRING': return 'bg-[#A08C7C]/10 text-[#A08C7C] border-[#A08C7C]/20';
    case 'DROPPING': return 'bg-[#8C6F6F]/10 text-[#8C6F6F] border-[#8C6F6F]/20';
    default: return 'bg-[#8A8780]/10 text-[#8A8780] border-[#8A8780]/20';
  }
});

const formatDate = (d, time = false) => {
    if(!d) return '--';
    return format(new Date(d), time ? 'MM-dd HH:mm' : 'yyyy-MM-dd');
};
</script>
