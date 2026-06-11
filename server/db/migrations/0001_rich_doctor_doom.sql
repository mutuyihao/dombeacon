ALTER TABLE `push_subscriptions` ADD `endpoint_hash` text;--> statement-breakpoint
CREATE INDEX `idx_push_subscriptions_endpoint_hash_v14` ON `push_subscriptions` (`endpoint_hash`);