import { integer, sqliteTable, text, real } from 'drizzle-orm/sqlite-core';
import type { Cuisine } from '$lib/cuisine';
import { relations } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Users & sessions
// ---------------------------------------------------------------------------

export const users = sqliteTable('users', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	name: text('name'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.$defaultFn(() => new Date())
		.notNull()
});

export const sessions = sqliteTable('sessions', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.$defaultFn(() => new Date())
		.notNull()
});

// ---------------------------------------------------------------------------
// Pantry
// ---------------------------------------------------------------------------

// Category drives smart expiry TTL and quantity mode heuristics
export type PantryCategory =
	| 'fresh_produce'
	| 'fresh_meat_fish'
	| 'dairy'
	| 'cooked_leftovers'
	| 'bread_bakery'
	| 'frozen'
	| 'dry_goods'
	| 'canned_goods'
	| 'condiments'
	| 'packaged_snacks'
	| 'other';

// Countable items (eggs, bananas) use 'count'; bulk/liquid use 'estimate'
export type QuantityType = 'count' | 'estimate';
export type QuantityEstimate = 'full' | 'half' | 'low';

export const pantryItems = sqliteTable('pantry_items', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	category: text('category').$type<PantryCategory>().notNull().default('other'),
	// quantity_type determines how quantity is stored
	quantityType: text('quantity_type').$type<QuantityType>().notNull().default('count'),
	// For 'count': a number. For 'estimate': stored as 1 (full), 0.5 (half), 0.1 (low)
	quantity: real('quantity').notNull().default(1),
	// Unit for count items (e.g. 'count', 'oz', 'g'); null for estimate items
	unit: text('unit'),
	purchaseDate: integer('purchase_date', { mode: 'timestamp' }).notNull(),
	expiryDate: integer('expiry_date', { mode: 'timestamp' }).notNull(),
	expiryOverridden: integer('expiry_overridden', { mode: 'boolean' }).notNull().default(false),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.$defaultFn(() => new Date())
		.notNull()
});

// ---------------------------------------------------------------------------
// Meal entries
// ---------------------------------------------------------------------------

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const mealEntries = sqliteTable('meal_entries', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	mealType: text('meal_type').$type<MealType>().notNull().default('snack'),
	loggedAt: integer('logged_at', { mode: 'timestamp' })
		.$defaultFn(() => new Date())
		.notNull()
});

// Created in step 2 of meal logging (pantry update). Absent if user skips.
export const mealIngredients = sqliteTable('meal_ingredients', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	mealEntryId: text('meal_entry_id')
		.notNull()
		.references(() => mealEntries.id, { onDelete: 'cascade' }),
	pantryItemId: text('pantry_item_id')
		.references(() => pantryItems.id, { onDelete: 'set null' }),
	// snapshot of the item name at log time (in case item is deleted later)
	itemName: text('item_name').notNull(),
	quantityUsed: real('quantity_used').notNull().default(1)
});

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------

// A recipe is a saved collection of pantry items for a named meal.
// Used to pre-fill the pantry depletion step when the same meal is logged again.
export const recipes = sqliteTable('recipes', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	mealType: text('meal_type').$type<MealType>(),
	cuisine: text('cuisine').$type<Cuisine>(),
	prepTime: integer('prep_time'), // 1=Quick, 2=Easy, 3=Medium, 4=Long
	createdAt: integer('created_at', { mode: 'timestamp' })
		.$defaultFn(() => new Date())
		.notNull()
});

export const recipeItems = sqliteTable('recipe_items', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	recipeId: text('recipe_id')
		.notNull()
		.references(() => recipes.id, { onDelete: 'cascade' }),
	pantryItemId: text('pantry_item_id').references(() => pantryItems.id, { onDelete: 'set null' }),
	itemName: text('item_name').notNull(),
	quantity: text('quantity')
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
	sessions: many(sessions),
	pantryItems: many(pantryItems),
	mealEntries: many(mealEntries)
}));

export const mealEntriesRelations = relations(mealEntries, ({ one, many }) => ({
	user: one(users, { fields: [mealEntries.userId], references: [users.id] }),
	ingredients: many(mealIngredients)
}));

export const mealIngredientsRelations = relations(mealIngredients, ({ one }) => ({
	mealEntry: one(mealEntries, {
		fields: [mealIngredients.mealEntryId],
		references: [mealEntries.id]
	}),
	pantryItem: one(pantryItems, {
		fields: [mealIngredients.pantryItemId],
		references: [pantryItems.id]
	})
}));

export const pantryItemsRelations = relations(pantryItems, ({ one }) => ({
	user: one(users, { fields: [pantryItems.userId], references: [users.id] })
}));

export const recipesRelations = relations(recipes, ({ one, many }) => ({
	user: one(users, { fields: [recipes.userId], references: [users.id] }),
	items: many(recipeItems)
}));

export const recipeItemsRelations = relations(recipeItems, ({ one }) => ({
	recipe: one(recipes, { fields: [recipeItems.recipeId], references: [recipes.id] }),
	pantryItem: one(pantryItems, { fields: [recipeItems.pantryItemId], references: [pantryItems.id] })
}));
