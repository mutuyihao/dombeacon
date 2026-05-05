<template>
  <TransitionGroup
    tag="div"
    name="toast"
    class="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
  >
    <div
      v-for="toast in toasts"
      :key="toast.id"
      :class="[
        'pointer-events-auto min-w-[320px] max-w-md p-4 rounded-xl shadow-lg border backdrop-blur-sm',
        'transform transition-all duration-300',
        toastClass(toast.type)
      ]"
    >
      <div class="flex items-start gap-3">
        <component :is="toastIcon(toast.type)" :class="['w-5 h-5 flex-shrink-0 mt-0.5', toastIconClass(toast.type)]" />
        <div class="flex-1 min-w-0">
          <p v-if="toast.title" class="font-medium text-sm mb-1">{{ toast.title }}</p>
          <p class="text-sm opacity-90">{{ toast.message }}</p>
        </div>
        <button
          @click="removeToast(toast.id)"
          class="flex-shrink-0 p-1 rounded-lg hover:bg-black/10 transition-colors"
        >
          <XIcon class="w-4 h-4" />
        </button>
      </div>
    </div>
  </TransitionGroup>
</template>

<script setup>
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X as XIcon } from 'lucide-vue-next';

const toasts = useState('toasts', () => []);

const toastClass = (type) => {
  switch (type) {
    case 'success':
      return 'bg-status-available/95 text-white border-status-available';
    case 'error':
      return 'bg-status-dropping/95 text-white border-status-dropping';
    case 'warning':
      return 'bg-status-expiring/95 text-white border-status-expiring';
    case 'info':
      return 'bg-status-registered/95 text-white border-status-registered';
    default:
      return 'bg-card/95 text-text-main border-card-border';
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

const toastIconClass = (type) => {
  return type === 'success' || type === 'error' || type === 'warning' || type === 'info'
    ? 'text-white'
    : 'text-text-main';
};

const removeToast = (id) => {
  const index = toasts.value.findIndex(t => t.id === id);
  if (index > -1) {
    toasts.value.splice(index, 1);
  }
};
</script>

<style scoped>
.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-enter-to {
  opacity: 1;
  transform: translateX(0);
}

.toast-leave-from {
  opacity: 1;
  transform: translateX(0);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast-move {
  transition: transform 0.3s ease;
}
</style>
