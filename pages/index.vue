<template>
  <div class="flex flex-col gap-8 md:gap-10">
    <!-- ─── HERO ────────────────────────────────────────────────────────── -->
    <section class="relative">
      <p class="eyebrow mb-3">{{ $t('dashboard.kicker') }}</p>

      <h1 class="headline-display max-w-4xl text-[2.2rem] leading-[1.1] sm:text-[2.8rem] md:text-[3.2rem]">
        {{ $t('dashboard.title') }}
      </h1>

      <p class="mt-4 max-w-2xl text-sm leading-[1.6] text-text-secondary">
        {{ $t('dashboard.description') }}
      </p>

      <div class="mt-6 flex flex-wrap gap-3">
        <NuxtLink to="/domains" class="btn-primary">
          <span>{{ $t('dashboard.quickDomains') }}</span>
          <ArrowRightIcon class="h-4 w-4" />
        </NuxtLink>
        <NuxtLink to="/actions" class="btn-ghost border border-card-border bg-card shadow-soft hover:bg-surface-sunken">
          <span>{{ $t('dashboard.quickActions') }}</span>
          <ArrowRightIcon class="h-4 w-4" />
        </NuxtLink>
      </div>
    </section>

    <!-- ─── METRIC STRIP — 5 hover-lift cards ──── -->
    <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <NuxtLink
        v-for="metric in metrics"
        :key="metric.key"
        :to="metric.to"
        class="group surface relative flex flex-col justify-between p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-elevated hover:border-accent/30"
      >
        <div>
          <p class="eyebrow flex items-center justify-between">
            <span>{{ metric.label }}</span>
            <component :is="metric.icon" :class="['h-4 w-4 opacity-50 transition-opacity group-hover:opacity-100 group-hover:text-accent', metric.iconClass]" />
          </p>
          <p class="font-sans mt-5 text-[2.2rem] font-bold leading-none tracking-tight text-text-main transition-colors group-hover:text-accent" data-numeric>
            {{ metric.value }}
          </p>
        </div>
        <p class="mt-3 text-xs leading-[1.5] text-text-secondary">{{ metric.hint }}</p>
      </NuxtLink>
    </section>

    <!-- ─── WIDGET GRID ───────────────────────────────────────────────── -->
    <section class="grid items-stretch gap-5 xl:grid-cols-2">

      <!-- Action Queue Widget -->
      <div class="surface flex h-full min-h-[16rem] flex-col p-6 xl:min-h-[18rem]">
        <div class="flex flex-1 flex-col">
          <div class="flex items-center justify-between gap-4">
            <h2 class="headline-display flex items-center gap-2 text-lg font-bold">
              <ListTodoIcon class="h-5 w-5 text-accent" />
              {{ $t('dashboard.openActions') }}
            </h2>
            <div class="flex shrink-0 items-center gap-3">
              <span v-if="!actionsLoading && openActions.length" class="rounded-full bg-accent-glow px-2.5 py-0.5 text-xs font-semibold text-accent" data-numeric>
                {{ openActions.length }}
              </span>
              <NuxtLink to="/actions" class="btn-text whitespace-nowrap text-xs">
                <span>{{ $t('dashboard.viewAll') }}</span>
                <ArrowRightIcon class="h-3.5 w-3.5" />
              </NuxtLink>
            </div>
          </div>
          <p class="mt-1 text-xs text-text-secondary">{{ $t('dashboard.openActionsHint') }}</p>
          <div class="hairline mt-4" />

          <div v-if="actionsLoading" class="space-y-2 pt-3">
            <div v-for="i in 4" :key="i" class="h-12 animate-pulse rounded-md bg-surface-sunken" />
          </div>

          <div v-else-if="openActions.length" class="divide-y divide-hairline">
            <NuxtLink
              v-for="action in openActions"
              :key="action.id"
              :to="`/domains/${action.domainId}`"
              class="metric-row is-link"
            >
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span :class="['h-1.5 w-1.5 rounded-full', priorityDot(action.priority)]" />
                  <p class="metric-row-label truncate font-mono text-[13.5px] font-medium text-text-main transition-colors">
                    {{ action.domain?.domain || '—' }}
                  </p>
                </div>
                <p class="mt-1 ml-3.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">
                  {{ formatActionType(action.actionType) }}
                </p>
              </div>
              <ArrowRightIcon class="h-4 w-4 text-text-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
            </NuxtLink>
          </div>

          <div v-else class="flex flex-1 flex-col items-center justify-center py-8 text-center">
            <CheckCircleIcon class="mx-auto mb-3 h-8 w-8 text-status-available" />
            <p class="text-sm text-text-secondary">{{ $t('dashboard.noOpenActions') }}</p>
          </div>
        </div>
      </div>

      <!-- SSL Radar Widget -->
      <div class="surface flex h-full min-h-[16rem] flex-col p-6 xl:min-h-[18rem]">
        <div class="flex flex-1 flex-col">
          <div class="flex items-center justify-between gap-4">
            <h2 class="headline-display flex items-center gap-2 text-lg font-bold">
              <ShieldAlertIcon class="h-5 w-5 text-accent" />
              {{ $t('dashboard.sslRadar') }}
            </h2>
            <NuxtLink to="/ssl" class="btn-text whitespace-nowrap text-xs">
              <span>{{ $t('dashboard.viewAll') }}</span>
              <ArrowRightIcon class="h-3.5 w-3.5" />
            </NuxtLink>
          </div>
          <p class="mt-1 text-xs text-text-secondary">{{ $t('dashboard.sslRadarHint') }}</p>
          <div class="hairline mt-4" />

          <div class="divide-y divide-hairline">
            <NuxtLink
              v-for="risk in sslRisks"
              :key="risk.key"
              :to="risk.to"
              class="metric-row is-link"
            >
              <div class="flex min-w-0 items-center gap-3">
                <span :class="['h-1.5 w-1.5 rounded-full', risk.dot]" />
                <div class="min-w-0">
                  <p class="metric-row-label truncate text-[13.5px] font-medium text-text-main">{{ risk.label }}</p>
                  <p class="mt-0.5 truncate text-[11px] text-text-tertiary">{{ risk.hint }}</p>
                </div>
              </div>
              <span class="font-sans text-xl font-bold tracking-tight text-text-main" data-numeric>{{ risk.value }}</span>
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Delivery Health Widget -->
      <div class="surface flex h-full min-h-[16rem] flex-col p-6 xl:min-h-[18rem]">
        <div class="flex flex-1 flex-col">
          <div class="flex items-center justify-between gap-4">
            <h2 class="headline-display flex items-center gap-2 text-lg font-bold">
              <BellIcon class="h-5 w-5 text-accent" />
              {{ $t('dashboard.failedNotifications') }}
            </h2>
            <div class="flex shrink-0 items-center gap-3">
              <span v-if="!notificationsLoading && failedNotifications.length" class="rounded-full bg-status-dropping/10 px-2.5 py-0.5 text-xs font-semibold text-status-dropping" data-numeric>
                {{ failedNotifications.length }}
              </span>
              <NuxtLink to="/notifications" class="btn-text whitespace-nowrap text-xs">
                <span>{{ $t('dashboard.viewAll') }}</span>
                <ArrowRightIcon class="h-3.5 w-3.5" />
              </NuxtLink>
            </div>
          </div>
          <p class="mt-1 text-xs text-text-secondary">{{ $t('dashboard.failedNotificationsHint') }}</p>
          <div class="hairline mt-4" />

          <div v-if="notificationsLoading" class="space-y-2 pt-3">
            <div v-for="i in 3" :key="i" class="h-12 animate-pulse rounded-md bg-surface-sunken" />
          </div>

          <div v-else-if="failedNotifications.length" class="divide-y divide-hairline">
            <div
              v-for="event in failedNotifications"
              :key="event.id"
              class="py-3.5"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="flex min-w-0 items-center gap-3">
                  <span class="h-3 w-px bg-status-dropping" />
                  <p class="truncate font-mono text-[13.5px] font-medium text-text-main">{{ event.domain || event.eventType }}</p>
                </div>
                <span class="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-status-dropping">
                  {{ event.channel }}
                </span>
              </div>
              <p class="mt-1.5 ml-4 line-clamp-2 text-xs leading-relaxed text-text-secondary">
                {{ event.errorMessage || '—' }}
              </p>
            </div>
          </div>

          <div v-else class="flex flex-1 flex-col items-center justify-center py-8 text-center">
            <BellIcon class="mx-auto mb-3 h-8 w-8 text-status-available opacity-60" />
            <p class="text-sm text-text-secondary">{{ $t('dashboard.noFailedNotifications') }}</p>
          </div>
        </div>
      </div>

      <!-- System Cadence Widget -->
      <div class="surface flex h-full min-h-[16rem] flex-col p-6 xl:min-h-[18rem]">
        <div class="flex flex-1 flex-col">
          <div class="flex items-center justify-between gap-4">
            <h2 class="headline-display flex items-center gap-2 text-lg font-bold">
              <ActivityIcon class="h-5 w-5 text-accent" />
              {{ $t('dashboard.recentTasks') }}
            </h2>
            <NuxtLink to="/tasks" class="btn-text whitespace-nowrap text-xs">
              <span>{{ $t('dashboard.viewAll') }}</span>
              <ArrowRightIcon class="h-3.5 w-3.5" />
            </NuxtLink>
          </div>
          <p class="mt-1 text-xs text-text-secondary">{{ $t('dashboard.recentTasksHint') }}</p>
          <div class="hairline mt-4" />

          <div v-if="tasksLoading" class="space-y-2 pt-3">
            <div v-for="i in 3" :key="i" class="h-12 animate-pulse rounded-md bg-surface-sunken" />
          </div>

          <div v-else-if="recentTasks.length" class="divide-y divide-hairline">
            <div
              v-for="run in recentTasks"
              :key="run.id"
              class="metric-row"
            >
              <div class="min-w-0">
                <p class="truncate text-[13.5px] font-medium text-text-main">{{ run.taskName }}</p>
                <p class="mt-1 text-xs text-text-tertiary">{{ formatDateTime(run.finishedAt || run.startedAt) }}</p>
              </div>
              <span :class="['text-[10px] font-semibold uppercase tracking-[0.14em]', taskClass(run)]">
                {{ taskLabel(run) }}
              </span>
            </div>
          </div>

          <div v-else class="flex flex-1 flex-col items-center justify-center py-8 text-center">
            <ActivityIcon class="mx-auto mb-3 h-8 w-8 text-text-tertiary" />
            <p class="text-sm text-text-secondary">{{ $t('dashboard.noTaskRuns') }}</p>
          </div>
        </div>
      </div>

    </section>

  </div>
</template>

<script setup>
import {
  Activity as ActivityIcon,
  ArrowRight as ArrowRightIcon,
  BellRing as BellIcon,
  CheckCircle2 as CheckCircleIcon,
  DollarSign as DollarSignIcon,
  Globe2 as GlobeIcon,
  ListTodo as ListTodoIcon,
  ShieldAlert as ShieldAlertIcon,
  ShieldCheck as ShieldCheckIcon,
} from '@lucide/vue';

const { t } = useI18n();

const domainsFetch = useLazyFetch('/api/domains', { query: { limit: 200 } });
const actionsFetch = useLazyFetch('/api/actions', { query: { status: 'OPEN', limit: 5 } });
const sslFetch = useLazyFetch('/api/ssl');
const notificationsFetch = useLazyFetch('/api/notifications', { query: { status: 'FAILED', limit: 5 } });
const tasksFetch = useLazyFetch('/api/tasks/runs', { query: { limit: 3 } });
const costsFetch = useLazyFetch('/api/costs/summary', { query: { year: new Date().getFullYear() } });

const { data: domainsData, pending: domainsLoading } = domainsFetch;
const { data: actionsData, pending: actionsLoading } = actionsFetch;
const { data: sslData, pending: sslLoading } = sslFetch;
const { data: notificationsData, pending: notificationsLoading } = notificationsFetch;
const { data: tasksData, pending: tasksLoading } = tasksFetch;
const { data: costsData, pending: costsLoading } = costsFetch;

const domainItems = computed(() => domainsData.value?.data?.items || []);
const totalDomains = computed(() => domainsData.value?.data?.total || domainItems.value.length);
const openActions = computed(() => actionsData.value?.data?.items || []);
const sslItems = computed(() => sslData.value?.data || []);
const failedNotifications = computed(() => notificationsData.value?.data?.items || []);
const recentTasks = computed(() => tasksData.value?.data?.items || []);
const costSummary = computed(() => costsData.value?.data || {});

const sslExpiring = computed(() =>
  sslItems.value.filter((s) => s.checkedAt && s.hasSSL && s.daysUntilExpiry !== null && s.daysUntilExpiry < 30).length,
);
const sslInvalid = computed(() =>
  sslItems.value.filter((s) => s.checkedAt && s.hasSSL && !s.isValid).length,
);
const sslUnchecked = computed(() =>
  sslItems.value.filter((s) => !s.checkedAt).length,
);

const ownedCount = computed(() => domainItems.value.filter((d) => d.watchKind === 'OWNED').length);
const wantedCount = computed(() => domainItems.value.filter((d) => d.watchKind === 'WANTED').length);

const quickLinks = computed(() => [
  { to: '/domains', label: t('nav.domains') },
  { to: '/actions', label: t('nav.actions') },
  { to: '/ssl', label: t('nav.ssl') },
  { to: '/costs', label: t('nav.costs') },
  { to: '/notifications', label: t('nav.notifications') },
]);

const metrics = computed(() => [
  {
    key: 'domains',
    label: t('dashboard.metrics.domains'),
    value: domainsLoading.value ? '—' : totalDomains.value,
    hint: t('dashboard.metrics.domainsHint', { owned: ownedCount.value, wanted: wantedCount.value }),
    to: '/domains',
    icon: GlobeIcon,
    iconClass: 'text-accent',
  },
  {
    key: 'actions',
    label: t('dashboard.metrics.actions'),
    value: actionsLoading.value ? '—' : actionsData.value?.data?.total || 0,
    hint: t('dashboard.metrics.actionsHint'),
    to: '/actions',
    icon: ListTodoIcon,
    iconClass: 'text-status-expiring',
  },
  {
    key: 'costs',
    label: t('dashboard.metrics.costs'),
    value: costsLoading.value ? '—' : formatCurrency(costSummary.value.total || 0, costSummary.value.currency),
    hint: t('dashboard.metrics.costsHint', { year: new Date().getFullYear() }),
    to: '/costs',
    icon: DollarSignIcon,
    iconClass: 'text-priority-low',
  },
  {
    key: 'ssl',
    label: t('dashboard.metrics.ssl'),
    value: sslLoading.value ? '—' : sslExpiring.value + sslInvalid.value,
    hint: t('dashboard.metrics.sslHint', { unchecked: sslUnchecked.value }),
    to: '/ssl',
    icon: ShieldAlertIcon,
    iconClass: 'text-status-dropping',
  },
  {
    key: 'notifications',
    label: t('dashboard.metrics.notifications'),
    value: notificationsLoading.value ? '—' : notificationsData.value?.data?.total || 0,
    hint: t('dashboard.metrics.notificationsHint'),
    to: '/notifications',
    icon: BellIcon,
    iconClass: 'text-status-registered',
  },
]);

const sslRisks = computed(() => [
  {
    key: 'expiring',
    label: t('ssl.filters.expiring'),
    hint: t('dashboard.sslExpiringHint'),
    value: sslExpiring.value,
    to: '/ssl',
    dot: 'bg-status-expiring',
  },
  {
    key: 'invalid',
    label: t('ssl.filters.invalid'),
    hint: t('dashboard.sslInvalidHint'),
    value: sslInvalid.value,
    to: '/ssl',
    dot: 'bg-status-dropping',
  },
  {
    key: 'unchecked',
    label: t('ssl.filters.unchecked'),
    hint: t('dashboard.sslUncheckedHint'),
    value: sslUnchecked.value,
    to: '/ssl',
    dot: 'bg-text-tertiary',
  },
]);

const priorityDot = (priority) => {
  if (priority === 'HIGH') return 'bg-priority-high';
  if (priority === 'LOW') return 'bg-priority-low';
  return 'bg-priority-medium';
};

const formatActionType = (type) => {
  if (!type) return '—';
  return String(type).replaceAll('_', ' ').toLowerCase();
};

const formatDateTime = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleString();
};

const formatCurrency = (cents, currency = 'USD') => {
  const amount = Number(cents || 0) / 100;
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
};

const taskLabel = (run) => {
  const fail = Number(run.result?.fail || 0);
  return fail > 0 ? t('dashboard.taskIssue') : t('dashboard.taskOk');
};

const taskClass = (run) => {
  const fail = Number(run.result?.fail || 0);
  return fail > 0 ? 'text-status-expiring' : 'text-status-available';
};
</script>
