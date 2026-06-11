<template>
  <div class="flex min-h-full flex-col gap-4 md:h-full md:min-h-0 md:overflow-hidden">

    <header class="shrink-0">
      <p class="eyebrow mb-3">Server酱</p>
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="headline-display text-3xl md:text-4xl">{{ $t('serverchan.title') }}</h1>
          <p class="mt-2 max-w-2xl text-sm text-text-secondary">{{ $t('serverchan.noServerchanHint') }}</p>
        </div>
        <button @click="openAddModal" class="btn-primary">
          <PlusIcon class="h-4 w-4" />
          {{ $t('serverchan.addServerchan') }}
        </button>
      </div>
    </header>

    <section class="relative min-h-[26rem] flex-1 overflow-y-auto rounded-[18px] border border-hairline bg-card/45 p-2 pr-3 md:min-h-0 md:p-3 md:pr-4">
    <div v-if="loading" class="flex justify-center py-16">
      <LoadingSpinner size="lg" />
    </div>

    <div v-else-if="serverchanList.length > 0">
      <article
        v-for="config in serverchanList"
        :key="config.id"
        class="group grid grid-cols-1 items-start gap-x-8 gap-y-3 border-b border-hairline py-6 transition-colors hover:bg-surface-sunken/50 lg:grid-cols-[minmax(0,1fr)_auto]"
      >
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 class="font-sans text-xl font-bold tracking-tight text-text-main">{{ config.name }}</h3>
            <span :class="['flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em]', config.enabled ? 'text-status-available' : 'text-status-unknown']">
              <span :class="['h-1.5 w-1.5 rounded-full', config.enabled ? 'bg-status-available' : 'bg-status-unknown']" />
              {{ config.enabled ? $t('serverchan.enabled') : $t('serverchan.disabled') }}
            </span>
          </div>

          <div class="mt-3 space-y-2 text-sm">
            <div class="flex items-center gap-2 text-text-secondary">
              <KeyIcon class="h-3.5 w-3.5 text-text-tertiary" />
              <span class="font-mono text-xs">{{ config.sendKeyMasked || '****' }}</span>
            </div>

            <div v-if="parseEventTypes(config.eventTypes).length" class="flex items-start gap-2 text-text-secondary">
              <BellIcon class="mt-0.5 h-3.5 w-3.5 text-text-tertiary" />
              <div class="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                <span v-for="event in parseEventTypes(config.eventTypes)" :key="event" class="font-mono">
                  {{ $t(`serverchan.events.${event}`) }}
                </span>
              </div>
            </div>

            <div class="flex items-start gap-2 text-text-secondary">
              <CodeIcon class="mt-0.5 h-3.5 w-3.5 text-text-tertiary" />
              <div class="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                <span
                  v-for="item in serverchanOptionSummary(config.options)"
                  :key="item"
                  class="font-mono"
                >
                  {{ item }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-1">
          <button
            @click="openEditModal(config)"
            class="rounded-full p-2 text-text-tertiary transition-colors hover:bg-card hover:text-accent"
            :title="$t('serverchan.editServerchan')"
          >
            <PencilIcon class="h-4 w-4" />
          </button>
          <button
            @click="testServerchan(config.id)"
            :disabled="testingId === config.id"
            class="rounded-full p-2 text-text-tertiary transition-colors hover:bg-card hover:text-accent disabled:opacity-50"
            :title="$t('serverchan.testServerchan')"
          >
            <PlayIcon v-if="testingId !== config.id" class="h-4 w-4" />
            <LoadingSpinner v-else size="sm" />
          </button>
          <button
            @click="deleteServerchan(config.id)"
            class="rounded-full p-2 text-text-tertiary transition-colors hover:bg-card hover:text-status-dropping"
            :title="$t('serverchan.deleteServerchan')"
          >
            <TrashIcon class="h-4 w-4" />
          </button>
        </div>
      </article>
    </div>

    <div v-else class="py-24 text-center">
      <MessageSquareIcon class="mx-auto mb-4 h-8 w-8 text-text-tertiary" />
      <p class="mb-6 text-sm text-text-secondary">{{ $t('serverchan.noServerchan') }}</p>
      <button @click="openAddModal" class="btn-primary">
        <PlusIcon class="h-4 w-4" />
        {{ $t('serverchan.addServerchan') }}
      </button>
    </div>
    </section>

    <ServerchanModal :is-open="modalOpen" :config="editingConfig" @close="closeModal" @save="handleSave" />
    <ConfirmDialog
      :is-open="deleteDialog.isOpen"
      :title="$t('serverchan.deleteServerchan')"
      :message="$t('serverchan.confirmDelete')"
      variant="danger"
      @confirm="confirmDelete"
      @cancel="deleteDialog.isOpen = false"
    />
  </div>
</template>

<script setup>
import {
  Plus as PlusIcon,
  Key as KeyIcon,
  Bell as BellIcon,
  Code as CodeIcon,
  Pencil as PencilIcon,
  Play as PlayIcon,
  Trash as TrashIcon,
  MessageSquare as MessageSquareIcon,
} from '@lucide/vue';
import { unwrapApiEnvelope } from '~/utils/api-envelope';

const { t } = useI18n();
const toast = useToast();

const loading = ref(true);
const serverchanList = ref([]);
const modalOpen = ref(false);
const editingConfig = ref(null);
const testingId = ref(null);
const deleteDialog = ref({ isOpen: false, configId: null });

const fetchServerchan = async () => {
  loading.value = true;
  try {
    const response = await $fetch('/api/serverchan');
    serverchanList.value = unwrapApiEnvelope(response, t('serverchan.addError')) || [];
  } catch (error) {
    toast.error(error?.message || error?.data?.msg || t('serverchan.addError'));
  } finally {
    loading.value = false;
  }
};

const parseEventTypes = (json) => {
  if (Array.isArray(json)) return json;
  if (!json) return [];
  try { return JSON.parse(json); } catch { return []; }
};

const serverchanChannelLabel = (channel) => {
  const keyByChannel = {
    9: 'serviceAccount',
    98: 'android',
    88: 'webhook',
    18: 'pushdeer',
    66: 'wecomApp',
    1: 'wecomBot',
    8: 'bark',
    2: 'dingtalk',
    3: 'feishu',
  };
  const key = keyByChannel[Number(channel)] || 'default';
  return t(`serverchan.channels.${key}`);
};

const serverchanOptionSummary = (options = {}) => {
  const items = [serverchanChannelLabel(options.channel)];
  if (options.noip) items.push(t('serverchan.ipHidden'));
  if (options.openid) items.push(t('serverchan.openidConfigured'));
  if (options.tags) items.push(t('serverchan.tagsSummary', { tags: options.tags }));
  if (options.titlePrefix) items.push(t('serverchan.titlePrefixSummary', { prefix: options.titlePrefix }));
  if (options.timeoutMs && options.timeoutMs !== 10000) {
    items.push(t('serverchan.timeoutSummary', { timeout: options.timeoutMs }));
  }
  return items;
};

const openAddModal = () => {
  editingConfig.value = null;
  modalOpen.value = true;
};

const openEditModal = (config) => {
  editingConfig.value = config;
  modalOpen.value = true;
};

const closeModal = () => {
  modalOpen.value = false;
  editingConfig.value = null;
};

const handleSave = async (configData) => {
  try {
    const response = editingConfig.value
      ? await $fetch(`/api/serverchan/${editingConfig.value.id}`, { method: 'PATCH', body: configData })
      : await $fetch('/api/serverchan', { method: 'POST', body: configData });
    unwrapApiEnvelope(response, t('serverchan.saveError'));
    toast.success(editingConfig.value ? t('serverchan.updateSuccess') : t('serverchan.addSuccess'));
    closeModal();
    await fetchServerchan();
  } catch (error) {
    toast.error(error?.message || error?.data?.msg || t('serverchan.saveError'));
  }
};

const testServerchan = async (id) => {
  testingId.value = id;
  try {
    const response = await $fetch(`/api/serverchan/${id}/test`, { method: 'POST' });
    const ok = unwrapApiEnvelope(response, t('serverchan.testFailed'));
    if (ok === true || ok?.ok === true) {
      toast.success(t('serverchan.testSuccess'));
    } else {
      toast.error(response?.data?.error || response?.msg || t('serverchan.testFailed'));
    }
  } catch (error) {
    toast.error(error?.data?.data?.error || error?.data?.msg || error?.message || t('serverchan.testFailed'));
  } finally {
    testingId.value = null;
  }
};

const deleteServerchan = (id) => {
  deleteDialog.value = { isOpen: true, configId: id };
};

const confirmDelete = async () => {
  const id = deleteDialog.value.configId;
  if (!id) {
    deleteDialog.value.isOpen = false;
    return;
  }
  try {
    const response = await $fetch(`/api/serverchan/${id}`, { method: 'DELETE' });
    unwrapApiEnvelope(response, t('serverchan.deleteError'));
    toast.success(t('serverchan.deleteSuccess'));
    await fetchServerchan();
  } catch (error) {
    toast.error(error?.message || error?.data?.msg || t('serverchan.deleteError'));
  } finally {
    deleteDialog.value.isOpen = false;
    deleteDialog.value.configId = null;
  }
};

onMounted(() => {
  fetchServerchan();
});
</script>
