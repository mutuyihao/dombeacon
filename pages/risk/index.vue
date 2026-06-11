<template>
  <div class="flex min-h-full flex-col gap-6">
    <header class="shrink-0">
      <p class="eyebrow mb-2">{{ t('risk.overview.kicker') }}</p>
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="headline-display text-3xl md:text-4xl">{{ t('risk.overview.title') }}</h1>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
            {{ t('risk.overview.description') }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <NuxtLink :to="findingQueueLink({ status: 'OPEN' })" class="btn-ghost">
            {{ t('risk.overview.viewFindings') }}
            <ArrowRightIcon class="h-3.5 w-3.5" />
          </NuxtLink>
          <button
            type="button"
            class="btn-primary disabled:opacity-50"
            :disabled="pending || refreshing"
            @click="refreshSummary"
          >
            <RefreshCwIcon :class="['h-4 w-4', (pending || refreshing) && 'animate-spin']" />
            {{ t('risk.common.refresh') }}
          </button>
        </div>
      </div>
    </header>

    <section class="surface-flat grid gap-5 p-5 lg:grid-cols-[1.2fr_0.8fr]">
      <div class="flex gap-4">
        <div :class="['flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', postureIconClass]">
          <component :is="postureIcon" class="h-6 w-6" />
        </div>
        <div>
          <p class="eyebrow mb-2">{{ t('risk.overview.briefKicker') }}</p>
          <h2 class="headline-display text-2xl">{{ postureTitle }}</h2>
          <p class="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
            {{ postureDescription }}
          </p>
        </div>
      </div>
      <div class="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
        <div class="rounded-2xl border border-hairline bg-card px-4 py-3">
          <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
            {{ t('risk.overview.scope') }}
          </p>
          <p class="mt-1 font-mono text-sm text-text-main">
            {{ t('risk.common.ownedDomains', { count: summary.ownedDomains || 0 }) }}
          </p>
        </div>
        <div class="rounded-2xl border border-hairline bg-card px-4 py-3">
          <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
            {{ t('risk.overview.window') }}
          </p>
          <p class="mt-1 font-mono text-sm text-text-main">
            {{ t('risk.common.days', { count: summary.windowDays || 7 }) }}
          </p>
        </div>
        <div class="rounded-2xl border border-hairline bg-card px-4 py-3">
          <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
            {{ t('risk.overview.updated') }}
          </p>
          <p class="mt-1 font-mono text-sm text-text-main">{{ formatDate(summary.generatedAt) }}</p>
        </div>
      </div>
    </section>

    <section class="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
            <p class="font-sans mt-3 text-4xl font-bold leading-none tracking-tight text-text-main">
              {{ pending ? '-' : card.value }}
            </p>
          </div>
          <component :is="card.icon" :class="['h-5 w-5 text-text-tertiary transition-colors group-hover:text-accent', card.iconClass]" />
        </div>
        <p class="mt-4 text-xs leading-5 text-text-secondary">{{ card.hint }}</p>
      </NuxtLink>
    </section>

    <section class="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <article class="surface p-5">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="eyebrow mb-2">{{ t('risk.priorities.kicker') }}</p>
            <h2 class="headline-display text-2xl">{{ t('risk.priorities.title') }}</h2>
            <p class="mt-2 text-sm leading-6 text-text-secondary">{{ t('risk.priorities.description') }}</p>
          </div>
          <ListChecksIcon class="h-5 w-5 text-accent" />
        </div>

        <div v-if="pending" class="mt-5 space-y-3">
          <div v-for="i in 3" :key="i" class="h-20 animate-pulse rounded-2xl bg-surface-sunken" />
        </div>
        <div v-else-if="priorityItems.length" class="mt-5 space-y-3">
          <NuxtLink
            v-for="item in priorityItems"
            :key="item.key"
            :to="item.to"
            class="group block rounded-2xl border border-hairline bg-card p-4 transition-colors hover:bg-surface-sunken"
          >
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-sm font-semibold text-text-main group-hover:text-accent">{{ item.title }}</p>
                <p class="mt-1 text-xs leading-5 text-text-secondary">{{ item.description }}</p>
              </div>
              <span :class="['rounded-full px-3 py-1 font-mono text-xs', item.badgeClass]">{{ item.count }}</span>
            </div>
          </NuxtLink>
        </div>
        <p v-else class="mt-5 rounded-2xl bg-surface-sunken px-4 py-6 text-center text-sm text-text-secondary">
          {{ t('risk.priorities.empty') }}
        </p>
      </article>

      <article class="surface p-5">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="eyebrow mb-2">{{ t('risk.mix.kicker') }}</p>
            <h2 class="headline-display text-2xl">{{ t('risk.mix.title') }}</h2>
            <p class="mt-2 text-sm leading-6 text-text-secondary">{{ t('risk.mix.description') }}</p>
          </div>
          <PieChartIcon class="h-5 w-5 text-accent" />
        </div>

        <div v-if="pending" class="mt-6 space-y-3">
          <div v-for="i in 5" :key="i" class="h-9 animate-pulse rounded-xl bg-surface-sunken" />
        </div>
        <div v-else-if="findingTypeRows.length" class="mt-6 space-y-4">
          <NuxtLink
            v-for="row in findingTypeRows"
            :key="row.key"
            :to="findingQueueLink({ status: 'OPEN', findingType: row.key })"
            class="group block"
          >
            <div class="mb-1.5 flex items-center justify-between gap-3 text-xs">
              <span class="font-medium text-text-main group-hover:text-accent">{{ findingTypeLabel(row.key) }}</span>
              <span class="font-mono text-text-tertiary">{{ row.value }}</span>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-surface-sunken">
              <div class="h-full rounded-full bg-accent" :style="{ width: `${barPercent(row.value, summary.openFindings)}%` }" />
            </div>
          </NuxtLink>
        </div>
        <p v-else class="mt-6 rounded-2xl bg-surface-sunken px-4 py-6 text-center text-sm text-text-secondary">
          {{ t('risk.mix.empty') }}
        </p>
      </article>
    </section>

    <section class="grid gap-5 xl:grid-cols-2">
      <article class="surface p-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="eyebrow mb-2">{{ t('risk.domains.kicker') }}</p>
            <h2 class="headline-display text-2xl">{{ t('risk.domains.title') }}</h2>
          </div>
          <NuxtLink to="/domains" class="btn-text text-xs">
            {{ t('nav.domains') }}
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
                {{ t('risk.domains.findingSummary', {
                  count: domain.openFindingsCount || 0,
                  types: (domain.findingTypes || []).map(findingTypeLabel).join(', '),
                }) }}
              </p>
            </div>
            <div class="text-right">
              <p class="font-sans text-2xl font-bold tracking-tight text-text-main">{{ domain.riskScore }}</p>
              <p :class="['text-[10px] font-semibold uppercase tracking-[0.12em]', severityTextClass(domain.highestSeverity)]">
                {{ severityLabel(domain.highestSeverity || 'LOW') }}
              </p>
            </div>
          </NuxtLink>
        </div>
        <p v-else class="mt-8 rounded-2xl bg-surface-sunken px-4 py-6 text-center text-sm text-text-secondary">
          {{ t('risk.domains.empty') }}
        </p>
      </article>

      <article class="surface p-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="eyebrow mb-2">{{ t('risk.stream.kicker') }}</p>
            <h2 class="headline-display text-2xl">{{ t('risk.stream.title') }}</h2>
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
                <p class="mt-1 text-xs text-text-tertiary">{{ findingTypeLabel(finding.findingType) }}</p>
              </div>
              <span :class="['shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em]', severityTextClass(finding.severity)]">
                {{ severityLabel(finding.severity) }}
              </span>
            </div>
            <p class="mt-2 line-clamp-2 text-xs leading-5 text-text-secondary">
              {{ findingEvidence(finding) }}
            </p>
            <p class="mt-2 font-mono text-[11px] text-text-tertiary">
              {{ t('risk.stream.lastSeen', { time: formatDate(finding.lastSeenAt || finding.firstSeenAt) }) }}
            </p>
          </NuxtLink>
        </div>
        <p v-else class="mt-8 rounded-2xl bg-surface-sunken px-4 py-6 text-center text-sm text-text-secondary">
          {{ t('risk.stream.empty') }}
        </p>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  Activity as ActivityIcon,
  ArrowRight as ArrowRightIcon,
  CheckCircle as CheckCircleIcon,
  ListChecks as ListChecksIcon,
  PieChart as PieChartIcon,
  RefreshCw as RefreshCwIcon,
  ShieldAlert as ShieldAlertIcon,
  ShieldCheck as ShieldCheckIcon,
} from 'lucide-vue-next';

const { t, locale } = useI18n();

const { data, pending, refresh } = useLazyFetch<any>('/api/security/summary', {
  query: { windowDays: 7, limit: 6 },
});

const refreshing = ref(false);
const summary = computed<Record<string, any>>(() => data.value?.data || {});
const trends = computed<Record<string, any>>(() => summary.value.trends || {});
const topRiskDomains = computed(() => summary.value.topRiskDomains || []);
const recentFindings = computed(() => summary.value.recentFindings || []);

const postureLevel = computed(() => {
  if ((summary.value.highOpenFindings || 0) > 0) return 'critical';
  if ((summary.value.openFindings || 0) > 0) return 'watch';
  return 'clear';
});

const postureTitle = computed(() => t(`risk.posture.${postureLevel.value}.title`));
const postureDescription = computed(() =>
  t(`risk.posture.${postureLevel.value}.description`, {
    open: summary.value.openFindings || 0,
    high: summary.value.highOpenFindings || 0,
  }),
);
const postureIcon = computed(() => (postureLevel.value === 'clear' ? CheckCircleIcon : ShieldAlertIcon));
const postureIconClass = computed(() =>
  postureLevel.value === 'critical'
    ? 'bg-priority-high/10 text-priority-high'
    : postureLevel.value === 'watch'
      ? 'bg-priority-medium/10 text-priority-medium'
      : 'bg-status-available/10 text-status-available',
);

const metricCards = computed(() => [
  {
    key: 'open-findings',
    label: t('risk.metrics.openFindings'),
    value: summary.value.openFindings || 0,
    hint: t('risk.metrics.openFindingsHint', { count: summary.value.highOpenFindings || 0 }),
    to: findingQueueLink({ status: 'OPEN' }),
    icon: ShieldAlertIcon,
    iconClass: 'text-status-dropping',
    accent: 'bg-status-dropping',
  },
  {
    key: 'registrar-lock',
    label: t('risk.metrics.lockGaps'),
    value: summary.value.registrarLockGaps || 0,
    hint: t('risk.metrics.lockGapsHint', {
      count: trends.value.registrarLockGaps || 0,
      days: summary.value.windowDays || 7,
    }),
    to: findingQueueLink({ status: 'OPEN', findingType: 'REGISTRAR_LOCK_MISSING' }),
    icon: ShieldCheckIcon,
    iconClass: 'text-priority-medium',
    accent: 'bg-priority-medium',
  },
  {
    key: 'dns-drift',
    label: t('risk.metrics.dnsDrift'),
    value: summary.value.dnsDriftFindings || 0,
    hint: t('risk.metrics.dnsDriftHint', { count: trends.value.dnsDriftFindings || 0 }),
    to: findingQueueLink({ status: 'OPEN', findingType: 'NAMESERVER_DRIFT,MX_DRIFT' }),
    icon: ActivityIcon,
    iconClass: 'text-status-expiring',
    accent: 'bg-status-expiring',
  },
  {
    key: 'owned-domains',
    label: t('risk.metrics.ownedDomains'),
    value: summary.value.ownedDomains || 0,
    hint: t('risk.metrics.ownedDomainsHint'),
    to: '/domains',
    icon: CheckCircleIcon,
    iconClass: 'text-status-available',
    accent: 'bg-status-available',
  },
]);

const priorityItems = computed(() =>
  [
    {
      key: 'high',
      count: summary.value.highOpenFindings || 0,
      title: t('risk.priorities.highTitle'),
      description: t('risk.priorities.highDescription'),
      to: findingQueueLink({ status: 'OPEN', severity: 'HIGH' }),
      badgeClass: 'bg-priority-high/10 text-priority-high',
    },
    {
      key: 'lock',
      count: summary.value.registrarLockGaps || 0,
      title: t('risk.priorities.lockTitle'),
      description: t('risk.priorities.lockDescription'),
      to: findingQueueLink({ status: 'OPEN', findingType: 'REGISTRAR_LOCK_MISSING' }),
      badgeClass: 'bg-priority-medium/10 text-priority-medium',
    },
    {
      key: 'drift',
      count: summary.value.dnsDriftFindings || 0,
      title: t('risk.priorities.driftTitle'),
      description: t('risk.priorities.driftDescription'),
      to: findingQueueLink({ status: 'OPEN', findingType: 'NAMESERVER_DRIFT,MX_DRIFT' }),
      badgeClass: 'bg-status-expiring/10 text-status-expiring',
    },
  ].filter((item) => item.count > 0),
);

const objectRows = (value: Record<string, number> | undefined) =>
  Object.entries(value || {})
    .map(([key, count]) => ({ key, value: Number(count) || 0 }))
    .sort((left, right) => right.value - left.value || left.key.localeCompare(right.key));

const findingTypeRows = computed(() => objectRows(summary.value.findingTypeCounts));

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

const fallbackLabel = (value: string | null | undefined) =>
  String(value || t('risk.common.unknown')).replaceAll('_', ' ').toLowerCase();

const translatedLabel = (key: string, fallback: string) => {
  const value = t(key);
  return value === key ? fallback : value;
};

const findingTypeLabel = (value: string | null | undefined) =>
  translatedLabel(`risk.findingTypes.${value}`, fallbackLabel(value));

const severityLabel = (value: string | null | undefined) =>
  translatedLabel(`risk.severity.${value}`, fallbackLabel(value));

const findingQueueLink = (query: Record<string, any> = {}) => ({
  path: '/risk/findings',
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
  return date.toLocaleString(locale.value);
};

const formatEvidenceValue = (value: unknown) => {
  if (Array.isArray(value)) return value.length ? value.join(', ') : t('risk.common.none');
  if (value === undefined || value === null || value === '') return t('risk.common.unknown');
  return String(value);
};

const findingEvidence = (finding: any) => {
  const evidence = finding?.evidence || {};
  if (finding?.findingType === 'REGISTRAR_LOCK_MISSING') {
    return t('risk.evidence.registrarLock', {
      lockStatus: formatEvidenceValue(evidence.lockStatus),
      statuses: formatEvidenceValue(evidence.statuses),
    });
  }
  if (finding?.findingType === 'NAMESERVER_DRIFT' || finding?.findingType === 'MX_DRIFT') {
    return t('risk.evidence.drift', {
      previous: formatEvidenceValue(evidence.previous),
      current: formatEvidenceValue(evidence.current),
    });
  }
  if (finding?.findingType === 'DMARC_WEAK_POLICY') {
    return t('risk.evidence.dmarcPolicy', {
      policy: formatEvidenceValue(evidence.policy),
      pct: formatEvidenceValue(evidence.pct),
    });
  }
  if (evidence.checkedRecord) {
    return t('risk.evidence.checkedRecord', { record: evidence.checkedRecord });
  }
  return t('risk.evidence.raw', { value: JSON.stringify(evidence).slice(0, 180) });
};
</script>
