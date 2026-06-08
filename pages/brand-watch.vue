<template>
  <div class="flex min-h-full flex-col gap-6 md:h-full md:min-h-0 md:overflow-hidden">
    <header class="shrink-0">
      <p class="eyebrow mb-2">Abuse surface</p>
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="headline-display text-3xl md:text-4xl">Brand Watch</h1>
          <p class="mt-2 max-w-2xl text-sm text-text-secondary">
            Generate typo, prefix, suffix, and homoglyph candidates from brand terms, then probe them with RDAP and CT evidence.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="btn-ghost disabled:opacity-50"
            :disabled="termsLoading || risksLoading || summaryLoading"
            @click="refreshAll"
          >
            <RefreshCwIcon :class="['h-4 w-4', (termsLoading || risksLoading || summaryLoading) && 'animate-spin']" />
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </header>

    <section class="grid shrink-0 gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.55fr)]">
      <div class="surface p-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="font-display text-xl font-medium tracking-[-0.025em] text-text-main">Watch term</h2>
            <p class="mt-1 text-sm text-text-secondary">
              Start with owned brand, product, or company labels. TLDs accept comma-separated values.
            </p>
          </div>
          <span class="rounded-full bg-surface-sunken px-3 py-1 text-xs font-medium text-text-secondary">
            RDAP + CT
          </span>
        </div>

        <form class="mt-5 grid gap-4 lg:grid-cols-12" @submit.prevent="createTerm">
          <label class="lg:col-span-4">
            <span class="text-xs font-semibold uppercase tracking-[0.14em] text-text-tertiary">Term</span>
            <input
              v-model.trim="form.term"
              class="input-bare mt-1"
              autocomplete="off"
              placeholder="example"
            />
          </label>

          <label class="lg:col-span-2">
            <span class="text-xs font-semibold uppercase tracking-[0.14em] text-text-tertiary">Type</span>
            <select v-model="form.termType" class="input-bare mt-1">
              <option v-for="type in termTypes" :key="type" :value="type">{{ type }}</option>
            </select>
          </label>

          <label class="lg:col-span-3">
            <span class="text-xs font-semibold uppercase tracking-[0.14em] text-text-tertiary">Strategy</span>
            <select v-model="form.matchStrategy" class="input-bare mt-1">
              <option v-for="strategy in matchStrategies" :key="strategy" :value="strategy">{{ strategy }}</option>
            </select>
          </label>

          <label class="lg:col-span-3">
            <span class="text-xs font-semibold uppercase tracking-[0.14em] text-text-tertiary">Severity</span>
            <select v-model="form.severity" class="input-bare mt-1">
              <option v-for="severity in severities" :key="severity" :value="severity">{{ severity }}</option>
            </select>
          </label>

          <label class="lg:col-span-7">
            <span class="text-xs font-semibold uppercase tracking-[0.14em] text-text-tertiary">TLDs</span>
            <input
              v-model.trim="form.tlds"
              class="input-bare mt-1 font-mono"
              autocomplete="off"
              placeholder="com, net, org"
            />
          </label>

          <label class="lg:col-span-3">
            <span class="text-xs font-semibold uppercase tracking-[0.14em] text-text-tertiary">Every hours</span>
            <input
              v-model.number="form.scanFrequencyHours"
              class="input-bare mt-1 font-mono"
              type="number"
              min="1"
              max="720"
            />
          </label>

          <label class="flex items-end gap-2 lg:col-span-2">
            <input v-model="form.enabled" type="checkbox" class="mb-2 h-4 w-4 accent-[var(--color-accent)]" />
            <span class="pb-1.5 text-sm font-medium text-text-main">Enabled</span>
          </label>

          <div class="flex flex-wrap gap-2 lg:col-span-12">
            <button type="submit" class="btn-primary" :disabled="creating || !form.term">
              <PlusIcon class="h-4 w-4" />
              <span>{{ creating ? 'Saving' : 'Save term' }}</span>
            </button>
            <button
              type="button"
              class="btn-ghost"
              :disabled="previewLoading || !form.term"
              @click="previewCandidates()"
            >
              <SearchIcon v-if="!previewLoading" class="h-4 w-4" />
              <LoadingSpinner v-else size="sm" />
              <span>Preview candidates</span>
            </button>
          </div>
        </form>

        <div v-if="previewItems.length" class="mt-5 rounded-[14px] bg-surface-sunken p-4">
          <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p class="text-sm font-medium text-text-main">
              Candidate preview
              <span class="font-mono text-text-tertiary">({{ previewItems.length }})</span>
            </p>
            <p v-if="previewSource?.normalizedTerm" class="font-mono text-xs text-text-tertiary">
              {{ previewSource.normalizedTerm }}
            </p>
          </div>
          <div class="grid max-h-42 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
            <div
              v-for="candidate in previewItems"
              :key="candidate.domain"
              class="rounded-lg bg-card px-3 py-2 shadow-soft"
            >
              <p class="truncate font-mono text-sm text-text-main">{{ candidate.domain }}</p>
              <p class="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">
                {{ candidate.mutationType }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <aside class="surface grid grid-cols-2 gap-px overflow-hidden bg-hairline sm:grid-cols-4 xl:grid-cols-2">
        <div class="bg-card p-5">
          <p class="eyebrow">Terms</p>
          <p class="mt-3 font-display text-3xl font-medium tracking-[-0.04em]" data-numeric>{{ termsTotal }}</p>
        </div>
        <div class="bg-card p-5">
          <p class="eyebrow">Enabled</p>
          <p class="mt-3 font-display text-3xl font-medium tracking-[-0.04em]" data-numeric>{{ enabledTermsCount }}</p>
        </div>
        <div class="bg-card p-5">
          <p class="eyebrow">Registered</p>
          <p class="mt-3 font-display text-3xl font-medium tracking-[-0.04em] text-status-dropping" data-numeric>
            {{ registeredRiskCount }}
          </p>
        </div>
        <div class="bg-card p-5">
          <p class="eyebrow">High</p>
          <p class="mt-3 font-display text-3xl font-medium tracking-[-0.04em] text-priority-high" data-numeric>
            {{ highRiskCount }}
          </p>
        </div>
      </aside>
    </section>

    <section class="grid min-h-[30rem] flex-1 gap-4 overflow-hidden lg:grid-cols-[minmax(20rem,0.85fr)_minmax(0,1.15fr)]">
      <div class="surface flex min-h-0 flex-col overflow-hidden">
        <div class="flex shrink-0 items-center justify-between gap-3 border-b border-hairline px-5 py-4">
          <div>
            <h2 class="font-display text-xl font-medium tracking-[-0.025em] text-text-main">Terms</h2>
            <p class="mt-1 text-xs text-text-secondary">Manual scans ignore schedule frequency.</p>
          </div>
          <LoadingSpinner v-if="termsLoading" size="sm" />
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto p-2">
          <article
            v-for="term in terms"
            :key="term.id"
            class="group rounded-xl px-3 py-4 transition-colors hover:bg-surface-sunken"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="truncate font-display text-lg font-medium tracking-[-0.025em] text-text-main">
                    {{ term.term }}
                  </h3>
                  <span :class="['flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em]', term.enabled ? 'text-status-available' : 'text-status-unknown']">
                    <span :class="['h-1.5 w-1.5 rounded-full', term.enabled ? 'bg-status-available' : 'bg-status-unknown']" />
                    {{ term.enabled ? 'enabled' : 'paused' }}
                  </span>
                </div>
                <p class="mt-1 truncate font-mono text-xs text-text-tertiary">{{ term.normalizedTerm }}</p>
              </div>
              <button
                type="button"
                class="rounded-full p-2 text-text-tertiary hover:bg-card hover:text-accent"
                :disabled="scanningId === term.id || !term.enabled"
                title="Scan now"
                @click="scanTerm(term)"
              >
                <RefreshCwIcon :class="['h-4 w-4', scanningId === term.id && 'animate-spin']" />
              </button>
            </div>

            <div class="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.13em]">
              <span :class="getSeverityTextClass(term.severity)">{{ term.severity }}</span>
              <span class="text-text-tertiary">{{ term.matchStrategy }}</span>
              <span class="text-text-tertiary">{{ term.termType }}</span>
              <span class="font-mono text-text-tertiary">{{ term.tlds?.join(', ') }}</span>
            </div>

            <p class="mt-3 text-xs text-text-secondary">
              Last scan:
              <span class="font-mono text-text-tertiary">{{ formatDateTime(term.lastScannedAt) }}</span>
            </p>

            <div class="mt-3 flex flex-wrap gap-3 text-xs">
              <button type="button" class="btn-text text-xs" @click="previewCandidates(term)">Preview</button>
              <button type="button" class="btn-text text-xs" @click="toggleTerm(term)">
                {{ term.enabled ? 'Pause' : 'Enable' }}
              </button>
              <button type="button" class="btn-text text-xs text-status-dropping hover:text-status-dropping" @click="deleteTerm(term)">
                Delete
              </button>
            </div>
          </article>

          <div v-if="!termsLoading && !terms.length" class="px-5 py-16 text-center">
            <ShieldAlertIcon class="mx-auto mb-4 h-8 w-8 text-text-tertiary" />
            <p class="text-sm text-text-secondary">No brand watch terms yet.</p>
          </div>
        </div>
      </div>

      <div class="surface flex min-h-0 flex-col overflow-hidden">
        <div class="shrink-0 border-b border-hairline px-5 py-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="font-display text-xl font-medium tracking-[-0.025em] text-text-main">Risk candidates</h2>
              <p class="mt-1 text-xs text-text-secondary">Persisted RDAP and CT results with manual review state.</p>
            </div>
            <div class="flex items-center gap-2">
              <LoadingSpinner v-if="risksLoading" size="sm" />
              <div class="relative">
                <button type="button" class="btn-ghost text-xs" @click="savedViewsOpen = !savedViewsOpen">
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
                      v-if="hasRiskFilters"
                      type="button"
                      class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-accent transition-colors hover:bg-surface-sunken"
                      @click="openSaveRiskViewDialog"
                    >
                      <SaveIcon class="h-4 w-4" />
                      Save current view
                    </button>
                    <p v-else class="px-3 py-2 text-xs text-text-tertiary">
                      Add at least one filter before saving a view.
                    </p>
                  </div>
                  <div class="hairline my-1" />
                  <div class="max-h-72 overflow-y-auto pt-1">
                    <div v-if="!savedRiskViews.length" class="px-3 py-6 text-center text-xs text-text-tertiary">
                      No saved Brand Watch views yet.
                    </div>
                    <div
                      v-for="view in savedRiskViews"
                      :key="view.id"
                      class="group flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-surface-sunken"
                    >
                      <button class="min-w-0 flex-1 text-left" type="button" @click="applySavedRiskView(view)">
                        <span class="block truncate text-text-main">{{ view.name }}</span>
                        <span v-if="view.isDefault" class="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
                          Default
                        </span>
                      </button>
                      <button
                        type="button"
                        class="rounded p-1 text-text-tertiary hover:text-accent"
                        :title="view.isDefault ? 'Unset default' : 'Set default'"
                        @click.stop="setDefaultRiskView(view)"
                      >
                        <StarIcon class="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        class="rounded p-1 text-text-tertiary hover:text-status-dropping"
                        title="Delete view"
                        @click.stop="deleteRiskView(view)"
                      >
                        <TrashIcon class="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <nav class="tab-bar mt-4 overflow-x-auto no-scrollbar">
            <button
              v-for="filter in reviewFilters"
              :key="filter.value || 'ALL_REVIEW'"
              type="button"
              :class="['tab-item', riskReviewStatus === filter.value && 'is-active']"
              @click="riskReviewStatus = filter.value"
            >
              {{ filter.label }}
            </button>
          </nav>

          <nav class="tab-bar mt-4 overflow-x-auto no-scrollbar">
            <button
              v-for="filter in riskFilters"
              :key="filter.value || 'ALL'"
              type="button"
              :class="['tab-item', riskStatus === filter.value && 'is-active']"
              @click="riskStatus = filter.value"
            >
              {{ filter.label }}
            </button>
          </nav>

          <div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <label>
              <span class="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">Term</span>
              <select v-model="riskTermId" class="input-bare mt-1 text-xs">
                <option value="">All terms</option>
                <option v-for="term in terms" :key="term.id" :value="String(term.id)">
                  {{ term.term }}
                </option>
              </select>
            </label>

            <label>
              <span class="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">Source</span>
              <select v-model="riskSource" class="input-bare mt-1 text-xs">
                <option v-for="source in sourceFilters" :key="source.value || 'ALL_SOURCE'" :value="source.value">
                  {{ source.label }}
                </option>
              </select>
            </label>

            <label>
              <span class="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">Mutation</span>
              <select v-model="riskMutationType" class="input-bare mt-1 text-xs">
                <option v-for="mutation in mutationFilters" :key="mutation.value || 'ALL_MUTATION'" :value="mutation.value">
                  {{ mutation.label }}
                </option>
              </select>
            </label>

            <label>
              <span class="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">First seen from</span>
              <input v-model="riskFirstSeenFrom" class="input-bare mt-1 text-xs" type="date" />
            </label>

            <label>
              <span class="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">Last seen from</span>
              <input v-model="riskLastSeenFrom" class="input-bare mt-1 text-xs" type="date" />
            </label>

            <div class="flex items-end">
              <button
                type="button"
                class="btn-ghost w-full justify-center text-xs"
                :disabled="!hasRiskFilters"
                @click="clearRiskFilters"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto p-2" @scroll="onRisksScroll">
          <article
            v-for="risk in riskItems"
            :key="risk.id"
            class="grid grid-cols-1 gap-3 rounded-xl px-3 py-4 transition-colors hover:bg-surface-sunken xl:grid-cols-[minmax(0,1fr)_auto]"
          >
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h3 class="truncate font-display text-lg font-medium tracking-[-0.025em] text-text-main">
                  {{ risk.domain }}
                </h3>
                <span :class="['flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em]', getStatusTextClass(risk.status)]">
                  <span :class="['h-1.5 w-1.5 rounded-full', getStatusDotClass(risk.status)]" />
                  {{ risk.status }}
                </span>
                <span :class="['text-[11px] font-semibold uppercase tracking-[0.14em]', getSeverityTextClass(risk.severity)]">
                  {{ risk.severity }}
                </span>
                <span :class="['text-[11px] font-semibold uppercase tracking-[0.14em]', getReviewTextClass(risk.reviewStatus)]">
                  {{ risk.reviewStatus || 'OPEN' }}
                </span>
              </div>

              <dl class="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-text-secondary">
                <div>
                  <dt class="sr-only">Mutation</dt>
                  <dd>{{ risk.mutationType }}</dd>
                </div>
                <div>
                  <dt class="sr-only">Source</dt>
                  <dd>Source: {{ String(risk.source || 'unknown').toUpperCase() }}</dd>
                </div>
                <div v-if="risk.term">
                  <dt class="sr-only">Term</dt>
                  <dd>Term: {{ risk.term.term }}</dd>
                </div>
                <div>
                  <dt class="sr-only">Checked</dt>
                  <dd>Checked: <span class="font-mono">{{ formatDateTime(risk.checkedAt) }}</span></dd>
                </div>
              </dl>

              <p v-if="risk.lastError" class="mt-2 flex items-start gap-1.5 text-xs text-status-dropping">
                <AlertCircleIcon class="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{{ risk.lastError }}</span>
              </p>
              <p v-else class="mt-2 text-xs text-text-tertiary">
                {{ summarizeEvidence(risk) }}
              </p>
              <p v-if="risk.reviewNote" class="mt-2 rounded-lg bg-card px-3 py-2 text-xs text-text-secondary">
                {{ risk.reviewNote }}
              </p>
            </div>

            <div class="flex flex-wrap items-start justify-between gap-2 xl:max-w-[17rem] xl:justify-end">
              <a
                v-if="risk.evidence?.rdapUrl"
                class="btn-text text-xs"
                :href="risk.evidence.rdapUrl"
                target="_blank"
                rel="noreferrer"
              >
                RDAP
                <ExternalLinkIcon class="h-3 w-3" />
              </a>
              <button
                v-if="risk.reviewStatus !== 'OPEN'"
                type="button"
                class="btn-text text-xs"
                :disabled="updatingRiskId === risk.id"
                @click="updateRiskReview(risk, 'OPEN')"
              >
                Reopen
              </button>
              <button
                v-if="risk.reviewStatus !== 'WATCHING'"
                type="button"
                class="btn-text text-xs"
                :disabled="updatingRiskId === risk.id"
                @click="updateRiskReview(risk, 'WATCHING')"
              >
                Watch
              </button>
              <button
                v-if="risk.reviewStatus !== 'DISMISSED'"
                type="button"
                class="btn-text text-xs"
                :disabled="updatingRiskId === risk.id"
                @click="updateRiskReview(risk, 'DISMISSED')"
              >
                Dismiss
              </button>
              <button
                v-if="risk.reviewStatus !== 'RESOLVED'"
                type="button"
                class="btn-text text-xs"
                :disabled="updatingRiskId === risk.id"
                @click="updateRiskReview(risk, 'RESOLVED')"
              >
                Resolve
              </button>
              <button
                type="button"
                class="btn-text text-xs"
                :disabled="updatingRiskId === risk.id"
                @click="editRiskNote(risk)"
              >
                Note
              </button>
            </div>
          </article>

          <div v-if="!risksLoading && !riskItems.length" class="px-5 py-16 text-center">
            <RadarIcon class="mx-auto mb-4 h-8 w-8 text-text-tertiary" />
            <p class="text-sm text-text-secondary">No persisted candidate scans yet.</p>
          </div>

          <div v-if="risksNextCursor" class="px-5 py-4 text-center">
            <button type="button" class="btn-text" :disabled="risksLoadingMore" @click="loadMoreRisks">
              {{ risksLoadingMore ? 'Loading' : 'Load more' }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <Teleport to="body">
      <div
        v-if="saveRiskViewDialogOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
        @click.self="saveRiskViewDialogOpen = false"
      >
        <div class="surface-elevated w-full max-w-md p-8">
          <h3 class="headline-display text-2xl">Save Brand Watch View</h3>
          <div class="mt-6 space-y-5">
            <input
              v-model="saveRiskViewName"
              class="input-bare"
              type="text"
              placeholder="Review queue, CT findings, high-risk terms..."
              @keydown.enter="performSaveRiskView"
            />
            <label class="flex items-center gap-2 text-sm text-text-secondary">
              <input v-model="saveRiskViewDefault" type="checkbox" class="h-4 w-4 accent-[var(--color-accent)]" />
              Mark as default for Brand Watch
            </label>
          </div>
          <div class="mt-8 flex justify-end gap-3">
            <button type="button" class="btn-ghost" @click="saveRiskViewDialogOpen = false">
              Cancel
            </button>
            <button
              type="button"
              class="btn-primary disabled:opacity-50"
              :disabled="!saveRiskViewName.trim()"
              @click="performSaveRiskView"
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
  AlertCircle as AlertCircleIcon,
  Bookmark as BookmarkIcon,
  ChevronDown as ChevronDownIcon,
  ExternalLink as ExternalLinkIcon,
  Plus as PlusIcon,
  Radar as RadarIcon,
  RefreshCw as RefreshCwIcon,
  Save as SaveIcon,
  Search as SearchIcon,
  ShieldAlert as ShieldAlertIcon,
  Star as StarIcon,
  Trash2 as TrashIcon,
} from 'lucide-vue-next';

const toast = useToast();

const termTypes = ['BRAND', 'PRODUCT', 'COMPANY', 'OTHER'];
const matchStrategies = ['STRICT', 'STANDARD', 'AGGRESSIVE'];
const severities = ['LOW', 'MEDIUM', 'HIGH'];
const reviewFilters = [
  { value: 'OPEN', label: 'Open' },
  { value: 'WATCHING', label: 'Watching' },
  { value: 'DISMISSED', label: 'Dismissed' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: '', label: 'All review' },
];
const riskFilters = [
  { value: '', label: 'All' },
  { value: 'REGISTERED', label: 'Registered' },
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'UNKNOWN', label: 'Unknown' },
  { value: 'ERROR', label: 'Error' },
];
const sourceFilters = [
  { value: '', label: 'All sources' },
  { value: 'rdap', label: 'RDAP' },
  { value: 'ct', label: 'CT' },
];
const mutationFilters = [
  { value: '', label: 'All mutations' },
  { value: 'exact', label: 'Exact' },
  { value: 'prefix', label: 'Prefix' },
  { value: 'suffix', label: 'Suffix' },
  { value: 'omission', label: 'Omission' },
  { value: 'duplication', label: 'Duplication' },
  { value: 'keyboard', label: 'Keyboard' },
  { value: 'homoglyph', label: 'Homoglyph' },
  { value: 'ct-exact', label: 'CT exact' },
  { value: 'ct-prefix', label: 'CT prefix' },
  { value: 'ct-suffix', label: 'CT suffix' },
  { value: 'ct-observed', label: 'CT observed' },
];

const form = reactive({
  term: '',
  termType: 'BRAND',
  matchStrategy: 'STANDARD',
  tlds: 'com, net, org',
  severity: 'MEDIUM',
  enabled: true,
  scanFrequencyHours: 24,
});

const terms = ref([]);
const summary = ref({});
const termsLoading = ref(false);
const summaryLoading = ref(false);
const creating = ref(false);
const previewLoading = ref(false);
const previewItems = ref([]);
const previewSource = ref(null);
const scanningId = ref(null);
const riskReviewStatus = ref('OPEN');
const riskStatus = ref('');
const riskTermId = ref('');
const riskSource = ref('');
const riskMutationType = ref('');
const riskFirstSeenFrom = ref('');
const riskLastSeenFrom = ref('');
const riskItems = ref([]);
const risksNextCursor = ref(null);
const risksLoading = ref(false);
const risksLoadingMore = ref(false);
const updatingRiskId = ref(null);
const savedViewsOpen = ref(false);
const savedRiskViews = ref([]);
const saveRiskViewDialogOpen = ref(false);
const saveRiskViewName = ref('');
const saveRiskViewDefault = ref(false);

const termsTotal = computed(() =>
  Number.isFinite(summary.value.termsTotal) ? summary.value.termsTotal : terms.value.length,
);
const enabledTermsCount = computed(() =>
  Number.isFinite(summary.value.enabledTerms)
    ? summary.value.enabledTerms
    : terms.value.filter((term) => term.enabled).length,
);
const registeredRiskCount = computed(() =>
  Number.isFinite(summary.value.registered)
    ? summary.value.registered
    : riskItems.value.filter((risk) => risk.status === 'REGISTERED').length,
);
const highRiskCount = computed(() =>
  Number.isFinite(summary.value.high)
    ? summary.value.high
    : riskItems.value.filter((risk) => risk.severity === 'HIGH').length,
);
const hasRiskFilters = computed(() =>
  Boolean(
    riskReviewStatus.value ||
      riskStatus.value ||
      riskTermId.value ||
      riskSource.value ||
      riskMutationType.value ||
      riskFirstSeenFrom.value ||
      riskLastSeenFrom.value,
  ),
);
const currentRiskCriteria = computed(() => ({
  reviewStatus: riskReviewStatus.value,
  status: riskStatus.value,
  termId: riskTermId.value,
  source: riskSource.value,
  mutationType: riskMutationType.value,
  firstSeenFrom: riskFirstSeenFrom.value,
  lastSeenFrom: riskLastSeenFrom.value,
}));

const assertOk = (resp, fallbackMessage) => {
  if (!resp || resp.code !== 0) {
    throw new Error(resp?.msg || fallbackMessage);
  }
  return resp.data || {};
};

const buildFormBody = () => ({
  term: form.term,
  termType: form.termType,
  matchStrategy: form.matchStrategy,
  tlds: form.tlds,
  severity: form.severity,
  enabled: form.enabled,
  scanFrequencyHours: Number(form.scanFrequencyHours) || 24,
});

const refreshTerms = async () => {
  termsLoading.value = true;
  try {
    const resp = await $fetch('/api/brand-watch/terms');
    const data = assertOk(resp, 'Failed to load brand watch terms');
    terms.value = data.items || [];
  } catch (error) {
    toast.error(error?.message || 'Failed to load brand watch terms');
  } finally {
    termsLoading.value = false;
  }
};

const buildRiskQuery = (extra = {}) => {
  const query = { limit: 50, ...extra };
  if (riskStatus.value) query.status = riskStatus.value;
  if (riskReviewStatus.value) query.reviewStatus = riskReviewStatus.value;
  if (riskTermId.value) query.termId = riskTermId.value;
  if (riskSource.value) query.source = riskSource.value;
  if (riskMutationType.value) query.mutationType = riskMutationType.value;
  if (riskFirstSeenFrom.value) query.firstSeenFrom = riskFirstSeenFrom.value;
  if (riskLastSeenFrom.value) query.lastSeenFrom = riskLastSeenFrom.value;
  return query;
};

const refreshRisks = async () => {
  risksLoading.value = true;
  try {
    const resp = await $fetch('/api/brand-watch/risks', {
      query: buildRiskQuery(),
    });
    const data = assertOk(resp, 'Failed to load brand watch risks');
    riskItems.value = data.items || [];
    risksNextCursor.value = data.nextCursor || null;
  } catch (error) {
    toast.error(error?.message || 'Failed to load brand watch risks');
  } finally {
    risksLoading.value = false;
  }
};

const refreshSummary = async () => {
  summaryLoading.value = true;
  try {
    const resp = await $fetch('/api/brand-watch/summary');
    summary.value = assertOk(resp, 'Failed to load brand watch summary');
  } catch (error) {
    toast.error(error?.message || 'Failed to load brand watch summary');
  } finally {
    summaryLoading.value = false;
  }
};

const refreshAll = async () => {
  await Promise.all([refreshTerms(), refreshRisks(), refreshSummary()]);
};

const previewCandidates = async (term = null) => {
  previewLoading.value = true;
  try {
    const body = term
      ? { termId: term.id, limit: 60 }
      : { ...buildFormBody(), limit: 60 };
    const resp = await $fetch('/api/brand-watch/candidates', {
      method: 'POST',
      body,
    });
    const data = assertOk(resp, 'Failed to generate candidates');
    previewSource.value = data.source || null;
    previewItems.value = data.items || [];
    if (!previewItems.value.length) {
      toast.info('No valid candidates generated for this term');
    }
  } catch (error) {
    toast.error(error?.message || 'Failed to generate candidates');
  } finally {
    previewLoading.value = false;
  }
};

const createTerm = async () => {
  if (creating.value || !form.term) return;
  creating.value = true;
  try {
    const resp = await $fetch('/api/brand-watch/terms', {
      method: 'POST',
      body: buildFormBody(),
    });
    assertOk(resp, 'Failed to create brand watch term');
    toast.success('Brand watch term saved');
    form.term = '';
    previewItems.value = [];
    previewSource.value = null;
    await refreshTerms();
  } catch (error) {
    toast.error(error?.message || 'Failed to create brand watch term');
  } finally {
    creating.value = false;
  }
};

const toggleTerm = async (term) => {
  try {
    const resp = await $fetch(`/api/brand-watch/terms/${term.id}`, {
      method: 'PATCH',
      body: { enabled: !term.enabled },
    });
    assertOk(resp, 'Failed to update brand watch term');
    toast.success(!term.enabled ? 'Brand watch term enabled' : 'Brand watch term paused');
    await refreshTerms();
  } catch (error) {
    toast.error(error?.message || 'Failed to update brand watch term');
  }
};

const deleteTerm = async (term) => {
  if (!window.confirm(`Delete brand watch term "${term.term}"?`)) return;
  try {
    const resp = await $fetch(`/api/brand-watch/terms/${term.id}`, {
      method: 'DELETE',
    });
    assertOk(resp, 'Failed to delete brand watch term');
    toast.success('Brand watch term deleted');
    await refreshAll();
  } catch (error) {
    toast.error(error?.message || 'Failed to delete brand watch term');
  }
};

const scanTerm = async (term) => {
  if (scanningId.value || !term.enabled) return;
  scanningId.value = term.id;
  try {
    const resp = await $fetch(`/api/brand-watch/terms/${term.id}/scan`, {
      method: 'POST',
      body: { limit: 100, includeCt: true, ctLimit: 50 },
    });
    const data = assertOk(resp, 'Failed to scan brand watch term');
    toast.success(
      `Checked ${data.checked || 0}; registered ${data.registered || 0}; CT ${data.ctDiscovered || 0}`,
    );
    await refreshAll();
  } catch (error) {
    toast.error(error?.message || 'Failed to scan brand watch term');
  } finally {
    scanningId.value = null;
  }
};

const loadMoreRisks = async () => {
  if (!risksNextCursor.value || risksLoadingMore.value) return;
  risksLoadingMore.value = true;
  try {
    const resp = await $fetch('/api/brand-watch/risks', {
      query: buildRiskQuery({ cursor: risksNextCursor.value }),
    });
    const data = assertOk(resp, 'Failed to load more brand watch risks');
    riskItems.value = riskItems.value.concat(data.items || []);
    risksNextCursor.value = data.nextCursor || null;
  } catch (error) {
    toast.error(error?.message || 'Failed to load more brand watch risks');
  } finally {
    risksLoadingMore.value = false;
  }
};

const clearRiskFilters = () => {
  riskReviewStatus.value = '';
  riskStatus.value = '';
  riskTermId.value = '';
  riskSource.value = '';
  riskMutationType.value = '';
  riskFirstSeenFrom.value = '';
  riskLastSeenFrom.value = '';
};

const applyRiskCriteria = (criteria = {}) => {
  riskReviewStatus.value = criteria.reviewStatus || '';
  riskStatus.value = criteria.status || '';
  riskTermId.value = criteria.termId ? String(criteria.termId) : '';
  riskSource.value = criteria.source || '';
  riskMutationType.value = criteria.mutationType || '';
  riskFirstSeenFrom.value = criteria.firstSeenFrom || '';
  riskLastSeenFrom.value = criteria.lastSeenFrom || '';
};

const fetchSavedRiskViews = async () => {
  try {
    const resp = await $fetch('/api/filters', {
      query: { scope: 'brand-watch-risks' },
    });
    savedRiskViews.value = resp?.data?.items || [];
  } catch (error) {
    console.error('Failed to load Brand Watch views:', error);
  }
};

const openSaveRiskViewDialog = () => {
  saveRiskViewDialogOpen.value = true;
  saveRiskViewName.value = '';
  saveRiskViewDefault.value = false;
  savedViewsOpen.value = false;
};

const performSaveRiskView = async () => {
  const name = saveRiskViewName.value.trim();
  if (!name) return;
  try {
    await $fetch('/api/filters', {
      method: 'POST',
      body: {
        name,
        scope: 'brand-watch-risks',
        criteria: currentRiskCriteria.value,
        isDefault: saveRiskViewDefault.value,
      },
    });
    toast.success('Brand Watch view saved');
    saveRiskViewDialogOpen.value = false;
    await fetchSavedRiskViews();
  } catch (error) {
    toast.error(error?.data?.msg || error?.message || 'Failed to save Brand Watch view');
  }
};

const applySavedRiskView = (view, options = {}) => {
  applyRiskCriteria(view.criteria || {});
  savedViewsOpen.value = false;
  if (!options.silent) toast.success(`Loaded ${view.name}`);
};

const setDefaultRiskView = async (view) => {
  try {
    await $fetch(`/api/filters/${view.id}`, {
      method: 'PATCH',
      body: {
        scope: 'brand-watch-risks',
        isDefault: !view.isDefault,
      },
    });
    await fetchSavedRiskViews();
  } catch (error) {
    toast.error(error?.data?.msg || error?.message || 'Failed to update Brand Watch view');
  }
};

const deleteRiskView = async (view) => {
  if (!window.confirm(`Delete Brand Watch view "${view.name}"?`)) return;
  try {
    await $fetch(`/api/filters/${view.id}`, { method: 'DELETE' });
    toast.success('Brand Watch view deleted');
    await fetchSavedRiskViews();
  } catch (error) {
    toast.error(error?.data?.msg || error?.message || 'Failed to delete Brand Watch view');
  }
};

const updateRiskReview = async (risk, reviewStatus, reviewNote = undefined) => {
  if (updatingRiskId.value) return;
  updatingRiskId.value = risk.id;
  try {
    const body = { reviewStatus };
    if (reviewNote !== undefined) body.reviewNote = reviewNote;
    const resp = await $fetch(`/api/brand-watch/risks/${risk.id}`, {
      method: 'PATCH',
      body,
    });
    assertOk(resp, 'Failed to update candidate review');
    toast.success(`Candidate marked ${reviewStatus.toLowerCase()}`);
    await Promise.all([refreshRisks(), refreshSummary()]);
  } catch (error) {
    toast.error(error?.message || 'Failed to update candidate review');
  } finally {
    updatingRiskId.value = null;
  }
};

const editRiskNote = async (risk) => {
  const nextNote = window.prompt('Review note', risk.reviewNote || '');
  if (nextNote === null) return;
  await updateRiskReview(risk, risk.reviewStatus || 'OPEN', nextNote);
};

const onRisksScroll = (event) => {
  if (risksLoadingMore.value || !risksNextCursor.value) return;
  const el = event.target;
  const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
  if (remaining < 240) {
    loadMoreRisks();
  }
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const getSeverityTextClass = (severity) => {
  switch (severity) {
    case 'HIGH': return 'text-priority-high';
    case 'MEDIUM': return 'text-priority-medium';
    case 'LOW': return 'text-priority-low';
    default: return 'text-text-tertiary';
  }
};

const getStatusTextClass = (status) => {
  switch (status) {
    case 'REGISTERED': return 'text-status-dropping';
    case 'AVAILABLE': return 'text-status-available';
    case 'ERROR': return 'text-status-dropping';
    case 'UNKNOWN': return 'text-status-unknown';
    default: return 'text-text-tertiary';
  }
};

const getStatusDotClass = (status) => {
  switch (status) {
    case 'REGISTERED': return 'bg-status-dropping';
    case 'AVAILABLE': return 'bg-status-available';
    case 'ERROR': return 'bg-status-dropping';
    case 'UNKNOWN': return 'bg-status-unknown';
    default: return 'bg-text-tertiary';
  }
};

const getReviewTextClass = (status) => {
  switch (status) {
    case 'OPEN': return 'text-status-dropping';
    case 'WATCHING': return 'text-accent';
    case 'DISMISSED': return 'text-text-tertiary';
    case 'RESOLVED': return 'text-status-available';
    default: return 'text-text-tertiary';
  }
};

const summarizeEvidence = (risk) => {
  const evidence = risk.evidence || {};
  if (evidence.httpStatus) return `RDAP HTTP ${evidence.httpStatus}`;
  if (Array.isArray(evidence.matchedNames) && evidence.matchedNames.length) {
    return `CT observed ${evidence.matchedNames[0]}${evidence.matchedNames.length > 1 ? ` +${evidence.matchedNames.length - 1}` : ''}`;
  }
  if (evidence.errorName) return `Probe error: ${evidence.errorName}`;
  return 'No additional evidence recorded';
};

watch(
  [
    riskStatus,
    riskReviewStatus,
    riskTermId,
    riskSource,
    riskMutationType,
    riskFirstSeenFrom,
    riskLastSeenFrom,
  ],
  () => {
    refreshRisks();
  },
);

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
  await Promise.all([refreshAll(), fetchSavedRiskViews()]);
  const defaultView = savedRiskViews.value.find((view) => view.isDefault);
  if (defaultView) {
    applySavedRiskView(defaultView, { silent: true });
  }
});
</script>
