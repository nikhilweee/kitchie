import { fail, error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { shoppingLists, shoppingListItems, pantryItems, userCategories } from '$lib/server/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { getString, getStrings } from '$lib/server/form-data';
import { inferItemDefaults } from '$lib/server/infer-item';
import { updatePantryQuantity, pantryStatusFields } from '$lib/server/pantry';
import { calcExpiry } from '$lib/expiry';

export const load: PageServerLoad = async ({ locals, params }) => {
	const userId = locals.user!.id;
	const listId = params.id;

	const list = await db
		.select()
		.from(shoppingLists)
		.where(and(eq(shoppingLists.id, listId), eq(shoppingLists.userId, userId)))
		.get();

	if (!list) error(404, 'List not found');

	const [items, allPantry, allCategories, otherListItems] = await Promise.all([
		db.select().from(shoppingListItems)
			.where(eq(shoppingListItems.listId, listId))
			.orderBy(shoppingListItems.createdAt),
		db.select().from(pantryItems)
			.where(eq(pantryItems.userId, userId)),
		db.select().from(userCategories)
			.where(eq(userCategories.userId, userId))
			.orderBy(userCategories.sortOrder),
		// Items on other lists (for visual indicator)
		db.select({ pantryItemId: shoppingListItems.pantryItemId, name: shoppingListItems.name })
			.from(shoppingListItems)
			.where(and(eq(shoppingListItems.userId, userId), ne(shoppingListItems.listId, listId)))
	]);

	return {
		list: { ...list, createdAt: list.createdAt.toISOString() },
		items: items.map((i) => ({ ...i, createdAt: i.createdAt.toISOString() })),
		pantryItems: allPantry.map((i) => ({
			...i,
			purchaseDate: i.purchaseDate.toISOString(),
			expiryDate: i.expiryDate.toISOString(),
			createdAt: i.createdAt.toISOString()
		})),
		categories: allCategories,
		// Set of names already on other lists
		otherListNames: new Set(otherListItems.map((i) => i.name.toLowerCase()))
	};
};

export const actions: Actions = {
	// Add selected pantry items and/or free-text items
	addItems: async ({ request, locals, params }) => {
		const userId = locals.user!.id;
		const listId = params.id;

		const data = await request.formData();
		// Selected existing pantry item IDs
		const pantryIds = getStrings(data, 'pantryItemId');
		// Free-text names (not in pantry)
		const freeTextNames = getStrings(data, 'freeText').filter(Boolean);

		// Get all pantry items for this user to resolve names
		const userPantry = await db.select().from(pantryItems).where(eq(pantryItems.userId, userId));
		// Get existing shopping list items to avoid duplicates
		const existing = await db.select().from(shoppingListItems).where(eq(shoppingListItems.listId, listId));
		const existingPantryIds = new Set(existing.map((i) => i.pantryItemId).filter(Boolean));
		const existingNames = new Set(existing.map((i) => i.name.toLowerCase()));

		const toInsert: { listId: string; userId: string; name: string; pantryItemId?: string }[] = [];

		for (const pid of pantryIds) {
			if (existingPantryIds.has(pid)) continue;
			const item = userPantry.find((p) => p.id === pid);
			if (!item) continue;
			toInsert.push({ listId, userId, name: item.name, pantryItemId: pid });
		}

		for (const name of freeTextNames) {
			if (existingNames.has(name.toLowerCase())) continue;
			// Check if name matches an existing pantry item
			const match = userPantry.find((p) => p.name.toLowerCase() === name.toLowerCase());
			toInsert.push({ listId, userId, name: match?.name ?? name, pantryItemId: match?.id });
		}

		if (toInsert.length > 0) {
			await db.insert(shoppingListItems).values(toInsert);
		}

		return { success: true };
	},

	toggleShopped: async ({ request, locals, params }) => {
		const userId = locals.user!.id;
		const listId = params.id;
		const data = await request.formData();
		const id = getString(data, 'id');
		const shopped = getString(data, 'shopped') === 'true';
		if (!id) return fail(400, {});

		await db.update(shoppingListItems)
			.set({ shopped: !shopped })
			.where(and(eq(shoppingListItems.id, id), eq(shoppingListItems.listId, listId), eq(shoppingListItems.userId, userId)));

		return { success: true };
	},

	removeItem: async ({ request, locals, params }) => {
		const userId = locals.user!.id;
		const listId = params.id;
		const data = await request.formData();
		const id = getString(data, 'id');
		if (!id) return fail(400, {});

		await db.delete(shoppingListItems)
			.where(and(eq(shoppingListItems.id, id), eq(shoppingListItems.listId, listId), eq(shoppingListItems.userId, userId)));

		return { success: true };
	},

	// Finalise: write shopped items to pantry, remove them from the list
	finish: async ({ request, locals, params }) => {
		const userId = locals.user!.id;
		const listId = params.id;
		const data = await request.formData();

		const itemIds = getStrings(data, 'itemId');
		const newQuantities = getStrings(data, 'newQuantity').map(Number);
		const pantryIdInputs = getStrings(data, 'pantryItemId');

		const allCats = await db.select().from(userCategories).where(eq(userCategories.userId, userId));
		const shoppedItems = await db.select().from(shoppingListItems)
			.where(and(eq(shoppingListItems.listId, listId), eq(shoppingListItems.userId, userId)));

		for (let i = 0; i < itemIds.length; i++) {
			const shoppingItemId = itemIds[i];
			const pantryItemId = pantryIdInputs[i] || null;
			const newQty = isNaN(newQuantities[i]) ? 1 : Math.max(0, newQuantities[i]);

			const shoppingItem = shoppedItems.find((s) => s.id === shoppingItemId);
			if (!shoppingItem) continue;

			if (pantryItemId) {
				// Existing pantry item: restore with new quantity and reset dates
				const purchaseDate = new Date();
				const existing = await db.select().from(pantryItems)
					.where(and(eq(pantryItems.id, pantryItemId), eq(pantryItems.userId, userId)))
					.get();
				if (existing) {
					const cat = allCats.find((c) => c.id === existing.category);
					const expiryDate = calcExpiry(cat?.ttlDays ?? 30, purchaseDate);
					await updatePantryQuantity(pantryItemId, newQty, userId, { purchaseDate, expiryDate, expiryOverridden: false });
				}
			} else {
				// New item: create pantry entry with inferred defaults
				const { category: categoryName, quantityType, unit } = inferItemDefaults(shoppingItem.name);
				const purchaseDate = new Date();
				const cat = allCats.find((c) => c.name === categoryName) ?? allCats.find((c) => c.name === 'Other') ?? allCats[0];
				const expiryDate = calcExpiry(cat?.ttlDays ?? 30, purchaseDate);
				await db.insert(pantryItems).values({
					userId,
					name: shoppingItem.name,
					category: cat?.id ?? categoryName,
					quantityType,
					unit: quantityType === 'count' ? (unit ?? 'count') : null,
					purchaseDate,
					expiryDate,
					expiryOverridden: false,
					...pantryStatusFields(newQty)
				});
			}

			// Remove from shopping list
			await db.delete(shoppingListItems)
				.where(and(eq(shoppingListItems.id, shoppingItemId), eq(shoppingListItems.userId, userId)));
		}

		return { success: true };
	}
};
