import { fanoutNotification } from "./notification-fanout";

const parseJson = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const notifySecurityFinding = async (params: {
  finding: any;
  domain: string;
  deduplicateHours?: number;
}) => {
  const finding = params.finding;
  const evidence = parseJson<Record<string, unknown>>(finding.evidenceJson, {});
  const dedupeKey = `security-finding:${finding.id}`;

  return await fanoutNotification({
    domainId: finding.domainId,
    eventType: "SECURITY_FINDING_HIGH",
    templateType: "risk_alert",
    deduplicateHours: params.deduplicateHours ?? 24,
    dedupeKey,
    templateData: {
      title: "High security finding",
      targetName: params.domain,
      severity: finding.severity,
      description: `${finding.findingType} was detected on ${params.domain}.`,
      url: `/domains/${finding.domainId}`,
      details: {
        findingId: finding.id,
        findingType: finding.findingType,
        evidence,
      },
    },
    eventData: {
      domain: params.domain,
      findingId: finding.id,
      findingType: finding.findingType,
      severity: finding.severity,
      status: finding.status,
      evidence,
      message: `${params.domain}: ${finding.findingType}`,
    },
  });
};

export const notifyBrandWatchCandidate = async (params: {
  candidate: any;
  term?: any;
  deduplicateHours?: number;
}) => {
  const candidate = params.candidate;
  const evidence =
    candidate.evidence ??
    parseJson<Record<string, unknown>>(candidate.evidenceJson, {});
  const dedupeKey = `brand-watch-candidate:${candidate.id}`;
  const termName = params.term?.term || candidate.term || "unknown term";

  return await fanoutNotification({
    eventType: "BRAND_WATCH_REGISTERED",
    templateType: "risk_alert",
    deduplicateHours: params.deduplicateHours ?? 24,
    dedupeKey,
    templateData: {
      title: "Brand Watch registration observed",
      targetName: candidate.domain,
      severity: candidate.severity,
      description: `${candidate.domain} matched Brand Watch term ${termName}.`,
      url: "/brand-watch",
      details: {
        candidateId: candidate.id,
        termId: candidate.termId,
        term: termName,
        source: candidate.source,
        mutationType: candidate.mutationType,
        evidence,
      },
    },
    eventData: {
      domain: candidate.domain,
      candidateId: candidate.id,
      termId: candidate.termId,
      term: termName,
      source: candidate.source,
      mutationType: candidate.mutationType,
      severity: candidate.severity,
      status: candidate.status,
      evidence,
      message: `${candidate.domain} matched ${termName}`,
    },
  });
};
