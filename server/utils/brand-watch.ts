import { domainToASCII } from "node:url";
import { and, eq } from "drizzle-orm";
import { brandWatchCandidates, brandWatchTerms } from "../db/schema";
import { useDb } from "./db";
import { buildRdapDomainUrl, resolveRdapServiceBase } from "./scanner";
import { notifyBrandWatchCandidate } from "./risk-notifications";

export const BRAND_TERM_TYPES = ["BRAND", "PRODUCT", "COMPANY", "OTHER"] as const;
export const BRAND_MATCH_STRATEGIES = [
  "STRICT",
  "STANDARD",
  "AGGRESSIVE",
] as const;
export const BRAND_SEVERITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export const BRAND_WATCH_REVIEW_STATUSES = [
  "OPEN",
  "WATCHING",
  "DISMISSED",
  "RESOLVED",
] as const;

type TermType = (typeof BRAND_TERM_TYPES)[number];
type MatchStrategy = (typeof BRAND_MATCH_STRATEGIES)[number];
type Severity = (typeof BRAND_SEVERITIES)[number];
type BrandWatchReviewStatus = (typeof BRAND_WATCH_REVIEW_STATUSES)[number];

export type BrandWatchCandidate = {
  domain: string;
  label: string;
  tld: string;
  mutationType: string;
  sourceTerm: string;
  severity: Severity;
};

export type BrandWatchCandidateStatus =
  | "REGISTERED"
  | "AVAILABLE"
  | "UNKNOWN"
  | "ERROR";

export type BrandWatchCandidateProbe = {
  status: BrandWatchCandidateStatus;
  source: "rdap" | "ct";
  evidence: Record<string, unknown>;
  lastError?: string | null;
};

export type BrandWatchCtDiscovery = {
  candidate: BrandWatchCandidate;
  evidence: Record<string, unknown>;
};

export type BrandWatchTermInput = {
  term?: unknown;
  termType?: unknown;
  matchStrategy?: unknown;
  tlds?: unknown;
  severity?: unknown;
  enabled?: unknown;
  scanFrequencyHours?: unknown;
};

const DEFAULT_TLDS = ["com", "net", "org"];
const DEFAULT_PREFIXES = ["login", "secure", "account", "app", "support"];
const DEFAULT_SUFFIXES = ["login", "secure", "app", "support", "verify"];
const RDAP_PROBE_TIMEOUT_MS = 7000;
const CT_DISCOVERY_TIMEOUT_MS = 10000;

const typoKeyboardNeighbors: Record<string, string[]> = {
  a: ["s", "q", "z"],
  b: ["v", "n"],
  c: ["x", "v"],
  d: ["s", "f", "e"],
  e: ["w", "r", "d"],
  f: ["d", "g", "r"],
  g: ["f", "h", "t"],
  h: ["g", "j", "y"],
  i: ["u", "o", "k"],
  j: ["h", "k", "u"],
  k: ["j", "l", "i"],
  l: ["k", "o"],
  m: ["n"],
  n: ["b", "m"],
  o: ["i", "p", "l"],
  p: ["o"],
  q: ["w", "a"],
  r: ["e", "t", "f"],
  s: ["a", "d", "w"],
  t: ["r", "y", "g"],
  u: ["y", "i", "j"],
  v: ["c", "b"],
  w: ["q", "e", "s"],
  x: ["z", "c"],
  y: ["t", "u", "h"],
  z: ["a", "x"],
};

const homoglyphReplacements: Record<string, string[]> = {
  a: ["4"],
  e: ["3"],
  g: ["9"],
  i: ["1"],
  l: ["1"],
  o: ["0"],
  s: ["5"],
  t: ["7"],
};

const asString = (value: unknown) => String(value || "").trim();

const isValidLabel = (label: string) =>
  label.length > 0 &&
  label.length <= 63 &&
  /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label);

const isValidTld = (tld: string) =>
  tld.length >= 2 &&
  tld.length <= 63 &&
  /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(tld);

const isValidHostname = (hostname: string) => {
  const labels = hostname.split(".");
  return labels.length >= 2 && labels.every(isValidLabel);
};

export const normalizeBrandTerm = (value: unknown) => {
  const raw = asString(value).toLowerCase();
  const ascii = domainToASCII(raw) || raw;
  return ascii
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[\s_.]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export const normalizeTlds = (value: unknown): string[] => {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : DEFAULT_TLDS;

  const tlds = raw
    .map((item) =>
      asString(item)
        .toLowerCase()
        .replace(/^\.+|\.+$/g, ""),
    )
    .filter(isValidTld);

  return [...new Set(tlds)].slice(0, 20);
};

export const normalizeTermType = (value: unknown): TermType => {
  const termType = asString(value).toUpperCase();
  return BRAND_TERM_TYPES.includes(termType as TermType)
    ? (termType as TermType)
    : "BRAND";
};

export const normalizeMatchStrategy = (value: unknown): MatchStrategy => {
  const strategy = asString(value).toUpperCase();
  return BRAND_MATCH_STRATEGIES.includes(strategy as MatchStrategy)
    ? (strategy as MatchStrategy)
    : "STANDARD";
};

export const normalizeSeverity = (value: unknown): Severity => {
  const severity = asString(value).toUpperCase();
  return BRAND_SEVERITIES.includes(severity as Severity)
    ? (severity as Severity)
    : "MEDIUM";
};

export const normalizeBrandWatchReviewStatus = (
  value: unknown,
): BrandWatchReviewStatus => {
  const status = asString(value).toUpperCase();
  return BRAND_WATCH_REVIEW_STATUSES.includes(status as BrandWatchReviewStatus)
    ? (status as BrandWatchReviewStatus)
    : "OPEN";
};

export const normalizeScanFrequencyHours = (value: unknown) => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return 24;
  return Math.min(720, Math.max(1, Math.floor(numberValue)));
};

const pushLabel = (
  labels: Array<{ label: string; mutationType: string }>,
  seen: Set<string>,
  label: string,
  mutationType: string,
) => {
  if (!isValidLabel(label) || seen.has(label)) return;
  seen.add(label);
  labels.push({ label, mutationType });
};

const generateTypoLabels = (term: string) => {
  const labels: Array<{ label: string; mutationType: string }> = [];
  const seen = new Set<string>();

  for (let index = 0; index < term.length; index += 1) {
    if (term[index] === "-") continue;
    pushLabel(labels, seen, term.slice(0, index) + term.slice(index + 1), "omission");
    pushLabel(
      labels,
      seen,
      `${term.slice(0, index + 1)}${term[index]}${term.slice(index + 1)}`,
      "duplication",
    );

    const neighbors = typoKeyboardNeighbors[term[index]] || [];
    neighbors.slice(0, 2).forEach((replacement) => {
      pushLabel(
        labels,
        seen,
        `${term.slice(0, index)}${replacement}${term.slice(index + 1)}`,
        "keyboard",
      );
    });
  }

  return labels;
};

const generateHomoglyphLabels = (term: string) => {
  const labels: Array<{ label: string; mutationType: string }> = [];
  const seen = new Set<string>();

  for (let index = 0; index < term.length; index += 1) {
    const replacements = homoglyphReplacements[term[index]] || [];
    replacements.forEach((replacement) => {
      pushLabel(
        labels,
        seen,
        `${term.slice(0, index)}${replacement}${term.slice(index + 1)}`,
        "homoglyph",
      );
    });
  }

  if (term.includes("m")) {
    pushLabel(labels, seen, term.replace(/m/g, "rn"), "homoglyph");
  }
  if (term.includes("w")) {
    pushLabel(labels, seen, term.replace(/w/g, "vv"), "homoglyph");
  }

  return labels;
};

const generatePrefixSuffixLabels = (term: string) => {
  const labels: Array<{ label: string; mutationType: string }> = [];
  const seen = new Set<string>();

  DEFAULT_PREFIXES.forEach((prefix) => {
    pushLabel(labels, seen, `${prefix}-${term}`, "prefix");
    pushLabel(labels, seen, `${prefix}${term}`, "prefix");
  });
  DEFAULT_SUFFIXES.forEach((suffix) => {
    pushLabel(labels, seen, `${term}-${suffix}`, "suffix");
    pushLabel(labels, seen, `${term}${suffix}`, "suffix");
  });

  return labels;
};

const candidateLabelGroups = (
  term: string,
  strategy: MatchStrategy,
): Array<{ label: string; mutationType: string }> => {
  const labels: Array<{ label: string; mutationType: string }> = [];
  const seen = new Set<string>();

  pushLabel(labels, seen, term, "exact");

  if (strategy === "STRICT") return labels;

  generateTypoLabels(term).forEach(({ label, mutationType }) =>
    pushLabel(labels, seen, label, mutationType),
  );
  generatePrefixSuffixLabels(term).forEach(({ label, mutationType }) =>
    pushLabel(labels, seen, label, mutationType),
  );

  if (strategy === "AGGRESSIVE") {
    generateHomoglyphLabels(term).forEach(({ label, mutationType }) =>
      pushLabel(labels, seen, label, mutationType),
    );
  }

  return labels;
};

export const generateBrandWatchCandidates = (
  term: unknown,
  options?: {
    matchStrategy?: unknown;
    tlds?: unknown;
    severity?: unknown;
    limit?: unknown;
  },
): BrandWatchCandidate[] => {
  const normalizedTerm = normalizeBrandTerm(term);
  if (!isValidLabel(normalizedTerm)) return [];

  const strategy = normalizeMatchStrategy(options?.matchStrategy);
  const tlds = normalizeTlds(options?.tlds);
  const severity = normalizeSeverity(options?.severity);
  const limit = Math.min(500, Math.max(1, Number(options?.limit) || 200));
  const candidates: BrandWatchCandidate[] = [];
  const seenDomains = new Set<string>();

  for (const { label, mutationType } of candidateLabelGroups(
    normalizedTerm,
    strategy,
  )) {
    for (const tld of tlds) {
      const domain = `${label}.${tld}`;
      if (seenDomains.has(domain)) continue;
      seenDomains.add(domain);
      candidates.push({
        domain,
        label,
        tld,
        mutationType,
        sourceTerm: normalizedTerm,
        severity,
      });
      if (candidates.length >= limit) return candidates;
    }
  }

  return candidates;
};

export const serializeBrandWatchTerm = (row: any) => ({
  id: row.id,
  term: row.term,
  normalizedTerm: row.normalizedTerm,
  termType: row.termType,
  matchStrategy: row.matchStrategy,
  tlds: normalizeTlds(parseJson(row.tldsJson, DEFAULT_TLDS)),
  severity: row.severity,
  enabled: !!row.enabled,
  scanFrequencyHours: row.scanFrequencyHours,
  lastScannedAt: row.lastScannedAt || null,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const normalizeBrandWatchTermInput = (body: BrandWatchTermInput) => {
  const term = asString(body.term);
  const normalizedTerm = normalizeBrandTerm(term);
  if (!term) throw new Error("Term required");
  if (!isValidLabel(normalizedTerm)) {
    throw new Error("Term must produce a valid DNS label");
  }

  const tlds = normalizeTlds(body.tlds);
  if (tlds.length === 0) throw new Error("At least one valid TLD is required");

  return {
    term: term.slice(0, 120),
    normalizedTerm,
    termType: normalizeTermType(body.termType),
    matchStrategy: normalizeMatchStrategy(body.matchStrategy),
    tlds,
    severity: normalizeSeverity(body.severity),
    enabled:
      typeof body.enabled === "boolean" ? body.enabled : body.enabled !== false,
    scanFrequencyHours: normalizeScanFrequencyHours(body.scanFrequencyHours),
  };
};

export const parseJson = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const eventDatesFromRdap = (data: any) => {
  const events = Array.isArray(data?.events) ? data.events : [];
  const out: Record<string, string> = {};
  events.forEach((event) => {
    const action = asString(event?.eventAction).toLowerCase().replace(/\s+/g, "_");
    const date = asString(event?.eventDate);
    if (action && date) out[action] = date;
  });
  return out;
};

const statusesFromRdap = (data: any) =>
  Array.isArray(data?.status)
    ? data.status.map((status: unknown) => asString(status)).filter(Boolean)
    : [];

const normalizeCtName = (value: unknown) => {
  const raw = asString(value).toLowerCase().replace(/^\*\./, "").replace(/\.$/, "");
  const ascii = domainToASCII(raw) || raw;
  return ascii;
};

const ctNamesFromRow = (row: any) => {
  const values = [row?.name_value, row?.common_name]
    .flatMap((value) => asString(value).split(/\r?\n/))
    .map(normalizeCtName)
    .filter((hostname) => hostname && isValidHostname(hostname));

  return [...new Set(values)];
};

const classifyCtMutation = (label: string, normalizedTerm: string) => {
  if (label === normalizedTerm) return "ct-exact";
  if (label.startsWith(`${normalizedTerm}-`) || label.startsWith(normalizedTerm)) {
    return "ct-suffix";
  }
  if (label.endsWith(`-${normalizedTerm}`) || label.endsWith(normalizedTerm)) {
    return "ct-prefix";
  }
  return "ct-observed";
};

const candidateFromCtHostname = (
  hostname: string,
  normalizedTerm: string,
  tlds: string[],
  severity: Severity,
): BrandWatchCandidate | null => {
  for (const tld of tlds) {
    if (!hostname.endsWith(`.${tld}`)) continue;
    const labels = hostname.slice(0, -(tld.length + 1)).split(".");
    const label = labels[labels.length - 1] || "";
    if (!isValidLabel(label) || !label.includes(normalizedTerm)) continue;

    return {
      domain: `${label}.${tld}`,
      label,
      tld,
      mutationType: classifyCtMutation(label, normalizedTerm),
      sourceTerm: normalizedTerm,
      severity,
    };
  }

  return null;
};

const buildCrtShUrl = (normalizedTerm: string, tld: string) => {
  const url = new URL("https://crt.sh/");
  url.searchParams.set("q", `%${normalizedTerm}%.${tld}`);
  url.searchParams.set("output", "json");
  return url.toString();
};

const parseCtJson = async (response: Response) => {
  const text = await response.text();
  if (!text.trim()) return [];
  const json = JSON.parse(text);
  return Array.isArray(json) ? json : [];
};

export const extractBrandWatchCtCandidates = (
  rows: any[],
  term: unknown,
  options?: {
    tlds?: unknown;
    severity?: unknown;
    limit?: unknown;
  },
): BrandWatchCtDiscovery[] => {
  const normalizedTerm = normalizeBrandTerm(term);
  if (!isValidLabel(normalizedTerm)) return [];

  const tlds = normalizeTlds(options?.tlds);
  const severity = normalizeSeverity(options?.severity);
  const limit = Math.min(500, Math.max(1, Number(options?.limit) || 100));
  const byDomain = new Map<
    string,
    {
      candidate: BrandWatchCandidate;
      matchedNames: Set<string>;
      certIds: Set<string>;
      issuerNames: Set<string>;
      notBefore: string | null;
      notAfter: string | null;
      entryTimestamp: string | null;
    }
  >();

  for (const row of rows) {
    for (const hostname of ctNamesFromRow(row)) {
      const candidate = candidateFromCtHostname(
        hostname,
        normalizedTerm,
        tlds,
        severity,
      );
      if (!candidate) continue;

      const current =
        byDomain.get(candidate.domain) ||
        {
          candidate,
          matchedNames: new Set<string>(),
          certIds: new Set<string>(),
          issuerNames: new Set<string>(),
          notBefore: null,
          notAfter: null,
          entryTimestamp: null,
        };

      current.matchedNames.add(hostname);
      if (row?.id) current.certIds.add(String(row.id));
      if (row?.issuer_name) current.issuerNames.add(asString(row.issuer_name));
      current.notBefore = current.notBefore || asString(row?.not_before) || null;
      current.notAfter = current.notAfter || asString(row?.not_after) || null;
      current.entryTimestamp =
        current.entryTimestamp || asString(row?.entry_timestamp) || null;
      byDomain.set(candidate.domain, current);

      if (byDomain.size >= limit) break;
    }
    if (byDomain.size >= limit) break;
  }

  return [...byDomain.values()].map((item) => ({
    candidate: item.candidate,
    evidence: {
      source: "crt.sh",
      matchedNames: [...item.matchedNames].slice(0, 25),
      certIds: [...item.certIds].slice(0, 25),
      issuerNames: [...item.issuerNames].slice(0, 10),
      notBefore: item.notBefore,
      notAfter: item.notAfter,
      entryTimestamp: item.entryTimestamp,
      observedCount: item.matchedNames.size,
    },
  }));
};

export const discoverBrandWatchCtCandidates = async (
  term: unknown,
  options?: {
    tlds?: unknown;
    severity?: unknown;
    limit?: unknown;
    fetchImpl?: typeof fetch;
  },
) => {
  const normalizedTerm = normalizeBrandTerm(term);
  if (!isValidLabel(normalizedTerm)) {
    return { queries: 0, discovered: 0, items: [] as BrandWatchCtDiscovery[] };
  }

  const fetchImpl = options?.fetchImpl ?? fetch;
  const tlds = normalizeTlds(options?.tlds);
  const severity = normalizeSeverity(options?.severity);
  const limit = Math.min(500, Math.max(1, Number(options?.limit) || 100));
  const rows: any[] = [];
  const errors: Array<{ tld: string; error: string }> = [];

  for (const tld of tlds) {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      CT_DISCOVERY_TIMEOUT_MS,
    );
    const url = buildCrtShUrl(normalizedTerm, tld);

    try {
      const response = await fetchImpl(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!response.ok) {
        errors.push({ tld, error: `crt.sh HTTP ${response.status}` });
        continue;
      }

      rows.push(...(await parseCtJson(response)));
    } catch (error: any) {
      clearTimeout(timeoutId);
      errors.push({
        tld,
        error:
          error?.name === "AbortError"
            ? "crt.sh timeout"
            : error?.message || String(error),
      });
    }

    if (rows.length >= limit * 4) break;
  }

  const items = extractBrandWatchCtCandidates(rows, normalizedTerm, {
    tlds,
    severity,
    limit,
  }).map((item) => ({
    ...item,
    evidence: {
      ...item.evidence,
      query: `%${normalizedTerm}%.{tld}`,
      errors,
    },
  }));

  return {
    queries: tlds.length,
    discovered: items.length,
    items,
    errors,
  };
};

export const probeBrandCandidateRdap = async (
  domain: string,
  options?: {
    fetchImpl?: typeof fetch;
    resolveRdapServiceBaseImpl?: typeof resolveRdapServiceBase;
  },
): Promise<BrandWatchCandidateProbe> => {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const resolveRdapServiceBaseImpl =
    options?.resolveRdapServiceBaseImpl ?? resolveRdapServiceBase;

  try {
    const rdapBase = await resolveRdapServiceBaseImpl(domain, fetchImpl);
    const rdapUrl = buildRdapDomainUrl(rdapBase, domain);
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      RDAP_PROBE_TIMEOUT_MS,
    );

    const response = await fetchImpl(rdapUrl, {
      headers: { Accept: "application/rdap+json" },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (response.status === 404) {
      return {
        status: "AVAILABLE",
        source: "rdap",
        evidence: { rdapUrl, httpStatus: 404 },
        lastError: null,
      };
    }

    if (!response.ok) {
      return {
        status: "UNKNOWN",
        source: "rdap",
        evidence: { rdapUrl, httpStatus: response.status },
        lastError: `RDAP HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      status: "REGISTERED",
      source: "rdap",
      evidence: {
        rdapUrl,
        httpStatus: response.status,
        statuses: statusesFromRdap(data),
        events: eventDatesFromRdap(data),
        handle: asString(data?.handle) || null,
        unicodeName: asString(data?.unicodeName) || null,
      },
      lastError: null,
    };
  } catch (error: any) {
    return {
      status: "ERROR",
      source: "rdap",
      evidence: {
        errorName: error?.name || "Error",
      },
      lastError:
        error?.name === "AbortError"
          ? "RDAP timeout"
          : error?.message || String(error),
    };
  }
};

export const serializeBrandWatchCandidate = (row: any) => ({
  id: row.id,
  termId: row.termId,
  domain: row.domain,
  label: row.label,
  tld: row.tld,
  mutationType: row.mutationType,
  status: row.status,
  severity: row.severity,
  source: row.source,
  evidence: parseJson(row.evidenceJson, null),
  reviewStatus: normalizeBrandWatchReviewStatus(row.reviewStatus),
  reviewNote: row.reviewNote || null,
  reviewedAt: row.reviewedAt || null,
  reviewedBy: row.reviewedBy || null,
  firstSeenAt: row.firstSeenAt || null,
  lastSeenAt: row.lastSeenAt || null,
  checkedAt: row.checkedAt || null,
  lastError: row.lastError || null,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const syncBrandWatchCandidateScan = async (
  termId: number,
  candidate: BrandWatchCandidate,
  probe: BrandWatchCandidateProbe,
  options?: { db?: ReturnType<typeof useDb> },
) => {
  const db = options?.db ?? useDb();
  const now = new Date();
  const existing = await db
    .select()
    .from(brandWatchCandidates)
    .where(
      and(
        eq(brandWatchCandidates.termId, termId),
        eq(brandWatchCandidates.domain, candidate.domain),
      ),
    )
    .get();

  const seenPatch =
    probe.status === "REGISTERED"
      ? {
          firstSeenAt: existing?.firstSeenAt || now,
          lastSeenAt: now,
        }
      : {
          firstSeenAt: existing?.firstSeenAt || null,
          lastSeenAt: existing?.lastSeenAt || null,
        };
  const existingEvidence = parseJson<Record<string, unknown>>(
    existing?.evidenceJson,
    {},
  );
  const evidence =
    existing && Object.keys(existingEvidence).length > 0
      ? {
          ...existingEvidence,
          [probe.source]: probe.evidence || {},
          ...(probe.evidence || {}),
        }
      : probe.evidence || {};

  const values = {
    termId,
    domain: candidate.domain,
    label: candidate.label,
    tld: candidate.tld,
    mutationType: candidate.mutationType,
    status: probe.status,
    severity: candidate.severity,
    source: probe.source,
    evidenceJson: JSON.stringify(evidence),
    checkedAt: now,
    lastError: probe.lastError || null,
    updatedAt: now,
    ...seenPatch,
  };

  const row = existing
    ? await db
        .update(brandWatchCandidates)
        .set(values)
        .where(eq(brandWatchCandidates.id, existing.id))
        .returning()
        .get()
    : await db
        .insert(brandWatchCandidates)
        .values({
          ...values,
          createdAt: now,
        })
        .returning()
        .get();

  return {
    ...serializeBrandWatchCandidate(row),
    isNew: !existing,
    becameRegistered:
      probe.status === "REGISTERED" && existing?.status !== "REGISTERED",
  };
};

export const scanBrandWatchCtTerm = async (
  termRow: typeof brandWatchTerms.$inferSelect,
  options?: {
    db?: ReturnType<typeof useDb>;
    fetchImpl?: typeof fetch;
    limit?: unknown;
    notify?: boolean;
  },
) => {
  const db = options?.db ?? useDb();
  const term = serializeBrandWatchTerm(termRow);
  const result = await discoverBrandWatchCtCandidates(term.term, {
    tlds: term.tlds,
    severity: term.severity,
    limit: options?.limit ?? 50,
    fetchImpl: options?.fetchImpl,
  });

  const items = [];
  let notificationsSent = 0;
  for (const discovery of result.items) {
    const item = await syncBrandWatchCandidateScan(
      term.id,
      discovery.candidate,
      {
        status: "REGISTERED",
        source: "ct",
        evidence: discovery.evidence,
        lastError: null,
      },
      { db },
    );
    if (options?.notify && item.becameRegistered) {
      const notification = await notifyBrandWatchCandidate({
        candidate: item,
        term,
      });
      notificationsSent += notification.successCount;
    }
    items.push(item);
  }

  return {
    termId: term.id,
    queries: result.queries,
    discovered: result.discovered,
    error: result.errors.length,
    errors: result.errors,
    items,
    notificationsSent,
  };
};

export const scanBrandWatchTerm = async (
  termRow: typeof brandWatchTerms.$inferSelect,
  options?: {
    db?: ReturnType<typeof useDb>;
    fetchImpl?: typeof fetch;
    limit?: unknown;
    includeCt?: boolean;
    ctLimit?: unknown;
    notify?: boolean;
    probeImpl?: (
      domain: string,
      candidate: BrandWatchCandidate,
    ) => Promise<BrandWatchCandidateProbe>;
  },
) => {
  const db = options?.db ?? useDb();
  const term = serializeBrandWatchTerm(termRow);
  const candidates = generateBrandWatchCandidates(term.term, {
    matchStrategy: term.matchStrategy,
    tlds: term.tlds,
    severity: term.severity,
    limit: options?.limit ?? 100,
  });
  const items = [];
  const summary: Record<BrandWatchCandidateStatus, number> = {
    REGISTERED: 0,
    AVAILABLE: 0,
    UNKNOWN: 0,
    ERROR: 0,
  };
  let notificationsSent = 0;

  for (const candidate of candidates) {
    const probe = options?.probeImpl
      ? await options.probeImpl(candidate.domain, candidate)
      : await probeBrandCandidateRdap(candidate.domain, {
          fetchImpl: options?.fetchImpl,
        });
    summary[probe.status] += 1;
    const item = await syncBrandWatchCandidateScan(term.id, candidate, probe, {
      db,
    });
    if (options?.notify && item.becameRegistered) {
      const notification = await notifyBrandWatchCandidate({
        candidate: item,
        term,
      });
      notificationsSent += notification.successCount;
    }
    items.push(item);
  }

  let ctResult = {
    queries: 0,
    discovered: 0,
    error: 0,
    errors: [] as any[],
    items: [] as any[],
    notificationsSent: 0,
  };
  if (options?.includeCt) {
    ctResult = await scanBrandWatchCtTerm(termRow, {
      db,
      fetchImpl: options?.fetchImpl,
      limit: options?.ctLimit ?? 50,
      notify: options?.notify,
    });
    items.push(...ctResult.items);
    notificationsSent += ctResult.notificationsSent;
  }

  await db
    .update(brandWatchTerms)
    .set({ lastScannedAt: new Date(), updatedAt: new Date() })
    .where(eq(brandWatchTerms.id, term.id));

  return {
    termId: term.id,
    checked: candidates.length,
    registered: summary.REGISTERED,
    available: summary.AVAILABLE,
    unknown: summary.UNKNOWN,
    error: summary.ERROR,
    ctQueries: ctResult.queries,
    ctDiscovered: ctResult.discovered,
    ctError: ctResult.error,
    notificationsSent,
    items,
  };
};
