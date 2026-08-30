CREATE TABLE `group_settings` (
	`group_jid` text PRIMARY KEY NOT NULL,
	`settings` text NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_group_settings_jid` ON `group_settings` (`group_jid`);