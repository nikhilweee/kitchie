CREATE TABLE `meal_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`logged_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `meal_ingredients` (
	`id` text PRIMARY KEY NOT NULL,
	`meal_entry_id` text NOT NULL,
	`pantry_item_id` text NOT NULL,
	`item_name` text NOT NULL,
	`quantity_used` real DEFAULT 1 NOT NULL,
	FOREIGN KEY (`meal_entry_id`) REFERENCES `meal_entries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`pantry_item_id`) REFERENCES `pantry_items`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `pantry_items` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text DEFAULT 'other' NOT NULL,
	`quantity_type` text DEFAULT 'count' NOT NULL,
	`quantity` real DEFAULT 1 NOT NULL,
	`purchase_date` integer NOT NULL,
	`expiry_date` integer NOT NULL,
	`expiry_overridden` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);