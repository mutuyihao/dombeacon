<template>
  <div class="flex min-h-full flex-col gap-6 md:h-full md:min-h-0 md:overflow-hidden">
    <header class="shrink-0">
      <p class="eyebrow mb-2">Security queue</p>
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="headline-display text-3xl md:text-4xl">Security Findings</h1>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
            Triage DNS posture and registrar-lock findings across monitored owned domains.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <NuxtLink to="/ops/security" class="btn-ghost">
            Dashboard
            <ArrowRightIcon class="h-3.5 w-3.5" />
          </NuxtLink>
          <button
            type="button"
            class="btn-primary disabled:opacity-50"
            :disabled="pending || refreshing"
            @click="refreshFindings"
          >
            <RefreshCwIcon :class="['h-4 w-4', (pending || refreshing) && 'animate-spin']" />
            Refresh
          </button>
        </div>
      </div>
    </header>

    <section class="surface-flat shrink-0 p-4">
      <div class="grid gap-3 md:grid-cols-5">
        <label class="block">
          <span class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Status</span>
          <select v-model="filters.status" class="input-bare">
            <option value="">All statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="SNOOZED">SNOOZED</option>
            <option value="DISMISSED">DISMISSED</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>
        </label>
        <label class="block">
          <span class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Severity</span>
          <select v-model="filters.severity" class="input-bare">
            <option value="">All severities</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
        </label>
        <label class="block md:col-span-2">
          <span class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Finding Type</span>
          <select v-model="filters.findingType" class="input-bare font-mono">
            <option value="">All finding types</option>
            <option value="REGISTRAR_LOCK_MISSING">REGISTRAR_LOCK_MISSING</option>
            <option value="NAMESERVER_DRIFT,MX_DRIFT">DNS drift</option>
            <option value="NAMESERVER_DRIFT">NAMESERVER_DRIFT</option>
            <option value="MX_DRIFT">MX_DRIFT</option>
            <option value="DMARC_MISSING">DMARC_MISSING</option>
            <option value="DMARC_WEAK_POLICY">DMARC_WEAK_POLICY</option>
            <option value="CAA_MISSING">CAA_MISSING</option>
            <option value="DNSSEC_UNSIGNED">DNSSEC_UNSIGNED</option>
          </select>
        </label>
        <label class="block">
          <span class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Domain ID</span>
          <input v-model.trim="filters.domainId" type="number" min="1" class="input-bare font-mono" placeholder="Any" />
        </label>
      </div>

      <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap gap-2">
          <span
            v-for="badge in activeFilterBadges"
            :key="badge"
            class="rounded-full bg-surface-sunken px-3 py-1 font-mono text-[11px] text-text-secondary"
          >
            {{ badge }}
          </span>
          <span v-if="!activeFilterBadges.length" class="text-xs text-text-tertiary">No filters applied.</span>
        </div>
        <div class="flex gap-2">
          <div class="relative">
            <button type="button" class="btn-ghost" @click="savedViewsOpen = !savedViewsOpen">
              <BookmarkIcon class="h-4 w-4" />
              <span>Views</span>
              <ChevronDownIcon class="h-3 w-3" />
            </button>
            <div
              v-if="savedViewsOpen"
              v-on-click-outside="() => savedViewsOpen = false"
              class="surface absolute right-0 top-full z-30 mt-2 w-80 overflow-hidden p-2"
            >
              <div class="px-1 pb-2">
                <button
                  v-if="hasActiveFilters"
                  type="button"
                  class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-accent transition-colors hover:bg-surface-sunken"
                  @click="openSaveFindingViewDialog"
                >
                  <SaveIcon class="h-4 w-4" />
                  Save current view
                </button>
                <p v-else class="px-3 py-2 text-xs text-text-tertiary">
                  Add at least one filter before saving a triage view.
                </p>
              </div>
              <div class="hairline my-1" />
              <div class="max-h-72 overflow-y-auto pt-1">
                <div v-if="!savedFindingViews.length" class="px-3 py-6 text-center text-xs text-text-tertiary">
                  No saved triage views yet.
                </div>
                <div
                  v-for="view in savedFindingViews"
                  :key="view.id"
                  class="group flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-surface-sunken"
                >
                  <button class="min-w-0 flex-1 text-left" type="button" @click="applySavedFindingView(view)">
                    <span class="block truncate text-text-main">{{ view.name }}</span>
                    <span v-if="view.isDefault" class="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
                      Default
                    </span>
                  </button>
                  <button
                    type="button"
                    class="rounded p-1 text-text-tertiary hover:text-accent"
                    :title="view.isDefault ? 'Unset default' : 'Set default'"
                    @click.stop="setDefaultFindingView(view)"
                  >
                    <StarIcon class="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    class="rounded p-1 text-text-tertiary hover:text-status-dropping"
                    title="Delete view"
                    @click.stop="deleteFindingView(view)"
                  >
                    <TrashIcon class="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          <button type="button" class="btn-ghost" @click="clearFilters">Clear</button>
          <button type="button" class="btn-primary" @click="applyFilters">Apply filters</button>
        </div>
      </div>
    </section>

    <section class="min-h-0 flex-1 overflow-y-auto rounded-[18px] border border-hairline bg-card/45 p-4">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="eyebrow mb-2">Queue</p>
          <h2 class="headline-display text-2xl">{{ findings.length }} findings</h2>
          <p v-if="findings.length" class="mt-1 text-xs text-text-tertiary">
            Shortcuts: J/K move, X select, R reopen, S snooze, D dismiss, E resolve.
          </p>
        </div>
        <div class="flex flex-wrap items-center justify-end gap-2">
          <label
            v-if="findings.length"
            class="flex cursor-pointer items-center gap-2 rounded-full border border-hairline bg-card px-3 py-1.5 text-xs text-text-secondary"
          >
            <input
              type="checkbox"
              class="h-4 w-4 accent-accent"
              :checked="allVisibleSelected"
              @change="toggleVisibleSelection"
            />
            Select visible
          </label>
          <span
            v-if="selectedCount"
            class="rounded-full bg-surface-sunken px-3 py-1.5 font-mono text-[11px] text-text-secondary"
          >
            {{ selectedCount }} selected
          </span>
          <button
            v-if="selectedCount"
            type="button"
            class="btn-ghost px-3 py-1.5 text-xs disabled:opacity-50"
            :disabled="bulkUpdating"
            @click="bulkUpdateFindingStatus('OPEN')"
          >
            Reopen
          </button>
          <button
            v-if="selectedCount"
            type="button"
            class="btn-ghost px-3 py-1.5 text-xs disabled:opacity-50"
            :disabled="bulkUpdating"
            @click="bulkSnoozeFindings"
          >
            Snooze 7d
          </button>
          <button
            v-if="selectedCount"
            type="button"
            class="btn-ghost px-3 py-1.5 text-xs disabled:opacity-50"
            :disabled="bulkUpdating"
            @click="bulkUpdateFindingStatus('DISMISSED')"
          >
            Dismiss
          </button>
          <button
            v-if="selectedCount"
            type="button"
            class="btn-primary px-3 py-1.5 text-xs disabled:opacity-50"
            :disabled="bulkUpdating"
            @click="bulkUpdateFindingStatus('RESOLVED')"
          >
            {{ bulkUpdating ? 'Updating...' : 'Resolve' }}
          </button>
          <button
            v-if="selectedCount"
            type="button"
            class="btn-text text-xs"
            :disabled="bulkUpdating"
            @click="clearSelection"
          >
            Clear selection
          </button>
          <NuxtLink to="/ops/security?focus=findings" class="btn-text text-xs">
            Back to risk summary
            <ArrowRightIcon class="h-3.5 w-3.5" />
          </NuxtLink>
        </div>
      </div>

      <div v-if="pending && !findings.length" class="space-y-3">
        <div v-for="i in 6" :key="i" class="h-24 animate-pulse rounded-2xl bg-surface-sunken" />
      </div>

      <div v-else-if="findings.length" class="space-y-3">
        <article
          v-for="finding in findings"
          :key="finding.id"
          :class="[
            'surface group p-5 transition-colors',
            isActiveFinding(finding.id) && 'ring-2 ring-accent/50 bg-accent/5',
          ]"
          :aria-current="isActiveFinding(finding.id) ? 'true' : undefined"
          :data-finding-id="finding.id"
          tabindex="0"
          @focusin="setActiveFinding(finding.id)"
          @mouseenter="setActiveFinding(finding.id)"
        >
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="flex min-w-0 flex-1 gap-3">
              <label class="mt-0.5 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-hairline bg-card">
                <input
                  type="checkbox"
                  class="h-4 w-4 accent-accent"
                  :checked="isFindingSelected(finding.id)"
                  @change="toggleFindingSelection(finding.id)"
                />
              </label>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span :class="['rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]', severityBadgeClass(finding.severity)]">
                    {{ finding.severity }}
                  </span>
                  <span class="rounded-full bg-surface-sunken px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
                    {{ finding.status }}
                  </span>
                  <span v-if="finding.snoozedUntil" class="font-mono text-[11px] text-text-tertiary">
                    snoozed until {{ formatDate(finding.snoozedUntil) }}
                  </span>
                </div>

                <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h3 class="text-sm font-semibold text-text-main">{{ findingTitle(finding.findingType) }}</h3>
                  <NuxtLink
                    v-if="finding.domain?.id"
                    :to="`/domains/${finding.domain.id}`"
                    class="font-mono text-xs text-accent transition-colors hover:text-accent-hover"
                  >
                    {{ finding.domain.domain || `#${finding.domain.id}` }}
                  </NuxtLink>
                </div>

                <p class="mt-2 break-words font-mono text-xs leading-5 text-text-secondary">
                  {{ findingEvidenceText(finding) }}
                </p>
                <p class="mt-2 font-mono text-[11px] text-text-tertiary">
                  First seen {{ formatDate(finding.firstSeenAt) }} - Last seen {{ formatDate(finding.lastSeenAt) }}
                </p>
              </div>
            </div>

            <div class="flex shrink-0 flex-wrap gap-2">
              <button
                v-if="finding.status !== 'OPEN'"
                type="button"
                class="btn-ghost px-3 py-1.5 text-xs"
                @click="updateFindingStatus(finding, 'OPEN')"
              >
                Reopen
              </button>
              <button
                v-if="finding.status === 'OPEN'"
                type="button"
                class="btn-ghost px-3 py-1.5 text-xs"
                @click="snoozeFinding(finding)"
              >
                Snooze 7d
              </button>
              <button
                v-if="finding.status !== 'DISMISSED'"
                type="button"
                class="btn-ghost px-3 py-1.5 text-xs"
                @click="updateFindingStatus(finding, 'DISMISSED')"
              >
                Dismiss
              </button>
              <button
                v-if="finding.status !== 'RESOLVED'"
                type="button"
                class="btn-primary px-3 py-1.5 text-xs"
                @click="updateFindingStatus(finding, 'RESOLVED')"
              >
                Resolve
              </button>
            </div>
          </div>
        </article>

        <div v-if="nextCursor" class="flex justify-center pt-2">
          <button type="button" class="btn-ghost disabled:opacity-50" :disabled="loadingMore" @click="loadMore">
            {{ loadingMore ? 'Loading...' : 'Load more' }}
          </button>
        </div>
      </div>

      <div v-else class="surface-flat p-8 text-center">
        <CheckCircleIcon class="mx-auto mb-3 h-7 w-7 text-status-available" />
        <p class="text-sm text-text-secondary">No security findings match the current filters.</p>
      </div>
    </section>

    <Teleport to="body">
      <div
        v-if="saveFindingViewDialogOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
        @click.self="saveFindingViewDialogOpen = false"
      >
        <div class="surface-elevated w-full max-w-md p-8">
          <h3 class="headline-display text-2xl">Save Triage View</h3>
          <p class="mt-2 text-sm text-text-secondary">
            Store the current security findings filters for future queue reviews.
          </p>
          <div class="mt-6 space-y-5">
            <input
              v-model="saveFindingViewName"
              class="input-bare"
              type="text"
              placeholder="Open high risks, registrar lock gaps..."
              @keydown.enter="performSaveFindingView"
            />
            <label class="flex items-center gap-2 text-sm text-text-secondary">
              <input v-model="saveFindingViewDefault" type="checkbox" class="h-4 w-4 accent-[var(--color-accent)]" />
              Mark as default for Security Findings
            </label>
          </div>
          <div class="mt-8 flex justify-end gap-3">
            <button type="button" class="btn-ghost" @click="saveFindingViewDialogOpen = false">
              Cancel
            </button>
            <button
              type="button"
              class="btn-primary disabled:opacity-50"
              :disabled="!saveFindingViewName.trim()"
              @click="performSaveFindingView"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import {
  ArrowRight as ArrowRightIcon,
  Bookmark as BookmarkIcon,
  CheckCircle as CheckCircleIcon,
  ChevronDown as ChevronDownIcon,
  RefreshCw as RefreshCwIcon,
  Save as SaveIcon,
  Star as StarIcon,
  Trash2 as TrashIcon,
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const FINDING_FILTER_SCOPE = 'security-findings';

const queryText = (value) => {
  if (Array.isArray(value)) return String(value[0] || '');
  return String(value || '');
};

const filters = reactive({
  status: queryText(route.query.status),
  severity: queryText(route.query.severity),
  findingType: queryText(route.query.findingType || route.query.findingTypes),
  domainId: queryText(route.query.domainId),
});

const syncFiltersFromRoute = () => {
  filters.status = queryText(route.query.status);
  filters.severity = queryText(route.query.severity);
  filters.findingType = queryText(route.query.findingType || route.query.findingTypes);
  filters.domainId = queryText(route.query.domainId);
};

watch(() => route.query, syncFiltersFromRoute, { immediate: true });

const cleanQuery = (source) => {
  const query = {};
  if (source.status) query.status = source.status;
  if (source.severity) query.severity = source.severity;
  if (source.findingType) query.findingType = source.findingType;
  if (source.domainId) query.domainId = source.domainId;
  return query;
};

const apiQuery = computed(() => ({
  limit: 50,
  ...cleanQuery({
    status: queryText(route.query.status),
    severity: queryText(route.query.severity),
    findingType: queryText(route.query.findingType || route.query.findingTypes),
    domainId: queryText(route.query.domainId),
  }),
}));

const { data, pending, refresh } = await useFetch('/api/security/findings', {
  query: apiQuery,
});

const refreshing = ref(false);
const loadingMore = ref(false);
const bulkUpdating = ref(false);
const keyboardUpdating = ref(false);
const extraItems = ref([]);
const nextCursor = ref(null);
const selectedIds = ref(new Set());
const activeFindingId = ref(null);
const savedViewsOpen = ref(false);
const savedFindingViews = ref([]);
const saveFindingViewDialogOpen = ref(false);
const saveFindingViewName = ref('');
const saveFindingViewDefault = ref(false);

watch(
  data,
  (value) => {
    extraItems.value = [];
    nextCursor.value = value?.data?.nextCursor || null;
  },
  { immediate: true },
);

watch(
  () => route.fullPath,
  () => {
    clearSelection();
  },
);

const baseItems = computed(() => data.value?.data?.items || []);
const findings = computed(() => [...baseItems.value, ...extraItems.value]);
const visibleFindingIds = computed(() =>
  findings.value.map((finding) => Number(finding.id)).filter(Boolean),
);
const selectedCount = computed(() => selectedIds.value.size);
const allVisibleSelected = computed(
  () =>
    visibleFindingIds.value.length > 0 &&
    visibleFindingIds.value.every((id) => selectedIds.value.has(id)),
);

const activeFilterBadges = computed(() =>
  Object.entries(cleanQuery(filters)).map(([key, value]) => `${key}=${value}`),
);
const hasActiveFilters = computed(() => activeFilterBadges.value.length > 0);
const currentFindingCriteria = computed(() => cleanQuery(filters));

const isFindingSelected = (id) => selectedIds.value.has(Number(id));
const activeFindingIndex = computed(() => {
  if (!findings.value.length) return -1;
  const normalizedId = Number(activeFindingId.value);
  const index = findings.value.findIndex((finding) => Number(finding.id) === normalizedId);
  return index >= 0 ? index : 0;
});
const activeFinding = computed(() =>
  activeFindingIndex.value >= 0 ? findings.value[activeFindingIndex.value] : null,
);
const isActiveFinding = (id) => {
  const finding = activeFinding.value;
  return finding ? Number(finding.id) === Number(id) : false;
};

const setActiveFinding = (id) => {
  const normalizedId = Number(id);
  if (!normalizedId) return;
  activeFindingId.value = normalizedId;
};

const scrollActiveFindingIntoView = () => {
  if (!import.meta.client || !activeFinding.value) return;
  window.requestAnimationFrame(() => {
    const id = Number(activeFinding.value?.id);
    if (!id) return;
    document
      .querySelector(`[data-finding-id="${id}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
};

const moveActiveFinding = (direction) => {
  if (!findings.value.length) return;
  const currentIndex = activeFindingIndex.value >= 0 ? activeFindingIndex.value : 0;
  const nextIndex = Math.min(
    findings.value.length - 1,
    Math.max(0, currentIndex + direction),
  );
  setActiveFinding(findings.value[nextIndex].id);
  scrollActiveFindingIntoView();
};

const setSelectedIds = (ids) => {
  selectedIds.value = new Set(ids);
};

const toggleFindingSelection = (id) => {
  const next = new Set(selectedIds.value);
  const normalizedId = Number(id);
  if (next.has(normalizedId)) next.delete(normalizedId);
  else next.add(normalizedId);
  setSelectedIds(next);
};

const toggleVisibleSelection = () => {
  const next = new Set(selectedIds.value);
  if (allVisibleSelected.value) {
    visibleFindingIds.value.forEach((id) => next.delete(id));
  } else {
    visibleFindingIds.value.forEach((id) => next.add(id));
  }
  setSelectedIds(next);
};

const clearSelection = () => {
  setSelectedIds([]);
};

const applyFilters = async () => {
  await router.push({
    path: '/ops/findings',
    query: cleanQuery(filters),
  });
};

const clearFilters = async () => {
  filters.status = '';
  filters.severity = '';
  filters.findingType = '';
  filters.domainId = '';
  await router.push({ path: '/ops/findings', query: {} });
};

const applyFindingCriteria = (criteria = {}) => {
  filters.status = criteria.status || '';
  filters.severity = criteria.severity || '';
  filters.findingType = criteria.findingType || criteria.findingTypes || '';
  filters.domainId = criteria.domainId ? String(criteria.domainId) : '';
};

const fetchSavedFindingViews = async () => {
  try {
    const response = await $fetch('/api/filters', {
      query: { scope: FINDING_FILTER_SCOPE },
    });
    savedFindingViews.value = response?.data?.items || [];
  } catch (error) {
    console.error('Failed to load security findings views:', error);
  }
};

const openSaveFindingViewDialog = () => {
  saveFindingViewDialogOpen.value = true;
  saveFindingViewName.value = '';
  saveFindingViewDefault.value = false;
  savedViewsOpen.value = false;
};

const performSaveFindingView = async () => {
  const name = saveFindingViewName.value.trim();
  if (!name) return;
  try {
    const response = await $fetch('/api/filters', {
      method: 'POST',
      body: {
        name,
        scope: FINDING_FILTER_SCOPE,
        criteria: currentFindingCriteria.value,
        isDefault: saveFindingViewDefault.value,
      },
    });
    if (response?.code !== 0) {
      throw new Error(response?.msg || 'Failed to save triage view');
    }
    toast.success('Triage view saved');
    saveFindingViewDialogOpen.value = false;
    await fetchSavedFindingViews();
  } catch (error) {
    toast.error(error?.data?.msg || error?.message || 'Failed to save triage view');
  }
};

const applySavedFindingView = async (view, options = {}) => {
  applyFindingCriteria(view.criteria || {});
  savedViewsOpen.value = false;
  await router.push({
    path: '/ops/findings',
    query: cleanQuery(filters),
  });
  if (!options.silent) toast.success(`Loaded ${view.name}`);
};

const setDefaultFindingView = async (view) => {
  try {
    const response = await $fetch(`/api/filters/${view.id}`, {
      method: 'PATCH',
      body: {
        scope: FINDING_FILTER_SCOPE,
        isDefault: !view.isDefault,
      },
    });
    if (response?.code !== 0) {
      throw new Error(response?.msg || 'Failed to update triage view');
    }
    await fetchSavedFindingViews();
  } catch (error) {
    toast.error(error?.data?.msg || error?.message || 'Failed to update triage view');
  }
};

const deleteFindingView = async (view) => {
  if (!window.confirm(`Delete triage view "${view.name}"?`)) return;
  try {
    const response = await $fetch(`/api/filters/${view.id}`, { method: 'DELETE' });
    if (response?.code !== 0) {
      throw new Error(response?.msg || 'Failed to delete triage view');
    }
    toast.success('Triage view deleted');
    await fetchSavedFindingViews();
  } catch (error) {
    toast.error(error?.data?.msg || error?.message || 'Failed to delete triage view');
  }
};

const refreshFindings = async () => {
  if (refreshing.value) return;
  refreshing.value = true;
  try {
    await refresh();
  } finally {
    refreshing.value = false;
  }
};

const loadMore = async () => {
  if (!nextCursor.value || loadingMore.value) return;
  loadingMore.value = true;
  try {
    const response = await $fetch('/api/security/findings', {
      query: {
        ...apiQuery.value,
        cursor: nextCursor.value,
      },
    });
    if (response?.code !== 0) {
      throw new Error(response?.msg || 'Failed to load findings');
    }
    extraItems.value = [...extraItems.value, ...(response?.data?.items || [])];
    nextCursor.value = response?.data?.nextCursor || null;
  } catch (error) {
    toast.error(error?.message || 'Failed to load findings');
  } finally {
    loadingMore.value = false;
  }
};

const severityBadgeClass = (severity) => {
  switch (severity) {
    case 'HIGH':
      return 'bg-priority-high/10 text-priority-high';
    case 'MEDIUM':
      return 'bg-priority-medium/10 text-priority-medium';
    case 'LOW':
      return 'bg-priority-low/10 text-priority-low';
    default:
      return 'bg-accent/10 text-accent';
  }
};

const findingTitle = (type) => {
  const titles = {
    DMARC_MISSING: 'DMARC record is missing',
    DMARC_WEAK_POLICY: 'DMARC policy is weak',
    CAA_MISSING: 'CAA record is missing',
    DNSSEC_UNSIGNED: 'DNSSEC is not signed',
    NAMESERVER_DRIFT: 'Nameserver drift detected',
    MX_DRIFT: 'Mail exchanger drift detected',
    REGISTRAR_LOCK_MISSING: 'Registrar transfer lock is missing',
  };
  return titles[type] || type;
};

const findingEvidenceText = (finding) => {
  const evidence = finding?.evidence || {};
  if (finding?.findingType === 'DMARC_WEAK_POLICY') {
    return `policy=${evidence.policy || 'unknown'}, pct=${evidence.pct ?? 'unknown'}`;
  }
  if (finding?.findingType === 'NAMESERVER_DRIFT' || finding?.findingType === 'MX_DRIFT') {
    return `previous=${JSON.stringify(evidence.previous || [])}; current=${JSON.stringify(evidence.current || [])}`;
  }
  if (finding?.findingType === 'REGISTRAR_LOCK_MISSING') {
    return `lockStatus=${evidence.lockStatus || 'unknown'}; statuses=${JSON.stringify(evidence.statuses || [])}`;
  }
  if (evidence.checkedRecord) return `checked=${evidence.checkedRecord}`;
  return JSON.stringify(evidence).slice(0, 220);
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const removeSelectedId = (id) => {
  const next = new Set(selectedIds.value);
  next.delete(Number(id));
  setSelectedIds(next);
};

const updateFindingStatus = async (finding, status, extraBody = {}) => {
  try {
    const response = await $fetch(`/api/security/findings/${finding.id}`, {
      method: 'PATCH',
      body: { status, ...extraBody },
    });
    if (response?.code !== 0) {
      throw new Error(response?.msg || 'Failed to update finding');
    }
    toast.success(`Finding ${status.toLowerCase()}`);
    removeSelectedId(finding.id);
    await refresh();
  } catch (error) {
    toast.error(error?.message || 'Failed to update finding');
  }
};

const snoozeFinding = async (finding) => {
  const snoozedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await updateFindingStatus(finding, 'SNOOZED', { snoozedUntil });
};

const updateActiveFindingStatus = async (status) => {
  const finding = activeFinding.value;
  if (!finding || keyboardUpdating.value) return;
  keyboardUpdating.value = true;
  try {
    if (status === 'SNOOZED') {
      await snoozeFinding(finding);
    } else {
      await updateFindingStatus(finding, status);
    }
  } finally {
    keyboardUpdating.value = false;
  }
};

const bulkUpdateFindingStatus = async (status, extraBody = {}) => {
  const ids = [...selectedIds.value];
  if (!ids.length || bulkUpdating.value) return;

  bulkUpdating.value = true;
  try {
    const response = await $fetch('/api/security/findings/bulk', {
      method: 'PATCH',
      body: { ids, status, ...extraBody },
    });
    if (response?.code !== 0) {
      throw new Error(response?.msg || 'Failed to update findings');
    }
    const updatedCount = response?.data?.updatedCount || 0;
    toast.success(`${updatedCount} findings ${status.toLowerCase()}`);
    clearSelection();
    await refresh();
  } catch (error) {
    toast.error(error?.message || 'Failed to update findings');
  } finally {
    bulkUpdating.value = false;
  }
};

const bulkSnoozeFindings = async () => {
  const snoozedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await bulkUpdateFindingStatus('SNOOZED', { snoozedUntil });
};

const hasRouteFindingFilters = () =>
  Object.keys(
    cleanQuery({
      status: queryText(route.query.status),
      severity: queryText(route.query.severity),
      findingType: queryText(route.query.findingType || route.query.findingTypes),
      domainId: queryText(route.query.domainId),
    }),
  ).length > 0;

const isKeyboardTypingTarget = (target) => {
  const element = target instanceof Element ? target : null;
  if (!element) return false;
  const tagName = element.tagName.toLowerCase();
  return (
    element.isContentEditable ||
    ['input', 'textarea', 'select', 'button', 'a'].includes(tagName)
  );
};

const handleFindingShortcut = (event) => {
  if (event.defaultPrevented || saveFindingViewDialogOpen.value || savedViewsOpen.value) return;
  if (isKeyboardTypingTarget(event.target)) return;
  if (pending.value || refreshing.value || bulkUpdating.value || keyboardUpdating.value) return;

  const key = event.key.toLowerCase();
  if (!['j', 'k', 'x', 'r', 's', 'd', 'e'].includes(key)) return;

  event.preventDefault();
  if (key === 'j') return moveActiveFinding(1);
  if (key === 'k') return moveActiveFinding(-1);

  const finding = activeFinding.value;
  if (!finding) return;
  if (key === 'x') return toggleFindingSelection(finding.id);
  if (key === 'r') return updateActiveFindingStatus('OPEN');
  if (key === 's') return updateActiveFindingStatus('SNOOZED');
  if (key === 'd') return updateActiveFindingStatus('DISMISSED');
  if (key === 'e') return updateActiveFindingStatus('RESOLVED');
};

const vOnClickOutside = {
  mounted(el, binding) {
    el._clickOutside = (event) => {
      if (!el.contains(event.target)) binding.value(event);
    };
    document.addEventListener('click', el._clickOutside);
  },
  unmounted(el) {
    document.removeEventListener('click', el._clickOutside);
  },
};

onMounted(async () => {
  window.addEventListener('keydown', handleFindingShortcut);
  await fetchSavedFindingViews();
  if (hasRouteFindingFilters()) return;

  const defaultView = savedFindingViews.value.find((view) => view.isDefault);
  if (defaultView) {
    await applySavedFindingView(defaultView, { silent: true });
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleFindingShortcut);
});
</script>
