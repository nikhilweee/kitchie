ALTER TABLE `pantry_items` ADD `status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `pantry_items` ADD `finished_at` integer;