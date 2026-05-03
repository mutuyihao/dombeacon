<template>
  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" @close="closeModal" class="relative z-50">
      <TransitionChild
        as="template"
        enter="duration-300 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-200 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/25 backdrop-blur-sm" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild
            as="template"
            enter="duration-300 ease-out"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95"
          >
            <DialogPanel
              class="w-full max-w-md transform overflow-hidden rounded-2xl bg-card p-6 text-left align-middle shadow-xl transition-all border border-card-border"
            >
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-text-main mb-4">
                {{ $t('domain.addDomain') }}
              </DialogTitle>

              <form @submit.prevent="submit" class="space-y-4">
                  <div>
                      <label class="block text-sm font-medium text-text-secondary mb-1">{{ $t('domain.domainName') }}</label>
                      <input
                        v-model="form.domain"
                        type="text"
                        placeholder="example.com"
                        :class="[
                          'w-full px-3 py-2 bg-background border rounded-lg focus:outline-none transition-colors',
                          errors.domain ? 'border-red-500 focus:border-red-500' : 'border-card-border focus:border-accent'
                        ]"
                        @blur="validateDomain"
                        required
                      >
                      <p v-if="errors.domain" class="mt-1 text-xs text-red-500">{{ errors.domain }}</p>
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-sm font-medium text-text-secondary mb-1">{{ $t('domain.watchKind') }}</label>
                      <select v-model="form.watchKind" class="w-full px-3 py-2 bg-background border border-card-border rounded-lg focus:outline-none focus:border-accent transition-colors">
                        <option value="WANTED">{{ $t('domain.wanted') }}</option>
                        <option value="OWNED">{{ $t('domain.owned') }}</option>
                      </select>
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-text-secondary mb-1">{{ $t('domain.priority') }}</label>
                      <select v-model="form.priority" class="w-full px-3 py-2 bg-background border border-card-border rounded-lg focus:outline-none focus:border-accent transition-colors">
                        <option value="LOW">{{ $t('domain.low') }}</option>
                        <option value="MEDIUM">{{ $t('domain.medium') }}</option>
                        <option value="HIGH">{{ $t('domain.high') }}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                      <label class="block text-sm font-medium text-text-secondary mb-1">{{ $t('domain.note') }}</label>
                      <input v-model="form.note" type="text" class="w-full px-3 py-2 bg-background border border-card-border rounded-lg focus:outline-none focus:border-accent transition-colors">
                  </div>
                  <div>
                      <label class="block text-sm font-medium text-text-secondary mb-1">{{ $t('domain.tags') }}</label>
                      <input v-model="tagsInput" type="text" placeholder="premium, watch" class="w-full px-3 py-2 bg-background border border-card-border rounded-lg focus:outline-none focus:border-accent transition-colors">
                  </div>

                  <div class="mt-4 flex justify-end gap-3">
                    <button
                      type="button"
                      class="px-4 py-2 text-sm text-text-secondary hover:bg-black/5 rounded-lg transition-all active:scale-95"
                      @click="closeModal"
                    >
                        {{ $t('common.cancel') }}
                    </button>
                    <button
                      type="submit"
                      class="px-4 py-2 text-sm text-white bg-accent hover:bg-accent-hover rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      :disabled="loading"
                    >
                        <span v-if="loading" class="flex items-center gap-2">
                          <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {{ $t('common.loading') }}
                        </span>
                        <span v-else>{{ $t('domain.addDomain') }}</span>
                    </button>
                  </div>
              </form>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { TransitionRoot, TransitionChild, Dialog, DialogPanel, DialogTitle } from '@headlessui/vue';

const props = defineProps({
    isOpen: Boolean
});

const emit = defineEmits(['close', 'saved']);

const loading = ref(false);
const tagsInput = ref('');
const errors = ref({
  domain: ''
});

const form = reactive({
    domain: '',
    watchKind: 'WANTED',
    priority: 'MEDIUM',
    note: ''
});

const validateDomain = () => {
  errors.value.domain = '';
  const domain = form.domain.trim();

  if (!domain) {
    errors.value.domain = t('domain.domainRequired');
    return false;
  }

  // Basic domain validation
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
  if (!domainRegex.test(domain)) {
    errors.value.domain = t('domain.invalidDomain');
    return false;
  }

  return true;
};

const closeModal = () => emit('close');

const { t } = useI18n();
const toast = useToast();

const submit = async () => {
    if (!validateDomain()) return;

    loading.value = true;
    try {
        const payload = {
            ...form,
            tags: tagsInput.value.split(',').map(t => t.trim()).filter(Boolean)
        };
        await $fetch('/api/domains', {
            method: 'POST',
            body: payload
        });
        // Clear
        form.domain = '';
        form.watchKind = 'WANTED';
        form.priority = 'MEDIUM';
        form.note = '';
        tagsInput.value = '';
        errors.value.domain = '';
        toast.success(t('domain.addSuccess'));
        emit('saved');
        closeModal();
    } catch (e) {
        toast.error(e.data?.msg || t('domain.addError') || 'Failed to add domain');
    } finally {
        loading.value = false;
    }
};
</script>
