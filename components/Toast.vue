<template>
  <TransitionGroup
    tag="div"
    name="toast"
    class="pointer-events-none fixed right-6 top-6 z-100 flex flex-col gap-2"
  >
    <div
      v-for="toast in toasts"
      :key="toast.id"
      :class="[
        'pointer-events-auto flex min-w-80 max-w-md items-start gap-3 rounded-xl bg-card p-4 shadow-elevated',
        'transform transition-all duration-300',
      ]"
    >
      <span :class="['mt-0.5 h-3 w-0.5 shrink-0 rounded-full', accentClass(toast.type)]" />
      <component :is="toastIcon(toast.type)" :class="['mt-0.5 h-4 w-4 shrink-0', toneClass(toast.type)]" />
      <div class="min-w-0 flex-1">
        <p v-if="toast.title" class="mb-0.5 text-sm font-medium text-text-main">{{ toast.title }}</p>
        <p class="text-sm leading-5 text-text-secondary">{{ toast.message }}</p>
      </div>
      <button
        @click="removeToast(toast.id)"
        class="shrink-0 rounded-full p-1 text-text-tertiary transition-colors hover:bg-surface-sunken hover:text-text-main"
      >
        <XIcon class="h-3.5 w-3.5" />
      </button>
    </div>
  </TransitionGroup>
</template>

<script setup>
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X as XIcon } from 'lucide-vue-next';

const toasts = useState('toasts', () => []);

const accentClass = (type) => {
  switch (type) {
    case 'success': return 'bg-status-available';
    case 'error': return 'bg-status-dropping';
    case 'warning': return 'bg-status-expiring';
    case 'info': return 'bg-status-registered';
    default: return 'bg-text-tertiary';
  }
};

const toneClass = (type) => {
  switch (type) {
    case 'success': return 'text-status-available';
    case 'error': return 'text-status-dropping';
    case 'warning': return 'text-status-expiring';
    case 'info': return 'text-status-registered';
    default: return 'text-text-tertiary';
  }
};

const toastIcon = (type) => {
  switch (type) {
    case 'success': return CheckCircle2;
    case 'error': return AlertCircle;
    case 'warning': return AlertTriangle;
    case 'info': return Info;
    default: return Info;
  }
};

const removeToast = (id) => {
  const index = toasts.value.findIndex((t) => t.id === id);
  if (index > -1) toasts.value.splice(index, 1);
};
</script>

<style scoped>
.toast-enter-from { opacity: 0; transform: translateY(-8px); }
.toast-enter-to { opacity: 1; transform: translateY(0); }
.toast-leave-from { opacity: 1; transform: translateY(0); }
.toast-leave-to { opacity: 0; transform: translateX(20px); }
.toast-move { transition: transform 0.3s ease; }
</style>
