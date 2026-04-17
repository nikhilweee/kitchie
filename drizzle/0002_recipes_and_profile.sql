ALTER TABLE `users` ADD `name` text;
--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recipe_items` (
	`id` text PRIMARY KEY NOT NULL,
	`recipe_id` text NOT NULL REFERENCES `recipes`(`id`) ON DELETE CASCADE,
	`pantry_item_id` text REFERENCES `pantry_items`(`id`) ON DELETE SET NULL,
	`item_name` text NOT NULL,
	`default_quantity` real DEFAULT 1 NOT NULL
);
