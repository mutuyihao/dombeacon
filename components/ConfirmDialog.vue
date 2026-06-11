<template>
  <BaseModal :is-open="isOpen" size="sm" :closable="false" @close="cancel">
    <div class="flex items-start gap-4">
      <div :class="['flex h-9 w-9 shrink-0 items-center justify-center rounded-full', iconBgClass]">
        <component :is="icon" :class="['h-4 w-4', iconClass]" />
      </div>
      <div class="min-w-0 flex-1">
        <h3 class="headline-display text-lg">{{ title }}</h3>
        <p class="mt-2 text-sm text-text-secondary">{{ message }}</p>
      </div>
    </div>

    <div class="mt-8 flex items-center justify-end gap-3">
      <button type="button" class="btn-ghost" @click="cancel">
        {{ cancelText }}
      </button>
      <button
        type="button"
        :class="['btn-primary', confirmStyleOverride]"
        @click="confirm"
      >
        {{ confirmText }}
      </button>
    </div>
  </BaseModal>
</template>

<script setup>
import { AlertTriangle, AlertCircle, Info, Trash2 } from '@lucide/vue';

const props = defineProps({
  isOpen: Boolean,
  title: String,
  message: String,
  confirmText: { type: String, default: 'Confirm' },
  cancelText: { type: String, default: 'Cancel' },
  variant: { type: String, default: 'danger' },
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
    default: return 'bg-surface-sunken';
  }
});

const iconClass = computed(() => {
  switch (props.variant) {
    case 'danger': return 'text-status-dropping';
    case 'warning': return 'text-status-expiring';
    case 'info': return 'text-status-registered';
    default: return 'text-text-secondary';
  }
});

const confirmStyleOverride = computed(() => {
  switch (props.variant) {
    case 'danger': return 'bg-status-dropping! hover:bg-status-dropping/85!';
    case 'warning': return 'bg-status-expiring! hover:bg-status-expiring/85!';
    default: return '';
  }
});

const confirm = () => emit('confirm');
const cancel = () => emit('cancel');
</script>
