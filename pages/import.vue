<template>
  <div class="container mx-auto px-4 py-8 max-w-4xl">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-text-main mb-2">{{ $t('import.title') }}</h1>
      <p class="text-sm text-text-secondary">{{ $t('import.description') }}</p>
    </div>

    <!-- Export Section -->
    <div class="bg-card border border-card-border rounded-lg p-6 mb-6">
      <div class="flex items-start justify-between mb-4">
        <div>
          <h2 class="text-lg font-semibold text-text-main mb-2">{{ $t('import.export.title') }}</h2>
          <p class="text-sm text-text-secondary">{{ $t('import.export.description') }}</p>
        </div>
        <DownloadIcon class="w-6 h-6 text-accent" />
      </div>

      <button
        @click="exportDomains"
        :disabled="exporting"
        class="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
      >
        <DownloadIcon class="w-4 h-4" />
        {{ exporting ? $t('import.export.exporting') : $t('import.export.button') }}
      </button>
    </div>

    <!-- Import Section -->
    <div class="bg-card border border-card-border rounded-lg p-6">
      <div class="flex items-start justify-between mb-4">
        <div>
          <h2 class="text-lg font-semibold text-text-main mb-2">{{ $t('import.import.title') }}</h2>
          <p class="text-sm text-text-secondary">{{ $t('import.import.description') }}</p>
        </div>
        <UploadIcon class="w-6 h-6 text-accent" />
      </div>

      <!-- File Upload -->
      <div class="mb-4">
        <label
          class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-card-border rounded-lg cursor-pointer hover:bg-card-border/20 transition-colors"
          :class="{ 'border-accent bg-accent/5': dragOver }"
          @dragover.prevent="dragOver = true"
          @dragleave.prevent="dragOver = false"
          @drop.prevent="handleDrop"
        >
          <div class="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadCloudIcon class="w-10 h-10 mb-3 text-text-tertiary" />
            <p class="mb-2 text-sm text-text-secondary">
              <span class="font-semibold">{{ $t('import.import.clickToUpload') }}</span>
              {{ $t('import.import.orDragDrop') }}
            </p>
            <p class="text-xs text-text-tertiary">CSV ({{ $t('import.import.maxSize') }})</p>
          </div>
          <input
            type="file"
            class="hidden"
            accept=".csv"
            @change="handleFileSelect"
            ref="fileInput"
          />
        </label>
      </div>

      <!-- Selected File -->
      <div v-if="selectedFile" class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <FileTextIcon class="w-4 h-4 text-blue-600" />
            <span class="text-sm text-blue-800">{{ selectedFile.name }}</span>
            <span class="text-xs text-blue-600">({{ formatFileSize(selectedFile.size) }})</span>
          </div>
          <button
            @click="clearFile"
            class="text-blue-600 hover:text-blue-800"
          >
            <XIcon class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Import Options -->
      <div class="mb-4 space-y-3">
        <div class="flex items-center gap-2">
          <input
            v-model="importOptions.updateExisting"
            type="checkbox"
            id="update-existing"
            class="rounded border-card-border text-accent focus:ring-accent"
          />
          <label for="update-existing" class="text-sm text-text-main cursor-pointer">
            {{ $t('import.import.updateExisting') }}
          </label>
        </div>
      </div>

      <!-- Import Button -->
      <button
        @click="importDomains"
        :disabled="!selectedFile || importing"
        class="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <UploadIcon class="w-4 h-4" />
        {{ importing ? $t('import.import.importing') : $t('import.import.button') }}
      </button>

      <!-- Import Result -->
      <div v-if="importResult" class="mt-4 p-4 rounded-lg" :class="importResult.success > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'">
        <div class="flex items-start gap-2 mb-2">
          <CheckCircleIcon v-if="importResult.success > 0" class="w-5 h-5 text-green-600 mt-0.5" />
          <AlertCircleIcon v-else class="w-5 h-5 text-red-600 mt-0.5" />
          <div class="flex-1">
            <p class="text-sm font-medium" :class="importResult.success > 0 ? 'text-green-800' : 'text-red-800'">
              {{ $t('import.import.result', { success: importResult.success, failed: importResult.failed }) }}
            </p>

            <!-- Errors -->
            <div v-if="importResult.errors.length > 0" class="mt-2 space-y-1">
              <p class="text-xs font-medium text-red-700">{{ $t('import.import.errors') }}:</p>
              <div class="max-h-40 overflow-y-auto space-y-1">
                <div
                  v-for="(error, index) in importResult.errors"
                  :key="index"
                  class="text-xs text-red-600"
                >
                  Row {{ error.row }}: {{ error.domain }} - {{ error.error }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- CSV Format Guide -->
    <div class="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div class="flex items-start gap-2">
        <InfoIcon class="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div class="text-sm text-blue-800">
          <p class="font-medium mb-2">{{ $t('import.format.title') }}</p>
          <ul class="list-disc list-inside space-y-1 mb-3">
            <li>{{ $t('import.format.required') }}: Domain, Watch Kind, Priority</li>
            <li>{{ $t('import.format.watchKind') }}: OWNED, WANTED</li>
            <li>{{ $t('import.format.priority') }}: LOW, MEDIUM, HIGH</li>
            <li>{{ $t('import.format.tags') }}: {{ $t('import.format.tagsFormat') }}</li>
          </ul>
          <details class="cursor-pointer">
            <summary class="font-medium">{{ $t('import.format.example') }}</summary>
            <pre class="mt-2 p-2 bg-white rounded text-xs overflow-x-auto">{{ csvFormatExample }}</pre>
          </details>
        </div>
      </div>
    </div>

    <!-- Toast Notifications -->
    <Toast ref="toast" />
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
  Info as InfoIcon,
} from 'lucide-vue-next';

const { t } = useI18n();
const toast = ref(null);
const fileInput = ref(null);

const exporting = ref(false);
const importing = ref(false);
const dragOver = ref(false);
const selectedFile = ref(null);
const importResult = ref(null);

const importOptions = ref({
  updateExisting: true,
});

const csvFormatExample = `Domain,Watch Kind,Priority,Status,Expires At,Registrar,Group,Tags,Note,Is Active,Created At,Last Checked
example.com,OWNED,HIGH,REGISTERED,2027-01-01T00:00:00Z,GoDaddy,Production,web;important,"Main website",true,2026-01-01T00:00:00Z,2026-05-03T12:00:00Z
test.com,WANTED,MEDIUM,AVAILABLE,,,Development,test,,true,2026-02-01T00:00:00Z,`;

// Export domains
const exportDomains = async () => {
  exporting.value = true;
  try {
    const response = await fetch('/api/domains/export');

    if (!response.ok) {
      throw new Error('Export failed');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `domains-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.value?.show(t('import.export.success'), 'success');
  } catch (error) {
    console.error('Export failed:', error);
    toast.value?.show(t('import.export.error'), 'error');
  } finally {
    exporting.value = false;
  }
};

// Handle file selection
const handleFileSelect = (event) => {
  const file = event.target.files[0];
  if (file) {
    selectedFile.value = file;
    importResult.value = null;
  }
};

// Handle drag and drop
const handleDrop = (event) => {
  dragOver.value = false;
  const file = event.dataTransfer.files[0];
  if (file && file.name.endsWith('.csv')) {
    selectedFile.value = file;
    importResult.value = null;
  } else {
    toast.value?.show(t('import.import.invalidFile'), 'error');
  }
};

// Clear selected file
const clearFile = () => {
  selectedFile.value = null;
  importResult.value = null;
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

// Import domains
const importDomains = async () => {
  if (!selectedFile.value) return;

  importing.value = true;
  importResult.value = null;

  try {
    // Read file content
    const csvContent = await readFileContent(selectedFile.value);

    // Send to API
    const response = await $fetch('/api/domains/import', {
      method: 'POST',
      body: {
        csvContent,
        updateExisting: importOptions.value.updateExisting,
      },
    });

    if (response.success) {
      importResult.value = response.data;

      if (response.data.success > 0) {
        toast.value?.show(
          t('import.import.successMessage', { count: response.data.success }),
          'success'
        );
      }

      if (response.data.failed > 0) {
        toast.value?.show(
          t('import.import.failedMessage', { count: response.data.failed }),
          'warning'
        );
      }

      // Clear file after successful import
      if (response.data.failed === 0) {
        setTimeout(() => {
          clearFile();
        }, 3000);
      }
    }
  } catch (error) {
    console.error('Import failed:', error);
    toast.value?.show(error.data?.message || t('import.import.error'), 'error');
  } finally {
    importing.value = false;
  }
};

// Read file content
const readFileContent = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};

// Format file size
const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};
</script>
          <pre class="text-xs bg-white p-2 rounded border border-blue-200 overflow-x-auto">{{ csvFormatExample }}</pre>
          <ul class="mt-2 space-y-1 text-xs">
            <li>• {{ $t('import.format.rule1') }}</li>
            <li>• {{ $t('import.format.rule2') }}</li>
            <li>• {{ $t('import.format.rule3') }}</li>
            <li>• {{ $t('import.format.rule4') }}</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Toast Notifications -->
    <Toast ref="toast" />
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
  Info as InfoIcon,
} from 'lucide-vue-next';

const { t } = useI18n();
const toast = ref(null);
const fileInput = ref(null);

const exporting = ref(false);
const importing = ref(false);
const dragOver = ref(false);
const selectedFile = ref(null);
const importResult = ref(null);

const importOptions = ref({
  updateExisting: true,
});

const csvFormatExample = `Domain,Watch Kind,Priority,Status,Expires At,Registrar,Group,Tags,Note,Is Active,Created At,Last Checked
example.com,OWNED,HIGH,REGISTERED,2027-01-01T00:00:00Z,GoDaddy,Production,web;important,"Main website",true,2026-01-01T00:00:00Z,2026-05-03T12:00:00Z
test.com,WANTED,MEDIUM,AVAILABLE,,,Development,test,,true,2026-02-01T00:00:00Z,`;

// Export domains
const exportDomains = async () => {
  exporting.value = true;
  try {
    const response = await fetch('/api/domains/export');

    if (!response.ok) {
      throw new Error('Export failed');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `domains-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast.value?.show(t('import.export.success'), 'success');
  } catch (error) {
    console.error('Export failed:', error);
    toast.value?.show(t('import.export.error'), 'error');
  } finally {
    exporting.value = false;
  }
};

// Handle file selection
const handleFileSelect = (event) => {
  const file = event.target.files[0];
  if (file) {
    if (file.size > 5 * 1024 * 1024) {
      toast.value?.show(t('import.import.fileTooLarge'), 'error');
      return;
    }
    selectedFile.value = file;
    importResult.value = null;
  }
};

// Handle drag and drop
const handleDrop = (event) => {
  dragOver.value = false;
  const file = event.dataTransfer.files[0];
  if (file && file.name.endsWith('.csv')) {
    if (file.size > 5 * 1024 * 1024) {
      toast.value?.show(t('import.import.fileTooLarge'), 'error');
      return;
    }
    selectedFile.value = file;
    importResult.value = null;
  } else {
    toast.value?.show(t('import.import.invalidFile'), 'error');
  }
};

// Clear selected file
const clearFile = () => {
  selectedFile.value = null;
  importResult.value = null;
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

// Import domains
const importDomains = async () => {
  if (!selectedFile.value) return;

  importing.value = true;
  importResult.value = null;

  try {
    const csvContent = await selectedFile.value.text();

    const response = await $fetch('/api/domains/import', {
      method: 'POST',
      body: {
        csvContent,
        updateExisting: importOptions.value.updateExisting,
      },
    });

    importResult.value = response.data;

    if (response.data.success > 0) {
      toast.value?.show(
        t('import.import.successMessage', { count: response.data.success }),
        'success'
      );
    }

    if (response.data.failed > 0) {
      toast.value?.show(
        t('import.import.failedMessage', { count: response.data.failed }),
        'warning'
      );
    }
  } catch (error) {
    console.error('Import failed:', error);
    toast.value?.show(error.data?.message || t('import.import.error'), 'error');
  } finally {
    importing.value = false;
  }
};

// Format file size
const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};
</script>
