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
                Add Domain
              </DialogTitle>
              
              <form @submit.prevent="submit" class="space-y-4">
                  <div>
                      <label class="block text-sm font-medium text-text-secondary mb-1">Domain Name</label>
                      <input v-model="form.domain" type="text" placeholder="example.com" class="w-full px-3 py-2 bg-background border border-card-border rounded-lg focus:outline-none focus:border-accent transition-colors" required>
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-sm font-medium text-text-secondary mb-1">Watch Kind</label>
                      <select v-model="form.watchKind" class="w-full px-3 py-2 bg-background border border-card-border rounded-lg focus:outline-none focus:border-accent transition-colors">
                        <option value="WANTED">Wanted</option>
                        <option value="OWNED">Owned</option>
                      </select>
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-text-secondary mb-1">Priority</label>
                      <select v-model="form.priority" class="w-full px-3 py-2 bg-background border border-card-border rounded-lg focus:outline-none focus:border-accent transition-colors">
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                      </select>
                    </div>
                  </div>

                  <div>
                      <label class="block text-sm font-medium text-text-secondary mb-1">Note (Optional)</label>
                      <input v-model="form.note" type="text" class="w-full px-3 py-2 bg-background border border-card-border rounded-lg focus:outline-none focus:border-accent transition-colors">
                  </div>
                  <div>
                      <label class="block text-sm font-medium text-text-secondary mb-1">Tags (Comma separated)</label>
                      <input v-model="tagsInput" type="text" placeholder="premium, watch" class="w-full px-3 py-2 bg-background border border-card-border rounded-lg focus:outline-none focus:border-accent transition-colors">
                  </div>

                  <div class="mt-4 flex justify-end gap-3">
                    <button type="button" class="px-4 py-2 text-sm text-text-secondary hover:bg-black/5 rounded-lg transition-colors" @click="closeModal">
                        Cancel
                    </button>
                    <button type="submit" class="px-4 py-2 text-sm text-white bg-accent hover:bg-accent-hover rounded-lg shadow-sm transition-colors" :disabled="loading">
                        {{ loading ? 'Saving...' : 'Add Domain' }}
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
const form = reactive({
    domain: '',
    watchKind: 'WANTED',
    priority: 'MEDIUM',
    note: ''
});

const closeModal = () => emit('close');

const submit = async () => {
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
        emit('saved');
        closeModal();
    } catch (e) {
        alert(e.data?.msg || 'Failed to add domain');
    } finally {
        loading.value = false;
    }
};
</script>
