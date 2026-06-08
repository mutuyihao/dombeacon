CREATE TABLE IF NOT EXISTS brand_watch_terms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  term TEXT NOT NULL,
  normalized_term TEXT NOT NULL,
  term_type TEXT NOT NULL DEFAULT 'BRAND',
  match_strategy TEXT NOT NULL DEFAULT 'STANDARD',
  tlds_json TEXT NOT NULL DEFAULT '["com","net","org"]',
  severity TEXT NOT NULL DEFAULT 'MEDIUM',
  enabled INTEGER DEFAULT 1,
  scan_frequency_hours INTEGER DEFAULT 24,
  last_scanned_at INTEGER,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_brand_watch_terms_normalized_term_v12 ON brand_watch_terms(normalized_term);
CREATE INDEX IF NOT EXISTS idx_brand_watch_terms_enabled_v12 ON brand_watch_terms(enabled);
CREATE INDEX IF NOT EXISTS idx_brand_watch_terms_severity_v12 ON brand_watch_terms(severity);

CREATE TABLE IF NOT EXISTS brand_watch_candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  term_id INTEGER NOT NULL REFERENCES brand_watch_terms(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  label TEXT NOT NULL,
  tld TEXT NOT NULL,
  mutation_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'UNKNOWN',
  severity TEXT NOT NULL DEFAULT 'MEDIUM',
  source TEXT NOT NULL DEFAULT 'rdap',
  evidence_json TEXT,
  first_seen_at INTEGER,
  last_seen_at INTEGER,
  checked_at INTEGER,
  last_error TEXT,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_brand_watch_candidates_term_id_v12 ON brand_watch_candidates(term_id);
CREATE INDEX IF NOT EXISTS idx_brand_watch_candidates_domain_v12 ON brand_watch_candidates(domain);
CREATE INDEX IF NOT EXISTS idx_brand_watch_candidates_status_v12 ON brand_watch_candidates(status);
CREATE INDEX IF NOT EXISTS idx_brand_watch_candidates_last_seen_at_v12 ON brand_watch_candidates(last_seen_at);
