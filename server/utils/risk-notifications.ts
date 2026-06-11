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
