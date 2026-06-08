<template>
  <div class="space-y-14 pb-2 md:space-y-16">

    <!-- ─── HERO ────────────────────────────────────────────────────────── -->
    <section class="relative">
      <p class="eyebrow mb-4">{{ $t('dashboard.kicker') }}</p>

      <h1 class="headline-display max-w-4xl text-[2.35rem] leading-[1.05] sm:text-[3rem] md:text-[3.75rem] lg:text-[4.25rem]">
        {{ $t('dashboard.title') }}
      </h1>

      <p class="mt-5 max-w-2xl text-base leading-[1.7] text-text-secondary">
        {{ $t('dashboard.description') }}
      </p>

      <div class="hairline mt-7 max-w-28 bg-accent!" />

      <div class="mt-7 flex flex-wrap gap-x-10 gap-y-3">
        <NuxtLink
          v-for="item in quickLinks"
          :key="item.to"
          :to="item.to"
          class="btn-text"
        >
          <span>{{ item.label }}</span>
          <ArrowRightIcon class="h-3.5 w-3.5" />
        </NuxtLink>
      </div>
    </section>

    <!-- ─── METRIC STRIP — 5 columns separated by hairlines, no cards ──── -->
    <section>
      <div class="grid grid-cols-2 divide-y divide-hairline sm:grid-cols-3 sm:divide-y-0 lg:grid-cols-5">
        <NuxtLink
          v-for="(metric, index) in metrics"
          :key="metric.key"
          :to="metric.to"
          :class="[
            'group relative flex flex-col px-1 py-5 transition-colors sm:px-5',
            index !== 0 && 'sm:before:absolute sm:before:left-0 sm:before:top-4 sm:before:bottom-4 sm:before:w-px sm:before:bg-hairline',
          ]"
        >
          <p class="eyebrow flex items-center justify-between">
            <span>{{ metric.label }}</span>
            <component :is="metric.icon" :class="['h-3.5 w-3.5 opacity-50 transition-opacity group-hover:opacity-100', metric.iconClass]" />
          </p>
          <p class="font-display mt-4 text-[2.4rem] font-medium leading-none tracking-[-0.045em] text-text-main transition-colors group-hover:text-accent">
            {{ metric.value }}
          </p>
          <p class="mt-3 text-[13px] leading-[1.55] text-text-secondary">{{ metric.hint }}</p>
        </NuxtLink>
      </div>
    </section>

    <!-- ─── ACTION QUEUE + SSL RADAR ─────────────────────────────────── -->
    <section class="grid gap-10 xl:grid-cols-2 xl:gap-12">

      <div>
        <p class="eyebrow mb-3">Action queue</p>
        <h2 class="headline-display text-2xl">{{ $t('dashboard.openActions') }}</h2>
        <p class="mt-2 text-sm text-text-secondary">{{ $t('dashboard.openActionsHint') }}</p>
        <div class="hairline mt-6" />

        <div v-if="actionsLoading" class="space-y-1 pt-3">
          <div v-for="i in 4" :key="i" class="h-12 animate-pulse rounded-md bg-surface-sunken" />
        </div>

        <div v-else-if="openActions.length" class="pt-2">
          <NuxtLink
            v-for="action in openActions"
            :key="action.id"
            :to="`/domains/${action.domainId}`"
            class="metric-row is-link"
          >
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span :class="['h-1.5 w-1.5 rounded-full', priorityDot(action.priority)]" />
                <p class="metric-row-label truncate font-mono text-sm font-medium text-text-main transition-colors">
                  {{ action.domain?.domain || '—' }}
                </p>
              </div>
              <p class="mt-1 ml-3.5 text-xs uppercase tracking-[0.14em] text-text-tertiary">
                {{ formatActionType(action.actionType) }}
              </p>
            </div>
            <ArrowRightIcon class="h-4 w-4 text-text-tertiary transition-transform group-hover:translate-x-0.5" />
          </NuxtLink>
        </div>

        <div v-else class="pt-8 text-center">
          <CheckCircleIcon class="mx-auto mb-3 h-6 w-6 text-status-available" />
          <p class="text-sm text-text-secondary">{{ $t('dashboard.noOpenActions') }}</p>
        </div>

        <div class="mt-6">
          <NuxtLink to="/ops/actions" class="btn-text">
            {{ $t('dashboard.viewAll') }}
            <ArrowRightIcon class="h-3.5 w-3.5" />
          </NuxtLink>
        </div>
      </div>

      <div>
        <p class="eyebrow mb-3">Certificate radar</p>
        <h2 class="headline-display text-2xl">{{ $t('dashboard.sslRadar') }}</h2>
        <p class="mt-2 text-sm text-text-secondary">{{ $t('dashboard.sslRadarHint') }}</p>
        <div class="hairline mt-6" />

        <div class="pt-2">
          <NuxtLink
            v-for="risk in sslRisks"
            :key="risk.key"
            :to="risk.to"
            class="metric-row is-link"
          >
            <div class="flex min-w-0 items-center gap-3">
              <span :class="['h-1.5 w-1.5 rounded-full', risk.dot]" />
              <div class="min-w-0">
                <p class="metric-row-label truncate text-sm font-medium text-text-main">{{ risk.label }}</p>
                <p class="mt-1 truncate text-xs text-text-tertiary">{{ risk.hint }}</p>
              </div>
            </div>
            <span class="font-display text-2xl font-medium tracking-[-0.035em] text-text-main">{{ risk.value }}</span>
          </NuxtLink>
        </div>

        <div class="mt-6">
          <NuxtLink to="/ssl" class="btn-text">
            {{ $t('dashboard.viewAll') }}
            <ArrowRightIcon class="h-3.5 w-3.5" />
          </NuxtLink>
        </div>
      </div>

    </section>

    <!-- ─── DELIVERY HEALTH + SYSTEM CADENCE ─────────────────────────── -->
    <section class="grid gap-10 xl:grid-cols-2 xl:gap-12">

      <div>
        <p class="eyebrow mb-3">Delivery health</p>
        <h2 class="headline-display text-2xl">{{ $t('dashboard.failedNotifications') }}</h2>
        <p class="mt-2 text-sm text-text-secondary">{{ $t('dashboard.failedNotificationsHint') }}</p>
        <div class="hairline mt-6" />

        <div v-if="notificationsLoading" class="space-y-1 pt-3">
          <div v-for="i in 3" :key="i" class="h-12 animate-pulse rounded-md bg-surface-sunken" />
        </div>

        <div v-else-if="failedNotifications.length" class="pt-2">
          <div
            v-for="event in failedNotifications"
            :key="event.id"
            class="border-b border-hairline py-4 last:border-b-0"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex min-w-0 items-center gap-3">
                <span class="h-3 w-px bg-status-dropping" />
                <p class="truncate text-sm font-medium text-text-main">{{ event.domain || event.eventType }}</p>
              </div>
              <span class="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-status-dropping">
                {{ event.channel }}
              </span>
            </div>
            <p class="mt-1.5 ml-4 line-clamp-2 text-xs leading-5 text-text-secondary">
              {{ event.errorMessage || '—' }}
            </p>
          </div>
        </div>

        <div v-else class="pt-8 text-center">
          <BellIcon class="mx-auto mb-3 h-6 w-6 text-status-available" />
          <p class="text-sm text-text-secondary">{{ $t('dashboard.noFailedNotifications') }}</p>
        </div>

        <div class="mt-6">
          <NuxtLink to="/notifications" class="btn-text">
            {{ $t('dashboard.viewAll') }}
            <ArrowRightIcon class="h-3.5 w-3.5" />
          </NuxtLink>
        </div>
      </div>

      <div>
        <p class="eyebrow mb-3">System cadence</p>
        <h2 class="headline-display text-2xl">{{ $t('dashboard.recentTasks') }}</h2>
        <p class="mt-2 text-sm text-text-secondary">{{ $t('dashboard.recentTasksHint') }}</p>
        <div class="hairline mt-6" />

        <div v-if="tasksLoading" class="space-y-1 pt-3">
          <div v-for="i in 3" :key="i" class="h-12 animate-pulse rounded-md bg-surface-sunken" />
        </div>

        <div v-else-if="recentTasks.length" class="pt-2">
          <div
            v-for="run in recentTasks"
            :key="run.id"
            class="metric-row"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-text-main">{{ run.taskName }}</p>
              <p class="mt-1 text-xs text-text-tertiary">{{ formatDateTime(run.finishedAt || run.startedAt) }}</p>
            </div>
            <span :class="['text-[11px] font-semibold uppercase tracking-[0.14em]', taskClass(run)]">
              {{ taskLabel(run) }}
            </span>
          </div>
        </div>

        <div v-else class="pt-8 text-center">
          <ActivityIcon class="mx-auto mb-3 h-6 w-6 text-text-tertiary" />
          <p class="text-sm text-text-secondary">{{ $t('dashboard.noTaskRuns') }}</p>
        </div>

        <div class="mt-6">
          <NuxtLink to="/ops/tasks" class="btn-text">
            {{ $t('dashboard.viewAll') }}
            <ArrowRightIcon class="h-3.5 w-3.5" />
          </NuxtLink>
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
  { to: '/domains', label: t('nav.domains') },
  { to: '/ops/actions', label: t('nav.actions') },
  { to: '/ssl', label: t('nav.ssl') },
  { to: '/data/costs', label: t('nav.costs') },
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
    to: '/ops/actions',
    icon: ListTodoIcon,
    iconClass: 'text-status-expiring',
  },
  {
    key: 'costs',
    label: t('dashboard.metrics.costs'),
    value: costsLoading.value ? '—' : formatCurrency(costSummary.value.total || 0, costSummary.value.currency),
    hint: t('dashboard.metrics.costsHint', { year: new Date().getFullYear() }),
    to: '/data/costs',
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
