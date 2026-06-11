<template>
  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" @close="onClose" class="relative z-50">
      <TransitionChild
        as="template"
        enter="duration-200 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-150 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/30 backdrop-blur-[2px]" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <TransitionChild
            as="template"
            enter="duration-200 ease-out"
            enter-from="opacity-0 translate-y-2"
            enter-to="opacity-100 translate-y-0"
            leave="duration-150 ease-in"
            leave-from="opacity-100 translate-y-0"
            leave-to="opacity-0 translate-y-2"
          >
            <DialogPanel
              :class="['surface-elevated relative flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden text-left', sizeClass]"
            >
              <div v-if="hasHeader" class="shrink-0 px-8 pt-8 pb-2">
                <p v-if="eyebrow" class="eyebrow mb-3">{{ eyebrow }}</p>
                <DialogTitle as="h3" class="headline-display text-2xl">
                  <slot name="title">{{ title }}</slot>
                </DialogTitle>
                <p v-if="description || $slots.description" class="mt-2 text-sm text-text-secondary">
                  <slot name="description">{{ description }}</slot>
                </p>
              </div>

              <div v-if="hasHeader" class="hairline mt-6 shrink-0" />

              <div class="min-h-0 overflow-y-auto px-8 py-6">
                <slot />
              </div>

              <div v-if="$slots.footer" class="hairline shrink-0" />
              <div v-if="$slots.footer" class="flex shrink-0 items-center justify-end gap-3 px-8 py-5">
                <slot name="footer" />
              </div>

              <button
                v-if="closable"
                type="button"
                class="absolute right-4 top-4 rounded-full p-2 text-text-tertiary transition-colors hover:bg-surface-sunken hover:text-text-main"
                @click="onClose"
                :aria-label="$t('common.close')"
              >
                <XIcon class="h-4 w-4" />
              </button>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup>
import { TransitionRoot, TransitionChild, Dialog, DialogPanel, DialogTitle } from '@headlessui/vue';
import { X as XIcon } from 'lucide-vue-next';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  title: { type: String, default: '' },
  eyebrow: { type: String, default: '' },
  description: { type: String, default: '' },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg', 'xl'].includes(v),
  },
  closable: { type: Boolean, default: true },
});

const emit = defineEmits(['close']);
const slots = useSlots();

const onClose = () => emit('close');

const hasHeader = computed(() =>
  Boolean(
    props.eyebrow ||
    props.title ||
    props.description ||
    slots.title ||
    slots.description,
  ),
);

const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm': return 'max-w-sm';
    case 'lg': return 'max-w-2xl';
    case 'xl': return 'max-w-4xl';
    default: return 'max-w-md';
  }
});
</script>
