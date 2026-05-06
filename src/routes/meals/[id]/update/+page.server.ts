import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { mealEntries, pantryItems, recipeItems } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals, params }) => {
	const userId = locals.user!.id;

	const [meal] = await db
		.select()
		.from(mealEntries)
		.where(and(eq(mealEntries.id, params.id), eq(mealEntries.userId, userId)));
	if (!meal) error(404, 'Meal not found');

	const allItems = await db
		.select()
		.from(pantryItems)
		.where(eq(pantryItems.userId, userId))
		.orderBy(pantryItems.name);

	const recipeId = meal.recipeId;
	let pantrySuggestions: Array<{ item: typeof pantryItems.$inferSelect; suggested: boolean }>;
	let originalRecipeItems: Array<{ itemName: string; pantryItemId: string | null }> = [];

	if (recipeId) {
		const rItems = await db.select().from(recipeItems).where(eq(recipeItems.recipeId, recipeId));
		const recipeItemIds = new Set(rItems.map((i) => i.pantryItemId).filter(Boolean));
		pantrySuggestions = allItems.map((item) => ({
			item,
			suggested: recipeItemIds.has(item.id)
		}));
		originalRecipeItems = rItems.map((i) => ({
			itemName: i.itemName,
			pantryItemId: i.pantryItemId ?? null
		}));
	} else {
		const mealWords = meal.name.toLowerCase().split(/\s+/);
		pantrySuggestions = allItems.map((item) => ({
			item,
			suggested: mealWords.some((word) => word.length > 2 && item.name.toLowerCase().includes(word))
		}));
	}

	return {
		meal: { ...meal, loggedAt: meal.loggedAt.toISOString() },
		recipeId: recipeId ?? null,
		pantrySuggestions: pantrySuggestions.map((s) => ({
			...s,
			item: {
				...s.item,
				purchaseDate: s.item.purchaseDate.toISOString(),
				expiryDate: s.item.expiryDate.toISOString(),
				createdAt: s.item.createdAt.toISOString()
			}
		})),
		originalRecipeItems
	};
};
