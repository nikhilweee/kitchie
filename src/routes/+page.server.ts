import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { mealEntries, mealIngredients, pantryItems } from '$lib/server/db/schema';
import { eq, desc, and, inArray } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = locals.user!.id;

	// Load recent meal entries (last 30 days)
	const since = new Date();
	since.setDate(since.getDate() - 30);

	const entries = await db
		.select()
		.from(mealEntries)
		.where(eq(mealEntries.userId, userId))
		.orderBy(desc(mealEntries.loggedAt))
		.limit(100);

	// Load ingredients for these meals
	const entryIds = entries.map((e) => e.id);
	const ingredients =
		entryIds.length > 0
			? await db
					.select()
					.from(mealIngredients)
					.where(inArray(mealIngredients.mealEntryId, entryIds))
			: [];

	// If ?update=<mealId>, load that meal + pantry suggestions for step 2
	const updateMealId = url.searchParams.get('update');
	let updateMeal: (typeof entries)[0] | null = null;
	let pantrySuggestions: Array<{
		item: typeof pantryItems.$inferSelect;
		suggested: boolean;
	}> = [];

	if (updateMealId) {
		updateMeal = entries.find((e) => e.id === updateMealId) ?? null;

		if (updateMeal) {
			// Load all pantry items for this user with remaining quantity
			const allItems = await db
				.select()
				.from(pantryItems)
				.where(and(eq(pantryItems.userId, userId)))
				.orderBy(pantryItems.name);

			// Simple heuristic: suggest items whose name appears as a word in the meal name
			const mealWords = updateMeal.name.toLowerCase().split(/\s+/);
			pantrySuggestions = allItems.map((item) => ({
				item,
				suggested: mealWords.some(
					(word) => word.length > 2 && item.name.toLowerCase().includes(word)
				)
			}));
		}
	}

	return {
		entries: entries.map((e) => ({
			...e,
			loggedAt: e.loggedAt.toISOString(),
			ingredients: ingredients
				.filter((i) => i.mealEntryId === e.id)
				.map((i) => i.itemName)
		})),
		updateMeal: updateMeal
			? { ...updateMeal, loggedAt: updateMeal.loggedAt.toISOString() }
			: null,
		pantrySuggestions: pantrySuggestions.map((s) => ({
			...s,
			item: {
				...s.item,
				purchaseDate: s.item.purchaseDate.toISOString(),
				expiryDate: s.item.expiryDate.toISOString(),
				createdAt: s.item.createdAt.toISOString()
			}
		}))
	};
};

export const actions: Actions = {
	// Step 1: save meal entry, redirect to step 2
	addMeal: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const name = String(data.get('name') ?? '').trim();

		if (!name) return fail(400, { error: 'Meal name is required.' });

		const [meal] = await db
			.insert(mealEntries)
			.values({ userId, name, loggedAt: new Date() })
			.returning();

		redirect(302, `/?update=${meal.id}`);
	},

	// Step 2: save pantry depletions
	updatePantry: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const mealId = String(data.get('mealId') ?? '');
		const selectedIds = data.getAll('itemId').map(String);
		const quantitiesUsed = data.getAll('quantityUsed').map(Number);

		if (!mealId) return fail(400, { error: 'Invalid request.' });

		// Verify meal belongs to user
		const meal = await db
			.select()
			.from(mealEntries)
			.where(and(eq(mealEntries.id, mealId), eq(mealEntries.userId, userId)))
			.get();

		if (!meal) return fail(404, { error: 'Meal not found.' });

		// Insert ingredient records and decrement pantry quantities
		for (let i = 0; i < selectedIds.length; i++) {
			const itemId = selectedIds[i];
			const used = quantitiesUsed[i] ?? 1;

			const item = await db
				.select()
				.from(pantryItems)
				.where(and(eq(pantryItems.id, itemId), eq(pantryItems.userId, userId)))
				.get();

			if (!item) continue;

			await db.insert(mealIngredients).values({
				mealEntryId: mealId,
				pantryItemId: itemId,
				itemName: item.name,
				quantityUsed: used
			});

			// Decrement quantity (floor at 0)
			const newQty = Math.max(0, item.quantity - used);
			await db
				.update(pantryItems)
				.set({ quantity: newQty })
				.where(eq(pantryItems.id, itemId));
		}

		redirect(302, '/');
	}
};
