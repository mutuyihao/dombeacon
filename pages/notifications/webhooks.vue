<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-text-main mb-2">{{ $t('webhook.title') }}</h1>
        <p class="text-sm text-text-secondary">{{ $t('webhook.noWebhooksHint') }}</p>
      </div>
      <button
        @click="openAddModal"
        class="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
      >
        <PlusIcon class="w-4 h-4" />
        {{ $t('webhook.addWebhook') }}
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <LoadingSpinner size="lg" />
    </div>

    <!-- Webhooks List -->
    <div v-else-if="webhooks.length > 0" class="grid gap-4">
      <div
        v-for="webhook in webhooks"
        :key="webhook.id"
        class="bg-card border border-card-border rounded-lg p-6 hover:shadow-md transition-shadow"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <h3 class="text-lg font-semibold text-text-main">{{ webhook.name }}</h3>
              <span
                :class="[
                  'px-2 py-0.5 text-xs rounded-full',
                  webhook.enabled
                    ? 'bg-status-available/10 text-status-available border border-status-available/20'
                    : 'bg-status-unknown/10 text-status-unknown border border-status-unknown/20'
                ]"
              >
                {{ webhook.enabled ? $t('webhook.enabled') : $t('webhook.disabled') }}
              </span>
            </div>

            <div class="space-y-2 text-sm">
              <div class="flex items-center gap-2 text-text-secondary">
                <LinkIcon class="w-4 h-4" />
                <span class="font-mono text-xs">{{ webhook.method }}</span>
                <span class="truncate">{{ webhook.url }}</span>
              </div>

              <div v-if="webhook.eventTypes" class="flex items-start gap-2 text-text-secondary">
                <BellIcon class="w-4 h-4 mt-0.5" />
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="event in parseEventTypes(webhook.eventTypes)"
                    :key="event"
                    class="px-2 py-0.5 bg-card-border/50 rounded text-xs"
                  >
                    {{ $t(`webhook.events.${event}`) }}
                  </span>
                </div>
              </div>

              <div v-if="webhook.headersJson" class="flex items-center gap-2 text-text-secondary">
                <CodeIcon class="w-4 h-4" />
                <span>{{ Object.keys(parseHeaders(webhook.headersJson)).length }} custom headers</span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 ml-4">
            <button
              @click="testWebhook(webhook.id)"
              :disabled="testingId === webhook.id"
              class="p-2 text-text-secondary hover:text-accent hover:bg-card-border/50 rounded transition-colors disabled:opacity-50"
              :title="$t('webhook.testWebhook')"
            >
              <PlayIcon v-if="testingId !== webhook.id" class="w-4 h-4" />
              <LoadingSpinner v-else size="sm" />
            </button>
            <button
              @click="deleteWebhook(webhook.id)"
              class="p-2 text-text-secondary hover:text-status-dropping hover:bg-status-dropping/10 rounded transition-colors"
              :title="$t('webhook.deleteWebhook')"
            >
              <TrashIcon class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-16">
      <WebhookIcon class="w-16 h-16 mx-auto text-text-tertiary mb-4" />
      <p class="text-text-secondary mb-4">{{ $t('webhook.noWebhooks') }}</p>
      <button
        @click="openAddModal"
        class="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
      >
        <PlusIcon class="w-4 h-4" />
        {{ $t('webhook.addWebhook') }}
      </button>
    </div>

    <!-- Add/Edit Modal -->
    <WebhookModal
      :is-open="modalOpen"
      :webhook="editingWebhook"
      @close="closeModal"
      @save="handleSave"
    />

    <!-- Confirm Dialog -->
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

const { t } = useI18n();
const toast = useToast();

const loading = ref(true);
const webhooks = ref([]);
const modalOpen = ref(false);
const editingWebhook = ref(null);
const testingId = ref(null);
const deleteDialog = ref({
  isOpen: false,
  webhookId: null,
});

// Fetch webhooks
const fetchWebhooks = async () => {
  loading.value = true;
  try {
    const response = await $fetch('/api/webhooks');
    webhooks.value = response.data || [];
  } catch (error) {
    console.error('Failed to fetch webhooks:', error);
    toast.error(t('webhook.addError'));
  } finally {
    loading.value = false;
  }
};

// Parse JSON fields
const parseEventTypes = (json) => {
  try {
    return JSON.parse(json || '[]');
  } catch {
    return [];
  }
};

const parseHeaders = (json) => {
  try {
    return JSON.parse(json || '{}');
  } catch {
    return {};
  }
};

// Modal handlers
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
    await $fetch('/api/webhooks', {
      method: 'POST',
      body: webhookData,
    });
    toast.success(t('webhook.addSuccess'));
    closeModal();
    await fetchWebhooks();
  } catch (error) {
    console.error('Failed to save webhook:', error);
    toast.error(error.data?.message || t('webhook.addError'));
  }
};

// Test webhook
const testWebhook = async (id) => {
  testingId.value = id;
  try {
    const response = await $fetch(`/api/webhooks/${id}/test`, {
      method: 'POST',
    });
    if (response.success) {
      toast.success(t('webhook.testSuccess'));
    } else {
      toast.error(t('webhook.testFailed'));
    }
  } catch (error) {
    console.error('Failed to test webhook:', error);
    toast.error(t('webhook.testFailed'));
  } finally {
    testingId.value = null;
  }
};

// Delete webhook
const deleteWebhook = (id) => {
  deleteDialog.value = {
    isOpen: true,
    webhookId: id,
  };
};

const confirmDelete = async () => {
  const id = deleteDialog.value.webhookId;
  try {
    await $fetch(`/api/webhooks/${id}`, {
      method: 'DELETE',
    });
    toast.success(t('webhook.deleteSuccess'));
    await fetchWebhooks();
  } catch (error) {
    console.error('Failed to delete webhook:', error);
    toast.error(t('webhook.deleteError'));
  } finally {
    deleteDialog.value.isOpen = false;
    deleteDialog.value.webhookId = null;
  }
};

// Load webhooks on mount
onMounted(() => {
  fetchWebhooks();
});
</script>
