CREATE TABLE `actions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`domain_id` integer NOT NULL,
	`action_type` text NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`priority` text NOT NULL,
	`triggered_at` integer,
	`snoozed_until` integer,
	`resolved_at` integer,
	`archived_at` integer,
	`metadata` text,
	FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_actions_triggered_at_v12` ON `actions` (`triggered_at`);--> statement-breakpoint
CREATE INDEX `idx_actions_action_type_v12` ON `actions` (`action_type`);--> statement-breakpoint
CREATE INDEX `idx_actions_archived_at_v13` ON `actions` (`archived_at`);--> statement-breakpoint
CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_type` text NOT NULL,
	`actor_type` text DEFAULT 'anonymous' NOT NULL,
	`actor_id` text,
	`ip_address` text,
	`user_agent` text,
	`outcome` text DEFAULT 'success' NOT NULL,
	`metadata` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_audit_logs_event_type_v12` ON `audit_logs` (`event_type`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_outcome_v12` ON `audit_logs` (`outcome`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_created_at_v12` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `dns_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`domain_id` integer NOT NULL,
	`records_json` text NOT NULL,
	`record_hash` text NOT NULL,
	`source` text DEFAULT 'dns' NOT NULL,
	`error` text,
	`checked_at` integer,
	FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_dns_snapshots_domain_id_v12` ON `dns_snapshots` (`domain_id`);--> statement-breakpoint
CREATE INDEX `idx_dns_snapshots_record_hash_v12` ON `dns_snapshots` (`record_hash`);--> statement-breakpoint
CREATE INDEX `idx_dns_snapshots_checked_at_v12` ON `dns_snapshots` (`checked_at`);--> statement-breakpoint
CREATE TABLE `domain_budgets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`period` text DEFAULT 'YEARLY' NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer,
	`alert_threshold` integer DEFAULT 80,
	`enabled` integer DEFAULT true,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `domain_costs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`domain_id` integer NOT NULL,
	`cost_type` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`registrar` text,
	`payment_date` integer NOT NULL,
	`period_start` integer,
	`period_end` integer,
	`note` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_domain_costs_domain_id_v12` ON `domain_costs` (`domain_id`);--> statement-breakpoint
CREATE INDEX `idx_domain_costs_payment_date_v12` ON `domain_costs` (`payment_date`);--> statement-breakpoint
CREATE INDEX `idx_domain_costs_cost_type_v12` ON `domain_costs` (`cost_type`);--> statement-breakpoint
CREATE TABLE `domain_status_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`domain_id` integer,
	`status` text NOT NULL,
	`checked_at` integer,
	`expires_at` integer,
	`source` text,
	`raw_snapshot` text,
	`rdap_summary_json` text,
	`parse_reason` text,
	FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_domain_status_history_domain_id` ON `domain_status_history` (`domain_id`);--> statement-breakpoint
CREATE TABLE `domain_status_latest` (
	`domain_id` integer PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`checked_at` integer,
	`expires_at` integer,
	`registrar` text,
	`nameservers_json` text,
	`source` text,
	`raw_snapshot` text,
	`rdap_summary_json` text,
	`parse_reason` text,
	`last_error` text,
	`last_error_at` integer,
	FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_domain_status_latest_status_v12` ON `domain_status_latest` (`status`);--> statement-breakpoint
CREATE INDEX `idx_domain_status_latest_expires_at_v12` ON `domain_status_latest` (`expires_at`);--> statement-breakpoint
CREATE TABLE `domains` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`domain` text NOT NULL,
	`watch_kind` text DEFAULT 'WANTED' NOT NULL,
	`priority` text DEFAULT 'MEDIUM' NOT NULL,
	`note` text,
	`tags_json` text DEFAULT '[]',
	`group_name` text,
	`is_active` integer DEFAULT true,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `domains_domain_unique` ON `domains` (`domain`);--> statement-breakpoint
CREATE INDEX `idx_domains_watch_kind_v12` ON `domains` (`watch_kind`);--> statement-breakpoint
CREATE INDEX `idx_domains_priority_v12` ON `domains` (`priority`);--> statement-breakpoint
CREATE INDEX `idx_domains_is_active_v12` ON `domains` (`is_active`);--> statement-breakpoint
CREATE INDEX `idx_domains_group_name_v12` ON `domains` (`group_name`);--> statement-breakpoint
CREATE TABLE `notification_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`domain_id` integer,
	`action_id` integer,
	`event_type` text NOT NULL,
	`channel` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`sent_at` integer,
	`failed_at` integer,
	`error_message` text,
	`metadata` text,
	`retry_of` integer,
	`archived_at` integer,
	`created_at` integer,
	FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`action_id`) REFERENCES `actions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_notification_events_domain_id_v12` ON `notification_events` (`domain_id`);--> statement-breakpoint
CREATE INDEX `idx_notification_events_event_type_v12` ON `notification_events` (`event_type`);--> statement-breakpoint
CREATE INDEX `idx_notification_events_status_v12` ON `notification_events` (`status`);--> statement-breakpoint
CREATE INDEX `idx_notification_events_channel_v12` ON `notification_events` (`channel`);--> statement-breakpoint
CREATE INDEX `idx_notification_events_created_at_v12` ON `notification_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_notification_events_sent_at_v12` ON `notification_events` (`sent_at`);--> statement-breakpoint
CREATE INDEX `idx_notification_events_archived_at_v13` ON `notification_events` (`archived_at`);--> statement-breakpoint
CREATE TABLE `notification_rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`instant_enabled` integer DEFAULT false,
	`daily_enabled` integer DEFAULT false,
	`target_email` text,
	`smtp_config_json` text
);
--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`user_agent` text,
	`enabled` integer DEFAULT true,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_subscriptions_endpoint_unique` ON `push_subscriptions` (`endpoint`);--> statement-breakpoint
CREATE INDEX `idx_push_subscriptions_enabled_v12` ON `push_subscriptions` (`enabled`);--> statement-breakpoint
CREATE TABLE `risk_findings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`domain_id` integer NOT NULL,
	`finding_type` text NOT NULL,
	`severity` text DEFAULT 'LOW' NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`evidence_json` text,
	`first_seen_at` integer,
	`last_seen_at` integer,
	`snoozed_until` integer,
	`resolved_at` integer,
	FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_risk_findings_domain_id_v12` ON `risk_findings` (`domain_id`);--> statement-breakpoint
CREATE INDEX `idx_risk_findings_finding_type_v12` ON `risk_findings` (`finding_type`);--> statement-breakpoint
CREATE INDEX `idx_risk_findings_severity_v12` ON `risk_findings` (`severity`);--> statement-breakpoint
CREATE INDEX `idx_risk_findings_status_v12` ON `risk_findings` (`status`);--> statement-breakpoint
CREATE INDEX `idx_risk_findings_last_seen_at_v12` ON `risk_findings` (`last_seen_at`);--> statement-breakpoint
CREATE TABLE `saved_filters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`criteria_json` text NOT NULL,
	`is_default` integer DEFAULT false,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `serverchan_configs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`send_key` text NOT NULL,
	`enabled` integer DEFAULT true,
	`event_types` text,
	`options_json` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `ssl_status_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`domain_id` integer,
	`checked_host` text,
	`has_ssl` integer,
	`is_valid` integer,
	`issuer` text,
	`valid_from` integer,
	`valid_to` integer,
	`days_until_expiry` integer,
	`validation_error` text,
	`checked_at` integer,
	FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_ssl_status_history_domain_id` ON `ssl_status_history` (`domain_id`);--> statement-breakpoint
CREATE TABLE `ssl_status_latest` (
	`domain_id` integer PRIMARY KEY NOT NULL,
	`checked_host` text,
	`has_ssl` integer DEFAULT false,
	`is_valid` integer DEFAULT false,
	`issuer` text,
	`valid_from` integer,
	`valid_to` integer,
	`days_until_expiry` integer,
	`checked_at` integer,
	`validation_error` text,
	`last_error` text,
	`last_error_at` integer,
	FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_ssl_status_latest_days_until_expiry_v12` ON `ssl_status_latest` (`days_until_expiry`);--> statement-breakpoint
CREATE INDEX `idx_ssl_status_latest_valid_to_v12` ON `ssl_status_latest` (`valid_to`);--> statement-breakpoint
CREATE TABLE `task_locks` (
	`task_name` text PRIMARY KEY NOT NULL,
	`locked_until` integer,
	`owner_id` text
);
--> statement-breakpoint
CREATE TABLE `task_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_name` text,
	`started_at` integer,
	`finished_at` integer,
	`result_json` text
);
--> statement-breakpoint
CREATE TABLE `webhook_configs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`method` text DEFAULT 'POST' NOT NULL,
	`headers_json` text,
	`enabled` integer DEFAULT true,
	`event_types` text,
	`created_at` integer
);
