<template>
  <div class="mx-auto max-w-6xl space-y-8 md:space-y-10">

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

    <div v-else class="flex flex-col gap-8 md:gap-10">

      <!-- ─── HERO ─────────────────────────────────────────────────── -->
      <section class="surface overflow-hidden p-6 md:p-7">
        <p class="eyebrow mb-3">Watch entry</p>
        <div class="flex flex-wrap items-end justify-between gap-6">
          <div class="min-w-0 flex-1">
            <h1 class="font-mono text-3xl font-bold tracking-tight text-text-main md:text-4xl select-all">
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

        <div class="hairline mt-6" />

        <div class="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div
            v-for="card in overviewCards"
            :key="card.key"
            class="surface-flat p-4"
          >
            <div class="flex items-center justify-between gap-3">
              <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ card.label }}</p>
              <span :class="['h-1.5 w-1.5 rounded-full', card.dot]" />
            </div>
            <p :class="['mt-3 truncate text-xl font-bold tracking-tight', card.tone]" data-numeric>
              {{ card.value }}
            </p>
            <p class="mt-1 truncate text-xs text-text-tertiary">{{ card.hint }}</p>
          </div>
        </div>

        <div
          v-if="latest?.lastError"
          class="surface-flat mt-5 flex flex-col gap-2 p-4 text-xs md:flex-row md:items-start md:justify-between"
        >
          <div class="min-w-0 flex-1">
            <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-status-dropping">{{ $t('domain.scanError') }}</p>
            <p class="mt-2 break-words font-mono text-text-main">{{ latest.lastError }}</p>
          </div>
          <p class="whitespace-nowrap font-mono text-text-tertiary">{{ formatDate(latest.lastErrorAt, true) }}</p>
        </div>
      </section>

      <!-- ─── INFO + METADATA ─────────────────────────────────────── -->
      <section class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div class="surface p-6">
          <div class="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p class="eyebrow mb-3">{{ $t('domain.detail.attention') }}</p>
              <h2 class="headline-display text-2xl">{{ $t('domain.detail.brief') }}</h2>
            </div>
            <p class="max-w-md text-xs leading-relaxed text-text-secondary">{{ $t('domain.detail.attentionHint') }}</p>
          </div>
          <div class="hairline mt-4" />

          <div class="mt-5 space-y-3">
            <div
              v-for="item in attentionItems"
              :key="item.key"
              class="surface-flat flex flex-col gap-3 p-4 md:flex-row md:items-start"
            >
              <span :class="['mt-1 h-2 w-2 shrink-0 rounded-full', item.dot]" />
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 :class="['text-sm font-semibold', item.tone]">{{ item.title }}</h3>
                  <span v-if="item.meta" class="font-mono text-[10px] uppercase tracking-[0.14em] text-text-tertiary">{{ item.meta }}</span>
                </div>
                <p class="mt-1 text-sm leading-relaxed text-text-secondary">{{ item.text }}</p>
              </div>
            </div>
          </div>
        </div>

        <aside class="surface p-6 lg:sticky lg:top-24 lg:self-start">
          <p class="eyebrow mb-3">{{ $t('domain.detail.operationalContext') }}</p>
          <h2 class="headline-display text-xl">{{ $t('domain.information') }}</h2>
          <div class="hairline mt-4" />

          <dl class="mt-1 text-sm">
            <div class="flex items-center justify-between gap-4 border-b border-hairline py-3">
              <dt class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('domain.expiresAt') }}</dt>
              <dd class="text-right font-mono text-text-main">{{ formatDate(primaryExpiryDate) }}</dd>
            </div>
            <div class="flex items-center justify-between gap-4 border-b border-hairline py-3">
              <dt class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('domain.lastChecked') }}</dt>
              <dd class="text-right font-mono text-text-main">{{ formatDate(latest?.checkedAt, true) }}</dd>
            </div>
            <div class="flex items-center justify-between gap-4 border-b border-hairline py-3">
              <dt class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('domain.registrar') }}</dt>
              <dd class="break-all text-right font-mono text-text-main">{{ latest?.registrar || '—' }}</dd>
            </div>
            <div class="flex items-center justify-between gap-4 border-b border-hairline py-3">
              <dt class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('domain.detail.source') }}</dt>
              <dd class="break-all text-right font-mono text-text-main">{{ latest?.source || '—' }}</dd>
            </div>
            <div class="flex items-center justify-between gap-4 border-b border-hairline py-3">
              <dt class="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('common.createdAt') }}</dt>
              <dd class="text-right font-mono text-text-main">{{ formatDate(domain.createdAt) }}</dd>
            </div>
          </dl>

          <div class="mt-5">
            <p class="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('domain.nameservers') }}</p>
            <div class="flex flex-wrap gap-x-3 gap-y-1 text-xs">
              <span v-if="latest?.nameservers && latest.nameservers.length" v-for="ns in latest.nameservers" :key="ns" class="font-mono text-text-main">{{ ns }}</span>
              <span v-else class="text-text-tertiary">{{ $t('domain.noNameservers') }}</span>
            </div>
          </div>

          <div class="mt-5">
            <p class="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('domain.tags') }}</p>
            <div class="flex flex-wrap gap-x-3 gap-y-1 text-xs">
              <span v-if="domain.tags && domain.tags.length" v-for="tag in domain.tags" :key="tag" class="font-mono text-text-secondary">#{{ tag }}</span>
              <span v-else class="text-text-tertiary">{{ $t('domain.noTags') }}</span>
            </div>
          </div>

          <div class="mt-5">
            <p class="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{{ $t('domain.note') }}</p>
            <p class="surface-flat p-3 text-sm leading-relaxed text-text-main">{{ domain.note || $t('domain.noNotes') }}</p>
          </div>
        </aside>
      </section>

      <!-- ─── RDAP SUMMARY ────────────────────────────────────────── -->
      <section v-if="showSecuritySection" class="surface p-6">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p class="eyebrow mb-3">{{ t('domain.detail.securityKicker') }}</p>
            <h2 class="headline-display text-2xl">{{ t('domain.detail.securityPosture') }}</h2>
          </div>
          <p class="font-mono text-xs text-text-tertiary">
            {{ t('domain.detail.lastScan', { time: formatDate(riskSummary?.lastSecurityScanAt, true) }) }}
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
            <p :class="['mt-2 font-sans text-2xl font-bold tracking-tight', card.tone]" data-numeric>
              {{ card.value }}
            </p>
            <p v-if="card.hint" class="mt-1 text-xs text-text-tertiary">{{ card.hint }}</p>
          </div>
        </div>

        <div class="mt-8">
          <div class="flex items-center justify-between gap-3">
            <p class="eyebrow">{{ t('domain.detail.findings') }}</p>
            <span class="font-mono text-xs text-text-tertiary">{{ t('domain.detail.findingsTotal', { count: securityFindings.length }) }}</span>
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
                    {{ severityLabel(finding.severity) }}
                  </span>
                  <span class="font-mono text-[11px] uppercase tracking-[0.12em] text-text-tertiary">{{ statusLabel(finding.status) }}</span>
                </div>
                <h3 class="mt-3 text-sm font-semibold text-text-main">{{ findingTypeLabel(finding.findingType) }}</h3>
                <p class="mt-2 break-words font-mono text-xs leading-5 text-text-secondary">
                  {{ findingEvidenceText(finding) }}
                </p>
                <p class="mt-2 font-mono text-[11px] text-text-tertiary">
                  {{ t('domain.detail.lastSeen', { time: formatDate(finding.lastSeenAt, true) }) }}
                </p>
              </div>

              <div v-if="finding.status === 'OPEN'" class="flex shrink-0 gap-2">
                <button type="button" class="btn-ghost px-3 py-1.5 text-xs" @click="updateFindingStatus(finding, 'DISMISSED')">
                  {{ t('risk.findings.actions.dismiss') }}
                </button>
                <button type="button" class="btn-ghost px-3 py-1.5 text-xs" @click="updateFindingStatus(finding, 'RESOLVED')">
                  {{ t('risk.findings.actions.resolve') }}
                </button>
              </div>
            </div>
          </div>

          <div v-else class="surface-flat mt-4 p-6 text-center">
            <CheckCircleIcon class="mx-auto mb-3 h-6 w-6 text-status-available" />
            <p class="text-sm text-text-secondary">{{ t('domain.detail.noSecurityFindings') }}</p>
          </div>
        </div>
      </section>

      <!-- ─── SSL ─────────────────────────────────────────────────── -->
      <section v-if="domain.watchKind === 'OWNED' || sslLatest" class="surface p-6">
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
              <dd :class="['mt-2 font-sans text-2xl font-bold tracking-tight', sslDaysClass(sslLatest.daysUntilExpiry)]" data-numeric>
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

      <!-- RDAP summary -->
      <section class="surface p-6">
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

      <!-- ─── TIMELINE ────────────────────────────────────────────── -->
      <section class="surface p-6">
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
      <details class="surface group p-6">
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
import { AlertCircle as AlertCircleIcon, CheckCircle as CheckCircleIcon, ChevronDown as ChevronDownIcon } from '@lucide/vue';
import { unwrapApiEnvelope } from '~/utils/api-envelope';

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

const DAY_MS = 24 * 60 * 60 * 1000;
const RISK_SEVERITY_WEIGHT = {
  HIGH: 40,
  MEDIUM: 20,
  LOW: 5,
};

const primaryExpiryDate = computed(() =>
  latest.value?.expiresAt ||
  latest.value?.rdapSummary?.events?.expiration ||
  latest.value?.rdapSummary?.events?.registrarExpiration,
);

const primaryExpiryDays = computed(() => daysUntil(primaryExpiryDate.value));

const openSecurityFindingsCount = computed(() =>
  securityFindings.value.filter((finding) => finding.status === 'OPEN').length,
);

const overviewCards = computed(() => {
  const status = latest.value?.status;
  const expiryDays = primaryExpiryDays.value;
  const riskScore = riskSummary.value?.riskScore ?? 0;
  const ssl = sslLatest.value;

  return [
    {
      key: 'status',
      label: t('domain.detail.statusSignal'),
      value: status ? t(`domain.status.${status.toLowerCase()}`) : t('domain.status.unknown'),
      hint: [
        domain.value?.watchKind === 'OWNED' ? t('domain.owned') : t('domain.wanted'),
        domain.value?.priority ? t(`domain.${domain.value.priority.toLowerCase()}`) : null,
      ].filter(Boolean).join(' / '),
      tone: status ? statusToneClass(status) : 'text-status-unknown',
      dot: status ? statusDotClass(status) : 'bg-status-unknown',
    },
    {
      key: 'expiry',
      label: t('domain.detail.expirySignal'),
      value: formatExpiryValue(expiryDays),
      hint: formatDate(primaryExpiryDate.value),
      tone: expiryToneClass(expiryDays),
      dot: expiryDotClass(expiryDays),
    },
    {
      key: 'ssl',
      label: t('domain.detail.sslSignal'),
      value: ssl ? sslStatusText(ssl) : t('domain.detail.notChecked'),
      hint: ssl?.issuer || formatDate(ssl?.checkedAt, true),
      tone: ssl ? sslStatusToneClass(ssl) : 'text-status-unknown',
      dot: ssl ? sslStatusDotClass(ssl) : 'bg-status-unknown',
    },
    {
      key: 'risk',
      label: t('domain.detail.riskSignal'),
      value: riskScore,
      hint: t('domain.detail.openFindings', { count: openSecurityFindingsCount.value }),
      tone: riskToneClass(riskScore),
      dot: riskDotClass(riskScore),
    },
  ];
});

const attentionItems = computed(() => {
  const items = [];
  const status = latest.value?.status;
  const expiryDays = primaryExpiryDays.value;
  const ssl = sslLatest.value;

  if (latest.value?.lastError) {
    items.push({
      key: 'scan-error',
      title: t('domain.detail.scanFailedTitle'),
      text: t('domain.detail.scanFailedText'),
      meta: formatDate(latest.value.lastErrorAt, true),
      tone: 'text-status-dropping',
      dot: 'bg-status-dropping',
    });
  }

  if (domain.value?.watchKind === 'WANTED' && status === 'AVAILABLE') {
    items.push({
      key: 'wanted-available',
      title: t('domain.detail.wantedAvailableTitle'),
      text: t('domain.detail.wantedAvailableText'),
      meta: t('domain.status.available'),
      tone: 'text-status-available',
      dot: 'bg-status-available',
    });
  }

  if (domain.value?.watchKind === 'OWNED' && (status === 'EXPIRING' || status === 'PENDING_DELETE')) {
    items.push({
      key: 'owned-expiring',
      title: t('domain.detail.ownedExpiringTitle'),
      text: t('domain.detail.ownedExpiringText'),
      meta: status ? t(`domain.status.${status.toLowerCase()}`) : null,
      tone: status === 'PENDING_DELETE' ? 'text-status-dropping' : 'text-status-expiring',
      dot: status === 'PENDING_DELETE' ? 'bg-status-dropping' : 'bg-status-expiring',
    });
  }

  if (
    domain.value?.watchKind === 'OWNED' &&
    expiryDays != null &&
    expiryDays >= 0 &&
    expiryDays < 30 &&
    status !== 'EXPIRING' &&
    status !== 'PENDING_DELETE'
  ) {
    items.push({
      key: 'domain-expiry-window',
      title: t('domain.detail.domainExpiryTitle'),
      text: t('domain.detail.domainExpiryText', { days: expiryDays }),
      meta: formatDate(primaryExpiryDate.value),
      tone: 'text-status-expiring',
      dot: 'bg-status-expiring',
    });
  }

  if (ssl) {
    if (ssl.hasSSL && !ssl.isValid) {
      items.push({
        key: 'ssl-invalid',
        title: t('domain.detail.sslInvalidTitle'),
        text: t('domain.detail.sslInvalidText'),
        meta: ssl.issuer || null,
        tone: 'text-status-dropping',
        dot: 'bg-status-dropping',
      });
    } else if (ssl.daysUntilExpiry != null && ssl.daysUntilExpiry >= 0 && ssl.daysUntilExpiry < 30) {
      items.push({
        key: 'ssl-expiring',
        title: t('domain.detail.sslExpiringTitle'),
        text: t('domain.detail.sslExpiringText', { days: ssl.daysUntilExpiry }),
        meta: formatDate(ssl.validTo),
        tone: 'text-status-expiring',
        dot: 'bg-status-expiring',
      });
    }
  }

  if (openSecurityFindingsCount.value > 0) {
    items.push({
      key: 'security-findings',
      title: t('domain.detail.securityFindingsTitle'),
      text: t('domain.detail.securityFindingsText', { count: openSecurityFindingsCount.value }),
      meta: t('domain.detail.openFindings', { count: openSecurityFindingsCount.value }),
      tone: riskToneClass(riskSummary.value?.riskScore ?? 0),
      dot: riskDotClass(riskSummary.value?.riskScore ?? 0),
    });
  }

  if (!items.length) {
    items.push({
      key: 'stable',
      title: t('domain.detail.stableTitle'),
      text: t('domain.detail.stableText'),
      meta: formatDate(latest.value?.checkedAt, true),
      tone: 'text-status-available',
      dot: 'bg-status-available',
    });
  }

  return items;
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
      label: t('domain.detail.riskScore'),
      value: summary.riskScore ?? 0,
      hint: t('domain.detail.openFindings', { count: summary.openFindingsCount ?? 0 }),
      tone: (summary.riskScore ?? 0) >= 60
        ? 'text-status-dropping'
        : (summary.riskScore ?? 0) >= 20
          ? 'text-status-expiring'
          : 'text-status-available',
    },
    {
      key: 'dnssec',
      label: 'DNSSEC',
      value: dnssecStatusLabel(summary.dnssecStatus),
      hint: t('domain.detail.dnssecHint'),
      tone: summary.dnssecStatus === 'SIGNED' ? 'text-status-available' : 'text-text-main',
    },
    {
      key: 'dmarc',
      label: 'DMARC',
      value: dmarcPolicyLabel(summary.dmarcPolicy),
      hint: t('domain.detail.dmarcHint'),
      tone: summary.dmarcPolicy === 'reject'
        ? 'text-status-available'
        : summary.dmarcPolicy === 'missing' || summary.dmarcPolicy === 'none'
          ? 'text-status-dropping'
          : 'text-status-expiring',
    },
    {
      key: 'caa',
      label: 'CAA',
      value: summary.caaConfigured ? t('domain.detail.caaSet') : t('domain.detail.caaMissing'),
      hint: t('domain.detail.caaHint'),
      tone: summary.caaConfigured ? 'text-status-available' : 'text-status-expiring',
    },
    {
      key: 'registrar-lock',
      label: t('domain.detail.registrarLock'),
      value: registrarLockStatusLabel(summary.registrarLockStatus),
      hint: t('domain.detail.registrarLockHint'),
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
    const historyData = unwrapApiEnvelope(resp, t('domain.loadError'));
    const items = historyData?.items || [];
    historyItems.value = historyItems.value.concat(items);
    historyNextCursor.value = historyData?.nextCursor ?? null;
  } catch (e) {
    toast.error(e?.message || e?.data?.msg || t('domain.loadError'));
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

const daysUntil = (date) => {
  if (!date) return null;
  const target = new Date(date).getTime();
  if (Number.isNaN(target)) return null;
  return Math.ceil((target - Date.now()) / DAY_MS);
};

const formatExpiryValue = (days) => {
  if (days == null) return '—';
  if (days < 0) return t('domain.detail.daysOverdue', { days: Math.abs(days) });
  return t('domain.detail.daysLeft', { days });
};

const expiryToneClass = (days) => {
  if (days == null) return 'text-status-unknown';
  if (days < 0) return 'text-status-dropping';
  if (days < 30) return 'text-status-expiring';
  return 'text-text-main';
};

const expiryDotClass = (days) => {
  if (days == null) return 'bg-status-unknown';
  if (days < 0) return 'bg-status-dropping';
  if (days < 30) return 'bg-status-expiring';
  return 'bg-status-registered';
};

const riskToneClass = (score) => {
  if (score >= 60) return 'text-status-dropping';
  if (score >= 20) return 'text-status-expiring';
  return 'text-status-available';
};

const riskDotClass = (score) => {
  if (score >= 60) return 'bg-status-dropping';
  if (score >= 20) return 'bg-status-expiring';
  return 'bg-status-available';
};

const fallbackLabel = (value) =>
  String(value || t('risk.common.unknown')).replaceAll('_', ' ').toLowerCase();

const translatedLabel = (key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

const statusLabel = (value) => translatedLabel(`risk.status.${value}`, fallbackLabel(value));
const severityLabel = (value) => translatedLabel(`risk.severity.${value}`, fallbackLabel(value));
const findingTypeLabel = (value) => translatedLabel(`risk.findingTypes.${value}`, fallbackLabel(value));
const dnssecStatusLabel = (value) =>
  translatedLabel(`domain.detail.dnssecStatuses.${value || 'UNKNOWN'}`, fallbackLabel(value));
const dmarcPolicyLabel = (value) =>
  translatedLabel(`domain.detail.dmarcPolicies.${value || 'unknown'}`, fallbackLabel(value));
const registrarLockStatusLabel = (value) =>
  translatedLabel(`domain.detail.registrarLockStatuses.${value || 'UNKNOWN'}`, fallbackLabel(value));

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

const applyFindingStatusUpdate = (finding, status) => {
  const payload = data.value?.data;
  if (!payload) return;

  const previousOpen = finding?.status === 'OPEN';
  const nextOpen = status === 'OPEN';
  const severityWeight = RISK_SEVERITY_WEIGHT[finding?.severity] || 0;
  const openCountDelta = previousOpen === nextOpen ? 0 : nextOpen ? 1 : -1;
  const riskScoreDelta = previousOpen === nextOpen ? 0 : nextOpen ? severityWeight : -severityWeight;
  const currentSummary = payload.riskSummary || {};

  data.value = {
    ...data.value,
    data: {
      ...payload,
      riskSummary: {
        ...currentSummary,
        openFindingsCount: Math.max(0, (currentSummary.openFindingsCount ?? 0) + openCountDelta),
        riskScore: Math.max(0, Math.min(100, (currentSummary.riskScore ?? 0) + riskScoreDelta)),
      },
      securityFindings: (payload.securityFindings || []).map((item) =>
        item.id === finding.id ? { ...item, status } : item,
      ),
    },
  };
};

const updateFindingStatus = async (finding, status) => {
  try {
    const resp = await $fetch(`/api/security/findings/${finding.id}`, {
      method: 'PATCH',
      body: { status },
    });
    unwrapApiEnvelope(resp, t('risk.findings.toasts.updateFailed'));
    applyFindingStatusUpdate(finding, status);
    toast.success(t('risk.findings.toasts.statusUpdated', { status: statusLabel(status) }));
  } catch (e) {
    toast.error(e?.message || e?.data?.msg || t('risk.findings.toasts.updateFailed'));
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
    const response = await $fetch(`/api/domains/${id}/refresh`, { method: 'POST' });
    unwrapApiEnvelope(response, t('domain.scanError'));
    toast.success(t('domain.scanSuccess'));
    await refresh();
  } catch (e) {
    toast.error(e?.message || e?.data?.msg || t('domain.scanError'));
  } finally {
    refreshing.value = false;
  }
};

const checkSSLNow = async () => {
  sslChecking.value = true;
  try {
    const response = await $fetch(`/api/ssl/${id}/check`, { method: 'POST' });
    unwrapApiEnvelope(response, t('ssl.checkError'));
    toast.success(t('ssl.checkSuccess'));
    await refresh();
  } catch (e) {
    toast.error(e?.message || e?.data?.msg || t('ssl.checkError'));
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
    const response = await $fetch(`/api/domains/${id}`, { method: 'DELETE' });
    unwrapApiEnvelope(response, t('domain.deleteError'));
    toast.success(t('domain.deleteSuccess'));
    navigateTo('/domains');
  } catch (e) {
    toast.error(e?.message || e?.data?.msg || t('domain.deleteError'));
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
