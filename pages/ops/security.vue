<template>
  <div class="flex min-h-full flex-col gap-6 md:h-full md:min-h-0 md:overflow-hidden">
    <header class="shrink-0">
      <p class="eyebrow mb-2">Attack surface</p>
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="headline-display text-3xl md:text-4xl">Risk Dashboard</h1>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
            Owned-domain posture and Brand Watch registrations in one triage view.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <NuxtLink :to="findingQueueLink({ status: 'OPEN' })" class="btn-ghost">
            Findings
            <ArrowRightIcon class="h-3.5 w-3.5" />
          </NuxtLink>
          <NuxtLink to="/brand-watch" class="btn-ghost">
            Brand Watch
            <ArrowRightIcon class="h-3.5 w-3.5" />
          </NuxtLink>
          <button
            type="button"
            class="btn-primary disabled:opacity-50"
            :disabled="pending || refreshing"
            @click="refreshSummary"
          >
            <RefreshCwIcon :class="['h-4 w-4', (pending || refreshing) && 'animate-spin']" />
            Refresh
          </button>
        </div>
      </div>
    </header>

    <section class="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <NuxtLink
        v-for="card in metricCards"
        :key="card.key"
        :to="card.to"
        class="surface-flat group relative overflow-hidden p-5 transition-shadow hover:shadow-elevated"
      >
        <span :class="['absolute left-0 top-5 h-8 w-0.5 rounded-r-full', card.accent]" />
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
              {{ card.label }}
            </p>
            <p class="font-display mt-3 text-4xl font-medium leading-none tracking-[-0.04em] text-text-main">
              {{ pending ? "-" : card.value }}
            </p>
          </div>
          <component :is="card.icon" :class="['h-5 w-5 text-text-tertiary transition-colors group-hover:text-accent', card.iconClass]" />
        </div>
        <p class="mt-4 text-xs leading-5 text-text-secondary">{{ card.hint }}</p>
      </NuxtLink>
    </section>

    <section class="grid min-h-0 flex-1 gap-5 xl:grid-cols-[1.05fr_0.95fr]">
      <div class="min-h-0 overflow-y-auto rounded-[18px] border border-hairline bg-card/45 p-4">
        <div class="grid gap-4 lg:grid-cols-2">
          <article class="surface p-5">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="eyebrow mb-2">Owned posture</p>
                <h2 class="headline-display text-2xl">Open finding mix</h2>
                <p class="mt-2 text-sm text-text-secondary">
                  Current `OPEN` DNS and RDAP findings across active owned domains.
                </p>
              </div>
              <span class="rounded-full bg-surface-sunken px-3 py-1 text-xs font-mono text-text-secondary">
                {{ summary.ownedDomains || 0 }} owned
              </span>
            </div>

            <div v-if="pending" class="mt-6 space-y-2">
              <div v-for="i in 5" :key="i" class="h-10 animate-pulse rounded-xl bg-surface-sunken" />
            </div>
            <div v-else-if="findingTypeRows.length" class="mt-6 space-y-4">
              <div v-for="row in findingTypeRows" :key="row.key">
                <div class="mb-1.5 flex items-center justify-between gap-3 text-xs">
                  <span class="font-mono uppercase tracking-[0.08em] text-text-main">{{ formatType(row.key) }}</span>
                  <span class="font-mono text-text-tertiary">{{ row.value }}</span>
                </div>
                <div class="h-2 overflow-hidden rounded-full bg-surface-sunken">
                  <div class="h-full rounded-full bg-accent" :style="{ width: `${barPercent(row.value, summary.openFindings)}%` }" />
                </div>
              </div>
            </div>
            <p v-else class="mt-8 rounded-2xl bg-surface-sunken px-4 py-6 text-center text-sm text-text-secondary">
              No open security findings.
            </p>
          </article>

          <article class="surface p-5">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="eyebrow mb-2">Trend window</p>
                <h2 class="headline-display text-2xl">New risk signals</h2>
                <p class="mt-2 text-sm text-text-secondary">
                  First-seen counts inside the last {{ summary.windowDays || 7 }} days.
                </p>
              </div>
              <TrendingUpIcon class="h-5 w-5 text-accent" />
            </div>

            <div class="mt-6 grid grid-cols-2 gap-3">
              <div v-for="item in trendCards" :key="item.key" class="rounded-2xl border border-hairline bg-card px-4 py-4">
                <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">{{ item.label }}</p>
                <p class="font-display mt-3 text-3xl font-medium leading-none tracking-[-0.04em] text-text-main">
                  {{ pending ? "-" : item.value }}
                </p>
              </div>
            </div>

            <div class="mt-5 rounded-2xl bg-surface-sunken p-4">
              <p class="text-xs leading-5 text-text-secondary">
                Registrar gaps track missing transfer locks. DNS drift tracks nameserver and MX changes from the previous baseline. Lookalikes count active `OPEN` or `WATCHING` registered Brand Watch candidates.
              </p>
            </div>

            <div class="mt-5">
              <div class="mb-2 flex items-center justify-between gap-3">
                <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">Risk pressure history</p>
                <span class="font-mono text-[11px] text-text-tertiary">{{ riskMetricHistory.length }} runs</span>
              </div>
              <div v-if="riskMetricHistory.length" class="flex h-16 items-end gap-1 rounded-2xl border border-hairline bg-card px-3 py-3">
                <div
                  v-for="point in riskMetricHistory"
                  :key="point.runId"
                  class="min-w-[4px] flex-1 rounded-t bg-accent/75"
                  :title="historyTitle(point)"
                  :style="{ height: `${historyBarHeight(point)}%` }"
                />
              </div>
              <p v-else class="rounded-2xl border border-dashed border-hairline px-4 py-4 text-xs text-text-secondary">
                Run a scheduled or manual scan to start recording risk metric snapshots.
              </p>
            </div>
          </article>
        </div>

        <div class="mt-5 grid gap-4 lg:grid-cols-2">
          <article class="surface p-5">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="eyebrow mb-2">Domain priority</p>
                <h2 class="headline-display text-2xl">Top risk domains</h2>
              </div>
              <NuxtLink to="/domains" class="btn-text text-xs">
                Domains
                <ArrowRightIcon class="h-3.5 w-3.5" />
              </NuxtLink>
            </div>

            <div v-if="topRiskDomains.length" class="mt-4 divide-y divide-hairline">
              <NuxtLink
                v-for="domain in topRiskDomains"
                :key="domain.domainId"
                :to="findingQueueLink({ status: 'OPEN', domainId: domain.domainId })"
                class="group flex items-center justify-between gap-4 py-4"
              >
                <div class="min-w-0">
                  <p class="truncate font-mono text-sm font-medium text-text-main group-hover:text-accent">
                    {{ domain.domain || `#${domain.domainId}` }}
                  </p>
                  <p class="mt-1 truncate text-xs text-text-tertiary">
                    {{ domain.openFindingsCount }} open - {{ (domain.findingTypes || []).map(formatType).join(", ") }}
                  </p>
                </div>
                <div class="text-right">
                  <p class="font-display text-2xl font-medium text-text-main">{{ domain.riskScore }}</p>
                  <p :class="['text-[10px] font-semibold uppercase tracking-[0.12em]', severityTextClass(domain.highestSeverity)]">
                    {{ domain.highestSeverity || "LOW" }}
                  </p>
                </div>
              </NuxtLink>
            </div>
            <p v-else class="mt-8 rounded-2xl bg-surface-sunken px-4 py-6 text-center text-sm text-text-secondary">
              No owned domains need risk triage.
            </p>
          </article>

          <article class="surface p-5">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="eyebrow mb-2">Brand abuse</p>
                <h2 class="headline-display text-2xl">Registered lookalikes</h2>
              </div>
              <NuxtLink to="/brand-watch" class="btn-text text-xs">
                Brand Watch
                <ArrowRightIcon class="h-3.5 w-3.5" />
              </NuxtLink>
            </div>

            <div class="mt-5 grid grid-cols-2 gap-3">
              <div v-for="row in brandSourceRows" :key="row.key" class="rounded-2xl bg-surface-sunken px-4 py-4">
                <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">{{ row.key }}</p>
                <p class="font-display mt-3 text-3xl font-medium leading-none tracking-[-0.04em] text-text-main">{{ row.value }}</p>
              </div>
            </div>

            <div v-if="recentBrandRisks.length" class="mt-4 divide-y divide-hairline">
              <NuxtLink
                v-for="risk in recentBrandRisks"
                :key="risk.id"
                to="/brand-watch"
                class="group flex items-center justify-between gap-4 py-4"
              >
                <div class="min-w-0">
                  <p class="truncate font-mono text-sm font-medium text-text-main group-hover:text-accent">{{ risk.domain }}</p>
                  <p class="mt-1 truncate text-xs text-text-tertiary">
                    {{ risk.term || "term" }} - {{ risk.source }} - {{ risk.mutationType }}
                  </p>
                </div>
                <span :class="['text-[10px] font-semibold uppercase tracking-[0.12em]', severityTextClass(risk.severity)]">
                  {{ risk.severity }}
                </span>
              </NuxtLink>
            </div>
            <p v-else class="mt-8 rounded-2xl bg-surface-sunken px-4 py-6 text-center text-sm text-text-secondary">
              No active registered lookalikes.
            </p>
          </article>
        </div>
      </div>

      <aside class="min-h-0 overflow-y-auto rounded-[18px] border border-hairline bg-card/45 p-4">
        <article class="surface p-5">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="eyebrow mb-2">Risk stream</p>
              <h2 class="headline-display text-2xl">Recent findings</h2>
            </div>
            <ShieldAlertIcon class="h-5 w-5 text-status-dropping" />
          </div>

          <div v-if="recentFindings.length" class="mt-4 divide-y divide-hairline">
            <NuxtLink
              v-for="finding in recentFindings"
              :key="finding.id"
              :to="findingQueueLink({ status: 'OPEN', domainId: finding.domainId, findingType: finding.findingType })"
              class="group block py-4"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <p class="truncate font-mono text-sm font-medium text-text-main group-hover:text-accent">
                    {{ finding.domain || `#${finding.domainId}` }}
                  </p>
                  <p class="mt-1 text-xs uppercase tracking-[0.12em] text-text-tertiary">{{ formatType(finding.findingType) }}</p>
                </div>
                <span :class="['shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em]', severityTextClass(finding.severity)]">
                  {{ finding.severity }}
                </span>
              </div>
              <p class="mt-2 line-clamp-2 text-xs leading-5 text-text-secondary">
                {{ findingEvidence(finding) }}
              </p>
              <p class="mt-2 font-mono text-[11px] text-text-tertiary">
                Last seen {{ formatDate(finding.lastSeenAt || finding.firstSeenAt) }}
              </p>
            </NuxtLink>
          </div>
          <p v-else class="mt-8 rounded-2xl bg-surface-sunken px-4 py-6 text-center text-sm text-text-secondary">
            No recent open findings.
          </p>
        </article>
      </aside>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  Activity as ActivityIcon,
  ArrowRight as ArrowRightIcon,
  Radar as RadarIcon,
  RefreshCw as RefreshCwIcon,
  ShieldAlert as ShieldAlertIcon,
  ShieldCheck as ShieldCheckIcon,
  TrendingUp as TrendingUpIcon,
} from 'lucide-vue-next';

const { data, pending, refresh } = await useFetch<any>('/api/security/summary', {
  query: { windowDays: 7, limit: 8 },
});

const refreshing = ref(false);
const summary = computed<Record<string, any>>(() => data.value?.data || {});
const trends = computed<Record<string, any>>(() => summary.value.trends || {});
const topRiskDomains = computed(() => summary.value.topRiskDomains || []);
const recentFindings = computed(() => summary.value.recentFindings || []);
const recentBrandRisks = computed(() => summary.value.recentBrandRisks || []);
const riskMetricHistory = computed(() => summary.value.riskMetricHistory || []);
const maxRiskPressure = computed(() =>
  Math.max(
    1,
    ...riskMetricHistory.value.map((point: any) =>
      Number(point?.metrics?.riskPressureScore || 0),
    ),
  ),
);

const metricCards = computed(() => [
  {
    key: 'open-findings',
    label: 'Open findings',
    value: summary.value.openFindings || 0,
    hint: `${summary.value.highOpenFindings || 0} high severity`,
    to: findingQueueLink({ status: 'OPEN' }),
    icon: ShieldAlertIcon,
    iconClass: 'text-status-dropping',
    accent: 'bg-status-dropping',
  },
  {
    key: 'registrar-lock',
    label: 'Lock gaps',
    value: summary.value.registrarLockGaps || 0,
    hint: `${trends.value.registrarLockGaps || 0} new in ${summary.value.windowDays || 7}d`,
    to: findingQueueLink({ status: 'OPEN', findingType: 'REGISTRAR_LOCK_MISSING' }),
    icon: ShieldCheckIcon,
    iconClass: 'text-priority-medium',
    accent: 'bg-priority-medium',
  },
  {
    key: 'dns-drift',
    label: 'DNS drift',
    value: summary.value.dnsDriftFindings || 0,
    hint: `${trends.value.dnsDriftFindings || 0} new nameserver or MX changes`,
    to: findingQueueLink({ status: 'OPEN', findingType: 'NAMESERVER_DRIFT,MX_DRIFT' }),
    icon: ActivityIcon,
    iconClass: 'text-status-expiring',
    accent: 'bg-status-expiring',
  },
  {
    key: 'lookalikes',
    label: 'Lookalikes',
    value: summary.value.registeredLookalikes || 0,
    hint: `${summary.value.ctRegisteredLookalikes || 0} CT, ${summary.value.rdapRegisteredLookalikes || 0} RDAP`,
    to: '/brand-watch',
    icon: RadarIcon,
    iconClass: 'text-accent',
    accent: 'bg-accent',
  },
  {
    key: 'brand-high',
    label: 'High brand risk',
    value: summary.value.highRegisteredLookalikes || 0,
    hint: `${trends.value.registeredLookalikes || 0} new registrations`,
    to: '/brand-watch',
    icon: TrendingUpIcon,
    iconClass: 'text-priority-high',
    accent: 'bg-priority-high',
  },
]);

const trendCards = computed(() => [
  { key: 'open', label: 'Findings', value: trends.value.openFindings || 0 },
  { key: 'lock', label: 'Lock gaps', value: trends.value.registrarLockGaps || 0 },
  { key: 'drift', label: 'DNS drift', value: trends.value.dnsDriftFindings || 0 },
  { key: 'brand', label: 'Lookalikes', value: trends.value.registeredLookalikes || 0 },
]);

const objectRows = (value: Record<string, number> | undefined) =>
  Object.entries(value || {})
    .map(([key, count]) => ({ key, value: Number(count) || 0 }))
    .sort((left, right) => right.value - left.value || left.key.localeCompare(right.key));

const findingTypeRows = computed(() => objectRows(summary.value.findingTypeCounts));
const brandSourceRows = computed(() => {
  const rows = objectRows(summary.value.brandSourceCounts);
  return rows.length ? rows : [{ key: 'rdap', value: 0 }, { key: 'ct', value: 0 }];
});

const refreshSummary = async () => {
  if (refreshing.value) return;
  refreshing.value = true;
  try {
    await refresh();
  } finally {
    refreshing.value = false;
  }
};

const barPercent = (value: number, total: number) => {
  if (!total) return 0;
  return Math.max(4, Math.min(100, Math.round((value / total) * 100)));
};

const historyBarHeight = (point: any) => {
  const score = Number(point?.metrics?.riskPressureScore || 0);
  if (!score) return 8;
  return Math.max(12, Math.round((score / maxRiskPressure.value) * 100));
};

const historyTitle = (point: any) => {
  const metrics = point?.metrics || {};
  return [
    point?.taskName || 'task',
    `score=${metrics.riskPressureScore || 0}`,
    `open=${metrics.openFindings || 0}`,
    `lookalikes=${metrics.registeredLookalikes || 0}`,
    formatDate(point?.finishedAt || point?.startedAt),
  ].join(' | ');
};

const formatType = (value: string) =>
  String(value || 'unknown').replaceAll('_', ' ').toLowerCase();

const findingQueueLink = (query: Record<string, any> = {}) => ({
  path: '/ops/findings',
  query: Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  ),
});

const severityTextClass = (severity: string | null | undefined) => {
  if (severity === 'HIGH') return 'text-priority-high';
  if (severity === 'MEDIUM') return 'text-priority-medium';
  if (severity === 'LOW') return 'text-priority-low';
  return 'text-text-tertiary';
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const findingEvidence = (finding: any) => {
  const evidence = finding?.evidence || {};
  if (finding?.findingType === 'REGISTRAR_LOCK_MISSING') {
    return `lockStatus=${evidence.lockStatus || 'unknown'}`;
  }
  if (finding?.findingType === 'NAMESERVER_DRIFT' || finding?.findingType === 'MX_DRIFT') {
    return `previous=${JSON.stringify(evidence.previous || [])}; current=${JSON.stringify(evidence.current || [])}`;
  }
  if (finding?.findingType === 'DMARC_WEAK_POLICY') {
    return `policy=${evidence.policy || 'unknown'}; pct=${evidence.pct ?? 'unknown'}`;
  }
  return JSON.stringify(evidence).slice(0, 180);
};
</script>
