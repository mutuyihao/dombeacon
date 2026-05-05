<template>
  <div class="space-y-5">
    <!-- Toolbar -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <!-- Quick Status Tabs (shortcuts; live-synced with FilterPanel.status) -->
      <div class="flex p-1 bg-card border border-card-border rounded-xl overflow-x-auto max-w-full no-scrollbar">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          @click="setQuickStatus(tab.value)"
          :class="[
            'px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
            (criteria.status || 'ALL') === tab.value
              ? 'bg-background text-text-main shadow-sm'
              : 'text-text-secondary hover:text-text-main'
          ]"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Right side: search, saved filters, add -->
      <div class="flex w-full md:w-auto gap-2 flex-wrap md:flex-nowrap">
        <div class="relative flex-1 md:w-64">
          <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-weak" />
          <input
            v-model="criteria.search"
            type="text"
            :placeholder="$t('common.search')"
            class="w-full pl-9 pr-4 py-2 bg-card border border-card-border rounded-xl focus:outline-none focus:border-accent transition-colors text-sm"
          >
        </div>

        <!-- Saved Filters Dropdown -->
        <div class="relative">
          <button
            @click="savedOpen = !savedOpen"
            class="flex items-center gap-2 px-3 py-2 bg-card border border-card-border hover:border-accent rounded-xl text-sm font-medium transition-colors whitespace-nowrap"
          >
            <BookmarkIcon class="w-4 h-4 text-text-secondary" />
            <span>{{ $t('filter.savedFilters') }}</span>
            <ChevronDownIcon class="w-3 h-3 text-text-secondary" />
          </button>
          <div
            v-if="savedOpen"
            v-on-click-outside="() => savedOpen = false"
            class="absolute right-0 top-full mt-1 w-72 bg-card border border-card-border rounded-xl shadow-lg z-30 overflow-hidden"
          >
            <div class="p-2 border-b border-card-border">
              <button
                v-if="isAnyActive"
                @click="openSaveDialog"
                class="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-accent hover:bg-card-border/30 transition-colors"
              >
                <SaveIcon class="w-4 h-4" />
                {{ $t('filter.saveCurrent') }}
              </button>
              <p v-else class="px-3 py-2 text-xs text-text-secondary">
                {{ $t('filter.saveCurrentHint') }}
              </p>
            </div>
            <div class="max-h-72 overflow-y-auto">
              <div v-if="!savedFilters.length" class="px-3 py-6 text-center text-xs text-text-secondary">
                {{ $t('filter.noSaved') }}
              </div>
              <button
                v-for="f in savedFilters"
                :key="f.id"
                class="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-card-border/30 transition-colors group"
              >
                <span class="flex items-center gap-2 flex-1 text-left" @click="loadFilter(f)">
                  <span class="truncate">{{ f.name }}</span>
                  <span v-if="f.isDefault" class="px-1.5 py-0.5 text-[10px] bg-accent/10 text-accent rounded">
                    {{ $t('filter.default') }}
                  </span>
                </span>
                <span class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    @click.stop="setDefault(f)"
                    :title="$t('filter.setDefault')"
                    class="p-1 text-text-secondary hover:text-accent"
                  >
                    <StarIcon class="w-3.5 h-3.5" :class="{ 'fill-accent text-accent': f.isDefault }" />
                  </button>
                  <button
                    @click.stop="deleteFilter(f)"
                    :title="$t('common.delete')"
                    class="p-1 text-text-secondary hover:text-status-dropping"
                  >
                    <Trash2Icon class="w-3.5 h-3.5" />
                  </button>
                </span>
              </button>
            </div>
          </div>
        </div>

        <button
          @click="isAddModalOpen = true"
          class="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl shadow-sm text-sm font-medium transition-all active:scale-95"
        >
          <PlusIcon class="w-4 h-4" />
          <span class="hidden sm:inline">{{ $t('domain.addDomain') }}</span>
          <span class="sm:hidden">{{ $t('common.add') }}</span>
        </button>

        <NuxtLink
          to="/data/import"
          class="flex items-center gap-2 px-4 py-2 bg-card border border-card-border hover:border-accent rounded-xl text-sm font-medium transition-colors whitespace-nowrap"
        >
          <UploadCloudIcon class="w-4 h-4 text-text-secondary" />
          <span class="hidden sm:inline">{{ $t('nav.import') }}</span>
          <span class="sm:hidden">{{ $t('common.import') }}</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Advanced filter panel -->
    <FilterPanel
      v-model="criteria"
      :active-chips="activeChips"
      @reset="reset"
    />

    <!-- Result count -->
    <div v-if="total > 0" class="flex flex-col gap-2 text-xs text-text-secondary sm:flex-row sm:items-center sm:justify-between">
      <span>{{ $t('filter.totalCount', { count: total }) }}</span>
      <span v-if="loading && domains.length">{{ $t('common.loading') }}</span>
    </div>

    <!-- Grid -->
    <div v-if="loading && !domains.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <div v-for="i in 8" :key="i" class="h-40 bg-card/50 rounded-2xl animate-pulse" />
    </div>

    <div v-else-if="domains.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <DomainCard
        v-for="domain in domains"
        :key="domain.id"
        :domain="domain"
        :refreshing="isRefreshing(domain.id)"
        :deleting="isDeleting(domain.id)"
        @refresh="refreshDomain"
        @delete="deleteDomain"
      />
    </div>

    <div v-else class="text-center py-20">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-card mb-4">
        <InboxIcon class="w-8 h-8 text-text-weak" />
      </div>
      <h3 class="text-lg font-medium text-text-main">{{ $t('domain.noDomains') }}</h3>
      <p class="text-text-secondary mt-1">{{ $t('domain.noDomainsHint') }}</p>
    </div>

    <!-- Pagination -->
    <div
      v-if="total > 0"
      class="flex flex-col gap-3 rounded-2xl border border-card-border bg-card px-4 py-3 text-sm shadow-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="text-text-secondary">
        {{ $t('filter.pageInfo', { start: pageStart, end: pageEnd, total, page, pages: totalPages }) }}
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <label class="flex items-center gap-2 text-text-secondary">
          <span>{{ $t('filter.pageSize') }}</span>
          <select
            v-model.number="limit"
            class="rounded-lg border border-card-border bg-background px-2 py-1 text-text-main focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
          </select>
        </label>

        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-lg border border-card-border bg-background px-3 py-1.5 font-medium text-text-main transition-colors hover:border-accent/40 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!canPrev"
          @click="page--"
        >
          <ChevronLeftIcon class="h-4 w-4" />
          {{ $t('common.previous') }}
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-lg border border-card-border bg-background px-3 py-1.5 font-medium text-text-main transition-colors hover:border-accent/40 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!canNext"
          @click="page++"
        >
          {{ $t('common.next') }}
          <ChevronRightIcon class="h-4 w-4" />
        </button>
      </div>
    </div>

    <!-- Modals -->
    <AddDomainModal :is-open="isAddModalOpen" @close="isAddModalOpen = false" @saved="refresh" />
    <ConfirmDialog
      :is-open="confirmDialog.isOpen"
      :title="$t('domain.deleteDomain')"
      :message="$t('domain.confirmDelete')"
      :confirm-text="$t('common.delete')"
      :cancel-text="$t('common.cancel')"
      variant="danger"
      @confirm="confirmDelete"
      @cancel="confirmDialog.isOpen = false"
    />

    <!-- Save filter dialog -->
    <Teleport to="body">
      <div v-if="saveDialogOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="saveDialogOpen = false">
        <div class="bg-card border border-card-border rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
          <h3 class="text-lg font-semibold text-text-main">{{ $t('filter.saveCurrent') }}</h3>
          <input
            v-model="saveDialogName"
            type="text"
            :placeholder="$t('filter.namePlaceholder')"
            class="w-full px-3 py-2 border border-card-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-accent/50"
            @keydown.enter="performSave"
          />
          <label class="flex items-center gap-2 text-sm">
            <input v-model="saveDialogDefault" type="checkbox" class="w-4 h-4 text-accent" />
            {{ $t('filter.markAsDefault') }}
          </label>
          <div class="flex justify-end gap-2 pt-2">
            <button
              @click="saveDialogOpen = false"
              class="px-4 py-2 rounded-xl border border-card-border text-sm hover:bg-card-border/30 transition-colors"
            >
              {{ $t('common.cancel') }}
            </button>
            <button
              @click="performSave"
              :disabled="!saveDialogName.trim()"
              class="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm disabled:opacity-50"
            >
              {{ $t('common.save') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import {
  Search as SearchIcon,
  Plus as PlusIcon,
  Inbox as InboxIcon,
  Bookmark as BookmarkIcon,
  ChevronDown as ChevronDownIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  UploadCloud as UploadCloudIcon,
  Save as SaveIcon,
  Star as StarIcon,
  Trash2 as Trash2Icon,
} from 'lucide-vue-next';

const { t } = useI18n();
const toast = useToast();
const { criteria, activeChips, isAnyActive, asApiQuery, apply, reset } = useFilterState();

const tabs = computed(() => [
  { label: t('common.all'), value: 'ALL' },
  { label: t('domain.status.available'), value: 'AVAILABLE' },
  { label: t('domain.status.registered'), value: 'REGISTERED' },
  { label: t('domain.status.expiring'), value: 'EXPIRING' },
  { label: t('domain.status.pending_delete'), value: 'PENDING_DELETE' },
]);

const setQuickStatus = (s) => {
  criteria.value.status = s === 'ALL' ? '' : s;
};

const isAddModalOpen = ref(false);
const confirmDialog = ref({ isOpen: false, domainId: null });
const page = ref(1);
const limit = ref(50);
const pageSizeOptions = [24, 50, 100];
const refreshingIds = ref(new Set());
const deletingIds = ref(new Set());

// Build query reactively from criteria + page
const apiQuery = computed(() => ({
  page: page.value,
  limit: limit.value,
  ...asApiQuery.value,
}));

const { data, pending: loading, refresh } = await useFetch('/api/domains', {
  query: apiQuery,
  watch: [apiQuery],
});

const domains = computed(() => data.value?.data?.items || []);
const total = computed(() => data.value?.data?.total || 0);
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)));
const pageStart = computed(() => (total.value === 0 ? 0 : (page.value - 1) * limit.value + 1));
const pageEnd = computed(() => Math.min(total.value, page.value * limit.value));
const canPrev = computed(() => page.value > 1);
const canNext = computed(() => page.value < totalPages.value);

// Reset page to 1 when criteria changes
watch(
  [() => JSON.stringify(criteria.value), limit],
  () => {
    page.value = 1;
  },
);

watch(totalPages, (pages) => {
  if (page.value > pages) {
    page.value = pages;
  }
});

const setPendingId = (bucket, id, pending) => {
  const next = new Set(bucket.value);
  if (pending) next.add(id);
  else next.delete(id);
  bucket.value = next;
};

const isRefreshing = (id) => refreshingIds.value.has(id);
const isDeleting = (id) => deletingIds.value.has(id);

const refreshDomain = async (id) => {
  if (isRefreshing(id)) return;
  setPendingId(refreshingIds, id, true);
  try {
    await $fetch(`/api/domains/${id}/refresh`, { method: 'POST' });
    toast.success(t('domain.scanSuccess'));
    await refresh();
  } catch (e) {
    toast.error(t('domain.scanError'));
  } finally {
    setPendingId(refreshingIds, id, false);
  }
};

const deleteDomain = (id) => {
  confirmDialog.value = { isOpen: true, domainId: id };
};

const confirmDelete = async () => {
  const id = confirmDialog.value.domainId;
  confirmDialog.value.isOpen = false;
  if (!id || isDeleting(id)) return;
  setPendingId(deletingIds, id, true);
  try {
    await $fetch(`/api/domains/${id}`, { method: 'DELETE' });
    toast.success(t('domain.deleteSuccess'));
    await refresh();
  } catch (e) {
    toast.error(t('domain.deleteError'));
  } finally {
    setPendingId(deletingIds, id, false);
  }
};

// ────────────────────────────────────────────────────────────────────────────
// Saved filters
// ────────────────────────────────────────────────────────────────────────────
const savedOpen = ref(false);
const savedFilters = ref([]);
const saveDialogOpen = ref(false);
const saveDialogName = ref('');
const saveDialogDefault = ref(false);

const fetchSavedFilters = async () => {
  try {
    const resp = await $fetch('/api/filters');
    savedFilters.value = resp.data?.items || [];
  } catch (e) {
    console.error('Failed to load saved filters:', e);
  }
};

const loadFilter = (f) => {
  apply({
    search: '',
    status: '',
    watchKind: '',
    priority: '',
    groupName: '',
    tags: [],
    sslState: '',
    expiringDays: null,
    ...f.criteria,
  });
  savedOpen.value = false;
  toast.success(t('filter.loaded', { name: f.name }));
};

const openSaveDialog = () => {
  saveDialogOpen.value = true;
  saveDialogName.value = '';
  saveDialogDefault.value = false;
  savedOpen.value = false;
};

const performSave = async () => {
  const name = saveDialogName.value.trim();
  if (!name) return;
  try {
    await $fetch('/api/filters', {
      method: 'POST',
      body: {
        name,
        criteria: criteria.value,
        isDefault: saveDialogDefault.value,
      },
    });
    toast.success(t('filter.saveSuccess'));
    saveDialogOpen.value = false;
    fetchSavedFilters();
  } catch (e) {
    toast.error(e.data?.msg || t('filter.saveError'));
  }
};

const setDefault = async (f) => {
  try {
    await $fetch(`/api/filters/${f.id}`, {
      method: 'PATCH',
      body: { isDefault: !f.isDefault },
    });
    fetchSavedFilters();
  } catch (e) {
    toast.error(e.data?.msg || t('filter.updateError'));
  }
};

const deleteFilter = async (f) => {
  try {
    await $fetch(`/api/filters/${f.id}`, { method: 'DELETE' });
    toast.success(t('filter.deleteSuccess'));
    fetchSavedFilters();
  } catch (e) {
    toast.error(e.data?.msg || t('filter.deleteError'));
  }
};

// Click-outside helper for the saved-filters dropdown.
// Registered as a Vue directive.
const vOnClickOutside = {
  mounted(el, binding) {
    el._clickOutside = (e) => {
      if (!el.contains(e.target)) binding.value(e);
    };
    setTimeout(() => document.addEventListener('click', el._clickOutside), 0);
  },
  unmounted(el) {
    if (el._clickOutside) document.removeEventListener('click', el._clickOutside);
  },
};

// Auto-apply default filter on first load if URL has no criteria
const route = useRoute();
onMounted(async () => {
  await fetchSavedFilters();
  const noQuery = Object.keys(route.query).length === 0;
  if (noQuery) {
    const def = savedFilters.value.find((f) => f.isDefault);
    if (def) loadFilter(def);
  }
});
</script>
