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
                  {{ $t('costs.addCost') }}
                </DialogTitle>

                <form @submit.prevent="handleSubmit" class="space-y-4">
                  <!-- Domain Selection -->
                  <div>
                    <label class="block text-sm font-medium text-text-main mb-2">
                      {{ $t('costs.domain') }} <span class="text-status-dropping">*</span>
                    </label>
                    <select
                      v-model="form.domainId"
                      required
                      class="w-full px-3 py-2 border border-card-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
                    >
                      <option value="">{{ $t('costs.selectDomain') }}</option>
                      <option v-for="d in domains" :key="d.id" :value="d.id">{{ d.domain }}</option>
                    </select>
                  </div>

                  <!-- Cost Type -->
                  <div>
                    <label class="block text-sm font-medium text-text-main mb-2">
                      {{ $t('costs.type') }} <span class="text-status-dropping">*</span>
                    </label>
                    <select
                      v-model="form.costType"
                      required
                      class="w-full px-3 py-2 border border-card-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
                    >
                      <option v-for="type in costTypes" :key="type" :value="type">
                        {{ $t(`costs.types.${type}`) }}
                      </option>
                    </select>
                  </div>

                  <!-- Amount and Currency -->
                  <div class="grid grid-cols-3 gap-4">
                    <div class="col-span-2">
                      <label class="block text-sm font-medium text-text-main mb-2">
                        {{ $t('costs.amount') }} <span class="text-status-dropping">*</span>
                      </label>
                      <input
                        v-model="form.amount"
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        class="w-full px-3 py-2 border border-card-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-text-main mb-2">
                        {{ $t('costs.currency') }}
                      </label>
                      <select
                        v-model="form.currency"
                        class="w-full px-3 py-2 border border-card-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
                      >
                        <option v-for="cur in currencies" :key="cur" :value="cur">{{ cur }}</option>
                      </select>
                    </div>
                  </div>

                  <!-- Registrar -->
                  <div>
                    <label class="block text-sm font-medium text-text-main mb-2">
                      {{ $t('costs.registrar') }}
                    </label>
                    <input
                      v-model="form.registrar"
                      type="text"
                      class="w-full px-3 py-2 border border-card-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
                      :placeholder="$t('costs.registrarPlaceholder')"
                    />
                  </div>

                  <!-- Payment Date -->
                  <div>
                    <label class="block text-sm font-medium text-text-main mb-2">
                      {{ $t('costs.paymentDate') }} <span class="text-status-dropping">*</span>
                    </label>
                    <input
                      v-model="form.paymentDate"
                      type="date"
                      required
                      class="w-full px-3 py-2 border border-card-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
                    />
                  </div>

                  <!-- Period -->
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="block text-sm font-medium text-text-main mb-2">
                        {{ $t('costs.periodStart') }}
                      </label>
                      <input
                        v-model="form.periodStart"
                        type="date"
                        class="w-full px-3 py-2 border border-card-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
                      />
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-text-main mb-2">
                        {{ $t('costs.periodEnd') }}
                      </label>
                      <input
                        v-model="form.periodEnd"
                        type="date"
                        class="w-full px-3 py-2 border border-card-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
                      />
                    </div>
                  </div>

                  <!-- Note -->
                  <div>
                    <label class="block text-sm font-medium text-text-main mb-2">
                      {{ $t('costs.note') }}
                    </label>
                    <textarea
                      v-model="form.note"
                      rows="2"
                      class="w-full px-3 py-2 border border-card-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
                      :placeholder="$t('costs.notePlaceholder')"
                    ></textarea>
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

const props = defineProps({
  isOpen: Boolean,
  domains: Array,
});

const emit = defineEmits(['close', 'save']);

const { t } = useI18n();
const saving = ref(false);

const costTypes = ['REGISTRATION', 'RENEWAL', 'TRANSFER', 'PRIVACY', 'OTHER'];
const currencies = ['USD', 'EUR', 'GBP', 'CNY', 'JPY', 'CAD', 'AUD'];

const form = ref({
  domainId: '',
  costType: 'RENEWAL',
  amount: '',
  currency: 'USD',
  registrar: '',
  paymentDate: new Date().toISOString().split('T')[0],
  periodStart: '',
  periodEnd: '',
  note: '',
});

// Reset form when modal opens
watch(() => props.isOpen, (open) => {
  if (open) {
    form.value = {
      domainId: '',
      costType: 'RENEWAL',
      amount: '',
      currency: 'USD',
      registrar: '',
      paymentDate: new Date().toISOString().split('T')[0],
      periodStart: '',
      periodEnd: '',
      note: '',
    };
  }
});

const handleSubmit = async () => {
  if (!form.value.domainId || !form.value.amount || !form.value.paymentDate) {
    return;
  }

  // Convert to cents
  const amountInCents = Math.round(parseFloat(form.value.amount) * 100);

  const costData = {
    domainId: parseInt(form.value.domainId),
    costType: form.value.costType,
    amount: amountInCents,
    currency: form.value.currency,
    registrar: form.value.registrar || null,
    paymentDate: form.value.paymentDate,
    periodStart: form.value.periodStart || null,
    periodEnd: form.value.periodEnd || null,
    note: form.value.note || null,
  };

  emit('save', costData);
};
</script>
