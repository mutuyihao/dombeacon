<template>
  <div class="space-y-8 md:space-y-10">
    <section class="editorial-panel relative overflow-hidden rounded-[2rem] px-6 py-8 md:px-10 md:py-12">
      <div class="absolute inset-0 bg-app-grid opacity-25" />
      <div class="absolute right-8 top-8 h-px w-36 bg-accent/30" />

      <div class="relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
        <div>
          <p class="eyebrow mb-5 text-accent">{{ $t('dashboard.kicker') }}</p>
          <h1 class="max-w-3xl font-display text-[3.25rem] font-semibold leading-[0.98] tracking-[-0.055em] text-text-main md:text-[4.9rem]">
            {{ $t('dashboard.title') }}
          </h1>
          <p class="mt-5 max-w-2xl text-base leading-8 text-text-secondary md:text-lg">
            {{ $t('dashboard.description') }}
          </p>

          <div class="mt-8 flex flex-wrap gap-x-5 gap-y-2">
            <NuxtLink
              v-for="item in quickLinks"
              :key="item.to"
              :to="item.to"
              class="text-link"
            >
              <span>{{ item.label }}</span>
              <ArrowRightIcon class="h-3.5 w-3.5" />
            </NuxtLink>
          </div>
        </div>

        <aside class="rounded-[1.45rem] bg-background/58 p-5 shadow-[inset_0_0_0_1px_rgba(18,32,31,0.045)] backdrop-blur">
          <div class="mb-5 flex items-center justify-between">
            <p class="eyebrow">Signal brief</p>
            <RadarIcon class="h-4 w-4 text-accent/70" />
          </div>

          <div class="space-y-1">
            <NuxtLink
              v-for="row in summaryRows"
              :key="row.key"
              :to="row.to"
              class="grid grid-cols-[minmax(0,1fr)_auto] gap-4 rounded-2xl px-3 py-3 hover:bg-card/70"
            >
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-text-main">{{ row.label }}</p>
                <p class="mt-1 truncate text-xs text-text-secondary">{{ row.hint }}</p>
              </div>
              <span :class="['font-display text-3xl font-semibold leading-none tracking-[-0.04em]', row.tone]">
                {{ row.value }}
              </span>
            </NuxtLink>
          </div>
        </aside>
      </div>
    </section>

    <section class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <NuxtLink
        v-for="metric in metrics"
        :key="metric.key"
        :to="metric.to"
        class="glass-panel glass-panel-hover group relative min-h-[9.25rem] overflow-hidden rounded-[1.35rem] p-5"
      >
        <div class="mb-5 flex items-start justify-between gap-4">
          <p class="eyebrow">{{ metric.label }}</p>
          <component :is="metric.icon" :class="['h-4 w-4 opacity-50 transition-opacity group-hover:opacity-80', metric.iconClass]" />
        </div>
        <p class="font-display text-[2.7rem] font-semibold leading-none tracking-[-0.055em] text-text-main">{{ metric.value }}</p>
        <p class="mt-3 text-sm leading-6 text-text-secondary">{{ metric.hint }}</p>
      </NuxtLink>
    </section>

    <section class="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      <div class="glass-panel rounded-[1.5rem] p-6">
        <div class="mb-6 flex items-start justify-between gap-4">
          <div>
            <p class="eyebrow mb-2">Action queue</p>
            <h2 class="font-display text-2xl font-semibold tracking-[-0.035em] text-text-main">{{ $t('dashboard.openActions') }}</h2>
            <p class="mt-1 text-sm leading-6 text-text-secondary">{{ $t('dashboard.openActionsHint') }}</p>
          </div>
          <NuxtLink to="/actions" class="text-link shrink-0">
            {{ $t('dashboard.viewAll') }}
            <ArrowRightIcon class="h-3.5 w-3.5" />
          </NuxtLink>
        </div>

        <div v-if="actionsLoading" class="space-y-3">
          <div v-for="i in 4" :key="i" class="h-16 animate-pulse rounded-2xl bg-background/65" />
        </div>
        <div v-else-if="openActions.length" class="space-y-1">
          <NuxtLink
            v-for="action in openActions"
            :key="action.id"
            :to="`/domains/${action.domainId}`"
            class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-2xl px-3 py-3.5 hover:bg-background/70"
          >
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span :class="['h-2 w-2 rounded-full', priorityDot(action.priority)]" />
                <p class="truncate font-mono text-sm font-semibold text-text-main">{{ action.domain?.domain || '-' }}</p>
              </div>
              <p class="mt-1 text-xs text-text-secondary">{{ formatActionType(action.actionType) }}</p>
            </div>
            <ArrowRightIcon class="h-4 w-4 text-text-tertiary" />
          </NuxtLink>
        </div>
        <div v-else class="rounded-[1.25rem] bg-background/55 p-8 text-center">
          <CheckCircleIcon class="mx-auto mb-3 h-7 w-7 text-status-available" />
          <p class="text-sm font-medium text-text-main">{{ $t('dashboard.noOpenActions') }}</p>
        </div>
      </div>

      <div class="glass-panel rounded-[1.5rem] p-6">
        <div class="mb-6 flex items-start justify-between gap-4">
          <div>
            <p class="eyebrow mb-2">Certificate radar</p>
            <h2 class="font-display text-2xl font-semibold tracking-[-0.035em] text-text-main">{{ $t('dashboard.sslRadar') }}</h2>
            <p class="mt-1 text-sm leading-6 text-text-secondary">{{ $t('dashboard.sslRadarHint') }}</p>
          </div>
          <NuxtLink to="/ssl" class="text-link shrink-0">
            {{ $t('dashboard.viewAll') }}
            <ArrowRightIcon class="h-3.5 w-3.5" />
          </NuxtLink>
        </div>

        <div class="space-y-2">
          <NuxtLink
            v-for="risk in sslRisks"
            :key="risk.key"
            :to="risk.to"
            class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-2xl bg-background/55 p-4 hover:bg-card/80"
          >
            <div class="flex min-w-0 items-center gap-3">
              <span :class="['h-2.5 w-2.5 rounded-full', risk.dot]" />
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-text-main">{{ risk.label }}</p>
                <p class="mt-1 truncate text-xs text-text-secondary">{{ risk.hint }}</p>
              </div>
            </div>
            <span class="font-display text-3xl font-semibold tracking-[-0.04em] text-text-main">{{ risk.value }}</span>
          </NuxtLink>
        </div>
      </div>
    </section>

    <section class="grid gap-5 xl:grid-cols-2">
      <div class="glass-panel rounded-[1.5rem] p-6">
        <div class="mb-6 flex items-start justify-between gap-4">
          <div>
            <p class="eyebrow mb-2">Delivery health</p>
            <h2 class="font-display text-2xl font-semibold tracking-[-0.035em] text-text-main">{{ $t('dashboard.failedNotifications') }}</h2>
            <p class="mt-1 text-sm leading-6 text-text-secondary">{{ $t('dashboard.failedNotificationsHint') }}</p>
          </div>
          <NuxtLink to="/notifications" class="text-link shrink-0">
            {{ $t('dashboard.viewAll') }}
            <ArrowRightIcon class="h-3.5 w-3.5" />
          </NuxtLink>
        </div>

        <div v-if="notificationsLoading" class="space-y-3">
          <div v-for="i in 3" :key="i" class="h-14 animate-pulse rounded-2xl bg-background/65" />
        </div>
        <div v-else-if="failedNotifications.length" class="space-y-2">
          <div
            v-for="event in failedNotifications"
            :key="event.id"
            class="rounded-2xl bg-status-dropping/5 p-4 shadow-[inset_0_0_0_1px_rgba(185,68,62,0.08)]"
          >
            <div class="flex items-center justify-between gap-3">
              <p class="truncate text-sm font-semibold text-text-main">{{ event.domain || event.eventType }}</p>
              <span class="rounded-full bg-status-dropping/10 px-2 py-0.5 text-xs font-medium text-status-dropping">
                {{ event.channel }}
              </span>
            </div>
            <p class="mt-1 line-clamp-2 text-xs leading-5 text-text-secondary">{{ event.errorMessage || '-' }}</p>
          </div>
        </div>
        <div v-else class="rounded-[1.25rem] bg-background/55 p-8 text-center">
          <BellIcon class="mx-auto mb-3 h-7 w-7 text-status-available" />
          <p class="text-sm font-medium text-text-main">{{ $t('dashboard.noFailedNotifications') }}</p>
        </div>
      </div>

      <div class="glass-panel rounded-[1.5rem] p-6">
        <div class="mb-6 flex items-start justify-between gap-4">
          <div>
            <p class="eyebrow mb-2">System cadence</p>
            <h2 class="font-display text-2xl font-semibold tracking-[-0.035em] text-text-main">{{ $t('dashboard.recentTasks') }}</h2>
            <p class="mt-1 text-sm leading-6 text-text-secondary">{{ $t('dashboard.recentTasksHint') }}</p>
          </div>
          <NuxtLink to="/tasks" class="text-link shrink-0">
            {{ $t('dashboard.viewAll') }}
            <ArrowRightIcon class="h-3.5 w-3.5" />
          </NuxtLink>
        </div>

        <div v-if="tasksLoading" class="space-y-3">
          <div v-for="i in 3" :key="i" class="h-14 animate-pulse rounded-2xl bg-background/65" />
        </div>
        <div v-else-if="recentTasks.length" class="space-y-2">
          <div
            v-for="run in recentTasks"
            :key="run.id"
            class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-2xl bg-background/55 p-4"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-text-main">{{ run.taskName }}</p>
              <p class="mt-1 text-xs text-text-secondary">{{ formatDateTime(run.finishedAt || run.startedAt) }}</p>
            </div>
            <span :class="['rounded-full px-2 py-0.5 text-xs font-medium', taskClass(run)]">
              {{ taskLabel(run) }}
            </span>
          </div>
        </div>
        <div v-else class="rounded-[1.25rem] bg-background/55 p-8 text-center">
          <ActivityIcon class="mx-auto mb-3 h-7 w-7 text-text-tertiary" />
          <p class="text-sm font-medium text-text-main">{{ $t('dashboard.noTaskRuns') }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import {
  Activity as ActivityIcon,
  AlertTriangle as AlertTriangleIcon,
  ArrowRight as ArrowRightIcon,
  BellRing as BellIcon,
  CheckCircle2 as CheckCircleIcon,
  DollarSign as DollarSignIcon,
  Globe2 as GlobeIcon,
  ListTodo as ListTodoIcon,
  Radar as RadarIcon,
  ShieldAlert as ShieldAlertIcon,
  ShieldCheck as ShieldCheckIcon,
  Sparkles as SparklesIcon,
} from 'lucide-vue-next';

const { t } = useI18n();

const [
  domainsFetch,
  actionsFetch,
  sslFetch,
  notificationsFetch,
  tasksFetch,
  costsFetch,
] = await Promise.all([
  useFetch('/api/domains', { query: { limit: 200 } }),
  useFetch('/api/actions', { query: { status: 'OPEN', limit: 5 } }),
  useFetch('/api/ssl'),
  useFetch('/api/notifications', { query: { status: 'FAILED', limit: 5 } }),
  useFetch('/api/tasks/runs', { query: { limit: 3 } }),
  useFetch('/api/costs/summary', { query: { year: new Date().getFullYear() } }),
]);

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
  { to: '/domains', label: t('nav.domains'), caption: t('dashboard.quickDomains'), icon: GlobeIcon },
  { to: '/actions', label: t('nav.actions'), caption: t('dashboard.quickActions'), icon: ListTodoIcon },
  { to: '/ssl', label: t('nav.ssl'), caption: t('dashboard.quickSsl'), icon: ShieldCheckIcon },
  { to: '/costs', label: t('nav.costs'), caption: t('dashboard.quickCosts'), icon: DollarSignIcon },
  { to: '/notifications', label: t('nav.notifications'), caption: t('dashboard.quickNotifications'), icon: BellIcon },
]);

const metrics = computed(() => [
  {
    key: 'domains',
    label: t('dashboard.metrics.domains'),
    value: domainsLoading.value ? '-' : totalDomains.value,
    hint: t('dashboard.metrics.domainsHint', { owned: ownedCount.value, wanted: wantedCount.value }),
    to: '/domains',
    icon: GlobeIcon,
    iconBg: 'bg-accent/10',
    iconClass: 'text-accent',
  },
  {
    key: 'actions',
    label: t('dashboard.metrics.actions'),
    value: actionsLoading.value ? '-' : actionsData.value?.data?.total || 0,
    hint: t('dashboard.metrics.actionsHint'),
    to: '/actions',
    icon: ListTodoIcon,
    iconBg: 'bg-status-expiring/10',
    iconClass: 'text-status-expiring',
  },
  {
    key: 'costs',
    label: t('dashboard.metrics.costs'),
    value: costsLoading.value ? '-' : formatCurrency(costSummary.value.total || 0),
    hint: t('dashboard.metrics.costsHint', { year: new Date().getFullYear() }),
    to: '/costs',
    icon: DollarSignIcon,
    iconBg: 'bg-priority-low/10',
    iconClass: 'text-priority-low',
  },
  {
    key: 'ssl',
    label: t('dashboard.metrics.ssl'),
    value: sslLoading.value ? '-' : sslExpiring.value + sslInvalid.value,
    hint: t('dashboard.metrics.sslHint', { unchecked: sslUnchecked.value }),
    to: '/ssl',
    icon: ShieldAlertIcon,
    iconBg: 'bg-status-dropping/10',
    iconClass: 'text-status-dropping',
  },
  {
    key: 'notifications',
    label: t('dashboard.metrics.notifications'),
    value: notificationsLoading.value ? '-' : notificationsData.value?.data?.total || 0,
    hint: t('dashboard.metrics.notificationsHint'),
    to: '/notifications',
    icon: BellIcon,
    iconBg: 'bg-status-registered/10',
    iconClass: 'text-status-registered',
  },
]);

const summaryRows = computed(() => [
  {
    key: 'actions',
    label: t('dashboard.openActions'),
    hint: t('dashboard.metrics.actionsHint'),
    value: actionsLoading.value ? '-' : actionsData.value?.data?.total || 0,
    to: '/actions',
    tone: 'text-status-expiring',
  },
  {
    key: 'ssl',
    label: t('dashboard.sslRadar'),
    hint: t('dashboard.metrics.sslHint', { unchecked: sslUnchecked.value }),
    value: sslLoading.value ? '-' : sslExpiring.value + sslInvalid.value,
    to: '/ssl',
    tone: 'text-status-dropping',
  },
  {
    key: 'notifications',
    label: t('dashboard.failedNotifications'),
    hint: t('dashboard.metrics.notificationsHint'),
    value: notificationsLoading.value ? '-' : notificationsData.value?.data?.total || 0,
    to: '/notifications',
    tone: 'text-accent',
  },
]);

const sslRisks = computed(() => [
  {
    key: 'expiring',
    label: t('ssl.filters.expiring'),
    hint: t('dashboard.sslExpiringHint'),
    value: sslExpiring.value,
    to: '/ssl',
    icon: AlertTriangleIcon,
    bg: 'bg-status-expiring/10',
    color: 'text-status-expiring',
    dot: 'bg-status-expiring',
  },
  {
    key: 'invalid',
    label: t('ssl.filters.invalid'),
    hint: t('dashboard.sslInvalidHint'),
    value: sslInvalid.value,
    to: '/ssl',
    icon: ShieldAlertIcon,
    bg: 'bg-status-dropping/10',
    color: 'text-status-dropping',
    dot: 'bg-status-dropping',
  },
  {
    key: 'unchecked',
    label: t('ssl.filters.unchecked'),
    hint: t('dashboard.sslUncheckedHint'),
    value: sslUnchecked.value,
    to: '/ssl',
    icon: SparklesIcon,
    bg: 'bg-text-tertiary/10',
    color: 'text-text-secondary',
    dot: 'bg-text-tertiary',
  },
]);

const priorityDot = (priority) => {
  if (priority === 'HIGH') return 'bg-priority-high';
  if (priority === 'LOW') return 'bg-priority-low';
  return 'bg-priority-medium';
};

const formatActionType = (type) => {
  if (!type) return '-';
  return String(type).replaceAll('_', ' ').toLowerCase();
};

const formatDateTime = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString();
};

const formatCurrency = (cents) => {
  const amount = Number(cents || 0) / 100;
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
};

const taskLabel = (run) => {
  const fail = Number(run.result?.fail || 0);
  return fail > 0 ? t('dashboard.taskIssue') : t('dashboard.taskOk');
};

const taskClass = (run) => {
  const fail = Number(run.result?.fail || 0);
  return fail > 0
    ? 'bg-status-expiring/10 text-status-expiring'
    : 'bg-status-available/10 text-status-available';
};
</script>
