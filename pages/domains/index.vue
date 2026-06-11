<template>
  <div class="flex min-h-full flex-col gap-4 md:h-full md:min-h-0 md:overflow-hidden">

    <!-- ─── PAGE HEADER ─────────────────────────────────────────────── -->
    <header class="shrink-0">
      <p class="eyebrow mb-2">{{ $t('domain.portfolio') }}</p>
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div class="min-w-0">
          <h1 class="headline-display text-3xl md:text-4xl">{{ $t('nav.domains') }}</h1>
          <p class="mt-2 min-h-5 text-sm text-text-secondary">
            <span class="font-medium text-text-main" data-numeric>{{ total }}</span>
            {{ $t('domain.totalSuffix') }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <NuxtLink to="/import" class="btn-ghost">
            <UploadCloudIcon class="h-4 w-4" />
            <span class="hidden sm:inline">{{ $t('nav.import') }}</span>
          </NuxtLink>
          <button @click="isAddModalOpen = true" class="btn-primary">
            <PlusIcon class="h-4 w-4" />
            <span class="hidden sm:inline">{{ $t('domain.addDomain') }}</span>
            <span class="sm:hidden">{{ $t('common.add') }}</span>
          </button>
        </div>
      </div>
    </header>

    <!-- ─── TOOLBAR — quick status tabs + search + saved filters ────── -->
    <div class="flex shrink-0 flex-col gap-3">
      <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <nav class="tab-bar min-w-0 overflow-x-auto no-scrollbar xl:flex-1">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            type="button"
            @click="setQuickStatus(tab.value)"
            :class="['tab-item', (criteria.status || 'ALL') === tab.value && 'is-active']"
          >
            {{ tab.label }}
          </button>
        </nav>

        <div class="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 xl:shrink-0 xl:justify-end">
          <div class="relative flex min-w-52 flex-1 items-center sm:max-w-sm xl:w-72 xl:flex-none">
            <SearchIcon class="pointer-events-none absolute left-0 h-4 w-4 text-text-tertiary" />
            <input
              v-model="criteria.search"
              type="text"
              :placeholder="$t('common.search')"
              class="input-bare pl-6"
            />
          </div>

          <Popover class="relative">
            <PopoverButton class="btn-ghost">
              <BookmarkIcon class="h-4 w-4" />
              <span>{{ $t('filter.savedFilters') }}</span>
              <ChevronDownIcon class="h-3 w-3" />
            </PopoverButton>
            <PopoverPanel
              class="surface absolute right-0 top-full z-30 mt-2 w-72 overflow-hidden p-2"
            >
              <div class="px-1 pb-2">
                <button
                  v-if="isAnyActive"
                  @click="openSaveDialog"
                  class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-accent transition-colors hover:bg-surface-sunken"
                >
                  <SaveIcon class="h-4 w-4" />
                  {{ $t('filter.saveCurrent') }}
                </button>
                <p v-else class="px-3 py-2 text-xs text-text-tertiary">
                  {{ $t('filter.saveCurrentHint') }}
                </p>
              </div>
              <div class="hairline my-1" />
              <div class="max-h-72 overflow-y-auto pt-1">
                <div v-if="!savedFilters.length" class="px-3 py-6 text-center text-xs text-text-tertiary">
                  {{ $t('filter.noSaved') }}
                </div>
                <div
                  v-for="f in savedFilters"
                  :key="f.id"
                  class="group flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-surface-sunken"
                >
                  <button class="flex flex-1 items-center gap-2 text-left" @click="loadFilter(f)">
                    <span class="truncate text-text-main">{{ f.name }}</span>
                    <span v-if="f.isDefault" class="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
                      {{ $t('filter.default') }}
                    </span>
                  </button>
                  <span class="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      @click.stop="setDefault(f)"
                      :title="$t('filter.setDefault')"
                      class="p-1 text-text-tertiary transition-colors hover:text-accent"
                    >
                      <StarIcon :class="['h-3.5 w-3.5', f.isDefault && 'fill-accent text-accent']" />
                    </button>
                    <button
                      @click.stop="deleteFilter(f)"
                      :title="$t('common.delete')"
                      class="p-1 text-text-tertiary transition-colors hover:text-status-dropping"
                    >
                      <Trash2Icon class="h-3.5 w-3.5" />
                    </button>
                  </span>
                </div>
              </div>
            </PopoverPanel>
          </Popover>
        </div>
      </div>
    </div>

    <!-- ─── ADVANCED FILTER PANEL ──────────────────────────────────── -->
    <FilterPanel class="shrink-0" v-model="criteria" :active-chips="activeChips" @reset="reset" />

    <!-- ─── RESULTS ────────────────────────────────────────────────── -->
    <div class="relative min-h-[26rem] flex-1 overflow-y-auto rounded-[18px] border border-hairline bg-card/45 p-2 pr-3 md:min-h-0 md:p-3 md:pr-4">
      <div v-if="total > 0 && loading && domains.length" class="absolute right-4 top-3 z-10 text-xs text-text-tertiary">
        {{ $t('common.loading') }}
      </div>

      <div v-if="loading && !domains.length" class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        <div v-for="i in 8" :key="i" class="h-48 animate-pulse rounded-2xl bg-surface-sunken" />
      </div>

      <div v-else-if="domains.length > 0" class="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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

      <div v-else class="flex min-h-[22rem] flex-col items-center justify-center text-center">
        <InboxIcon class="mb-4 h-8 w-8 text-text-tertiary" />
        <h3 class="headline-display text-2xl">{{ $t('domain.noDomains') }}</h3>
        <p class="mt-2 text-sm text-text-secondary">{{ $t('domain.noDomainsHint') }}</p>
      </div>
    </div>

    <!-- ─── PAGINATION ─────────────────────────────────────────────── -->
    <div v-if="total > 0" class="shrink-0 space-y-3">
      <div class="hairline" />
      <div class="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p class="text-text-secondary">
          {{ $t('filter.pageInfo', { start: pageStart, end: pageEnd, total, page, pages: totalPages }) }}
        </p>
        <div class="flex flex-wrap items-center gap-x-5 gap-y-2">
          <label class="flex items-center gap-2 text-text-secondary">
            <span class="text-xs uppercase tracking-[0.14em]">{{ $t('filter.pageSize') }}</span>
            <select v-model.number="limit" class="input-bare w-auto py-1 pr-1 text-sm">
              <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
            </select>
          </label>
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="btn-ghost px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="!canPrev"
              @click="page--"
            >
              <ChevronLeftIcon class="h-4 w-4" />
              <span>{{ $t('common.previous') }}</span>
            </button>
            <button
              type="button"
              class="btn-ghost px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="!canNext"
              @click="page++"
            >
              <span>{{ $t('common.next') }}</span>
              <ChevronRightIcon class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── MODALS ─────────────────────────────────────────────────── -->
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
      <div v-if="saveDialogOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm" @click.self="saveDialogOpen = false">
        <div class="surface-elevated w-full max-w-md p-8">
          <h3 class="headline-display text-2xl">{{ $t('filter.saveCurrent') }}</h3>
          <div class="mt-6 space-y-5">
            <input
              v-model="saveDialogName"
              type="text"
              :placeholder="$t('filter.namePlaceholder')"
              class="input-bare"
              @keydown.enter="performSave"
            />
            <label class="flex items-center gap-2 text-sm text-text-secondary">
              <input v-model="saveDialogDefault" type="checkbox" class="h-4 w-4 accent-accent" />
              {{ $t('filter.markAsDefault') }}
            </label>
          </div>
          <div class="mt-8 flex justify-end gap-3">
            <button @click="saveDialogOpen = false" class="btn-ghost">
              {{ $t('common.cancel') }}
            </button>
            <button
              @click="performSave"
              :disabled="!saveDialogName.trim()"
              class="btn-primary disabled:opacity-50"
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
} from '@lucide/vue';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/vue';
import { unwrapApiEnvelope } from '~/utils/api-envelope';

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

const apiQuery = computed(() => ({
  page: page.value,
  limit: limit.value,
  ...asApiQuery.value,
}));

const { data, pending: loading, refresh } = useLazyFetch('/api/domains', {
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
    const response = await $fetch(`/api/domains/${id}/refresh`, { method: 'POST' });
    unwrapApiEnvelope(response, t('domain.scanError'));
    toast.success(t('domain.scanSuccess'));
    await refresh();
  } catch (e) {
    toast.error(e?.message || e?.data?.msg || t('domain.scanError'));
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
    const response = await $fetch(`/api/domains/${id}`, { method: 'DELETE' });
    unwrapApiEnvelope(response, t('domain.deleteError'));
    toast.success(t('domain.deleteSuccess'));
    await refresh();
  } catch (e) {
    toast.error(e?.message || e?.data?.msg || t('domain.deleteError'));
  } finally {
    setPendingId(deletingIds, id, false);
  }
};

// ────────────────────────────────────────────────────────────────────────────
// Saved filters
// ────────────────────────────────────────────────────────────────────────────
const savedFilters = ref([]);
const saveDialogOpen = ref(false);
const saveDialogName = ref('');
const saveDialogDefault = ref(false);

const fetchSavedFilters = async () => {
  try {
    const resp = await $fetch('/api/filters', {
      query: { scope: 'domains' },
    });
    const data = unwrapApiEnvelope(resp, 'Failed to load saved filters');
    savedFilters.value = data?.items || [];
  } catch (e) {
    toast.error(e?.message || e?.data?.msg || 'Failed to load saved filters');
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
  toast.success(t('filter.loaded', { name: f.name }));
};

const openSaveDialog = () => {
  saveDialogOpen.value = true;
  saveDialogName.value = '';
  saveDialogDefault.value = false;
};

const performSave = async () => {
  const name = saveDialogName.value.trim();
  if (!name) return;
  try {
    const response = await $fetch('/api/filters', {
      method: 'POST',
      body: {
        name,
        scope: 'domains',
        criteria: criteria.value,
        isDefault: saveDialogDefault.value,
      },
    });
    unwrapApiEnvelope(response, t('filter.saveError'));
    toast.success(t('filter.saveSuccess'));
    saveDialogOpen.value = false;
    fetchSavedFilters();
  } catch (e) {
    toast.error(e?.message || e?.data?.msg || t('filter.saveError'));
  }
};

const setDefault = async (f) => {
  try {
    const response = await $fetch(`/api/filters/${f.id}`, {
      method: 'PATCH',
      body: { scope: 'domains', isDefault: !f.isDefault },
    });
    unwrapApiEnvelope(response, t('filter.updateError'));
    fetchSavedFilters();
  } catch (e) {
    toast.error(e?.message || e?.data?.msg || t('filter.updateError'));
  }
};

const deleteFilter = async (f) => {
  try {
    const response = await $fetch(`/api/filters/${f.id}`, { method: 'DELETE' });
    unwrapApiEnvelope(response, t('filter.deleteError'));
    toast.success(t('filter.deleteSuccess'));
    fetchSavedFilters();
  } catch (e) {
    toast.error(e?.message || e?.data?.msg || t('filter.deleteError'));
  }
};

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
