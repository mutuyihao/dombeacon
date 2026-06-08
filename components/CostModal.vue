<template>
  <BaseModal
    :is-open="isOpen"
    :title="$t('costs.addCost')"
    eyebrow="Domain cost"
    size="lg"
    @close="$emit('close')"
  >
    <form @submit.prevent="handleSubmit" class="space-y-6">
      <div>
        <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">
          {{ $t('costs.domain') }} <span class="text-status-dropping">*</span>
        </label>
        <select v-model="form.domainId" required class="input-bare">
          <option value="">{{ $t('costs.selectDomain') }}</option>
          <option v-for="d in domains" :key="d.id" :value="d.id">{{ d.domain }}</option>
        </select>
      </div>

      <div>
        <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">
          {{ $t('costs.type') }} <span class="text-status-dropping">*</span>
        </label>
        <select v-model="form.costType" required class="input-bare">
          <option v-for="type in costTypes" :key="type" :value="type">
            {{ $t(`costs.types.${type}`) }}
          </option>
        </select>
      </div>

      <div class="grid grid-cols-3 gap-6">
        <div class="col-span-2">
          <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">
            {{ $t('costs.amount') }} <span class="text-status-dropping">*</span>
          </label>
          <input
            v-model="form.amount"
            type="number"
            step="0.01"
            min="0"
            required
            class="input-bare font-mono"
            placeholder="0.00"
          />
        </div>
        <div>
          <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">
            {{ $t('costs.currency') }}
          </label>
          <input :value="currency" type="text" disabled class="input-bare font-mono opacity-70" />
        </div>
      </div>
      <p class="-mt-4 text-xs text-text-tertiary">{{ $t('costs.globalCurrencyHint') }}</p>

      <div>
        <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">
          {{ $t('costs.registrar') }}
        </label>
        <input
          v-model="form.registrar"
          type="text"
          class="input-bare"
          :placeholder="$t('costs.registrarPlaceholder')"
        />
      </div>

      <div>
        <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">
          {{ $t('costs.paymentDate') }} <span class="text-status-dropping">*</span>
        </label>
        <input v-model="form.paymentDate" type="date" required class="input-bare font-mono" />
      </div>

      <div class="grid grid-cols-2 gap-6">
        <div>
          <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">
            {{ $t('costs.periodStart') }}
          </label>
          <input v-model="form.periodStart" type="date" class="input-bare font-mono" />
        </div>
        <div>
          <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">
            {{ $t('costs.periodEnd') }}
          </label>
          <input v-model="form.periodEnd" type="date" class="input-bare font-mono" />
        </div>
      </div>

      <div>
        <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">
          {{ $t('costs.note') }}
        </label>
        <textarea
          v-model="form.note"
          rows="2"
          class="input-bare resize-none"
          :placeholder="$t('costs.notePlaceholder')"
        />
      </div>

      <div class="hairline" />

      <div class="flex items-center justify-end gap-3">
        <button type="button" class="btn-ghost" @click="$emit('close')">
          {{ $t('common.cancel') }}
        </button>
        <button type="submit" class="btn-primary disabled:opacity-50" :disabled="saving">
          {{ saving ? $t('common.loading') : $t('common.save') }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
const props = defineProps({
  isOpen: Boolean,
  domains: Array,
  currency: {
    type: String,
    default: 'USD',
  },
});

const emit = defineEmits(['close', 'save']);

const { t } = useI18n();
const saving = ref(false);

const costTypes = ['REGISTRATION', 'RENEWAL', 'TRANSFER', 'PRIVACY', 'OTHER'];

const form = ref({
  domainId: '',
  costType: 'RENEWAL',
  amount: '',
  registrar: '',
  paymentDate: new Date().toISOString().split('T')[0],
  periodStart: '',
  periodEnd: '',
  note: '',
});

watch(() => props.isOpen, (open) => {
  if (open) {
    form.value = {
      domainId: '',
      costType: 'RENEWAL',
      amount: '',
      registrar: '',
      paymentDate: new Date().toISOString().split('T')[0],
      periodStart: '',
      periodEnd: '',
      note: '',
    };
  }
});

const handleSubmit = async () => {
  if (!form.value.domainId || !form.value.amount || !form.value.paymentDate) return;

  const domainId = Number.parseInt(form.value.domainId, 10);
  const amount = Number.parseFloat(form.value.amount);
  if (!Number.isFinite(domainId) || !Number.isFinite(amount) || amount < 0) return;
  const amountInCents = Math.round(amount * 100);

  const costData = {
    domainId,
    costType: form.value.costType,
    amount: amountInCents,
    currency: props.currency,
    registrar: form.value.registrar || null,
    paymentDate: form.value.paymentDate,
    periodStart: form.value.periodStart || null,
    periodEnd: form.value.periodEnd || null,
    note: form.value.note || null,
  };

  emit('save', costData);
};
</script>
