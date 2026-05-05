<template>
  <TransitionRoot :show="isOpen" as="template">
    <Dialog as="div" class="relative z-50" @close="$emit('close')">
      <TransitionChild
        as="template"
        enter="ease-out duration-300"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-200"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/30 backdrop-blur-sm" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <TransitionChild
            as="template"
            enter="ease-out duration-300"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="ease-in duration-200"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95"
          >
            <DialogPanel class="w-full max-w-2xl bg-card rounded-xl shadow-xl border border-card-border">
              <div class="p-6">
                <div class="flex items-start justify-between mb-6">
                  <DialogTitle class="text-xl font-semibold text-text-main">
                    {{ $t('notification.detailTitle') }}
                  </DialogTitle>
                  <button
                    @click="$emit('close')"
                    class="p-1 text-text-secondary hover:bg-card-border/50 rounded transition-colors"
                  >
                    <XIcon class="w-5 h-5" />
                  </button>
                </div>

                <div v-if="event" class="space-y-4">
                  <!-- Status & Channel -->
                  <div class="flex flex-wrap gap-2">
                    <span
                      :class="[
                        'px-3 py-1 text-xs rounded-full font-medium',
                        statusClass(event.status)
                      ]"
                    >
                      {{ $t(`notification.statuses.${event.status.toLowerCase()}`) }}
                    </span>
                    <span class="px-3 py-1 text-xs rounded-full font-medium bg-card-border/50 text-text-main">
                      {{ event.channel }}
                    </span>
                    <span class="px-3 py-1 text-xs rounded-full font-medium bg-card-border/50 text-text-main">
                      {{ event.eventType }}
                    </span>
                  </div>

                  <!-- Basic Info -->
                  <div class="bg-card-border/20 rounded-lg p-4 space-y-2 text-sm">
                    <div class="flex justify-between">
                      <span class="text-text-secondary">ID</span>
                      <span class="font-mono text-text-main">{{ event.id }}</span>
                    </div>
                    <div v-if="event.domain" class="flex justify-between">
                      <span class="text-text-secondary">{{ $t('notification.domain') }}</span>
                      <span class="font-mono text-text-main">{{ event.domain }}</span>
                    </div>
                    <div v-if="event.actionId" class="flex justify-between">
                      <span class="text-text-secondary">{{ $t('notification.actionId') }}</span>
                      <span class="font-mono text-text-main">{{ event.actionId }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-text-secondary">{{ $t('notification.createdAt') }}</span>
                      <span class="text-text-main">{{ formatTime(event.createdAt) }}</span>
                    </div>
                    <div v-if="event.sentAt" class="flex justify-between">
                      <span class="text-text-secondary">{{ $t('notification.sentAt') }}</span>
                      <span class="text-text-main">{{ formatTime(event.sentAt) }}</span>
                    </div>
                    <div v-if="event.failedAt" class="flex justify-between">
                      <span class="text-text-secondary">{{ $t('notification.failedAt') }}</span>
                      <span class="text-text-main">{{ formatTime(event.failedAt) }}</span>
                    </div>
                    <div v-if="event.retryOf" class="flex justify-between">
                      <span class="text-text-secondary">{{ $t('notification.retryOfLabel') }}</span>
                      <span class="font-mono text-text-main">#{{ event.retryOf }}</span>
                    </div>
                  </div>

                  <!-- Error Message -->
                  <div v-if="event.errorMessage" class="bg-status-dropping/10 border border-status-dropping/20 rounded-lg p-4">
                    <div class="text-xs font-medium text-status-dropping mb-1">{{ $t('notification.errorMessage') }}</div>
                    <pre class="text-xs text-text-main font-mono whitespace-pre-wrap">{{ event.errorMessage }}</pre>
                  </div>

                  <!-- Metadata -->
                  <div v-if="event.metadata">
                    <div class="text-xs font-medium text-text-secondary mb-2">{{ $t('notification.metadata') }}</div>
                    <pre class="bg-card-border/20 rounded-lg p-4 text-xs text-text-main font-mono overflow-x-auto whitespace-pre-wrap">{{ formattedMetadata }}</pre>
                  </div>
                </div>

                <div class="flex justify-end gap-3 pt-6 mt-6 border-t border-card-border">
                  <button
                    type="button"
                    @click="$emit('close')"
                    class="px-4 py-2 text-text-secondary hover:bg-card-border/50 rounded-lg transition-colors"
                  >
                    {{ $t('common.close') }}
                  </button>
                  <button
                    v-if="event && event.status === 'FAILED'"
                    @click="$emit('retry', event)"
                    class="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
                  >
                    {{ $t('notification.retry') }}
                  </button>
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup>
import { Dialog, DialogPanel, DialogTitle, TransitionRoot, TransitionChild } from '@headlessui/vue';
import { X as XIcon } from 'lucide-vue-next';

const props = defineProps({
  isOpen: Boolean,
  event: Object,
});

defineEmits(['close', 'retry']);

const formattedMetadata = computed(() => {
  if (!props.event?.metadata) return '';
  try {
    return JSON.stringify(JSON.parse(props.event.metadata), null, 2);
  } catch {
    return props.event.metadata;
  }
});

const formatTime = (ts) => {
  if (!ts) return '';
  return new Date(ts).toLocaleString();
};

const statusClass = (status) => {
  switch (status) {
    case 'SENT': return 'bg-status-available/10 text-status-available border border-status-available/20';
    case 'FAILED': return 'bg-status-dropping/10 text-status-dropping border border-status-dropping/20';
    case 'PENDING': return 'bg-status-expiring/10 text-status-expiring border border-status-expiring/20';
    default: return 'bg-status-unknown/10 text-status-unknown border border-status-unknown/20';
  }
};
</script>
