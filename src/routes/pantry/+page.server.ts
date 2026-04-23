import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { pantryItems, shoppingLists, shoppingListItems } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { calcExpiry } from '$lib/expiry';
import { getString, getNumber } from '$lib/server/form-data';
import { inferItemDefaults } from '$lib/server/infer-item';
import { pantryStatusFields } from '$lib/server/pantry';
import { getOrSeedCategories, resolveCatByName } from '$lib/server/categories';

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = locals.user!.id;

	const [items, categories, lists, listItems] = await Promise.all([
		db.select().from(pantryItems).where(eq(pantryItems.userId, userId)).orderBy(pantryItems.expiryDate),
		getOrSeedCategories(userId),
		db.select().from(shoppingLists).where(eq(shoppingLists.userId, userId)).orderBy(desc(shoppingLists.createdAt)),
		db.select({ listId: shoppingListItems.listId, pantryItemId: shoppingListItems.pantryItemId })
			.from(shoppingListItems).where(eq(shoppingListItems.userId, userId))
	]);

	// Set of "listId:pantryItemId" for fast membership lookup
	const listMembership = new Set(
		listItems.filter((r) => r.pantryItemId).map((r) => `${r.listId}:${r.pantryItemId}`)
	);

	return {
		items: items.map((i) => ({
			...i,
			purchaseDate: i.purchaseDate.toISOString(),
			expiryDate: i.expiryDate.toISOString(),
			createdAt: i.createdAt.toISOString()
		})),
		categories,
		lists: lists.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })),
		listMembership,
		editId: url.searchParams.get('edit')
	};
};

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();

		const name = getString(data, 'name');
		if (!name) return fail(400, { addError: 'Name is required.' });

		const purchaseDateStr = getString(data, 'purchaseDate');
		const purchaseDate = purchaseDateStr ? new Date(purchaseDateStr) : new Date();

		const submittedCategoryId = getString(data, 'category');
		const submittedQType = getString(data, 'quantityType') as 'count' | 'estimate';
		const inferred = inferItemDefaults(name);
		const cats = await getOrSeedCategories(userId);
		const cat = cats.find((c) => c.id === submittedCategoryId) ?? resolveCatByName(cats, inferred.category);
		const quantityType = submittedQType || inferred.quantityType;
		const quantity = getNumber(data, 'quantity', 1);
		const unit = quantityType === 'count' ? (getString(data, 'unit') || 'count') : null;

		const expiryDateStr = getString(data, 'expiryDate');
		const expiryDate = expiryDateStr ? new Date(expiryDateStr) : calcExpiry(cat.ttlDays, purchaseDate);
		const expiryOverridden = getString(data, 'expiryOverridden') === 'true';

		await db.insert(pantryItems).values({
			userId, name, category: cat.id, quantityType, quantity, unit, purchaseDate, expiryDate, expiryOverridden
		});

		return { success: true };
	},

	update: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();

		const id = getString(data, 'id');
		const name = getString(data, 'name');
		if (!id || !name) return fail(400, { addError: 'Invalid request.' });

		const submittedCategoryId = getString(data, 'category');
		const submittedQType = getString(data, 'quantityType') as 'count' | 'estimate';
		const inferred = inferItemDefaults(name);
		const cats = await getOrSeedCategories(userId);
		const cat = cats.find((c) => c.id === submittedCategoryId) ?? resolveCatByName(cats, inferred.category);
		const quantityType = submittedQType || inferred.quantityType;
		const quantity = getNumber(data, 'quantity', 1);
		const unit = quantityType === 'count' ? (getString(data, 'unit') || 'count') : null;

		const qtyFields = pantryStatusFields(quantity);

		// When restoring a consumed/discarded item, check current status and reset dates
		const [current] = await db.select({ status: pantryItems.status }).from(pantryItems)
			.where(and(eq(pantryItems.id, id), eq(pantryItems.userId, userId)));
		const isRestoring = current && current.status !== 'active' && qtyFields.status === 'active';

		const purchaseDateStr = getString(data, 'purchaseDate');
		const purchaseDate = isRestoring ? new Date() : (purchaseDateStr ? new Date(purchaseDateStr) : new Date());
		const expiryDateStr = getString(data, 'expiryDate');
		const expiryDate = isRestoring ? calcExpiry(cat.ttlDays, purchaseDate) : (expiryDateStr ? new Date(expiryDateStr) : calcExpiry(cat.ttlDays, purchaseDate));
		const expiryOverridden = isRestoring ? false : getString(data, 'expiryOverridden') === 'true';

		await db
			.update(pantryItems)
			.set({ name, category: cat.id, quantityType, unit, purchaseDate, expiryDate, expiryOverridden, ...qtyFields })
			.where(and(eq(pantryItems.id, id), eq(pantryItems.userId, userId)));

		return { success: true };
	},

	discard: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const id = getString(data, 'id');

		if (!id) return fail(400, {});

		await db
			.update(pantryItems)
			.set({ status: 'discarded', finishedAt: new Date() })
			.where(and(eq(pantryItems.id, id), eq(pantryItems.userId, userId)));

		return { success: true };
	},

	delete: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const id = getString(data, 'id');

		if (!id) return fail(400, {});

		await db
			.delete(pantryItems)
			.where(and(eq(pantryItems.id, id), eq(pantryItems.userId, userId)));

		return { success: true };
	},

	addToList: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const itemId = getString(data, 'itemId');
		const listId = getString(data, 'listId');
		if (!itemId || !listId) return fail(400, {});

		// Verify ownership
		const item = db.select().from(pantryItems)
			.where(and(eq(pantryItems.id, itemId), eq(pantryItems.userId, userId))).get();
		const list = db.select().from(shoppingLists)
			.where(and(eq(shoppingLists.id, listId), eq(shoppingLists.userId, userId))).get();
		if (!item || !list) return fail(404, {});

		// Skip if already on this list
		const existing = db.select().from(shoppingListItems)
			.where(and(eq(shoppingListItems.listId, listId), eq(shoppingListItems.pantryItemId, itemId))).get();
		if (existing) return { success: true, alreadyOnList: true };

		await db.insert(shoppingListItems).values({
			listId, userId, name: item.name, pantryItemId: item.id
		});

		return { success: true, listName: list.name };
	},

	removeFromList: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const itemId = getString(data, 'itemId');
		const listId = getString(data, 'listId');
		if (!itemId || !listId) return fail(400, {});

		await db.delete(shoppingListItems)
			.where(and(
				eq(shoppingListItems.listId, listId),
				eq(shoppingListItems.pantryItemId, itemId),
				eq(shoppingListItems.userId, userId)
			));

		return { success: true };
	}
};
