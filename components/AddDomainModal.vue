<template>
  <BaseModal
    :is-open="isOpen"
    :title="isEdit ? $t('domain.editDomain') : $t('domain.addDomain')"
    eyebrow="Watch entry"
    @close="closeModal"
  >
    <form @submit.prevent="submit" class="space-y-6">
      <div>
        <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">
          {{ $t('domain.domainName') }}
        </label>
        <input
          v-model="form.domain"
          type="text"
          placeholder="example.com"
          :disabled="isEdit"
          :class="['input-bare font-mono', errors.domain && 'border-status-dropping! focus:border-status-dropping!']"
          @blur="validateDomain"
          required
        />
        <p v-if="errors.domain" class="mt-1.5 text-xs text-status-dropping">{{ errors.domain }}</p>
      </div>

      <div class="grid grid-cols-2 gap-6">
        <div>
          <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">
            {{ $t('domain.watchKind') }}
          </label>
          <select v-model="form.watchKind" class="input-bare">
            <option value="WANTED">{{ $t('domain.wanted') }}</option>
            <option value="OWNED">{{ $t('domain.owned') }}</option>
          </select>
        </div>
        <div>
          <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">
            {{ $t('domain.priority') }}
          </label>
          <select v-model="form.priority" class="input-bare">
            <option value="LOW">{{ $t('domain.low') }}</option>
            <option value="MEDIUM">{{ $t('domain.medium') }}</option>
            <option value="HIGH">{{ $t('domain.high') }}</option>
          </select>
        </div>
      </div>

      <div>
        <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">
          {{ $t('domain.note') }}
        </label>
        <input v-model="form.note" type="text" class="input-bare" />
      </div>

      <div>
        <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">
          {{ $t('domain.tags') }}
        </label>
        <input v-model="tagsInput" type="text" placeholder="premium, watch" class="input-bare" />
      </div>

      <div>
        <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">
          {{ $t('domain.group') }}
        </label>
        <input v-model="form.group" type="text" class="input-bare" />
      </div>

      <div class="flex items-center justify-end gap-3 pt-2">
        <button type="button" class="btn-ghost" @click="closeModal">
          {{ $t('common.cancel') }}
        </button>
        <button type="submit" class="btn-primary disabled:opacity-50" :disabled="loading">
          <Loader2Icon v-if="loading" class="h-4 w-4 animate-spin" />
          <span>{{ loading ? $t('common.loading') : (isEdit ? $t('common.save') : $t('domain.addDomain')) }}</span>
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import { Loader2 as Loader2Icon } from '@lucide/vue';
import { unwrapApiEnvelope } from '~/utils/api-envelope';
import { isValidDomainName, normalizeDomainInput } from '~/utils/domain';

const props = defineProps({
  isOpen: Boolean,
  domain: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['close', 'saved']);

const loading = ref(false);
const tagsInput = ref('');
const errors = ref({ domain: '' });

const form = reactive({
  domain: '',
  watchKind: 'WANTED',
  priority: 'MEDIUM',
  note: '',
  group: '',
});

const isEdit = computed(() => !!props.domain?.id);

const { t } = useI18n();
const toast = useToast();
const runtimeConfig = useRuntimeConfig();
const allowSingleLabelDomains = computed(
  () => runtimeConfig.public.allowSingleLabelDomains === true,
);

const resetForm = () => {
  errors.value.domain = '';

  if (isEdit.value && props.domain) {
    form.domain = props.domain.domain || '';
    form.watchKind = props.domain.watchKind || 'WANTED';
    form.priority = props.domain.priority || 'MEDIUM';
    form.note = props.domain.note || '';
    form.group = props.domain.groupName || '';
    tagsInput.value = Array.isArray(props.domain.tags) ? props.domain.tags.join(', ') : '';
    return;
  }

  form.domain = '';
  form.watchKind = 'WANTED';
  form.priority = 'MEDIUM';
  form.note = '';
  form.group = '';
  tagsInput.value = '';
};

watch(() => props.isOpen, (open) => { if (open) resetForm(); });
watch(() => props.domain, () => { if (props.isOpen) resetForm(); });

const validateDomain = () => {
  errors.value.domain = '';
  const domain = normalizeDomainInput(form.domain);

  if (!domain) {
    errors.value.domain = t('domain.domainRequired');
    return false;
  }

  if (
    !isValidDomainName(domain, {
      allowSingleLabel: allowSingleLabelDomains.value,
    })
  ) {
    errors.value.domain = t('domain.invalidDomain');
    return false;
  }

  form.domain = domain;
  return true;
};

const closeModal = () => emit('close');

const submit = async () => {
  if (!validateDomain()) return;

  loading.value = true;
  try {
    const payload = {
      ...form,
      tags: tagsInput.value.split(',').map((t) => t.trim()).filter(Boolean),
    };
    const response = await $fetch(isEdit.value ? `/api/domains/${props.domain.id}` : '/api/domains', {
      method: isEdit.value ? 'PUT' : 'POST',
      body: payload,
    });
    unwrapApiEnvelope(response, t('domain.addError'));
    resetForm();
    toast.success(isEdit.value ? t('domain.updateSuccess') : t('domain.addSuccess'));
    emit('saved');
    closeModal();
  } catch (e) {
    toast.error(e?.message || e?.data?.msg || t('domain.addError') || 'Failed to add domain');
  } finally {
    loading.value = false;
  }
};
</script>
