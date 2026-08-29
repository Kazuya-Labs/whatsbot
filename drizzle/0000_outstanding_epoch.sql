CREATE TABLE `campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`text` text NOT NULL,
	`footer` text,
	`jeda` integer DEFAULT 5000 NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `campaign_cards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`campaign_id` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`title` text,
	`body` text,
	`image_url` text,
	`buttons` text,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_cards_campaign` ON `campaign_cards` (`campaign_id`);--> statement-breakpoint
CREATE TABLE `campaign_targets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`campaign_id` text NOT NULL,
	`jid` text NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_targets_campaign_jid` ON `campaign_targets` (`campaign_id`,`jid`);