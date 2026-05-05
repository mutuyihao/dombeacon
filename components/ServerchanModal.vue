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
                <DialogTitle class="text-xl font-semibold text-text-main mb-6">
                  {{ $t('serverchan.addServerchan') }}
                </DialogTitle>

                <form @submit.prevent="handleSubmit" class="space-y-4">
                  <!-- Name -->
                  <div>
                    <label class="block text-sm font-medium text-text-main mb-2">
                      {{ $t('serverchan.name') }} <span class="text-status-dropping">*</span>
                    </label>
                    <input
                      v-model="form.name"
                      type="text"
                      required
                      class="w-full px-3 py-2 border border-card-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
                      :placeholder="$t('serverchan.name')"
                    />
                  </div>

                  <!-- SendKey -->
                  <div>
                    <label class="block text-sm font-medium text-text-main mb-2">
                      {{ $t('serverchan.sendKey') }} <span class="text-status-dropping">*</span>
                    </label>
                    <input
                      v-model="form.sendKey"
                      type="text"
                      required
                      class="w-full px-3 py-2 border border-card-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 font-mono text-sm"
                      :placeholder="$t('serverchan.sendKeyPlaceholder')"
                    />
                    <p class="mt-1 text-xs text-text-secondary">
                      {{ $t('serverchan.sendKeyHint') }}
                    </p>
                  </div>

                  <!-- How to get SendKey -->
                  <div class="bg-accent/10 border border-accent/20 rounded-lg p-3">
                    <div class="flex items-start gap-2">
                      <InfoIcon class="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                      <div class="text-xs text-text-main">
                        <p class="font-medium mb-1">{{ $t('serverchan.howToGetSendKey') }}</p>
                        <pre class="whitespace-pre-wrap">{{ $t('serverchan.sendKeyGuide') }}</pre>
                      </div>
                    </div>
                  </div>

                  <!-- Event Types -->
                  <div>
                    <label class="block text-sm font-medium text-text-main mb-2">
                      {{ $t('serverchan.eventTypes') }}
                    </label>
                    <div class="space-y-2 max-h-48 overflow-y-auto p-3 border border-card-border rounded-lg">
                      <label
                        v-for="event in availableEvents"
                        :key="event"
                        class="flex items-center gap-2 cursor-pointer hover:bg-card-border/30 p-2 rounded"
                      >
                        <input
                          type="checkbox"
                          :value="event"
                          v-model="form.eventTypes"
                          class="rounded border-card-border text-accent focus:ring-accent"
                        />
                        <span class="text-sm text-text-main">{{ $t(`serverchan.events.${event}`) }}</span>
                      </label>
                    </div>
                  </div>

                  <!-- Enabled -->
                  <div class="flex items-center gap-2">
                    <input
                      v-model="form.enabled"
                      type="checkbox"
                      id="serverchan-enabled"
                      class="rounded border-card-border text-accent focus:ring-accent"
                    />
                    <label for="serverchan-enabled" class="text-sm font-medium text-text-main cursor-pointer">
                      {{ $t('serverchan.enabled') }}
                    </label>
                  </div>

                  <!-- Actions -->
                  <div class="flex justify-end gap-3 pt-4 border-t border-card-border">
                    <button
                      type="button"
                      @click="$emit('close')"
                      class="px-4 py-2 text-text-secondary hover:bg-card-border/50 rounded-lg transition-colors"
                    >
                      {{ $t('common.cancel') }}
                    </button>
                    <button
                      type="submit"
                      :disabled="saving"
                      class="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
                    >
                      {{ saving ? $t('common.loading') : $t('common.save') }}
                    </button>
                  </div>
                </form>
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
import { Info as InfoIcon } from 'lucide-vue-next';

const props = defineProps({
  isOpen: Boolean,
  config: Object,
});

const emit = defineEmits(['close', 'save']);

const { t } = useI18n();
const saving = ref(false);

const availableEvents = [
  'wanted_available',
  'wanted_dropping',
  'owned_expiring',
  'status_change',
  'expiring_soon',
  'dropping_alert',
  'daily_summary',
];

const form = ref({
  name: '',
  sendKey: '',
  eventTypes: [],
  enabled: true,
});

// Initialize form when config prop changes
watch(() => props.config, (config) => {
  if (config) {
    form.value = {
      name: config.name || '',
      sendKey: config.sendKey || '',
      eventTypes: config.eventTypes ? JSON.parse(config.eventTypes) : [],
      enabled: config.enabled ?? true,
    };
  } else {
    form.value = {
      name: '',
      sendKey: '',
      eventTypes: [],
      enabled: true,
    };
  }
}, { immediate: true });

const handleSubmit = async () => {
  // Validate
  if (!form.value.name || !form.value.sendKey) {
    return;
  }

  const configData = {
    name: form.value.name,
    sendKey: form.value.sendKey,
    eventTypes: form.value.eventTypes,
    enabled: form.value.enabled,
  };

  emit('save', configData);
};
</script>
