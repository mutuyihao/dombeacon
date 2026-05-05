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
            <DialogPanel
              class="w-full max-w-2xl bg-card rounded-xl shadow-xl border border-card-border"
            >
              <div class="p-6">
                <div class="flex items-start justify-between mb-6">
                  <DialogTitle class="text-xl font-semibold text-text-main">
                    {{ $t("task.detailTitle") }}
                  </DialogTitle>
                  <button
                    type="button"
                    @click="$emit('close')"
                    class="p-1 text-text-secondary hover:bg-card-border/50 rounded transition-colors"
                  >
                    <XIcon class="w-5 h-5" />
                  </button>
                </div>

                <div v-if="run" class="space-y-4">
                  <div class="bg-card-border/20 rounded-lg p-4 space-y-2 text-sm">
                    <div class="flex justify-between">
                      <span class="text-text-secondary">ID</span>
                      <span class="font-mono text-text-main">{{ run.id }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-text-secondary">{{ $t("task.taskName") }}</span>
                      <span class="font-mono text-text-main">{{ run.taskName }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-text-secondary">{{ $t("task.started") }}</span>
                      <span class="text-text-main">{{ formatTime(run.startedAt) }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-text-secondary">{{ $t("task.duration") }}</span>
                      <span class="text-text-main">{{ durationLabel }}</span>
                    </div>
                  </div>

                  <div>
                    <div class="text-xs font-medium text-text-secondary mb-2">
                      {{ $t("task.result") }}
                    </div>
                    <pre
                      class="bg-card-border/20 rounded-lg p-4 text-xs text-text-main font-mono overflow-x-auto whitespace-pre-wrap"
                    >{{ formattedResult }}</pre>
                  </div>
                </div>

                <div
                  class="flex justify-end gap-3 pt-6 mt-6 border-t border-card-border"
                >
                  <button
                    type="button"
                    @click="$emit('close')"
                    class="px-4 py-2 text-text-secondary hover:bg-card-border/50 rounded-lg transition-colors"
                  >
                    {{ $t("common.close") }}
                  </button>
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionChild,
  TransitionRoot,
} from "@headlessui/vue";
import { X as XIcon } from "lucide-vue-next";

const props = defineProps<{
  isOpen: boolean;
  run: any | null;
}>();

defineEmits<{
  (e: "close"): void;
}>();

const formattedResult = computed(() => {
  const r = props.run?.result;
  if (r === undefined || r === null) return "";
  try {
    return JSON.stringify(r, null, 2);
  } catch {
    return String(r);
  }
});

const formatTime = (ts: any) => {
  if (!ts) return "";
  return new Date(ts).toLocaleString();
};

const durationLabel = computed(() => {
  const started = props.run?.startedAt;
  if (!started) return "";
  const finished = props.run?.finishedAt;
  if (!finished) return "—";
  const ms = new Date(finished).getTime() - new Date(started).getTime();
  return `${ms}ms`;
});
</script>
