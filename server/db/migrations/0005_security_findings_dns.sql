CREATE TABLE IF NOT EXISTS dns_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id INTEGER NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  records_json TEXT NOT NULL,
  record_hash TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'dns',
  error TEXT,
  checked_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_dns_snapshots_domain_id_v12 ON dns_snapshots(domain_id);
CREATE INDEX IF NOT EXISTS idx_dns_snapshots_record_hash_v12 ON dns_snapshots(record_hash);
CREATE INDEX IF NOT EXISTS idx_dns_snapshots_checked_at_v12 ON dns_snapshots(checked_at);

CREATE TABLE IF NOT EXISTS risk_findings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id INTEGER NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  finding_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'LOW',
  status TEXT NOT NULL DEFAULT 'OPEN',
  evidence_json TEXT,
  first_seen_at INTEGER,
  last_seen_at INTEGER,
  snoozed_until INTEGER,
  resolved_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_risk_findings_domain_id_v12 ON risk_findings(domain_id);
CREATE INDEX IF NOT EXISTS idx_risk_findings_finding_type_v12 ON risk_findings(finding_type);
CREATE INDEX IF NOT EXISTS idx_risk_findings_severity_v12 ON risk_findings(severity);
CREATE INDEX IF NOT EXISTS idx_risk_findings_status_v12 ON risk_findings(status);
CREATE INDEX IF NOT EXISTS idx_risk_findings_last_seen_at_v12 ON risk_findings(last_seen_at);
