<template>
  <div class="flex min-h-full flex-col gap-4 md:h-full md:min-h-0 md:overflow-hidden">

    <header class="shrink-0">
      <p class="eyebrow mb-2">Outbound</p>
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="headline-display text-3xl md:text-4xl">{{ $t('webhook.title') }}</h1>
          <p class="mt-2 max-w-2xl text-sm text-text-secondary">{{ $t('webhook.noWebhooksHint') }}</p>
        </div>
        <button @click="openAddModal" class="btn-primary">
          <PlusIcon class="h-4 w-4" />
          {{ $t('webhook.addWebhook') }}
        </button>
      </div>
    </header>

    <section class="relative min-h-[26rem] flex-1 overflow-y-auto rounded-[18px] border border-hairline bg-card/45 p-2 pr-3 md:min-h-0 md:p-3 md:pr-4">
    <div v-if="loading" class="flex justify-center py-16">
      <LoadingSpinner size="lg" />
    </div>

    <div v-else-if="webhooks.length > 0">
      <article
        v-for="webhook in webhooks"
        :key="webhook.id"
        class="group grid grid-cols-1 items-start gap-x-8 gap-y-3 border-b border-hairline py-6 transition-colors hover:bg-surface-sunken/50 lg:grid-cols-[minmax(0,1fr)_auto]"
      >
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 class="font-sans text-xl font-bold tracking-tight text-text-main">{{ webhook.name }}</h3>
            <span :class="['flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em]', webhook.enabled ? 'text-status-available' : 'text-status-unknown']">
              <span :class="['h-1.5 w-1.5 rounded-full', webhook.enabled ? 'bg-status-available' : 'bg-status-unknown']" />
              {{ webhook.enabled ? $t('webhook.enabled') : $t('webhook.disabled') }}
            </span>
          </div>

          <div class="mt-3 space-y-2 text-sm">
            <div class="flex items-center gap-2 text-text-secondary">
              <LinkIcon class="h-3.5 w-3.5 text-text-tertiary" />
              <span class="font-mono text-xs font-semibold text-text-main">{{ webhook.method }}</span>
              <span class="truncate font-mono text-xs">{{ webhook.url }}</span>
            </div>

            <div v-if="parseEventTypes(webhook.eventTypes).length" class="flex items-start gap-2 text-text-secondary">
              <BellIcon class="mt-0.5 h-3.5 w-3.5 text-text-tertiary" />
              <div class="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                <span v-for="event in parseEventTypes(webhook.eventTypes)" :key="event" class="font-mono">
                  {{ formatWebhookEvent(event) }}
                </span>
              </div>
            </div>

            <div v-if="webhook.headerCount" class="flex items-center gap-2 text-text-tertiary">
              <CodeIcon class="h-3.5 w-3.5" />
              <span class="text-xs">{{ webhook.headerCount }} custom headers</span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-1">
          <button
            @click="testWebhook(webhook.id)"
            :disabled="testingId === webhook.id"
            class="rounded-full p-2 text-text-tertiary transition-colors hover:bg-card hover:text-accent disabled:opacity-50"
            :title="$t('webhook.testWebhook')"
          >
            <PlayIcon v-if="testingId !== webhook.id" class="h-4 w-4" />
            <LoadingSpinner v-else size="sm" />
          </button>
          <button
            @click="deleteWebhook(webhook.id)"
            class="rounded-full p-2 text-text-tertiary transition-colors hover:bg-card hover:text-status-dropping"
            :title="$t('webhook.deleteWebhook')"
          >
            <TrashIcon class="h-4 w-4" />
          </button>
        </div>
      </article>
    </div>

    <div v-else class="py-24 text-center">
      <WebhookIcon class="mx-auto mb-4 h-8 w-8 text-text-tertiary" />
      <p class="mb-6 text-sm text-text-secondary">{{ $t('webhook.noWebhooks') }}</p>
      <button @click="openAddModal" class="btn-primary">
        <PlusIcon class="h-4 w-4" />
        {{ $t('webhook.addWebhook') }}
      </button>
    </div>
    </section>

    <WebhookModal :is-open="modalOpen" :webhook="editingWebhook" @close="closeModal" @save="handleSave" />
    <ConfirmDialog
      :is-open="deleteDialog.isOpen"
      :title="$t('webhook.deleteWebhook')"
      :message="$t('webhook.confirmDelete')"
      variant="danger"
      @confirm="confirmDelete"
      @cancel="deleteDialog.isOpen = false"
    />
  </div>
</template>

<script setup>
import {
  Plus as PlusIcon,
  Link as LinkIcon,
  Bell as BellIcon,
  Code as CodeIcon,
  Play as PlayIcon,
  Trash as TrashIcon,
  Webhook as WebhookIcon,
} from 'lucide-vue-next';
import { unwrapApiEnvelope } from '~/utils/api-envelope';

const { t } = useI18n();
const toast = useToast();

const loading = ref(true);
const webhooks = ref([]);
const modalOpen = ref(false);
const editingWebhook = ref(null);
const testingId = ref(null);
const deleteDialog = ref({ isOpen: false, webhookId: null });

const fetchWebhooks = async () => {
  loading.value = true;
  try {
    const response = await $fetch('/api/webhooks');
    webhooks.value = unwrapApiEnvelope(response, t('webhook.addError')) || [];
  } catch (error) {
    toast.error(error?.message || error?.data?.msg || t('webhook.addError'));
  } finally {
    loading.value = false;
  }
};

const parseEventTypes = (json) => {
  if (Array.isArray(json)) return json;
  try { return JSON.parse(json || '[]'); } catch { return []; }
};

const formatWebhookEvent = (event) => {
  const key = `webhook.events.${String(event).toLowerCase()}`;
  const value = t(key);
  return value === key ? event : value;
};

const openAddModal = () => {
  editingWebhook.value = null;
  modalOpen.value = true;
};

const closeModal = () => {
  modalOpen.value = false;
  editingWebhook.value = null;
};

const handleSave = async (webhookData) => {
  try {
    const response = await $fetch('/api/webhooks', { method: 'POST', body: webhookData });
    unwrapApiEnvelope(response, t('webhook.addError'));
    toast.success(t('webhook.addSuccess'));
    closeModal();
    await fetchWebhooks();
  } catch (error) {
    toast.error(error?.message || error?.data?.message || t('webhook.addError'));
  }
};

const testWebhook = async (id) => {
  testingId.value = id;
  try {
    const response = await $fetch(`/api/webhooks/${id}/test`, { method: 'POST' });
    const result = unwrapApiEnvelope(response, t('webhook.testFailed'));
    if (result?.ok) toast.success(t('webhook.testSuccess'));
    else toast.error(result?.error || t('webhook.testFailed'));
  } catch (error) {
    toast.error(error?.message || error?.data?.msg || t('webhook.testFailed'));
  } finally {
    testingId.value = null;
  }
};

const deleteWebhook = (id) => {
  deleteDialog.value = { isOpen: true, webhookId: id };
};

const confirmDelete = async () => {
  const id = deleteDialog.value.webhookId;
  if (!id) {
    deleteDialog.value.isOpen = false;
    return;
  }
  try {
    const response = await $fetch(`/api/webhooks/${id}`, { method: 'DELETE' });
    unwrapApiEnvelope(response, t('webhook.deleteError'));
    toast.success(t('webhook.deleteSuccess'));
    await fetchWebhooks();
  } catch (error) {
    toast.error(error?.message || error?.data?.msg || t('webhook.deleteError'));
  } finally {
    deleteDialog.value.isOpen = false;
    deleteDialog.value.webhookId = null;
  }
};

onMounted(() => {
  fetchWebhooks();
});
</script>
