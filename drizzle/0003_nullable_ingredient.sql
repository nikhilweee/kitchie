PRAGMA foreign_keys = OFF;
--> statement-breakpoint
CREATE TABLE `meal_ingredients_new` (
	`id` text PRIMARY KEY NOT NULL,
	`meal_entry_id` text NOT NULL REFERENCES `meal_entries`(`id`) ON DELETE CASCADE,
	`pantry_item_id` text REFERENCES `pantry_items`(`id`) ON DELETE SET NULL,
	`item_name` text NOT NULL,
	`quantity_used` real NOT NULL DEFAULT 1
);
--> statement-breakpoint
INSERT INTO `meal_ingredients_new` SELECT * FROM `meal_ingredients`;
--> statement-breakpoint
DROP TABLE `meal_ingredients`;
--> statement-breakpoint
ALTER TABLE `meal_ingredients_new` RENAME TO `meal_ingredients`;
--> statement-breakpoint
PRAGMA foreign_keys = ON;
