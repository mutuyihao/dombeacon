<template>
  <div>
    <button
      type="button"
      @click="expanded = !expanded"
      class="flex w-full items-center justify-between gap-3 py-2 text-left transition-colors hover:text-accent"
      :aria-expanded="expanded"
    >
      <div class="flex items-center gap-2 text-sm font-medium text-text-main">
        <SlidersIcon class="h-4 w-4 text-text-tertiary" />
        <span>{{ $t('filter.title') }}</span>
        <span
          v-if="activeChips.length > 0"
          class="ml-1 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent"
          data-numeric
        >
          {{ activeChips.length }}
        </span>
      </div>
      <div class="flex items-center gap-3">
        <button
          v-if="activeChips.length > 0"
          type="button"
          @click.stop="$emit('reset')"
          class="text-xs text-text-tertiary transition-colors hover:text-status-dropping"
        >
          {{ $t('filter.clearAll') }}
        </button>
        <ChevronDownIcon
          class="h-4 w-4 text-text-tertiary transition-transform"
          :class="{ 'rotate-180': expanded }"
        />
      </div>
    </button>

    <div v-if="activeChips.length > 0" class="flex flex-wrap gap-2 pb-3">
      <span
        v-for="chip in activeChips"
        :key="chip.key"
        class="inline-flex items-center gap-1.5 rounded-full bg-surface-sunken px-3 py-1 text-xs text-text-main"
      >
        {{ chip.label }}
        <button
          type="button"
          @click="chip.clear"
          class="text-text-tertiary transition-colors hover:text-status-dropping"
          :aria-label="$t('filter.removeChip')"
        >
          <XIcon class="h-3 w-3" />
        </button>
      </span>
    </div>

    <div v-if="expanded" class="grid grid-cols-1 gap-x-6 gap-y-4 border-t border-hairline pt-4 md:grid-cols-2 lg:grid-cols-3">
      <div>
        <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">
          {{ $t('domain.watchKind') }}
        </label>
        <select v-model="local.watchKind" class="input-bare">
          <option value="">{{ $t('common.all') }}</option>
          <option value="OWNED">{{ $t('domain.owned') }}</option>
          <option value="WANTED">{{ $t('domain.wanted') }}</option>
        </select>
      </div>

      <div>
        <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">
          {{ $t('domain.priority') }}
        </label>
        <select v-model="local.priority" class="input-bare">
          <option value="">{{ $t('common.all') }}</option>
          <option value="HIGH">{{ $t('domain.high') }}</option>
          <option value="MEDIUM">{{ $t('domain.medium') }}</option>
          <option value="LOW">{{ $t('domain.low') }}</option>
        </select>
      </div>

      <div>
        <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">
          {{ $t('common.status') }}
        </label>
        <select v-model="local.status" class="input-bare">
          <option value="">{{ $t('common.all') }}</option>
          <option value="AVAILABLE">{{ $t('domain.status.available') }}</option>
          <option value="REGISTERED">{{ $t('domain.status.registered') }}</option>
          <option value="EXPIRING">{{ $t('domain.status.expiring') }}</option>
          <option value="PENDING_DELETE">{{ $t('domain.status.pending_delete') }}</option>
        </select>
      </div>

      <div>
        <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">
          {{ $t('domain.group') }}
        </label>
        <input v-model="local.groupName" type="text" class="input-bare" />
      </div>

      <div>
        <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">
          {{ $t('filter.sslState') }}
        </label>
        <select v-model="local.sslState" class="input-bare">
          <option value="">{{ $t('common.all') }}</option>
          <option value="expiring">{{ $t('filter.sslExpiring') }}</option>
          <option value="invalid">{{ $t('filter.sslInvalid') }}</option>
          <option value="none">{{ $t('filter.sslNone') }}</option>
        </select>
      </div>

      <div>
        <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-1">
          {{ $t('filter.expiringDays') }}
        </label>
        <select v-model.number="expiringDaysSelect" class="input-bare">
          <option :value="null">{{ $t('common.all') }}</option>
          <option :value="7">{{ $t('filter.within7d') }}</option>
          <option :value="30">{{ $t('filter.within30d') }}</option>
          <option :value="90">{{ $t('filter.within90d') }}</option>
        </select>
      </div>

      <div class="md:col-span-2 lg:col-span-3">
        <label class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-2">
          {{ $t('domain.tags') }}
        </label>
        <div class="flex flex-wrap items-center gap-2">
          <span
            v-for="tag in local.tags"
            :key="tag"
            class="inline-flex items-center gap-1 rounded-full bg-surface-sunken px-2.5 py-1 font-mono text-xs text-text-main"
          >
            #{{ tag }}
            <button
              type="button"
              @click="removeTag(tag)"
              class="text-text-tertiary transition-colors hover:text-status-dropping"
            >
              <XIcon class="h-3 w-3" />
            </button>
          </span>
          <input
            v-model="tagInput"
            type="text"
            :placeholder="$t('filter.tagsHint')"
            @keydown.enter.prevent="addTag"
            class="input-bare min-w-30 flex-1 py-1 text-xs"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Sliders as SlidersIcon, ChevronDown as ChevronDownIcon, X as XIcon } from 'lucide-vue-next';

const props = defineProps({
  modelValue: { type: Object, required: true },
  activeChips: { type: Array, default: () => [] },
});
const emit = defineEmits(['update:modelValue', 'reset']);

const expanded = ref(false);
const tagInput = ref('');

const local = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const expiringDaysSelect = computed({
  get: () => local.value.expiringDays,
  set: (v) => {
    const next = { ...local.value, expiringDays: v == null ? null : Number(v) };
    emit('update:modelValue', next);
  },
});

const addTag = () => {
  const v = tagInput.value.trim();
  if (!v) return;
  if (!local.value.tags.includes(v)) {
    emit('update:modelValue', { ...local.value, tags: [...local.value.tags, v] });
  }
  tagInput.value = '';
};

const removeTag = (tag) => {
  emit('update:modelValue', { ...local.value, tags: local.value.tags.filter((t) => t !== tag) });
};
</script>
