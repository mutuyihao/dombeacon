<template>
  <div class="flex min-h-full flex-col gap-6">
    <header class="shrink-0">
      <p class="eyebrow mb-2">{{ t('risk.findings.kicker') }}</p>
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="headline-display text-3xl md:text-4xl">{{ t('risk.findings.title') }}</h1>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
            {{ t('risk.findings.description') }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <NuxtLink to="/risk" class="btn-ghost">
            {{ t('risk.findings.backToOverview') }}
            <ArrowRightIcon class="h-3.5 w-3.5" />
          </NuxtLink>
          <button
            type="button"
            class="btn-primary disabled:opacity-50"
            :disabled="pending || refreshing"
            @click="refreshFindings"
          >
            <RefreshCwIcon :class="['h-4 w-4', (pending || refreshing) && 'animate-spin']" />
            {{ t('risk.common.refresh') }}
          </button>
        </div>
      </div>
    </header>

    <section class="surface-flat shrink-0 p-4">
      <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="eyebrow mb-2">{{ t('risk.findings.filtersKicker') }}</p>
          <h2 class="headline-display text-2xl">{{ t('risk.findings.filtersTitle') }}</h2>
        </div>
        <button type="button" class="btn-ghost" @click="clearFilters">
          {{ t('risk.findings.clearFilters') }}
        </button>
      </div>

      <div class="grid gap-3 md:grid-cols-5">
        <label class="block">
          <span class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
            {{ t('risk.findings.status') }}
          </span>
          <select v-model="filters.status" class="input-bare">
            <option v-for="option in statusOptions" :key="option.value || 'all'" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
        <label class="block">
          <span class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
            {{ t('risk.findings.severity') }}
          </span>
          <select v-model="filters.severity" class="input-bare">
            <option v-for="option in severityOptions" :key="option.value || 'all'" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
        <label class="block md:col-span-2">
          <span class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
            {{ t('risk.findings.findingType') }}
          </span>
          <select v-model="filters.findingType" class="input-bare">
            <option v-for="option in findingTypeOptions" :key="option.value || 'all'" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
        <label class="block">
          <span class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
            {{ t('risk.findings.domainId') }}
          </span>
          <input
            v-model.trim="filters.domainId"
            type="number"
            min="1"
            class="input-bare font-mono"
            :placeholder="t('risk.findings.domainPlaceholder')"
          />
        </label>
      </div>

      <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap gap-2">
          <span
            v-for="badge in activeFilterBadges"
            :key="badge"
            class="rounded-full bg-surface-sunken px-3 py-1 text-[11px] text-text-secondary"
          >
            {{ badge }}
          </span>
          <span v-if="!activeFilterBadges.length" class="text-xs text-text-tertiary">
            {{ t('risk.findings.noFilters') }}
          </span>
        </div>
        <div class="flex gap-2">
          <div class="relative">
            <button type="button" class="btn-ghost" @click="savedViewsOpen = !savedViewsOpen">
              <BookmarkIcon class="h-4 w-4" />
              <span>{{ t('risk.findings.savedViews') }}</span>
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
                  {{ t('risk.findings.saveCurrentView') }}
                </button>
                <p v-else class="px-3 py-2 text-xs text-text-tertiary">
                  {{ t('risk.findings.saveViewDisabled') }}
                </p>
              </div>
              <div class="hairline my-1" />
              <div class="max-h-72 overflow-y-auto pt-1">
                <div v-if="!savedFindingViews.length" class="px-3 py-6 text-center text-xs text-text-tertiary">
                  {{ t('risk.findings.noSavedViews') }}
                </div>
                <div
                  v-for="view in savedFindingViews"
                  :key="view.id"
                  class="group flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-surface-sunken"
                >
                  <button class="min-w-0 flex-1 text-left" type="button" @click="applySavedFindingView(view)">
                    <span class="block truncate text-text-main">{{ view.name }}</span>
                    <span v-if="view.isDefault" class="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
                      {{ t('risk.findings.defaultView') }}
                    </span>
                  </button>
                  <button
                    type="button"
                    class="rounded p-1 text-text-tertiary hover:text-accent"
                    :title="view.isDefault ? t('risk.findings.unsetDefault') : t('risk.findings.setDefault')"
                    @click.stop="setDefaultFindingView(view)"
                  >
                    <StarIcon class="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    class="rounded p-1 text-text-tertiary hover:text-status-dropping"
                    :title="t('risk.findings.deleteView')"
                    @click.stop="deleteFindingView(view)"
                  >
                    <TrashIcon class="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          <button type="button" class="btn-primary" @click="applyFilters">
            {{ t('risk.findings.applyFilters') }}
          </button>
        </div>
      </div>
    </section>

    <section class="rounded-[18px] border border-hairline bg-card/45 p-4">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="eyebrow mb-2">{{ t('risk.findings.queueKicker') }}</p>
          <h2 class="headline-display text-2xl">
            {{ t('risk.findings.queueTitle', { count: findings.length }) }}
          </h2>
          <p v-if="findings.length" class="mt-1 text-xs text-text-tertiary">
            {{ t('risk.findings.shortcuts') }}
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
            {{ t('risk.findings.selectVisible') }}
          </label>
          <span
            v-if="selectedCount"
            class="rounded-full bg-surface-sunken px-3 py-1.5 font-mono text-[11px] text-text-secondary"
          >
            {{ t('risk.findings.selectedCount', { count: selectedCount }) }}
          </span>
          <button
            v-if="selectedCount"
            type="button"
            class="btn-ghost px-3 py-1.5 text-xs disabled:opacity-50"
            :disabled="bulkUpdating"
            @click="bulkUpdateFindingStatus('OPEN')"
          >
            {{ t('risk.findings.actions.reopen') }}
          </button>
          <button
            v-if="selectedCount"
            type="button"
            class="btn-ghost px-3 py-1.5 text-xs disabled:opacity-50"
            :disabled="bulkUpdating"
            @click="bulkSnoozeFindings"
          >
            {{ t('risk.findings.actions.snooze7d') }}
          </button>
          <button
            v-if="selectedCount"
            type="button"
            class="btn-ghost px-3 py-1.5 text-xs disabled:opacity-50"
            :disabled="bulkUpdating"
            @click="bulkUpdateFindingStatus('DISMISSED')"
          >
            {{ t('risk.findings.actions.dismiss') }}
          </button>
          <button
            v-if="selectedCount"
            type="button"
            class="btn-primary px-3 py-1.5 text-xs disabled:opacity-50"
            :disabled="bulkUpdating"
            @click="bulkUpdateFindingStatus('RESOLVED')"
          >
            {{ bulkUpdating ? t('risk.findings.actions.updating') : t('risk.findings.actions.resolve') }}
          </button>
          <button
            v-if="selectedCount"
            type="button"
            class="btn-text text-xs"
            :disabled="bulkUpdating"
            @click="clearSelection"
          >
            {{ t('risk.findings.clearSelection') }}
          </button>
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
                  :aria-label="t('risk.findings.selectFinding')"
                  @change="toggleFindingSelection(finding.id)"
                />
              </label>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span :class="['rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]', severityBadgeClass(finding.severity)]">
                    {{ severityLabel(finding.severity) }}
                  </span>
                  <span class="rounded-full bg-surface-sunken px-2 py-0.5 text-[10px] tracking-[0.12em] text-text-tertiary">
                    {{ statusLabel(finding.status) }}
                  </span>
                  <span v-if="finding.snoozedUntil" class="font-mono text-[11px] text-text-tertiary">
                    {{ t('risk.findings.snoozedUntil', { time: formatDate(finding.snoozedUntil) }) }}
                  </span>
                </div>

                <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h3 class="text-sm font-semibold text-text-main">{{ findingTypeLabel(finding.findingType) }}</h3>
                  <NuxtLink
                    v-if="finding.domain?.id"
                    :to="`/domains/${finding.domain.id}`"
                    class="font-mono text-xs text-accent transition-colors hover:text-accent-hover"
                  >
                    {{ finding.domain.domain || `#${finding.domain.id}` }}
                  </NuxtLink>
                </div>

                <p class="mt-2 break-words text-xs leading-5 text-text-secondary">
                  {{ findingEvidenceText(finding) }}
                </p>
                <p class="mt-2 font-mono text-[11px] text-text-tertiary">
                  {{ t('risk.findings.seenWindow', {
                    first: formatDate(finding.firstSeenAt),
                    last: formatDate(finding.lastSeenAt),
                  }) }}
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
                {{ t('risk.findings.actions.reopen') }}
              </button>
              <button
                v-if="finding.status === 'OPEN'"
                type="button"
                class="btn-ghost px-3 py-1.5 text-xs"
                @click="snoozeFinding(finding)"
              >
                {{ t('risk.findings.actions.snooze7d') }}
              </button>
              <button
                v-if="finding.status !== 'DISMISSED'"
                type="button"
                class="btn-ghost px-3 py-1.5 text-xs"
                @click="updateFindingStatus(finding, 'DISMISSED')"
              >
                {{ t('risk.findings.actions.dismiss') }}
              </button>
              <button
                v-if="finding.status !== 'RESOLVED'"
                type="button"
                class="btn-primary px-3 py-1.5 text-xs"
                @click="updateFindingStatus(finding, 'RESOLVED')"
              >
                {{ t('risk.findings.actions.resolve') }}
              </button>
            </div>
          </div>
        </article>

        <div v-if="nextCursor" class="flex justify-center pt-2">
          <button type="button" class="btn-ghost disabled:opacity-50" :disabled="loadingMore" @click="loadMore">
            {{ loadingMore ? t('risk.findings.loadingMore') : t('common.loadMore') }}
          </button>
        </div>
      </div>

      <div v-else class="surface-flat p-8 text-center">
        <CheckCircleIcon class="mx-auto mb-3 h-7 w-7 text-status-available" />
        <p class="text-sm text-text-secondary">{{ t('risk.findings.empty') }}</p>
      </div>
    </section>

    <Teleport to="body">
      <div
        v-if="saveFindingViewDialogOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
        @click.self="saveFindingViewDialogOpen = false"
      >
        <div class="surface-elevated w-full max-w-md p-8">
          <h3 class="headline-display text-2xl">{{ t('risk.findings.saveDialogTitle') }}</h3>
          <p class="mt-2 text-sm text-text-secondary">
            {{ t('risk.findings.saveDialogDescription') }}
          </p>
          <div class="mt-6 space-y-5">
            <input
              v-model="saveFindingViewName"
              class="input-bare"
              type="text"
              :placeholder="t('risk.findings.saveDialogPlaceholder')"
              @keydown.enter="performSaveFindingView"
            />
            <label class="flex items-center gap-2 text-sm text-text-secondary">
              <input v-model="saveFindingViewDefault" type="checkbox" class="h-4 w-4 accent-[var(--color-accent)]" />
              {{ t('risk.findings.markAsDefault') }}
            </label>
          </div>
          <div class="mt-8 flex justify-end gap-3">
            <button type="button" class="btn-ghost" @click="saveFindingViewDialogOpen = false">
              {{ t('common.cancel') }}
            </button>
            <button
              type="button"
              class="btn-primary disabled:opacity-50"
              :disabled="!saveFindingViewName.trim()"
              @click="performSaveFindingView"
            >
              {{ t('common.save') }}
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
const { t, locale } = useI18n();
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

const knownStatuses = ['OPEN', 'SNOOZED', 'DISMISSED', 'RESOLVED'];
const knownSeverities = ['HIGH', 'MEDIUM', 'LOW'];
const knownFindingTypes = [
  'REGISTRAR_LOCK_MISSING',
  'NAMESERVER_DRIFT,MX_DRIFT',
  'NAMESERVER_DRIFT',
  'MX_DRIFT',
  'DMARC_MISSING',
  'DMARC_WEAK_POLICY',
  'CAA_MISSING',
  'DNSSEC_UNSIGNED',
];

const fallbackLabel = (value) =>
  String(value || t('risk.common.unknown')).replaceAll('_', ' ').toLowerCase();

const translatedLabel = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

const statusLabel = (value) => translatedLabel(`risk.status.${value}`, fallbackLabel(value));
const severityLabel = (value) => translatedLabel(`risk.severity.${value}`, fallbackLabel(value));
const findingTypeLabel = (value) => {
  if (value === 'NAMESERVER_DRIFT,MX_DRIFT') return t('risk.findingTypes.DNS_DRIFT');
  return translatedLabel(`risk.findingTypes.${value}`, fallbackLabel(value));
};

const statusOptions = computed(() => [
  { value: '', label: t('risk.findings.allStatuses') },
  ...knownStatuses.map((value) => ({ value, label: statusLabel(value) })),
]);

const severityOptions = computed(() => [
  { value: '', label: t('risk.findings.allSeverities') },
  ...knownSeverities.map((value) => ({ value, label: severityLabel(value) })),
]);

const findingTypeOptions = computed(() => [
  { value: '', label: t('risk.findings.allFindingTypes') },
  ...knownFindingTypes.map((value) => ({ value, label: findingTypeLabel(value) })),
]);

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

const { data, pending, refresh } = useLazyFetch('/api/security/findings', {
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

const filterBadgeLabel = (key, value) => {
  if (key === 'status') return `${t('risk.findings.status')}: ${statusLabel(value)}`;
  if (key === 'severity') return `${t('risk.findings.severity')}: ${severityLabel(value)}`;
  if (key === 'findingType') {
    return `${t('risk.findings.findingType')}: ${String(value)
      .split(',')
      .map((item) => findingTypeLabel(item.trim()))
      .join(' / ')}`;
  }
  if (key === 'domainId') return t('risk.findings.domainBadge', { id: value });
  return `${key}: ${value}`;
};

const activeFilterBadges = computed(() =>
  Object.entries(cleanQuery(filters)).map(([key, value]) => filterBadgeLabel(key, value)),
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
    path: '/risk/findings',
    query: cleanQuery(filters),
  });
};

const clearFilters = async () => {
  filters.status = '';
  filters.severity = '';
  filters.findingType = '';
  filters.domainId = '';
  await router.push({ path: '/risk/findings', query: {} });
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
    if (response?.code !== 0) {
      throw new Error(response?.msg || t('risk.findings.toasts.loadViewsFailed'));
    }
    savedFindingViews.value = response?.data?.items || [];
  } catch (error) {
    toast.error(error?.message || t('risk.findings.toasts.loadViewsFailed'));
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
      throw new Error(response?.msg || t('risk.findings.toasts.saveViewFailed'));
    }
    toast.success(t('risk.findings.toasts.viewSaved'));
    saveFindingViewDialogOpen.value = false;
    await fetchSavedFindingViews();
  } catch (error) {
    toast.error(error?.data?.msg || error?.message || t('risk.findings.toasts.saveViewFailed'));
  }
};

const applySavedFindingView = async (view, options = {}) => {
  applyFindingCriteria(view.criteria || {});
  savedViewsOpen.value = false;
  await router.push({
    path: '/risk/findings',
    query: cleanQuery(filters),
  });
  if (!options.silent) toast.success(t('risk.findings.toasts.viewLoaded', { name: view.name }));
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
      throw new Error(response?.msg || t('risk.findings.toasts.updateViewFailed'));
    }
    await fetchSavedFindingViews();
  } catch (error) {
    toast.error(error?.data?.msg || error?.message || t('risk.findings.toasts.updateViewFailed'));
  }
};

const deleteFindingView = async (view) => {
  if (import.meta.client && !window.confirm(t('risk.findings.confirmDeleteView', { name: view.name }))) return;
  try {
    const response = await $fetch(`/api/filters/${view.id}`, { method: 'DELETE' });
    if (response?.code !== 0) {
      throw new Error(response?.msg || t('risk.findings.toasts.deleteViewFailed'));
    }
    toast.success(t('risk.findings.toasts.viewDeleted'));
    await fetchSavedFindingViews();
  } catch (error) {
    toast.error(error?.data?.msg || error?.message || t('risk.findings.toasts.deleteViewFailed'));
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
      throw new Error(response?.msg || t('risk.findings.toasts.loadMoreFailed'));
    }
    extraItems.value = [...extraItems.value, ...(response?.data?.items || [])];
    nextCursor.value = response?.data?.nextCursor || null;
  } catch (error) {
    toast.error(error?.message || t('risk.findings.toasts.loadMoreFailed'));
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

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString(locale.value);
};

const formatEvidenceValue = (value) => {
  if (Array.isArray(value)) return value.length ? value.join(', ') : t('risk.common.none');
  if (value === undefined || value === null || value === '') return t('risk.common.unknown');
  return String(value);
};

const findingEvidenceText = (finding) => {
  const evidence = finding?.evidence || {};
  if (finding?.findingType === 'DMARC_WEAK_POLICY') {
    return t('risk.evidence.dmarcPolicy', {
      policy: formatEvidenceValue(evidence.policy),
      pct: formatEvidenceValue(evidence.pct),
    });
  }
  if (finding?.findingType === 'NAMESERVER_DRIFT' || finding?.findingType === 'MX_DRIFT') {
    return t('risk.evidence.drift', {
      previous: formatEvidenceValue(evidence.previous),
      current: formatEvidenceValue(evidence.current),
    });
  }
  if (finding?.findingType === 'REGISTRAR_LOCK_MISSING') {
    return t('risk.evidence.registrarLock', {
      lockStatus: formatEvidenceValue(evidence.lockStatus),
      statuses: formatEvidenceValue(evidence.statuses),
    });
  }
  if (evidence.checkedRecord) return t('risk.evidence.checkedRecord', { record: evidence.checkedRecord });
  return t('risk.evidence.raw', { value: JSON.stringify(evidence).slice(0, 220) });
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
      throw new Error(response?.msg || t('risk.findings.toasts.updateFailed'));
    }
    toast.success(t('risk.findings.toasts.statusUpdated', { status: statusLabel(status) }));
    removeSelectedId(finding.id);
    await refresh();
  } catch (error) {
    toast.error(error?.message || t('risk.findings.toasts.updateFailed'));
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
      throw new Error(response?.msg || t('risk.findings.toasts.bulkUpdateFailed'));
    }
    const updatedCount = response?.data?.updatedCount || 0;
    toast.success(t('risk.findings.toasts.bulkStatusUpdated', {
      count: updatedCount,
      status: statusLabel(status),
    }));
    clearSelection();
    await refresh();
  } catch (error) {
    toast.error(error?.message || t('risk.findings.toasts.bulkUpdateFailed'));
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
