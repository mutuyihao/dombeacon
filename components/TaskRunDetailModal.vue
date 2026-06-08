<template>
  <BaseModal
    :is-open="isOpen"
    :title="$t('task.detailTitle')"
    eyebrow="Task run"
    size="lg"
    @close="$emit('close')"
  >
    <div v-if="run" class="space-y-6">
      <dl class="text-sm">
        <div class="flex items-center justify-between border-b border-hairline py-3">
          <dt class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">ID</dt>
          <dd class="font-mono text-text-main">{{ run.id }}</dd>
        </div>
        <div class="flex items-center justify-between border-b border-hairline py-3">
          <dt class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('task.taskName') }}</dt>
          <dd class="font-mono text-text-main">{{ run.taskName }}</dd>
        </div>
        <div class="flex items-center justify-between border-b border-hairline py-3">
          <dt class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('task.started') }}</dt>
          <dd class="text-text-main">{{ formatTime(run.startedAt) }}</dd>
        </div>
        <div class="flex items-center justify-between py-3">
          <dt class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('task.duration') }}</dt>
          <dd class="font-mono text-text-main">{{ durationLabel }}</dd>
        </div>
      </dl>

      <div>
        <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-2">
          {{ $t('task.result') }}
        </p>
        <pre class="surface-flat overflow-x-auto whitespace-pre-wrap p-4 font-mono text-xs leading-5 text-text-main">{{ formattedResult }}</pre>
      </div>
    </div>

    <div class="hairline mt-6" />

    <div class="mt-6 flex items-center justify-end gap-3">
      <button type="button" class="btn-ghost" @click="$emit('close')">
        {{ $t('common.close') }}
      </button>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  isOpen: boolean;
  run: any | null;
}>();

defineEmits<{
  (e: 'close'): void;
}>();

const formattedResult = computed(() => {
  const r = props.run?.result;
  if (r === undefined || r === null) return '';
  try {
    return JSON.stringify(r, null, 2);
  } catch {
    return String(r);
  }
});

const formatTime = (ts: any) => {
  if (!ts) return '-';
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const durationLabel = computed(() => {
  const started = props.run?.startedAt;
  if (!started) return '-';
  const finished = props.run?.finishedAt;
  if (!finished) return '—';
  const ms = new Date(finished).getTime() - new Date(started).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '-';
  return `${ms}ms`;
});
</script>
