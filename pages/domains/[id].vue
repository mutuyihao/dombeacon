<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Breadcrumb -->
    <div class="flex items-center gap-2 text-sm text-text-secondary mb-2">
        <NuxtLink to="/domains" class="hover:text-accent transition-colors">{{ $t('nav.domains') }}</NuxtLink>
        <span>/</span>
        <span>{{ $t('domain.viewDetails') }}</span>
    </div>

    <!-- Loading State -->
    <div v-if="pending" class="py-20 text-center">
      <LoadingSpinner size="lg" />
      <p class="mt-4 text-text-secondary">{{ $t('common.loading') }}</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error || !data" class="py-20 text-center">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-status-dropping/10 mb-4">
        <svg class="w-8 h-8 text-status-dropping" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p class="text-status-dropping">{{ $t('domain.loadError') }}</p>
    </div>

    <div v-else class="space-y-6">
        <!-- Header Card -->
        <div class="bg-card border border-card-border rounded-2xl p-6 shadow-sm">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div class="flex-1">
                    <h1 class="text-2xl font-semibold text-text-main mb-3 select-all">{{ domain.domain }}</h1>
                    <div class="flex flex-wrap items-center gap-2">
                        <!-- Status Badge -->
                        <span v-if="latest?.status" :class="['px-3 py-1 rounded-full text-sm font-medium border', statusClass(latest.status)]">
                            {{ $t(`domain.status.${latest.status.toLowerCase()}`) }}
                        </span>
                        <span v-else class="px-3 py-1 rounded-full text-sm font-medium border bg-status-unknown/10 text-status-unknown border-status-unknown/20">
                            {{ $t('domain.status.unknown') }}
                        </span>

                        <!-- Watch Kind Badge -->
                        <span :class="['px-2 py-0.5 rounded text-xs font-medium', watchKindClass]">
                            {{ domain.watchKind === 'OWNED' ? $t('domain.owned') : $t('domain.wanted') }}
                        </span>

                        <!-- Priority Badge -->
                        <span v-if="domain.priority" :class="['px-2 py-0.5 rounded text-xs font-medium', priorityClass]">
                            {{ $t(`domain.${domain.priority.toLowerCase()}`) }}
                        </span>

                        <!-- Registrar -->
                        <span v-if="latest?.registrar" class="text-sm text-text-secondary">
                            {{ $t('domain.registrar') }}: {{ latest.registrar }}
                        </span>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="flex gap-2 w-full md:w-auto">
                    <button
                        @click="openEditModal"
                        class="flex-1 md:flex-none px-4 py-2 bg-background border border-card-border rounded-lg text-sm font-medium hover:bg-card-border/30 transition-all active:scale-95"
                    >
                        {{ $t('common.edit') }}
                    </button>
                    <button
                        @click="refreshDomain"
                        :disabled="refreshing"
                        class="flex-1 md:flex-none px-4 py-2 bg-background border border-card-border rounded-lg text-sm font-medium hover:bg-card-border/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span v-if="refreshing" class="flex items-center gap-2 justify-center">
                            <LoadingSpinner size="sm" color="gray" />
                            {{ $t('domain.checking') }}
                        </span>
                        <span v-else>{{ $t('domain.checkNow') }}</span>
                    </button>
                    <button
                        @click="confirmDelete"
                        class="flex-1 md:flex-none px-4 py-2 text-status-dropping bg-background border border-card-border rounded-lg text-sm font-medium hover:bg-status-dropping/10 transition-all active:scale-95"
                    >
                        {{ $t('common.delete') }}
                    </button>
                </div>
            </div>

            <div
              v-if="latest?.lastError"
              class="mt-4 text-xs text-status-dropping bg-status-dropping/10 border border-status-dropping/20 rounded-lg p-3 flex flex-col md:flex-row md:items-start md:justify-between gap-2"
            >
              <div class="flex-1 min-w-0">
                <div class="font-medium mb-1">{{ $t('domain.scanError') }}</div>
                <div class="font-mono break-words">{{ latest.lastError }}</div>
              </div>
              <div class="font-mono text-status-dropping/80 whitespace-nowrap">
                {{ formatDate(latest.lastErrorAt, true) }}
              </div>
            </div>
        </div>

        <!-- Info Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Key Dates & Info -->
            <div class="bg-card border border-card-border rounded-2xl p-6 shadow-sm">
                <h3 class="font-medium text-text-main mb-4 border-b border-card-border pb-2">{{ $t('domain.information') }}</h3>
                <dl class="space-y-3 text-sm">
                    <div class="flex justify-between items-center py-2 border-b border-card-border/50 last:border-0">
                        <dt class="text-text-secondary flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {{ $t('domain.expiresAt') }}
                        </dt>
                        <dd class="font-mono text-text-main font-medium">{{ formatDate(latest?.expiresAt) }}</dd>
                    </div>
                    <div class="flex justify-between items-center py-2 border-b border-card-border/50 last:border-0">
                        <dt class="text-text-secondary flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {{ $t('domain.lastChecked') }}
                        </dt>
                        <dd class="font-mono text-text-main">{{ formatDate(latest?.checkedAt, true) }}</dd>
                    </div>
                    <div class="flex justify-between items-center py-2 border-b border-card-border/50 last:border-0">
                        <dt class="text-text-secondary flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                            </svg>
                            {{ $t('common.createdAt') }}
                        </dt>
                        <dd class="font-mono text-text-main">{{ formatDate(domain.createdAt) }}</dd>
                    </div>
                    <div class="pt-3">
                        <dt class="text-text-secondary mb-2 flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                            </svg>
                            {{ $t('domain.nameservers') }}
                        </dt>
                        <dd class="text-text-main flex flex-wrap gap-1">
                            <span v-if="latest?.nameservers && latest.nameservers.length > 0" v-for="ns in latest.nameservers" :key="ns" class="px-2 py-1 bg-background rounded text-xs font-mono">{{ ns }}</span>
                            <span v-else class="text-text-weak text-xs">{{ $t('domain.noNameservers') }}</span>
                        </dd>
                    </div>
                </dl>
            </div>

            <!-- Notes & Tags -->
            <div class="bg-card border border-card-border rounded-2xl p-6 shadow-sm">
                 <h3 class="font-medium text-text-main mb-4 border-b border-card-border pb-2">{{ $t('domain.metadata') }}</h3>
                 <div class="mb-4">
                     <p class="text-sm text-text-secondary mb-2 flex items-center gap-2">
                         <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                         </svg>
                         {{ $t('domain.note') }}
                     </p>
                     <p class="text-text-main bg-background p-3 rounded-lg text-sm min-h-[60px]">{{ domain.note || $t('domain.noNotes') }}</p>
                 </div>
                 <div>
                     <p class="text-sm text-text-secondary mb-2 flex items-center gap-2">
                         <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                         </svg>
                         {{ $t('domain.tags') }}
                     </p>
                     <div class="flex flex-wrap gap-2">
                         <span v-if="domain.tags && domain.tags.length > 0" v-for="tag in domain.tags" :key="tag" class="px-2 py-1 bg-background border border-card-border rounded text-xs text-text-secondary">
                             {{ tag }}
                         </span>
                         <span v-else class="text-text-weak text-xs">{{ $t('domain.noTags') }}</span>
                     </div>
                 </div>
            </div>
        </div>

        <!-- RDAP Summary -->
        <div class="bg-card border border-card-border rounded-2xl p-6 shadow-sm">
          <div class="flex items-center justify-between mb-4 border-b border-card-border pb-2">
            <h3 class="font-medium text-text-main flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4h16v6H4V4zm0 10h16v6H4v-6z" />
              </svg>
              {{ $t('domain.rdap.title') }}
            </h3>
            <span class="text-xs text-text-weak font-mono">
              {{ latest?.source || '--' }}
            </span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div class="bg-background rounded-lg p-4 space-y-2">
              <div class="text-text-secondary text-xs">{{ $t('domain.rdap.handle') }}</div>
              <div class="font-mono text-text-main break-all">{{ latest?.rdapSummary?.handle || '--' }}</div>
            </div>

            <div class="bg-background rounded-lg p-4 space-y-2">
              <div class="text-text-secondary text-xs">{{ $t('domain.rdap.unicodeName') }}</div>
              <div class="font-mono text-text-main break-all">{{ latest?.rdapSummary?.unicodeName || '--' }}</div>
            </div>

            <div class="bg-background rounded-lg p-4 space-y-2 md:col-span-2">
              <div class="text-text-secondary text-xs">{{ $t('domain.rdap.rdapUrl') }}</div>
              <div class="flex items-start gap-2">
                <a
                  v-if="latest?.rdapSummary?.rdapUrl"
                  :href="latest.rdapSummary.rdapUrl"
                  target="_blank"
                  rel="noreferrer"
                  class="flex-1 min-w-0 font-mono text-text-main underline decoration-card-border hover:decoration-text-main break-all"
                >
                  {{ latest.rdapSummary.rdapUrl }}
                </a>
                <span v-else class="flex-1 min-w-0 font-mono text-text-weak">--</span>
                <button
                  v-if="latest?.rdapSummary?.rdapUrl"
                  type="button"
                  class="shrink-0 px-2 py-1 text-xs bg-background border border-card-border rounded hover:bg-card-border/30 transition-all active:scale-95"
                  @click="copyText(latest.rdapSummary.rdapUrl)"
                >
                  {{ $t('common.copy') }}
                </button>
              </div>
            </div>
          </div>

          <div class="mt-5">
            <div class="text-text-secondary text-xs mb-2">{{ $t('domain.rdap.dates') }}</div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div class="bg-background rounded-lg p-4 space-y-2">
                <div class="text-text-secondary text-xs">{{ $t('domain.rdap.registration') }}</div>
                <div class="font-mono text-text-main">{{ formatDate(latest?.rdapSummary?.events?.registration, true) }}</div>
              </div>
              <div class="bg-background rounded-lg p-4 space-y-2">
                <div class="text-text-secondary text-xs">{{ $t('domain.rdap.lastChanged') }}</div>
                <div class="font-mono text-text-main">{{ formatDate(latest?.rdapSummary?.events?.lastChanged, true) }}</div>
              </div>
              <div class="bg-background rounded-lg p-4 space-y-2">
                <div class="text-text-secondary text-xs">{{ $t('domain.rdap.transfer') }}</div>
                <div class="font-mono text-text-main">{{ formatDate(latest?.rdapSummary?.events?.transfer, true) }}</div>
              </div>
              <div class="bg-background rounded-lg p-4 space-y-2">
                <div class="text-text-secondary text-xs">{{ $t('domain.rdap.lastUpdateOfRdapDb') }}</div>
                <div class="font-mono text-text-main">{{ formatDate(latest?.rdapSummary?.events?.lastUpdateOfRdapDb, true) }}</div>
              </div>
              <div class="bg-background rounded-lg p-4 space-y-2">
                <div class="text-text-secondary text-xs">{{ $t('domain.rdap.registrarExpiration') }}</div>
                <div class="font-mono text-text-main">{{ formatDate(latest?.rdapSummary?.events?.registrarExpiration, true) }}</div>
              </div>
              <div class="bg-background rounded-lg p-4 space-y-2">
                <div class="text-text-secondary text-xs">{{ $t('domain.rdap.expiration') }}</div>
                <div class="font-mono text-text-main">{{ formatDate(latest?.rdapSummary?.events?.expiration, true) }}</div>
              </div>
            </div>
          </div>

          <div class="mt-5">
            <div class="text-text-secondary text-xs mb-2">{{ $t('domain.rdap.eppStatuses') }}</div>
            <div class="flex flex-wrap gap-1">
              <template v-if="latest?.rdapSummary?.statuses?.length">
                <span
                  v-for="s in latest.rdapSummary.statuses"
                  :key="s"
                  class="px-2 py-1 bg-background border border-card-border rounded text-xs font-mono text-text-secondary"
                >
                  {{ s }}
                </span>
              </template>
              <span v-else class="text-text-weak text-xs">--</span>
            </div>
          </div>

          <div class="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div class="bg-background rounded-lg p-4 space-y-3">
              <div class="text-text-secondary text-xs">{{ $t('domain.rdap.dnssec') }}</div>
              <div class="font-mono text-text-main">
                <span v-if="latest?.rdapSummary?.secureDNS?.delegationSigned === true">{{ $t('domain.rdap.dnssecSigned') }}</span>
                <span v-else-if="latest?.rdapSummary?.secureDNS?.delegationSigned === false">{{ $t('domain.rdap.dnssecUnsigned') }}</span>
                <span v-else>--</span>
              </div>

              <div v-if="latest?.rdapSummary?.secureDNS?.dsData?.length" class="space-y-2">
                <div
                  v-for="(ds, idx) in latest.rdapSummary.secureDNS.dsData"
                  :key="idx"
                  class="text-xs font-mono text-text-secondary bg-background/60 border border-card-border rounded p-2"
                >
                  <div class="flex flex-wrap gap-x-3 gap-y-1">
                    <span>keyTag={{ ds.keyTag ?? '--' }}</span>
                    <span>alg={{ ds.algorithm ?? '--' }}</span>
                    <span>digestType={{ ds.digestType ?? '--' }}</span>
                  </div>
                  <div class="mt-1 break-all" :title="ds.digest || ''">
                    digest={{ ds.digest ? truncate(ds.digest, 28) : '--' }}
                  </div>
                </div>
              </div>
              <div v-else class="text-xs text-text-weak">--</div>
            </div>

            <div class="bg-background rounded-lg p-4 space-y-3">
              <div class="text-text-secondary text-xs">{{ $t('domain.rdap.registrarExtra') }}</div>

              <div class="flex items-center justify-between gap-2">
                <div class="text-xs text-text-secondary">{{ $t('domain.rdap.ianaId') }}</div>
                <div class="font-mono text-text-main break-all text-right">
                  {{ latest?.rdapSummary?.registrar?.ianaId || '--' }}
                </div>
              </div>

              <div class="flex items-center justify-between gap-2">
                <div class="text-xs text-text-secondary">{{ $t('domain.rdap.abuseEmail') }}</div>
                <div class="flex items-center gap-2 min-w-0">
                  <div class="font-mono text-text-main break-all text-right">
                    {{ latest?.rdapSummary?.registrar?.abuseEmail || '--' }}
                  </div>
                  <button
                    v-if="latest?.rdapSummary?.registrar?.abuseEmail"
                    type="button"
                    class="shrink-0 px-2 py-1 text-[11px] bg-background border border-card-border rounded hover:bg-card-border/30 transition-all active:scale-95"
                    @click="copyText(latest.rdapSummary.registrar.abuseEmail)"
                  >
                    {{ $t('common.copy') }}
                  </button>
                </div>
              </div>

              <div class="flex items-center justify-between gap-2">
                <div class="text-xs text-text-secondary">{{ $t('domain.rdap.abusePhone') }}</div>
                <div class="flex items-center gap-2 min-w-0">
                  <div class="font-mono text-text-main break-all text-right">
                    {{ latest?.rdapSummary?.registrar?.abusePhone || '--' }}
                  </div>
                  <button
                    v-if="latest?.rdapSummary?.registrar?.abusePhone"
                    type="button"
                    class="shrink-0 px-2 py-1 text-[11px] bg-background border border-card-border rounded hover:bg-card-border/30 transition-all active:scale-95"
                    @click="copyText(latest.rdapSummary.registrar.abusePhone)"
                  >
                    {{ $t('common.copy') }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-5">
            <div class="text-text-secondary text-xs mb-2">{{ $t('domain.rdap.nameserversDetailed') }}</div>
            <div v-if="latest?.rdapSummary?.nameserversDetailed?.length" class="space-y-2">
              <div
                v-for="ns in latest.rdapSummary.nameserversDetailed"
                :key="ns.name"
                class="bg-background rounded-lg p-3 flex flex-col md:flex-row md:items-start md:justify-between gap-2"
              >
                <div class="font-mono text-text-main text-xs break-all">{{ ns.name }}</div>
                <div class="text-xs text-text-secondary font-mono break-all text-right">
                  <div v-if="ns.v4?.length">v4: {{ ns.v4.join(', ') }}</div>
                  <div v-if="ns.v6?.length">v6: {{ ns.v6.join(', ') }}</div>
                  <div v-if="!ns.v4?.length && !ns.v6?.length">--</div>
                </div>
              </div>
            </div>
            <div v-else class="text-xs text-text-weak">--</div>
          </div>
        </div>

        <!-- SSL Summary (Owned domains) -->
        <div
          v-if="domain.watchKind === 'OWNED' || sslLatest"
          class="bg-card border border-card-border rounded-2xl p-6 shadow-sm"
        >
          <div class="flex items-center justify-between mb-4 border-b border-card-border pb-2">
            <h3 class="font-medium text-text-main flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3l7 4v6c0 5-3 9-7 11-4-2-7-6-7-11V7l7-4z" />
              </svg>
              {{ $t('nav.ssl') }}
            </h3>
            <button
              type="button"
              @click="checkSSLNow"
              :disabled="sslChecking"
              class="px-4 py-2 bg-background border border-card-border rounded-lg text-sm font-medium hover:bg-card-border/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="sslChecking" class="flex items-center gap-2 justify-center">
                <LoadingSpinner size="sm" color="gray" />
                {{ $t('domain.checking') }}
              </span>
              <span v-else>{{ $t('ssl.checkNow') }}</span>
            </button>
          </div>

          <div v-if="sslLatest" class="space-y-4">
            <div class="flex flex-wrap items-center gap-2">
              <span
                :class="[
                  'px-3 py-1 rounded-full text-sm font-medium border',
                  sslStatusClass(sslLatest),
                ]"
              >
                {{ sslStatusText(sslLatest) }}
              </span>
              <span v-if="sslLatest.issuer" class="text-sm text-text-secondary">
                {{ $t('ssl.issuer') }}: {{ sslLatest.issuer }}
              </span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div class="bg-background rounded-lg p-4 space-y-2">
                <div class="text-text-secondary text-xs">{{ $t('ssl.lastChecked') }}</div>
                <div class="font-mono text-text-main">{{ formatDate(sslLatest.checkedAt, true) }}</div>
              </div>

              <div class="bg-background rounded-lg p-4 space-y-2">
                <div class="text-text-secondary text-xs">{{ $t('ssl.daysUntilExpiryLabel') }}</div>
                <div :class="['font-mono', sslDaysClass(sslLatest.daysUntilExpiry)]">
                  {{ sslLatest.daysUntilExpiry ?? '--' }}
                </div>
              </div>

              <div class="bg-background rounded-lg p-4 space-y-2">
                <div class="text-text-secondary text-xs">{{ $t('ssl.validFrom') }}</div>
                <div class="font-mono text-text-main">{{ formatDate(sslLatest.validFrom) }}</div>
              </div>

              <div class="bg-background rounded-lg p-4 space-y-2">
                <div class="text-text-secondary text-xs">{{ $t('ssl.validTo') }}</div>
                <div class="font-mono text-text-main">{{ formatDate(sslLatest.validTo) }}</div>
              </div>
            </div>

            <div v-if="sslLatest.lastError" class="text-xs text-status-dropping bg-status-dropping/10 border border-status-dropping/20 rounded-lg p-3">
              {{ sslLastErrorText(sslLatest) }}
            </div>
          </div>
          <div v-else class="text-center py-8 text-text-secondary text-sm">
            {{ $t('ssl.noData') }}
          </div>
        </div>

          <!-- Timeline -->
          <div class="bg-card border border-card-border rounded-2xl p-6 shadow-sm">
              <h3 class="font-medium text-text-main mb-4 border-b border-card-border pb-2 flex items-center gap-2">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {{ $t('domain.timeline') }}
              </h3>
              <div
                v-if="historyItems.length > 0"
                @scroll="onHistoryScroll"
                class="space-y-0 max-h-80 overflow-y-auto pr-2 custom-scrollbar"
              >
                  <div v-for="item in historyItems" :key="item.id" class="flex gap-4 py-3 border-b border-card-border/50 last:border-0 text-sm hover:bg-background/50 transition-colors rounded px-2 -mx-2">
                      <div class="w-36 text-text-secondary font-mono text-xs flex-shrink-0">{{ formatDate(item.checkedAt, true) }}</div>
                      <div class="font-medium flex-shrink-0" :style="{ color: getStatusColor(item.status) }">
                          {{ $t(`domain.status.${item.status.toLowerCase()}`) }}
                      </div>
                      <div class="flex-1 text-right text-text-weak text-xs truncate" :title="item.parseReason">{{ item.parseReason || '--' }}</div>
                  </div>

                  <div v-if="historyLoadingMore" class="py-3 text-center text-xs text-text-secondary">
                    {{ $t('common.loading') }}
                  </div>
                  <div v-else-if="historyNextCursor" class="py-3 text-center">
                    <button
                      type="button"
                      @click="loadMoreHistory"
                      class="text-xs text-accent hover:underline"
                    >
                      {{ $t('common.loadMore') }}
                    </button>
                  </div>
              </div>
              <div v-else class="text-center py-8 text-text-secondary">
                  {{ $t('domain.noHistory') }}
              </div>
          </div>

         <!-- Raw Snapshot -->
         <details class="group bg-card border border-card-border rounded-2xl p-6 shadow-sm">
            <summary class="flex cursor-pointer list-none items-center justify-between gap-3 text-text-main">
              <span class="font-medium flex items-center gap-2">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  {{ $t('domain.rawSnapshot') }}
              </span>
              <span class="text-xs text-text-secondary transition-transform group-open:rotate-180">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </summary>
            <p class="mt-2 text-xs text-text-secondary">{{ $t('domain.rawSnapshotHint') }}</p>
            <pre class="mt-4 bg-background p-4 rounded-lg overflow-x-auto text-xs text-text-secondary font-mono max-h-96 custom-scrollbar">{{ latest?.rawSnapshot || $t('domain.noSnapshot') }}</pre>
         </details>
    </div>

    <!-- Confirm Delete Dialog -->
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

const { t } = useI18n();
const toast = useToast();
const route = useRoute();
const id = route.params.id;

const { data, pending, error, refresh } = await useFetch(`/api/domains/${id}`);

const domain = computed(() => data.value?.data?.domain);
const latest = computed(() => data.value?.data?.latest);
const sslLatest = computed(() => data.value?.data?.sslLatest);
const refreshing = ref(false);
const sslChecking = ref(false);
const editModalOpen = ref(false);
const deleteDialog = ref({
  isOpen: false
});

const HISTORY_PAGE_SIZE = 50;
const historyItems = ref([]);
const historyNextCursor = ref(null);
const historyLoadingMore = ref(false);

watchEffect(() => {
  historyItems.value = data.value?.data?.history || [];
  historyNextCursor.value = data.value?.data?.historyNextCursor ?? null;
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
      toast.error(resp?.msg || t("domain.loadError"));
      return;
    }

    const items = resp?.data?.items || [];
    historyItems.value = historyItems.value.concat(items);
    historyNextCursor.value = resp?.data?.nextCursor ?? null;
  } catch (e) {
    toast.error(t("domain.loadError"));
  } finally {
    historyLoadingMore.value = false;
  }
};

const onHistoryScroll = (e) => {
  const el = e?.target;
  if (!el) return;
  if (historyLoadingMore.value || !historyNextCursor.value) return;

  const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
  if (remaining < 120) {
    loadMoreHistory();
  }
};

const formatDate = (d, time = false) => {
    if(!d) return '--';
    return format(new Date(d), time ? 'yyyy-MM-dd HH:mm' : 'yyyy-MM-dd');
};

const truncate = (s, max = 28) => {
  const str = String(s || "");
  if (str.length <= max) return str;
  if (max <= 3) return str.slice(0, max);
  return `${str.slice(0, max - 3)}...`;
};

const copyText = async (text) => {
  const value = String(text || "").trim();
  if (!value) return;

  try {
    await navigator.clipboard.writeText(value);
    toast.success(t("common.copied"));
  } catch (e) {
    try {
      const el = document.createElement("textarea");
      el.value = value;
      el.setAttribute("readonly", "true");
      el.style.position = "fixed";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      toast.success(t("common.copied"));
    } catch {
      toast.error(t("common.copyFailed"));
    }
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

const statusClass = (status) => {
  switch (status) {
    case 'AVAILABLE': return 'bg-status-available/10 text-status-available border-status-available/20';
    case 'REGISTERED': return 'bg-status-registered/10 text-status-registered border-status-registered/20';
    case 'EXPIRING': return 'bg-status-expiring/10 text-status-expiring border-status-expiring/20';
    case 'PENDING_DELETE': return 'bg-status-dropping/10 text-status-dropping border-status-dropping/20';
    default: return 'bg-status-unknown/10 text-status-unknown border-status-unknown/20';
  }
};

const watchKindClass = computed(() => {
  return domain.value?.watchKind === 'OWNED'
    ? 'bg-watch-owned/10 text-watch-owned border border-watch-owned/20'
    : 'bg-watch-wanted/10 text-watch-wanted border border-watch-wanted/20';
});

const priorityClass = computed(() => {
  switch (domain.value?.priority) {
    case 'HIGH': return 'bg-priority-high/10 text-priority-high border border-priority-high/20';
    case 'MEDIUM': return 'bg-priority-medium/10 text-priority-medium border border-priority-medium/20';
    case 'LOW': return 'bg-priority-low/10 text-priority-low border border-priority-low/20';
    default: return 'bg-priority-low/10 text-priority-low border border-priority-low/20';
  }
});

const refreshDomain = async () => {
    refreshing.value = true;
    try {
        await $fetch(`/api/domains/${id}/refresh`, { method: 'POST' });
        toast.success(t('domain.scanSuccess'));
        refresh();
    } catch(e) {
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

const sslStatusClass = (s) => {
  if (!s?.hasSSL) return 'bg-status-unknown/10 text-status-unknown border-status-unknown/20';
  if (!s?.isValid) return 'bg-status-dropping/10 text-status-dropping border-status-dropping/20';
  if (s?.daysUntilExpiry != null && s.daysUntilExpiry < 30) {
    return 'bg-status-expiring/10 text-status-expiring border-status-expiring/20';
  }
  return 'bg-status-available/10 text-status-available border-status-available/20';
};

const sslStatusText = (s) => {
  if (!s?.hasSSL) return t('ssl.status.noSSL');
  if (!s?.isValid) return t('ssl.status.invalid');
  if (s?.daysUntilExpiry != null && s.daysUntilExpiry < 30) return t('ssl.status.expiring');
  return t('ssl.status.valid');
};

const sslLastErrorText = (s) => {
  if (s?.hasSSL && s?.lastError) {
    return t('ssl.retainedAfterError', { error: s.lastError });
  }
  return s?.lastError || '';
};

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
    } catch(e) {
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

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: var(--color-background);
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--color-card-border);
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-weak);
}
</style>
