import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { pantryItems, shoppingLists, shoppingListItems } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getOrSeedCategories } from '$lib/server/categories';

export const load: PageServerLoad = async ({ locals, params }) => {
	const userId = locals.user!.id;
	const { id } = params;

	const [[item], categories, lists, listItems] = await Promise.all([
		db.select().from(pantryItems).where(and(eq(pantryItems.id, id), eq(pantryItems.userId, userId))),
		getOrSeedCategories(userId),
		db.select().from(shoppingLists).where(eq(shoppingLists.userId, userId)).orderBy(desc(shoppingLists.createdAt)),
		db.select({ listId: shoppingListItems.listId, pantryItemId: shoppingListItems.pantryItemId })
			.from(shoppingListItems).where(eq(shoppingListItems.userId, userId))
	]);

	if (!item) error(404, 'Item not found');

	const listMembership = new Set(
		listItems.filter((r) => r.pantryItemId).map((r) => `${r.listId}:${r.pantryItemId}`)
	);

	return {
		item: {
			...item,
			purchaseDate: item.purchaseDate.toISOString(),
			expiryDate: item.expiryDate.toISOString(),
			createdAt: item.createdAt.toISOString()
		},
		categories,
		lists: lists.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })),
		listMembership
	};
};
