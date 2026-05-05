<template>
  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" @close="cancel" class="relative z-50">
      <TransitionChild
        as="template"
        enter="duration-200 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-150 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/30 backdrop-blur-sm" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <TransitionChild
            as="template"
            enter="duration-200 ease-out"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="duration-150 ease-in"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95"
          >
            <DialogPanel
              class="w-full max-w-md transform overflow-hidden rounded-2xl bg-card p-6 text-left align-middle shadow-xl transition-all border border-card-border"
            >
              <div class="flex items-start gap-4">
                <div :class="['flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center', iconBgClass]">
                  <component :is="icon" :class="['w-5 h-5', iconClass]" />
                </div>
                <div class="flex-1 min-w-0">
                  <DialogTitle as="h3" class="text-lg font-medium text-text-main mb-2">
                    {{ title }}
                  </DialogTitle>
                  <p class="text-sm text-text-secondary">
                    {{ message }}
                  </p>
                </div>
              </div>

              <div class="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  class="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-black/5 rounded-lg transition-all active:scale-95"
                  @click="cancel"
                >
                  {{ cancelText }}
                </button>
                <button
                  type="button"
                  :class="[
                    'px-4 py-2 text-sm font-medium text-white rounded-lg transition-all active:scale-95',
                    confirmClass
                  ]"
                  @click="confirm"
                >
                  {{ confirmText }}
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup>
import { TransitionRoot, TransitionChild, Dialog, DialogPanel, DialogTitle } from '@headlessui/vue';
import { AlertTriangle, AlertCircle, Info, Trash2 } from 'lucide-vue-next';

const props = defineProps({
  isOpen: Boolean,
  title: String,
  message: String,
  confirmText: { type: String, default: 'Confirm' },
  cancelText: { type: String, default: 'Cancel' },
  variant: { type: String, default: 'danger' } // 'danger' | 'warning' | 'info'
});

const emit = defineEmits(['confirm', 'cancel']);

const icon = computed(() => {
  switch (props.variant) {
    case 'danger': return Trash2;
    case 'warning': return AlertTriangle;
    case 'info': return Info;
    default: return AlertCircle;
  }
});

const iconBgClass = computed(() => {
  switch (props.variant) {
    case 'danger': return 'bg-status-dropping/10';
    case 'warning': return 'bg-status-expiring/10';
    case 'info': return 'bg-status-registered/10';
    default: return 'bg-status-unknown/10';
  }
});

const iconClass = computed(() => {
  switch (props.variant) {
    case 'danger': return 'text-status-dropping';
    case 'warning': return 'text-status-expiring';
    case 'info': return 'text-status-registered';
    default: return 'text-status-unknown';
  }
});

const confirmClass = computed(() => {
  switch (props.variant) {
    case 'danger': return 'bg-status-dropping hover:bg-status-dropping/90';
    case 'warning': return 'bg-status-expiring hover:bg-status-expiring/90';
    case 'info': return 'bg-status-registered hover:bg-status-registered/90';
    default: return 'bg-accent hover:bg-accent-hover';
  }
});

const confirm = () => emit('confirm');
const cancel = () => emit('cancel');
</script>
