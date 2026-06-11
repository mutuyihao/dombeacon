<template>
  <div class="mx-auto flex min-h-full w-full max-w-4xl flex-col gap-6 md:h-full md:min-h-0 md:overflow-hidden">

    <header class="shrink-0">
      <p class="eyebrow mb-2">Data</p>
      <h1 class="headline-display text-3xl md:text-4xl">{{ $t('import.title') }}</h1>
      <p class="mt-2 max-w-2xl text-sm text-text-secondary">{{ $t('import.description') }}</p>
    </header>

    <!-- ─── EXPORT ──────────────────────────────────────────────────── -->
    <div class="min-h-0 flex-1 space-y-12 overflow-y-auto pr-2">
    <section>
      <p class="eyebrow mb-3">Export</p>
      <h2 class="headline-display text-2xl">{{ $t('import.export.title') }}</h2>
      <p class="mt-2 max-w-2xl text-sm text-text-secondary">{{ $t('import.export.description') }}</p>
      <div class="hairline mt-6" />

      <div class="pt-6">
        <button @click="exportDomains" :disabled="exporting" class="btn-primary disabled:opacity-50">
          <DownloadIcon class="h-4 w-4" />
          {{ exporting ? $t('import.export.exporting') : $t('import.export.button') }}
        </button>
      </div>
    </section>

    <!-- ─── IMPORT ──────────────────────────────────────────────────── -->
    <section>
      <p class="eyebrow mb-3">Import</p>
      <h2 class="headline-display text-2xl">{{ $t('import.import.title') }}</h2>
      <p class="mt-2 max-w-2xl text-sm text-text-secondary">{{ $t('import.import.description') }}</p>
      <div class="hairline mt-6" />

      <div class="pt-6">
        <label
          :class="[
            'flex h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed transition-colors',
            dragOver ? 'border-accent bg-accent/5' : 'border-hairline-strong hover:bg-surface-sunken',
          ]"
          @dragover.prevent="dragOver = true"
          @dragleave.prevent="dragOver = false"
          @drop.prevent="handleDrop"
        >
          <UploadCloudIcon class="mb-3 h-7 w-7 text-text-tertiary" />
          <p class="text-sm text-text-secondary">
            <span class="font-medium text-text-main">{{ $t('import.import.clickToUpload') }}</span>
            {{ $t('import.import.orDragDrop') }}
          </p>
          <p class="mt-1 font-mono text-[11px] text-text-tertiary">CSV · {{ $t('import.import.maxSize') }}</p>
          <input type="file" class="hidden" accept=".csv" @change="handleFileSelect" ref="fileInput" />
        </label>

        <div v-if="selectedFile" class="surface-flat mt-4 flex items-center justify-between gap-3 p-4">
          <div class="flex min-w-0 items-center gap-2">
            <FileTextIcon class="h-4 w-4 shrink-0 text-accent" />
            <span class="truncate font-mono text-sm text-text-main">{{ selectedFile.name }}</span>
            <span class="font-mono text-xs text-text-tertiary">{{ formatFileSize(selectedFile.size) }}</span>
          </div>
          <button @click="clearFile" class="rounded-full p-1.5 text-text-tertiary transition-colors hover:bg-card hover:text-status-dropping">
            <XIcon class="h-3.5 w-3.5" />
          </button>
        </div>

        <label class="mt-6 flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
          <input v-model="importOptions.updateExisting" type="checkbox" class="h-4 w-4 accent-accent" />
          {{ $t('import.import.updateExisting') }}
        </label>

        <div class="mt-6">
          <button @click="importDomains" :disabled="!selectedFile || importing" class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
            <UploadIcon class="h-4 w-4" />
            {{ importing ? $t('import.import.importing') : $t('import.import.button') }}
          </button>
        </div>

        <div v-if="importResult" class="surface-flat mt-6 p-4">
          <div class="flex items-start gap-3">
            <CheckCircleIcon v-if="importResult.success > 0" class="mt-0.5 h-4 w-4 shrink-0 text-status-available" />
            <AlertCircleIcon v-else class="mt-0.5 h-4 w-4 shrink-0 text-status-dropping" />
            <div class="flex-1">
              <p :class="['text-sm font-medium', importResult.success > 0 ? 'text-status-available' : 'text-status-dropping']">
                {{ $t('import.import.result', { success: importResult.success, failed: importResult.failed }) }}
              </p>
              <div v-if="importResult.errors.length > 0" class="mt-3 space-y-1">
                <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-status-dropping">{{ $t('import.import.errors') }}</p>
                <div class="max-h-40 space-y-1 overflow-y-auto">
                  <p v-for="(error, index) in importResult.errors" :key="index" class="font-mono text-xs text-status-dropping">
                    Row {{ error.row }}: {{ error.domain }} — {{ error.error }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── FORMAT GUIDE ────────────────────────────────────────────── -->
    <section>
      <p class="eyebrow mb-3">Reference</p>
      <h2 class="headline-display text-2xl">{{ $t('import.format.title') }}</h2>
      <div class="hairline mt-6" />

      <ul class="mt-6 space-y-2 text-sm text-text-secondary">
        <li class="flex items-start gap-3">
          <span class="mt-2 h-1 w-1 shrink-0 rounded-full bg-text-tertiary" />
          <span><span class="font-medium text-text-main">{{ $t('import.format.required') }}:</span> Domain, Watch Kind, Priority</span>
        </li>
        <li class="flex items-start gap-3">
          <span class="mt-2 h-1 w-1 shrink-0 rounded-full bg-text-tertiary" />
          <span><span class="font-medium text-text-main">{{ $t('import.format.watchKind') }}:</span> <code class="font-mono">OWNED</code>, <code class="font-mono">WANTED</code></span>
        </li>
        <li class="flex items-start gap-3">
          <span class="mt-2 h-1 w-1 shrink-0 rounded-full bg-text-tertiary" />
          <span><span class="font-medium text-text-main">{{ $t('import.format.priority') }}:</span> <code class="font-mono">LOW</code>, <code class="font-mono">MEDIUM</code>, <code class="font-mono">HIGH</code></span>
        </li>
        <li class="flex items-start gap-3">
          <span class="mt-2 h-1 w-1 shrink-0 rounded-full bg-text-tertiary" />
          <span><span class="font-medium text-text-main">{{ $t('import.format.tags') }}:</span> {{ $t('import.format.tagsFormat') }}</span>
        </li>
      </ul>

      <details class="group mt-6 cursor-pointer">
        <summary class="btn-text list-none">
          <span>{{ $t('import.format.example') }}</span>
          <ChevronDownIcon class="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
        </summary>
        <pre class="surface-flat mt-3 overflow-x-auto p-4 font-mono text-xs leading-5 text-text-secondary">{{ csvFormatExample }}</pre>
      </details>
    </section>
    </div>

  </div>
</template>

<script setup>
import {
  Download as DownloadIcon,
  Upload as UploadIcon,
  UploadCloud as UploadCloudIcon,
  FileText as FileTextIcon,
  X as XIcon,
  CheckCircle as CheckCircleIcon,
  AlertCircle as AlertCircleIcon,
  ChevronDown as ChevronDownIcon,
} from '@lucide/vue';
import { unwrapApiEnvelope } from '~/utils/api-envelope';

const { t } = useI18n();
const toast = useToast();
const fileInput = ref(null);

const exporting = ref(false);
const importing = ref(false);
const dragOver = ref(false);
const selectedFile = ref(null);
const importResult = ref(null);
const MAX_CSV_BYTES = 10 * 1024 * 1024;

const importOptions = ref({
  updateExisting: true,
});

const csvFormatExample = `Domain,Watch Kind,Priority,Status,Expires At,Registrar,Group,Tags,Note,Is Active,Created At,Last Checked
example.com,OWNED,HIGH,REGISTERED,2027-01-01T00:00:00Z,GoDaddy,Production,web;important,"Main website",true,2026-01-01T00:00:00Z,2026-05-03T12:00:00Z
test.com,WANTED,MEDIUM,AVAILABLE,,,Development,test,,true,2026-02-01T00:00:00Z,`;

const exportDomains = async () => {
  exporting.value = true;
  try {
    const response = await fetch('/api/domains/export');
    if (!response.ok) throw new Error('Export failed');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `domains-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success(t('import.export.success'));
  } catch (error) {
    toast.error(error?.message || t('import.export.error'));
  } finally {
    exporting.value = false;
  }
};

const isCsvFile = (file) => file?.name?.toLowerCase().endsWith('.csv');

const setSelectedFile = (file) => {
  if (!isCsvFile(file)) {
    toast.error(t('import.import.invalidFile'));
    return false;
  }
  if (file.size > MAX_CSV_BYTES) {
    toast.error(t('import.import.fileTooLarge'));
    return false;
  }
  selectedFile.value = file;
  importResult.value = null;
  return true;
};

const handleFileSelect = (event) => {
  const file = event.target.files?.[0];
  if (file && !setSelectedFile(file)) {
    event.target.value = '';
  }
};

const handleDrop = (event) => {
  dragOver.value = false;
  const file = event.dataTransfer.files?.[0];
  if (file) setSelectedFile(file);
};

const clearFile = () => {
  selectedFile.value = null;
  importResult.value = null;
  if (fileInput.value) fileInput.value.value = '';
};

const importDomains = async () => {
  if (!selectedFile.value) return;

  importing.value = true;
  importResult.value = null;

  try {
    const csvContent = await readFileContent(selectedFile.value);
    const response = await $fetch('/api/domains/import', {
      method: 'POST',
      body: { csvContent, updateExisting: importOptions.value.updateExisting },
    });

    const result = unwrapApiEnvelope(response, t('import.import.error'));
    importResult.value = result;

    if (result.success > 0) {
      toast.success(t('import.import.successMessage', { count: result.success }));
    }
    if (result.failed > 0) {
      toast.warning(t('import.import.failedMessage', { count: result.failed }));
    }
    if (result.failed === 0) {
      setTimeout(clearFile, 3000);
    }
  } catch (error) {
    toast.error(error?.message || error?.data?.msg || t('import.import.error'));
  } finally {
    importing.value = false;
  }
};

const readFileContent = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};
</script>
