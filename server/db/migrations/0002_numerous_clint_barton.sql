CREATE TABLE `domain_risk_summaries` (
	`domain_id` integer PRIMARY KEY NOT NULL,
	`risk_score` integer DEFAULT 0 NOT NULL,
	`open_findings_count` integer DEFAULT 0 NOT NULL,
	`highest_severity` text,
	`last_security_scan_at` integer,
	`dnssec_status` text DEFAULT 'UNKNOWN' NOT NULL,
	`dmarc_policy` text DEFAULT 'unknown' NOT NULL,
	`registrar_lock_status` text DEFAULT 'UNKNOWN' NOT NULL,
	`spf_configured` integer DEFAULT false NOT NULL,
	`caa_configured` integer DEFAULT false NOT NULL,
	`bimi_configured` integer DEFAULT false NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_domain_risk_summaries_risk_score_v14` ON `domain_risk_summaries` (`risk_score`);--> statement-breakpoint
CREATE INDEX `idx_domain_risk_summaries_open_findings_v14` ON `domain_risk_summaries` (`open_findings_count`);