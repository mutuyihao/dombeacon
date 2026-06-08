CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  actor_type TEXT NOT NULL DEFAULT 'anonymous',
  actor_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  outcome TEXT NOT NULL DEFAULT 'success',
  metadata TEXT,
  created_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type_v12 ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_outcome_v12 ON audit_logs(outcome);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at_v12 ON audit_logs(created_at);
