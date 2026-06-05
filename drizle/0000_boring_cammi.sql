CREATE TABLE `transaksi` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reff_id` text NOT NULL,
	`user_id` integer,
	`produk` text NOT NULL,
	`tujuan` text NOT NULL,
	`harga` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transaksi_reff_id_unique` ON `transaksi` (`reff_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`phone` text NOT NULL,
	`saldo` integer DEFAULT 0 NOT NULL,
	`saldo_hold` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_phone_unique` ON `users` (`phone`);