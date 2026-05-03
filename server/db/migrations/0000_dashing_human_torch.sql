CREATE TABLE `domain_status_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`domain_id` integer,
	`status` text NOT NULL,
	`checked_at` integer,
	`expires_at` integer,
	`source` text,
	`raw_snapshot` text,
	`parse_reason` text,
	FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `domain_status_latest` (
	`domain_id` integer PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`checked_at` integer,
	`expires_at` integer,
	`registrar` text,
	`nameservers_json` text,
	`source` text,
	`raw_snapshot` text,
	`parse_reason` text,
	FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `domains` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`domain` text NOT NULL,
	`note` text,
	`tags_json` text DEFAULT '[]',
	`group_name` text,
	`is_active` integer DEFAULT true,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `domains_domain_unique` ON `domains` (`domain`);--> statement-breakpoint
CREATE TABLE `notification_rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`instant_enabled` integer DEFAULT false,
	`daily_enabled` integer DEFAULT false,
	`target_email` text,
	`smtp_config_json` text
);
--> statement-breakpoint
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
