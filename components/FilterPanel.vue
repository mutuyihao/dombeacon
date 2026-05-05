<template>
  <div>
    <!-- Toggle bar (always visible) -->
    <div class="bg-card border border-card-border rounded-2xl">
      <button
        @click="expanded = !expanded"
        class="w-full flex items-center justify-between px-4 py-3 text-left"
        :aria-expanded="expanded"
      >
        <div class="flex items-center gap-2 text-sm font-medium text-text-main">
          <SlidersIcon class="w-4 h-4 text-text-secondary" />
          <span>{{ $t('filter.title') }}</span>
          <span
            v-if="activeChips.length > 0"
            class="ml-2 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-xs font-semibold"
          >
            {{ activeChips.length }}
          </span>
        </div>
        <div class="flex items-center gap-3">
          <button
            v-if="activeChips.length > 0"
            @click.stop="$emit('reset')"
            class="text-xs text-text-secondary hover:text-accent transition-colors"
          >
            {{ $t('filter.clearAll') }}
          </button>
          <ChevronDownIcon
            class="w-4 h-4 text-text-secondary transition-transform"
            :class="{ 'rotate-180': expanded }"
          />
        </div>
      </button>

      <!-- Active chips row (always visible when any) -->
      <div
        v-if="activeChips.length > 0"
        class="flex flex-wrap gap-2 px-4 pb-3"
      >
        <span
          v-for="chip in activeChips"
          :key="chip.key"
          class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-card-border/50 text-text-main text-xs"
        >
          {{ chip.label }}
          <button
            @click="chip.clear"
            class="text-text-secondary hover:text-status-dropping transition-colors"
            :aria-label="$t('filter.removeChip')"
          >
            <XIcon class="w-3 h-3" />
          </button>
        </span>
      </div>

      <!-- Expanded panel -->
      <div
        v-if="expanded"
        class="border-t border-card-border p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <!-- Watch Kind -->
        <div>
          <label class="block text-xs font-medium text-text-secondary mb-1">
            {{ $t('domain.watchKind') }}
          </label>
          <select
            v-model="local.watchKind"
            class="w-full px-3 py-2 text-sm border border-card-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            <option value="">{{ $t('common.all') }}</option>
            <option value="OWNED">{{ $t('domain.owned') }}</option>
            <option value="WANTED">{{ $t('domain.wanted') }}</option>
          </select>
        </div>

        <!-- Priority -->
        <div>
          <label class="block text-xs font-medium text-text-secondary mb-1">
            {{ $t('domain.priority') }}
          </label>
          <select
            v-model="local.priority"
            class="w-full px-3 py-2 text-sm border border-card-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            <option value="">{{ $t('common.all') }}</option>
            <option value="HIGH">{{ $t('domain.high') }}</option>
            <option value="MEDIUM">{{ $t('domain.medium') }}</option>
            <option value="LOW">{{ $t('domain.low') }}</option>
          </select>
        </div>

        <!-- Status -->
        <div>
          <label class="block text-xs font-medium text-text-secondary mb-1">
            {{ $t('common.status') }}
          </label>
          <select
            v-model="local.status"
            class="w-full px-3 py-2 text-sm border border-card-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            <option value="">{{ $t('common.all') }}</option>
            <option value="AVAILABLE">{{ $t('domain.status.available') }}</option>
            <option value="REGISTERED">{{ $t('domain.status.registered') }}</option>
            <option value="EXPIRING">{{ $t('domain.status.expiring') }}</option>
            <option value="PENDING_DELETE">{{ $t('domain.status.pending_delete') }}</option>
          </select>
        </div>

        <!-- Group -->
        <div>
          <label class="block text-xs font-medium text-text-secondary mb-1">
            {{ $t('domain.group') }}
          </label>
          <input
            v-model="local.groupName"
            type="text"
            class="w-full px-3 py-2 text-sm border border-card-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>

        <!-- SSL state -->
        <div>
          <label class="block text-xs font-medium text-text-secondary mb-1">
            {{ $t('filter.sslState') }}
          </label>
          <select
            v-model="local.sslState"
            class="w-full px-3 py-2 text-sm border border-card-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            <option value="">{{ $t('common.all') }}</option>
            <option value="expiring">{{ $t('filter.sslExpiring') }}</option>
            <option value="invalid">{{ $t('filter.sslInvalid') }}</option>
            <option value="none">{{ $t('filter.sslNone') }}</option>
          </select>
        </div>

        <!-- Expiring within N days -->
        <div>
          <label class="block text-xs font-medium text-text-secondary mb-1">
            {{ $t('filter.expiringDays') }}
          </label>
          <select
            v-model.number="expiringDaysSelect"
            class="w-full px-3 py-2 text-sm border border-card-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            <option :value="null">{{ $t('common.all') }}</option>
            <option :value="7">{{ $t('filter.within7d') }}</option>
            <option :value="30">{{ $t('filter.within30d') }}</option>
            <option :value="90">{{ $t('filter.within90d') }}</option>
          </select>
        </div>

        <!-- Tags -->
        <div class="md:col-span-2 lg:col-span-3">
          <label class="block text-xs font-medium text-text-secondary mb-1">
            {{ $t('domain.tags') }}
          </label>
          <div class="flex flex-wrap gap-2 items-center">
            <span
              v-for="tag in local.tags"
              :key="tag"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-card-border/40 text-xs"
            >
              #{{ tag }}
              <button
                type="button"
                @click="removeTag(tag)"
                class="text-text-secondary hover:text-status-dropping"
              >
                <XIcon class="w-3 h-3" />
              </button>
            </span>
            <input
              v-model="tagInput"
              type="text"
              :placeholder="$t('filter.tagsHint')"
              @keydown.enter.prevent="addTag"
              class="flex-1 min-w-[120px] px-2 py-1 text-xs border border-card-border rounded-lg bg-card focus:outline-none focus:ring-1 focus:ring-accent/50"
            />
          </div>
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

// Two-way bind via local proxy that emits update:modelValue
const local = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

// expiringDays uses null for "all" but v-model.number turns "" into NaN; wrap it
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
    emit('update:modelValue', {
      ...local.value,
      tags: [...local.value.tags, v],
    });
  }
  tagInput.value = '';
};

const removeTag = (tag) => {
  emit('update:modelValue', {
    ...local.value,
    tags: local.value.tags.filter((t) => t !== tag),
  });
};
</script>
