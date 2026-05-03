-- Add watchKind and priority to domains table
ALTER TABLE domains ADD COLUMN watch_kind TEXT NOT NULL DEFAULT 'WANTED';
ALTER TABLE domains ADD COLUMN priority TEXT NOT NULL DEFAULT 'MEDIUM';

-- Add error tracking to domain_status_latest
ALTER TABLE domain_status_latest ADD COLUMN last_error TEXT;
ALTER TABLE domain_status_latest ADD COLUMN last_error_at INTEGER;

-- Create actions table
CREATE TABLE IF NOT EXISTS actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id INTEGER NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  priority TEXT NOT NULL,
  triggered_at INTEGER NOT NULL,
  snoozed_until INTEGER,
  resolved_at INTEGER,
  metadata TEXT
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_actions_domain_id ON actions(domain_id);
CREATE INDEX IF NOT EXISTS idx_actions_status ON actions(status);
CREATE INDEX IF NOT EXISTS idx_actions_priority ON actions(priority);
CREATE INDEX IF NOT EXISTS idx_domains_watch_kind ON domains(watch_kind);
CREATE INDEX IF NOT EXISTS idx_domains_priority ON domains(priority);
