<template>
  <div class="mx-auto max-w-5xl space-y-12">

    <!-- Breadcrumb -->
    <nav class="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-text-tertiary">
      <NuxtLink to="/domains" class="transition-colors hover:text-text-main">{{ $t('nav.domains') }}</NuxtLink>
      <span>/</span>
      <span class="text-text-secondary">{{ $t('domain.viewDetails') }}</span>
    </nav>

    <!-- Loading -->
    <div v-if="pending" class="py-24 text-center">
      <LoadingSpinner size="lg" />
      <p class="mt-4 text-sm text-text-secondary">{{ $t('common.loading') }}</p>
    </div>

    <!-- Error -->
    <div v-else-if="error || !data" class="py-24 text-center">
      <AlertCircleIcon class="mx-auto mb-4 h-8 w-8 text-status-dropping" />
      <p class="text-sm text-status-dropping">{{ $t('domain.loadError') }}</p>
    </div>

    <div v-else class="space-y-16">

      <!-- ─── HERO ─────────────────────────────────────────────────── -->
      <section>
        <p class="eyebrow mb-3">Watch entry</p>
        <div class="flex flex-wrap items-end justify-between gap-6">
          <div class="min-w-0 flex-1">
            <h1 class="font-display text-4xl font-medium tracking-[-0.035em] text-text-main md:text-5xl select-all">
              {{ domain.domain }}
            </h1>
            <div class="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
              <span :class="['flex items-center gap-1.5', latest?.status ? statusToneClass(latest.status) : 'text-status-unknown']">
                <span :class="['h-1.5 w-1.5 rounded-full', latest?.status ? statusDotClass(latest.status) : 'bg-status-unknown']" />
                {{ latest?.status ? $t(`domain.status.${latest.status.toLowerCase()}`) : $t('domain.status.unknown') }}
              </span>
              <span class="text-text-tertiary">·</span>
              <span :class="domain.watchKind === 'OWNED' ? 'text-watch-owned' : 'text-watch-wanted'">
                {{ domain.watchKind === 'OWNED' ? $t('domain.owned') : $t('domain.wanted') }}
              </span>
              <span v-if="domain.priority" class="text-text-tertiary">·</span>
              <span v-if="domain.priority" :class="priorityToneClass">
                {{ $t(`domain.${domain.priority.toLowerCase()}`) }}
              </span>
              <span v-if="latest?.registrar" class="text-text-tertiary">·</span>
              <span v-if="latest?.registrar" class="font-mono text-text-secondary normal-case tracking-normal">
                {{ latest.registrar }}
              </span>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button @click="openEditModal" class="btn-ghost">{{ $t('common.edit') }}</button>
            <button @click="refreshDomain" :disabled="refreshing" class="btn-ghost disabled:opacity-50">
              <LoadingSpinner v-if="refreshing" size="sm" color="gray" />
              <span>{{ refreshing ? $t('domain.checking') : $t('domain.checkNow') }}</span>
            </button>
            <button @click="confirmDelete" class="btn-ghost text-status-dropping hover:text-status-dropping">
              {{ $t('common.delete') }}
            </button>
          </div>
        </div>

        <div
          v-if="latest?.lastError"
          class="surface-flat mt-8 flex flex-col gap-2 p-4 text-xs md:flex-row md:items-start md:justify-between"
        >
          <div class="min-w-0 flex-1">
            <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-status-dropping">{{ $t('domain.scanError') }}</p>
            <p class="mt-2 break-words font-mono text-text-main">{{ latest.lastError }}</p>
          </div>
          <p class="whitespace-nowrap font-mono text-text-tertiary">{{ formatDate(latest.lastErrorAt, true) }}</p>
        </div>
      </section>

      <!-- ─── INFO + METADATA ─────────────────────────────────────── -->
      <section class="grid grid-cols-1 gap-16 md:grid-cols-2">
        <div>
          <p class="eyebrow mb-3">Information</p>
          <h2 class="headline-display text-2xl">{{ $t('domain.information') }}</h2>
          <div class="hairline mt-4" />
          <dl class="mt-1 text-sm">
            <div class="flex items-center justify-between border-b border-hairline py-3">
              <dt class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('domain.expiresAt') }}</dt>
              <dd class="font-mono text-text-main">{{ formatDate(latest?.expiresAt) }}</dd>
            </div>
            <div class="flex items-center justify-between border-b border-hairline py-3">
              <dt class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('domain.lastChecked') }}</dt>
              <dd class="font-mono text-text-main">{{ formatDate(latest?.checkedAt, true) }}</dd>
            </div>
            <div class="flex items-center justify-between border-b border-hairline py-3">
              <dt class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('common.createdAt') }}</dt>
              <dd class="font-mono text-text-main">{{ formatDate(domain.createdAt) }}</dd>
            </div>
            <div class="py-4">
              <dt class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-2">{{ $t('domain.nameservers') }}</dt>
              <dd class="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                <span v-if="latest?.nameservers && latest.nameservers.length" v-for="ns in latest.nameservers" :key="ns" class="font-mono text-text-main">{{ ns }}</span>
                <span v-else class="text-text-tertiary">{{ $t('domain.noNameservers') }}</span>
              </dd>
            </div>
          </dl>
        </div>

        <div>
          <p class="eyebrow mb-3">Metadata</p>
          <h2 class="headline-display text-2xl">{{ $t('domain.metadata') }}</h2>
          <div class="hairline mt-4" />
          <div class="mt-6">
            <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-2">{{ $t('domain.note') }}</p>
            <p class="surface-flat min-h-15 p-4 text-sm text-text-main">{{ domain.note || $t('domain.noNotes') }}</p>
          </div>
          <div class="mt-6">
            <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary mb-2">{{ $t('domain.tags') }}</p>
            <div class="flex flex-wrap gap-x-3 gap-y-1 text-xs">
              <span v-if="domain.tags && domain.tags.length" v-for="tag in domain.tags" :key="tag" class="font-mono text-text-secondary">#{{ tag }}</span>
              <span v-else class="text-text-tertiary">{{ $t('domain.noTags') }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- ─── RDAP SUMMARY ────────────────────────────────────────── -->
      <section v-if="showSecuritySection">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p class="eyebrow mb-3">Security</p>
            <h2 class="headline-display text-2xl">Security posture</h2>
          </div>
          <p class="font-mono text-xs text-text-tertiary">
            Last scan: {{ formatDate(riskSummary?.lastSecurityScanAt, true) }}
          </p>
        </div>
        <div class="hairline mt-4" />

        <div class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-5">
          <div
            v-for="card in securityPostureCards"
            :key="card.key"
            class="surface-flat p-4"
          >
            <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ card.label }}</p>
            <p :class="['mt-2 font-display text-2xl font-medium tracking-[-0.035em]', card.tone]" data-numeric>
              {{ card.value }}
            </p>
            <p v-if="card.hint" class="mt-1 text-xs text-text-tertiary">{{ card.hint }}</p>
          </div>
        </div>

        <div class="mt-8">
          <div class="flex items-center justify-between gap-3">
            <p class="eyebrow">Findings</p>
            <span class="font-mono text-xs text-text-tertiary">{{ securityFindings.length }} total</span>
          </div>

          <div v-if="securityFindings.length" class="mt-4 space-y-3">
            <div
              v-for="finding in securityFindings"
              :key="finding.id"
              class="surface-flat flex flex-col gap-3 p-4 md:flex-row md:items-start md:justify-between"
            >
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span :class="['rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]', severityBadgeClass(finding.severity)]">
                    {{ finding.severity }}
                  </span>
                  <span class="font-mono text-[11px] uppercase tracking-[0.12em] text-text-tertiary">{{ finding.status }}</span>
                </div>
                <h3 class="mt-3 text-sm font-semibold text-text-main">{{ findingTitle(finding.findingType) }}</h3>
                <p class="mt-2 break-words font-mono text-xs leading-5 text-text-secondary">
                  {{ findingEvidenceText(finding) }}
                </p>
                <p class="mt-2 font-mono text-[11px] text-text-tertiary">
                  Last seen: {{ formatDate(finding.lastSeenAt, true) }}
                </p>
              </div>

              <div v-if="finding.status === 'OPEN'" class="flex shrink-0 gap-2">
                <button type="button" class="btn-ghost px-3 py-1.5 text-xs" @click="updateFindingStatus(finding, 'DISMISSED')">
                  Dismiss
                </button>
                <button type="button" class="btn-ghost px-3 py-1.5 text-xs" @click="updateFindingStatus(finding, 'RESOLVED')">
                  Resolve
                </button>
              </div>
            </div>
          </div>

          <div v-else class="surface-flat mt-4 p-6 text-center">
            <CheckCircleIcon class="mx-auto mb-3 h-6 w-6 text-status-available" />
            <p class="text-sm text-text-secondary">No security findings from the latest scan.</p>
          </div>
        </div>
      </section>

      <!-- RDAP summary -->
      <section>
        <div class="flex items-end justify-between">
          <div>
            <p class="eyebrow mb-3">RDAP</p>
            <h2 class="headline-display text-2xl">{{ $t('domain.rdap.title') }}</h2>
          </div>
          <span class="font-mono text-xs text-text-tertiary">{{ latest?.source || '—' }}</span>
        </div>
        <div class="hairline mt-4" />

        <div class="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div class="surface-flat p-4">
            <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('domain.rdap.handle') }}</p>
            <p class="mt-2 break-all font-mono text-sm text-text-main">{{ latest?.rdapSummary?.handle || '—' }}</p>
          </div>
          <div class="surface-flat p-4">
            <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('domain.rdap.unicodeName') }}</p>
            <p class="mt-2 break-all font-mono text-sm text-text-main">{{ latest?.rdapSummary?.unicodeName || '—' }}</p>
          </div>
          <div class="surface-flat p-4 md:col-span-2">
            <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('domain.rdap.rdapUrl') }}</p>
            <div class="mt-2 flex items-start gap-3">
              <a v-if="latest?.rdapSummary?.rdapUrl" :href="latest.rdapSummary.rdapUrl" target="_blank" rel="noreferrer"
                class="min-w-0 flex-1 break-all font-mono text-sm text-accent transition-colors hover:text-accent-hover">
                {{ latest.rdapSummary.rdapUrl }}
              </a>
              <span v-else class="min-w-0 flex-1 font-mono text-sm text-text-tertiary">—</span>
              <button v-if="latest?.rdapSummary?.rdapUrl" type="button" class="btn-ghost shrink-0 px-3 py-1 text-xs"
                @click="copyText(latest.rdapSummary.rdapUrl)">
                {{ $t('common.copy') }}
              </button>
            </div>
          </div>
        </div>

        <p class="eyebrow mt-10 mb-4">{{ $t('domain.rdap.dates') }}</p>
        <dl class="grid grid-cols-1 divide-y divide-hairline md:grid-cols-3 md:divide-y-0 md:[&>div:nth-child(n+1)]:border-r md:[&>div:nth-child(n+1)]:border-hairline md:[&>div:nth-child(3n)]:border-r-0 md:[&>div:nth-child(n+4)]:border-t md:[&>div:nth-child(n+4)]:border-hairline">
          <div v-for="ev in rdapEvents" :key="ev.key" class="px-0 py-4 md:px-6">
            <dt class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ ev.label }}</dt>
            <dd class="mt-2 font-mono text-sm text-text-main">{{ formatDate(ev.value, true) }}</dd>
          </div>
        </dl>

        <p class="eyebrow mt-10 mb-3">{{ $t('domain.rdap.eppStatuses') }}</p>
        <div class="flex flex-wrap gap-x-3 gap-y-1 text-xs">
          <template v-if="latest?.rdapSummary?.statuses?.length">
            <span v-for="s in latest.rdapSummary.statuses" :key="s" class="font-mono text-text-secondary">{{ s }}</span>
          </template>
          <span v-else class="text-text-tertiary">—</span>
        </div>

        <div class="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div class="surface-flat p-4">
            <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('domain.rdap.dnssec') }}</p>
            <p class="mt-2 font-mono text-sm text-text-main">
              <span v-if="latest?.rdapSummary?.secureDNS?.delegationSigned === true">{{ $t('domain.rdap.dnssecSigned') }}</span>
              <span v-else-if="latest?.rdapSummary?.secureDNS?.delegationSigned === false">{{ $t('domain.rdap.dnssecUnsigned') }}</span>
              <span v-else>—</span>
            </p>
            <div v-if="latest?.rdapSummary?.secureDNS?.dsData?.length" class="mt-3 space-y-2">
              <div v-for="(ds, idx) in latest.rdapSummary.secureDNS.dsData" :key="idx" class="rounded-md bg-card p-2 font-mono text-xs text-text-secondary">
                <div class="flex flex-wrap gap-x-3 gap-y-1">
                  <span>keyTag={{ ds.keyTag ?? '—' }}</span>
                  <span>alg={{ ds.algorithm ?? '—' }}</span>
                  <span>digestType={{ ds.digestType ?? '—' }}</span>
                </div>
                <p class="mt-1 break-all" :title="ds.digest || ''">digest={{ ds.digest ? truncate(ds.digest, 28) : '—' }}</p>
              </div>
            </div>
          </div>

          <div class="surface-flat space-y-3 p-4">
            <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('domain.rdap.registrarExtra') }}</p>

            <div class="flex items-center justify-between gap-2 border-t border-hairline pt-3 text-xs">
              <span class="text-text-tertiary">{{ $t('domain.rdap.ianaId') }}</span>
              <span class="break-all text-right font-mono text-text-main">{{ latest?.rdapSummary?.registrar?.ianaId || '—' }}</span>
            </div>
            <div class="flex items-center justify-between gap-2 border-t border-hairline pt-3 text-xs">
              <span class="text-text-tertiary">{{ $t('domain.rdap.abuseEmail') }}</span>
              <span class="flex min-w-0 items-center gap-2">
                <span class="break-all text-right font-mono text-text-main">{{ latest?.rdapSummary?.registrar?.abuseEmail || '—' }}</span>
                <button v-if="latest?.rdapSummary?.registrar?.abuseEmail" type="button" class="btn-ghost shrink-0 px-2 py-0.5 text-[10px]"
                  @click="copyText(latest.rdapSummary.registrar.abuseEmail)">{{ $t('common.copy') }}</button>
              </span>
            </div>
            <div class="flex items-center justify-between gap-2 border-t border-hairline pt-3 text-xs">
              <span class="text-text-tertiary">{{ $t('domain.rdap.abusePhone') }}</span>
              <span class="flex min-w-0 items-center gap-2">
                <span class="break-all text-right font-mono text-text-main">{{ latest?.rdapSummary?.registrar?.abusePhone || '—' }}</span>
                <button v-if="latest?.rdapSummary?.registrar?.abusePhone" type="button" class="btn-ghost shrink-0 px-2 py-0.5 text-[10px]"
                  @click="copyText(latest.rdapSummary.registrar.abusePhone)">{{ $t('common.copy') }}</button>
              </span>
            </div>
          </div>
        </div>

        <p class="eyebrow mt-10 mb-3">{{ $t('domain.rdap.nameserversDetailed') }}</p>
        <div v-if="latest?.rdapSummary?.nameserversDetailed?.length" class="space-y-2">
          <div v-for="ns in latest.rdapSummary.nameserversDetailed" :key="ns.name"
            class="surface-flat flex flex-col gap-2 p-3 md:flex-row md:items-start md:justify-between">
            <p class="break-all font-mono text-xs text-text-main">{{ ns.name }}</p>
            <div class="break-all text-right font-mono text-xs text-text-secondary">
              <p v-if="ns.v4?.length">v4: {{ ns.v4.join(', ') }}</p>
              <p v-if="ns.v6?.length">v6: {{ ns.v6.join(', ') }}</p>
              <p v-if="!ns.v4?.length && !ns.v6?.length">—</p>
            </div>
          </div>
        </div>
        <p v-else class="text-xs text-text-tertiary">—</p>
      </section>

      <!-- ─── SSL ─────────────────────────────────────────────────── -->
      <section v-if="domain.watchKind === 'OWNED' || sslLatest">
        <div class="flex items-end justify-between">
          <div>
            <p class="eyebrow mb-3">Certificate</p>
            <h2 class="headline-display text-2xl">{{ $t('nav.ssl') }}</h2>
          </div>
          <button type="button" @click="checkSSLNow" :disabled="sslChecking" class="btn-ghost disabled:opacity-50">
            <LoadingSpinner v-if="sslChecking" size="sm" color="gray" />
            <span>{{ sslChecking ? $t('domain.checking') : $t('ssl.checkNow') }}</span>
          </button>
        </div>
        <div class="hairline mt-4" />

        <div v-if="sslLatest" class="mt-6 space-y-6">
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.16em]">
            <span :class="['flex items-center gap-1.5', sslStatusToneClass(sslLatest)]">
              <span :class="['h-1.5 w-1.5 rounded-full', sslStatusDotClass(sslLatest)]" />
              {{ sslStatusText(sslLatest) }}
            </span>
            <span v-if="sslLatest.issuer" class="text-text-tertiary">·</span>
            <span v-if="sslLatest.issuer" class="font-mono text-text-secondary normal-case tracking-normal">{{ sslLatest.issuer }}</span>
          </div>

          <p v-if="sslCheckedHostDiff(sslLatest)" class="font-mono text-xs text-text-secondary">
            {{ $t('ssl.checkedHost') }}: {{ sslLatest.checkedHost }}
          </p>

          <dl class="grid grid-cols-1 divide-y divide-hairline md:grid-cols-2 md:divide-x md:divide-y-0">
            <div class="px-0 py-4 md:px-6 md:first:pl-0">
              <dt class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('ssl.lastChecked') }}</dt>
              <dd class="mt-2 font-mono text-sm text-text-main">{{ formatDate(sslLatest.checkedAt, true) }}</dd>
            </div>
            <div class="px-0 py-4 md:px-6">
              <dt class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('ssl.daysUntilExpiryLabel') }}</dt>
              <dd :class="['mt-2 font-display text-2xl font-medium tracking-[-0.035em]', sslDaysClass(sslLatest.daysUntilExpiry)]" data-numeric>
                {{ sslLatest.daysUntilExpiry ?? '—' }}
              </dd>
            </div>
            <div class="px-0 py-4 md:px-6 md:first:pl-0 md:border-t md:border-hairline">
              <dt class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('ssl.validFrom') }}</dt>
              <dd class="mt-2 font-mono text-sm text-text-main">{{ formatDate(sslLatest.validFrom) }}</dd>
            </div>
            <div class="px-0 py-4 md:px-6 md:border-t md:border-hairline">
              <dt class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('ssl.validTo') }}</dt>
              <dd class="mt-2 font-mono text-sm text-text-main">{{ formatDate(sslLatest.validTo) }}</dd>
            </div>
          </dl>

          <p v-if="sslLatest.lastError" class="surface-flat p-4 text-xs text-status-dropping">{{ sslLastErrorText(sslLatest) }}</p>
          <p v-if="sslLatest.validationError" class="surface-flat p-4 text-xs text-status-expiring">
            {{ $t('ssl.validationError') }}: {{ sslLatest.validationError }}
          </p>
        </div>
        <div v-else class="py-12 text-center">
          <p class="text-sm text-text-secondary">{{ $t('ssl.noData') }}</p>
        </div>
      </section>

      <!-- ─── TIMELINE ────────────────────────────────────────────── -->
      <section>
        <p class="eyebrow mb-3">Timeline</p>
        <h2 class="headline-display text-2xl">{{ $t('domain.timeline') }}</h2>
        <div class="hairline mt-4" />

        <div v-if="historyItems.length > 0" @scroll="onHistoryScroll" class="max-h-96 overflow-y-auto pr-2">
          <div v-for="item in historyItems" :key="item.id"
            class="grid grid-cols-[10rem_minmax(0,1fr)_auto] items-center gap-4 border-b border-hairline py-3 transition-colors hover:bg-surface-sunken/50 last:border-b-0">
            <div class="font-mono text-xs text-text-tertiary">{{ formatDate(item.checkedAt, true) }}</div>
            <div class="text-[11px] font-semibold uppercase tracking-[0.16em]" :style="{ color: getStatusColor(item.status) }">
              {{ $t(`domain.status.${item.status.toLowerCase()}`) }}
            </div>
            <div class="truncate text-right text-xs text-text-tertiary" :title="item.parseReason">{{ item.parseReason || '—' }}</div>
          </div>

          <div v-if="historyLoadingMore" class="py-3 text-center text-xs text-text-secondary">{{ $t('common.loading') }}</div>
          <div v-else-if="historyNextCursor" class="py-3 text-center">
            <button type="button" @click="loadMoreHistory" class="btn-text text-xs">{{ $t('common.loadMore') }}</button>
          </div>
        </div>
        <div v-else class="py-12 text-center">
          <p class="text-sm text-text-secondary">{{ $t('domain.noHistory') }}</p>
        </div>
      </section>

      <!-- ─── RAW SNAPSHOT ────────────────────────────────────────── -->
      <details class="group">
        <summary class="flex cursor-pointer list-none items-center justify-between gap-3">
          <div>
            <p class="eyebrow mb-1">Raw data</p>
            <h2 class="headline-display text-2xl">{{ $t('domain.rawSnapshot') }}</h2>
          </div>
          <ChevronDownIcon class="h-5 w-5 text-text-tertiary transition-transform group-open:rotate-180" />
        </summary>
        <div class="hairline mt-4" />
        <p class="mt-4 text-xs text-text-secondary">{{ $t('domain.rawSnapshotHint') }}</p>
        <pre class="surface-flat mt-4 max-h-96 overflow-x-auto p-4 font-mono text-xs leading-5 text-text-secondary">{{ latest?.rawSnapshot || $t('domain.noSnapshot') }}</pre>
      </details>
    </div>

    <ConfirmDialog
      :is-open="deleteDialog.isOpen"
      :title="$t('domain.deleteDomain')"
      :message="$t('domain.confirmDelete')"
      :confirm-text="$t('common.delete')"
      :cancel-text="$t('common.cancel')"
      variant="danger"
      @confirm="handleDelete"
      @cancel="deleteDialog.isOpen = false"
    />

    <AddDomainModal
      :is-open="editModalOpen"
      :domain="domain"
      @close="editModalOpen = false"
      @saved="handleEditSaved"
    />
  </div>
</template>

<script setup>
import { format } from 'date-fns';
import { AlertCircle as AlertCircleIcon, CheckCircle as CheckCircleIcon, ChevronDown as ChevronDownIcon } from 'lucide-vue-next';

const { t } = useI18n();
const toast = useToast();
const route = useRoute();
const id = route.params.id;

const { data, pending, error, refresh } = await useFetch(`/api/domains/${id}`);

const domain = computed(() => data.value?.data?.domain);
const latest = computed(() => data.value?.data?.latest);
const sslLatest = computed(() => data.value?.data?.sslLatest);
const riskSummary = computed(() => data.value?.data?.riskSummary);
const securityFindings = computed(() => data.value?.data?.securityFindings || []);
const refreshing = ref(false);
const sslChecking = ref(false);
const editModalOpen = ref(false);
const deleteDialog = ref({ isOpen: false });

const HISTORY_PAGE_SIZE = 50;
const historyItems = ref([]);
const historyNextCursor = ref(null);
const historyLoadingMore = ref(false);

watchEffect(() => {
  historyItems.value = data.value?.data?.history || [];
  historyNextCursor.value = data.value?.data?.historyNextCursor ?? null;
});

const rdapEvents = computed(() => [
  { key: 'registration', label: t('domain.rdap.registration'), value: latest.value?.rdapSummary?.events?.registration },
  { key: 'lastChanged', label: t('domain.rdap.lastChanged'), value: latest.value?.rdapSummary?.events?.lastChanged },
  { key: 'transfer', label: t('domain.rdap.transfer'), value: latest.value?.rdapSummary?.events?.transfer },
  { key: 'lastUpdateOfRdapDb', label: t('domain.rdap.lastUpdateOfRdapDb'), value: latest.value?.rdapSummary?.events?.lastUpdateOfRdapDb },
  { key: 'registrarExpiration', label: t('domain.rdap.registrarExpiration'), value: latest.value?.rdapSummary?.events?.registrarExpiration },
  { key: 'expiration', label: t('domain.rdap.expiration'), value: latest.value?.rdapSummary?.events?.expiration },
]);

const showSecuritySection = computed(() =>
  domain.value?.watchKind === 'OWNED' ||
  Boolean(riskSummary.value?.lastSecurityScanAt) ||
  securityFindings.value.length > 0,
);

const securityPostureCards = computed(() => {
  const summary = riskSummary.value || {};
  return [
    {
      key: 'risk',
      label: 'Risk score',
      value: summary.riskScore ?? 0,
      hint: `${summary.openFindingsCount ?? 0} open findings`,
      tone: (summary.riskScore ?? 0) >= 60
        ? 'text-status-dropping'
        : (summary.riskScore ?? 0) >= 20
          ? 'text-status-expiring'
          : 'text-status-available',
    },
    {
      key: 'dnssec',
      label: 'DNSSEC',
      value: summary.dnssecStatus || 'UNKNOWN',
      hint: 'DS record posture',
      tone: summary.dnssecStatus === 'SIGNED' ? 'text-status-available' : 'text-text-main',
    },
    {
      key: 'dmarc',
      label: 'DMARC',
      value: String(summary.dmarcPolicy || 'unknown').toUpperCase(),
      hint: 'Mail spoofing policy',
      tone: summary.dmarcPolicy === 'reject'
        ? 'text-status-available'
        : summary.dmarcPolicy === 'missing' || summary.dmarcPolicy === 'none'
          ? 'text-status-dropping'
          : 'text-status-expiring',
    },
    {
      key: 'caa',
      label: 'CAA',
      value: summary.caaConfigured ? 'SET' : 'MISSING',
      hint: 'Certificate issuer control',
      tone: summary.caaConfigured ? 'text-status-available' : 'text-status-expiring',
    },
    {
      key: 'registrar-lock',
      label: 'Registrar lock',
      value: summary.registrarLockStatus || 'UNKNOWN',
      hint: 'Transfer lock',
      tone: summary.registrarLockStatus === 'LOCKED'
        ? 'text-status-available'
        : summary.registrarLockStatus === 'UNLOCKED'
          ? 'text-status-dropping'
          : 'text-status-expiring',
    },
  ];
});

const loadMoreHistory = async () => {
  if (historyLoadingMore.value) return;
  if (!historyNextCursor.value) return;
  historyLoadingMore.value = true;
  try {
    const resp = await $fetch(`/api/domains/${id}/history`, {
      query: { cursor: historyNextCursor.value, limit: HISTORY_PAGE_SIZE },
    });
    if (resp?.code !== 0) {
      toast.error(resp?.msg || t('domain.loadError'));
      return;
    }
    const items = resp?.data?.items || [];
    historyItems.value = historyItems.value.concat(items);
    historyNextCursor.value = resp?.data?.nextCursor ?? null;
  } catch (e) {
    toast.error(t('domain.loadError'));
  } finally {
    historyLoadingMore.value = false;
  }
};

const onHistoryScroll = (e) => {
  const el = e?.target;
  if (!el) return;
  if (historyLoadingMore.value || !historyNextCursor.value) return;
  const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
  if (remaining < 120) loadMoreHistory();
};

const formatDate = (d, time = false) => {
  if (!d) return '—';
  return format(new Date(d), time ? 'yyyy-MM-dd HH:mm' : 'yyyy-MM-dd');
};

const truncate = (s, max = 28) => {
  const str = String(s || '');
  if (str.length <= max) return str;
  if (max <= 3) return str.slice(0, max);
  return `${str.slice(0, max - 3)}...`;
};

const copyText = async (text) => {
  const value = String(text || '').trim();
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    toast.success(t('common.copied'));
  } catch (e) {
    try {
      const el = document.createElement('textarea');
      el.value = value;
      el.setAttribute('readonly', 'true');
      el.style.position = 'fixed';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      toast.success(t('common.copied'));
    } catch {
      toast.error(t('common.copyFailed'));
    }
  }
};

const severityBadgeClass = (severity) => {
  switch (severity) {
    case 'HIGH':
      return 'bg-status-dropping/10 text-status-dropping';
    case 'MEDIUM':
      return 'bg-status-expiring/10 text-status-expiring';
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
  if (finding.findingType === 'DMARC_WEAK_POLICY') {
    return `policy=${evidence.policy || 'unknown'}, pct=${evidence.pct ?? 'unknown'}`;
  }
  if (finding.findingType === 'NAMESERVER_DRIFT' || finding.findingType === 'MX_DRIFT') {
    return `previous=${JSON.stringify(evidence.previous || [])}; current=${JSON.stringify(evidence.current || [])}`;
  }
  if (finding.findingType === 'REGISTRAR_LOCK_MISSING') {
    return `lockStatus=${evidence.lockStatus || 'unknown'}; statuses=${JSON.stringify(evidence.statuses || [])}`;
  }
  if (evidence.checkedRecord) return `checked=${evidence.checkedRecord}`;
  return JSON.stringify(evidence);
};

const updateFindingStatus = async (finding, status) => {
  try {
    const resp = await $fetch(`/api/security/findings/${finding.id}`, {
      method: 'PATCH',
      body: { status },
    });
    if (resp?.code !== 0) {
      toast.error(resp?.msg || 'Failed to update finding');
      return;
    }
    toast.success(status === 'RESOLVED' ? 'Finding resolved' : 'Finding dismissed');
    await refresh();
  } catch (e) {
    toast.error('Failed to update finding');
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case 'AVAILABLE': return 'var(--color-status-available)';
    case 'REGISTERED': return 'var(--color-status-registered)';
    case 'EXPIRING': return 'var(--color-status-expiring)';
    case 'PENDING_DELETE': return 'var(--color-status-dropping)';
    default: return 'var(--color-status-unknown)';
  }
};

const statusToneClass = (status) => {
  switch (status) {
    case 'AVAILABLE': return 'text-status-available';
    case 'REGISTERED': return 'text-status-registered';
    case 'EXPIRING': return 'text-status-expiring';
    case 'PENDING_DELETE': return 'text-status-dropping';
    default: return 'text-status-unknown';
  }
};

const statusDotClass = (status) => {
  switch (status) {
    case 'AVAILABLE': return 'bg-status-available';
    case 'REGISTERED': return 'bg-status-registered';
    case 'EXPIRING': return 'bg-status-expiring';
    case 'PENDING_DELETE': return 'bg-status-dropping';
    default: return 'bg-status-unknown';
  }
};

const priorityToneClass = computed(() => {
  switch (domain.value?.priority) {
    case 'HIGH': return 'text-priority-high';
    case 'MEDIUM': return 'text-priority-medium';
    case 'LOW': return 'text-priority-low';
    default: return 'text-priority-low';
  }
});

const refreshDomain = async () => {
  refreshing.value = true;
  try {
    await $fetch(`/api/domains/${id}/refresh`, { method: 'POST' });
    toast.success(t('domain.scanSuccess'));
    refresh();
  } catch (e) {
    toast.error(t('domain.scanError'));
  } finally {
    refreshing.value = false;
  }
};

const checkSSLNow = async () => {
  sslChecking.value = true;
  try {
    await $fetch(`/api/ssl/${id}/check`, { method: 'POST' });
    toast.success(t('ssl.checkSuccess'));
    await refresh();
  } catch (e) {
    toast.error(t('ssl.checkError'));
  } finally {
    sslChecking.value = false;
  }
};

const sslStatusToneClass = (s) => {
  if (!s?.hasSSL) return 'text-status-unknown';
  if (!s?.isValid) return 'text-status-dropping';
  if (s?.daysUntilExpiry != null && s.daysUntilExpiry < 30) return 'text-status-expiring';
  return 'text-status-available';
};

const sslStatusDotClass = (s) => {
  if (!s?.hasSSL) return 'bg-status-unknown';
  if (!s?.isValid) return 'bg-status-dropping';
  if (s?.daysUntilExpiry != null && s.daysUntilExpiry < 30) return 'bg-status-expiring';
  return 'bg-status-available';
};

const sslStatusText = (s) => {
  if (!s?.hasSSL) return t('ssl.status.noSSL');
  if (!s?.isValid) return t('ssl.status.invalid');
  if (s?.daysUntilExpiry != null && s.daysUntilExpiry < 30) return t('ssl.status.expiring');
  return t('ssl.status.valid');
};

const sslLastErrorText = (s) => {
  if (s?.hasSSL && s?.lastError) return t('ssl.retainedAfterError', { error: s.lastError });
  return s?.lastError || '';
};

const sslCheckedHostDiff = (s) =>
  s?.checkedHost && domain.value?.domain && s.checkedHost !== domain.value.domain;

const sslDaysClass = (days) => {
  if (days == null) return 'text-text-main';
  if (days < 0) return 'text-status-dropping';
  if (days < 30) return 'text-status-expiring';
  return 'text-text-main';
};

const confirmDelete = () => {
  deleteDialog.value.isOpen = true;
};

const handleDelete = async () => {
  deleteDialog.value.isOpen = false;
  try {
    await $fetch(`/api/domains/${id}`, { method: 'DELETE' });
    toast.success(t('domain.deleteSuccess'));
    navigateTo('/domains');
  } catch (e) {
    toast.error(t('domain.deleteError'));
  }
};

const openEditModal = () => {
  editModalOpen.value = true;
};

const handleEditSaved = async () => {
  editModalOpen.value = false;
  await refresh();
};
</script>
