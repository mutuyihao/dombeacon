<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-text-main mb-2">{{ $t('serverchan.title') }}</h1>
        <p class="text-sm text-text-secondary">{{ $t('serverchan.noServerchanHint') }}</p>
      </div>
      <button
        @click="openAddModal"
        class="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
      >
        <PlusIcon class="w-4 h-4" />
        {{ $t('serverchan.addServerchan') }}
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <LoadingSpinner size="lg" />
    </div>

    <!-- Server酱 List -->
    <div v-else-if="serverchanList.length > 0" class="grid gap-4">
      <div
        v-for="config in serverchanList"
        :key="config.id"
        class="bg-card border border-card-border rounded-lg p-6 hover:shadow-md transition-shadow"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <h3 class="text-lg font-semibold text-text-main">{{ config.name }}</h3>
              <span
                :class="[
                  'px-2 py-0.5 text-xs rounded-full',
                  config.enabled
                    ? 'bg-status-available/10 text-status-available border border-status-available/20'
                    : 'bg-status-unknown/10 text-status-unknown border border-status-unknown/20'
                ]"
              >
                {{ config.enabled ? $t('serverchan.enabled') : $t('serverchan.disabled') }}
              </span>
            </div>

            <div class="space-y-2 text-sm">
              <div class="flex items-center gap-2 text-text-secondary">
                <KeyIcon class="w-4 h-4" />
                <span class="font-mono text-xs">{{ config.sendKeyMasked || maskSendKey(config.sendKey) }}</span>
              </div>

              <div v-if="config.eventTypes" class="flex items-start gap-2 text-text-secondary">
                <BellIcon class="w-4 h-4 mt-0.5" />
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="event in parseEventTypes(config.eventTypes)"
                    :key="event"
                    class="px-2 py-0.5 bg-card-border/50 rounded text-xs"
                  >
                    {{ $t(`serverchan.events.${event}`) }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 ml-4">
            <button
              @click="testServerchan(config.id)"
              :disabled="testingId === config.id"
              class="p-2 text-text-secondary hover:text-accent hover:bg-card-border/50 rounded transition-colors disabled:opacity-50"
              :title="$t('serverchan.testServerchan')"
            >
              <PlayIcon v-if="testingId !== config.id" class="w-4 h-4" />
              <LoadingSpinner v-else size="sm" />
            </button>
            <button
              @click="deleteServerchan(config.id)"
              class="p-2 text-text-secondary hover:text-status-dropping hover:bg-status-dropping/10 rounded transition-colors"
              :title="$t('serverchan.deleteServerchan')"
            >
              <TrashIcon class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-16">
      <MessageSquareIcon class="w-16 h-16 mx-auto text-text-tertiary mb-4" />
      <p class="text-text-secondary mb-4">{{ $t('serverchan.noServerchan') }}</p>
      <button
        @click="openAddModal"
        class="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
      >
        <PlusIcon class="w-4 h-4" />
        {{ $t('serverchan.addServerchan') }}
      </button>
    </div>

    <!-- Add/Edit Modal -->
    <ServerchanModal
      :is-open="modalOpen"
      :config="editingConfig"
      @close="closeModal"
      @save="handleSave"
    />

    <!-- Confirm Dialog -->
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
  Play as PlayIcon,
  Trash as TrashIcon,
  MessageSquare as MessageSquareIcon,
} from 'lucide-vue-next';

const { t } = useI18n();
const toast = useToast();

const loading = ref(true);
const serverchanList = ref([]);
const modalOpen = ref(false);
const editingConfig = ref(null);
const testingId = ref(null);
const deleteDialog = ref({
  isOpen: false,
  configId: null,
});

// Fetch Server酱 configs
const fetchServerchan = async () => {
  loading.value = true;
  try {
    const response = await $fetch('/api/serverchan');
    serverchanList.value = response.data || [];
  } catch (error) {
    console.error('Failed to fetch Server酱 configs:', error);
    toast.error(t('serverchan.addError'));
  } finally {
    loading.value = false;
  }
};

// Parse JSON fields
const parseEventTypes = (json) => {
  if (Array.isArray(json)) return json;
  if (!json) return [];
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
};

// Mask SendKey for security
const maskSendKey = (sendKey) => {
  if (!sendKey || sendKey.length < 8) return '****';
  return sendKey.substring(0, 4) + '****' + sendKey.substring(sendKey.length - 4);
};

// Modal handlers
const openAddModal = () => {
  editingConfig.value = null;
  modalOpen.value = true;
};

const closeModal = () => {
  modalOpen.value = false;
  editingConfig.value = null;
};

const handleSave = async (configData) => {
  try {
    await $fetch('/api/serverchan', {
      method: 'POST',
      body: configData,
    });
    toast.success(t('serverchan.addSuccess'));
    closeModal();
    await fetchServerchan();
  } catch (error) {
    console.error('Failed to save Server酱:', error);
    toast.error(error.data?.message || t('serverchan.addError'));
  }
};

// Test Server酱
const testServerchan = async (id) => {
  testingId.value = id;
  try {
    const response = await $fetch(`/api/serverchan/${id}/test`, {
      method: 'POST',
    });
    if (response?.code === 0 && response?.data?.ok) {
      toast.success(t('serverchan.testSuccess'));
    } else {
      toast.error(response?.data?.error || response?.msg || t('serverchan.testFailed'));
    }
  } catch (error) {
    console.error('Failed to test Server酱:', error);
    toast.error(error?.data?.data?.error || error?.data?.msg || error?.message || t('serverchan.testFailed'));
  } finally {
    testingId.value = null;
  }
};

// Delete Server酱
const deleteServerchan = (id) => {
  deleteDialog.value = {
    isOpen: true,
    configId: id,
  };
};

const confirmDelete = async () => {
  const id = deleteDialog.value.configId;
  try {
    await $fetch(`/api/serverchan/${id}`, {
      method: 'DELETE',
    });
    toast.success(t('serverchan.deleteSuccess'));
    await fetchServerchan();
  } catch (error) {
    console.error('Failed to delete Server酱:', error);
    toast.error(t('serverchan.deleteError'));
  } finally {
    deleteDialog.value.isOpen = false;
    deleteDialog.value.configId = null;
  }
};

// Load configs on mount
onMounted(() => {
  fetchServerchan();
});
</script>
