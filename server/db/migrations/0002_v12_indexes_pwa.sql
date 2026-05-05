-- v1.2 indexes (additive, safe to re-run with IF NOT EXISTS)

-- domains additional indexes
CREATE INDEX IF NOT EXISTS idx_domains_watch_kind_v12 ON domains(watch_kind);
CREATE INDEX IF NOT EXISTS idx_domains_priority_v12 ON domains(priority);
CREATE INDEX IF NOT EXISTS idx_domains_is_active_v12 ON domains(is_active);
CREATE INDEX IF NOT EXISTS idx_domains_group_name_v12 ON domains(group_name);

-- domain_status_latest indexes for filtering
CREATE INDEX IF NOT EXISTS idx_domain_status_latest_status_v12 ON domain_status_latest(status);
CREATE INDEX IF NOT EXISTS idx_domain_status_latest_expires_at_v12 ON domain_status_latest(expires_at);

-- domain_status_history indexes for per-domain timeline pagination
CREATE INDEX IF NOT EXISTS idx_domain_status_history_domain_id_id_v12 ON domain_status_history(domain_id, id);

-- actions indexes for sorting/filtering
CREATE INDEX IF NOT EXISTS idx_actions_triggered_at_v12 ON actions(triggered_at);
CREATE INDEX IF NOT EXISTS idx_actions_action_type_v12 ON actions(action_type);

-- notification_events indexes for the history viewer
CREATE INDEX IF NOT EXISTS idx_notification_events_domain_id_v12 ON notification_events(domain_id);
CREATE INDEX IF NOT EXISTS idx_notification_events_event_type_v12 ON notification_events(event_type);
CREATE INDEX IF NOT EXISTS idx_notification_events_status_v12 ON notification_events(status);
CREATE INDEX IF NOT EXISTS idx_notification_events_channel_v12 ON notification_events(channel);
CREATE INDEX IF NOT EXISTS idx_notification_events_created_at_v12 ON notification_events(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_events_sent_at_v12 ON notification_events(sent_at);

-- ssl_status_latest indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_ssl_status_latest_days_until_expiry_v12 ON ssl_status_latest(days_until_expiry);
CREATE INDEX IF NOT EXISTS idx_ssl_status_latest_valid_to_v12 ON ssl_status_latest(valid_to);

-- domain_costs indexes for cost analytics
CREATE INDEX IF NOT EXISTS idx_domain_costs_domain_id_v12 ON domain_costs(domain_id);
CREATE INDEX IF NOT EXISTS idx_domain_costs_payment_date_v12 ON domain_costs(payment_date);
CREATE INDEX IF NOT EXISTS idx_domain_costs_cost_type_v12 ON domain_costs(cost_type);

-- notification_events: track retries
ALTER TABLE notification_events ADD COLUMN retry_of INTEGER;

-- Web Push subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  enabled INTEGER DEFAULT 1,
  created_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_enabled_v12 ON push_subscriptions(enabled);

-- Saved filter presets
CREATE TABLE IF NOT EXISTS saved_filters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  criteria_json TEXT NOT NULL,
  is_default INTEGER DEFAULT 0,
  created_at INTEGER
);
