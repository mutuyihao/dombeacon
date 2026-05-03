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
                  {{ $t('webhook.addWebhook') }}
                </DialogTitle>

                <form @submit.prevent="handleSubmit" class="space-y-4">
                  <!-- Name -->
                  <div>
                    <label class="block text-sm font-medium text-text-main mb-2">
                      {{ $t('webhook.name') }} <span class="text-red-500">*</span>
                    </label>
                    <input
                      v-model="form.name"
                      type="text"
                      required
                      class="w-full px-3 py-2 border border-card-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
                      :placeholder="$t('webhook.name')"
                    />
                  </div>

                  <!-- URL -->
                  <div>
                    <label class="block text-sm font-medium text-text-main mb-2">
                      {{ $t('webhook.url') }} <span class="text-red-500">*</span>
                    </label>
                    <input
                      v-model="form.url"
                      type="url"
                      required
                      class="w-full px-3 py-2 border border-card-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
                      placeholder="https://example.com/webhook"
                    />
                  </div>

                  <!-- Method -->
                  <div>
                    <label class="block text-sm font-medium text-text-main mb-2">
                      {{ $t('webhook.method') }}
                    </label>
                    <select
                      v-model="form.method"
                      class="w-full px-3 py-2 border border-card-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
                    >
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="PATCH">PATCH</option>
                    </select>
                  </div>

                  <!-- Event Types -->
                  <div>
                    <label class="block text-sm font-medium text-text-main mb-2">
                      {{ $t('webhook.eventTypes') }}
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
                        <span class="text-sm text-text-main">{{ $t(`webhook.events.${event}`) }}</span>
                      </label>
                    </div>
                  </div>

                  <!-- Custom Headers -->
                  <div>
                    <label class="block text-sm font-medium text-text-main mb-2">
                      {{ $t('webhook.headers') }}
                    </label>
                    <div class="space-y-2">
                      <div
                        v-for="(header, index) in form.headers"
                        :key="index"
                        class="flex gap-2"
                      >
                        <input
                          v-model="header.key"
                          type="text"
                          :placeholder="$t('webhook.headerKey')"
                          class="flex-1 px-3 py-2 border border-card-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
                        />
                        <input
                          v-model="header.value"
                          type="text"
                          :placeholder="$t('webhook.headerValue')"
                          class="flex-1 px-3 py-2 border border-card-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
                        />
                        <button
                          type="button"
                          @click="removeHeader(index)"
                          class="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <XIcon class="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        type="button"
                        @click="addHeader"
                        class="flex items-center gap-2 px-3 py-2 text-sm text-accent hover:bg-accent/10 rounded-lg transition-colors"
                      >
                        <PlusIcon class="w-4 h-4" />
                        {{ $t('webhook.addHeader') }}
                      </button>
                    </div>
                  </div>

                  <!-- Enabled -->
                  <div class="flex items-center gap-2">
                    <input
                      v-model="form.enabled"
                      type="checkbox"
                      id="webhook-enabled"
                      class="rounded border-card-border text-accent focus:ring-accent"
                    />
                    <label for="webhook-enabled" class="text-sm text-text-main cursor-pointer">
                      {{ $t('webhook.enabled') }}
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
import { Plus as PlusIcon, X as XIcon } from 'lucide-vue-next';

const props = defineProps({
  isOpen: Boolean,
  webhook: Object,
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
  url: '',
  method: 'POST',
  eventTypes: [],
  headers: [],
  enabled: true,
});

// Initialize form when webhook prop changes
watch(() => props.webhook, (webhook) => {
  if (webhook) {
    form.value = {
      name: webhook.name || '',
      url: webhook.url || '',
      method: webhook.method || 'POST',
      eventTypes: webhook.eventTypes ? JSON.parse(webhook.eventTypes) : [],
      headers: webhook.headersJson ? Object.entries(JSON.parse(webhook.headersJson)).map(([key, value]) => ({ key, value })) : [],
      enabled: webhook.enabled ?? true,
    };
  } else {
    form.value = {
      name: '',
      url: '',
      method: 'POST',
      eventTypes: [],
      headers: [],
      enabled: true,
    };
  }
}, { immediate: true });

const addHeader = () => {
  form.value.headers.push({ key: '', value: '' });
};

const removeHeader = (index) => {
  form.value.headers.splice(index, 1);
};

const handleSubmit = async () => {
  // Validate
  if (!form.value.name || !form.value.url) {
    return;
  }

  // Convert headers array to object
  const headers = {};
  form.value.headers.forEach(h => {
    if (h.key && h.value) {
      headers[h.key] = h.value;
    }
  });

  const webhookData = {
    name: form.value.name,
    url: form.value.url,
    method: form.value.method,
    eventTypes: form.value.eventTypes,
    headers: Object.keys(headers).length > 0 ? headers : null,
    enabled: form.value.enabled,
  };

  emit('save', webhookData);
};
</script>
