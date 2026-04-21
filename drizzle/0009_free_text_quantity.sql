ALTER TABLE `recipe_items` ADD `quantity` text;--> statement-breakpoint
ALTER TABLE `recipe_items` DROP COLUMN `default_quantity`;--> statement-breakpoint
ALTER TABLE `recipe_items` DROP COLUMN `unit`;