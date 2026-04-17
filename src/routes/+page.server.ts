import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { mealEntries, mealIngredients, pantryItems } from '$lib/server/db/schema';
import type { MealType } from '$lib/server/db/schema';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { guessMealType } from '$lib/meal-type';

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = locals.user!.id;

	const entries = await db
		.select()
		.from(mealEntries)
		.where(eq(mealEntries.userId, userId))
		.orderBy(desc(mealEntries.loggedAt))
		.limit(100);

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
	let pantrySuggestions: Array<{ item: typeof pantryItems.$inferSelect; suggested: boolean }> = [];

	if (updateMealId) {
		updateMeal = entries.find((e) => e.id === updateMealId) ?? null;

		if (updateMeal) {
			const allItems = await db
				.select()
				.from(pantryItems)
				.where(eq(pantryItems.userId, userId))
				.orderBy(pantryItems.name);

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
			ingredients: ingredients.filter((i) => i.mealEntryId === e.id).map((i) => i.itemName)
		})),
		updateMeal: updateMeal ? { ...updateMeal, loggedAt: updateMeal.loggedAt.toISOString() } : null,
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
		const datetimeStr = String(data.get('datetime') ?? '');
		const mealType = String(data.get('mealType') ?? '') as MealType;

		if (!name) return fail(400, { error: 'Meal name is required.' });

		const loggedAt = datetimeStr ? new Date(datetimeStr) : new Date();
		const resolvedMealType: MealType =
			(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).includes(mealType)
				? mealType
				: guessMealType(loggedAt.getHours());

		const [meal] = await db
			.insert(mealEntries)
			.values({ userId, name, mealType: resolvedMealType, loggedAt })
			.returning();

		redirect(302, `/?update=${meal.id}`);
	},

	// Edit a meal entry (name, time, meal type)
	updateMeal: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		const name = String(data.get('name') ?? '').trim();
		const datetimeStr = String(data.get('datetime') ?? '');
		const mealType = String(data.get('mealType') ?? '') as MealType;

		if (!id || !name) return fail(400, { error: 'Invalid request.' });

		const existing = await db
			.select()
			.from(mealEntries)
			.where(and(eq(mealEntries.id, id), eq(mealEntries.userId, userId)))
			.get();

		if (!existing) return fail(404, {});

		const loggedAt = datetimeStr ? new Date(datetimeStr) : existing.loggedAt;
		const resolvedMealType: MealType =
			(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).includes(mealType)
				? mealType
				: guessMealType(loggedAt.getHours());

		await db
			.update(mealEntries)
			.set({ name, mealType: resolvedMealType, loggedAt })
			.where(eq(mealEntries.id, id));

		return { success: true };
	},

	// Delete a meal entry
	deleteMeal: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		if (!id) return fail(400, {});

		await db
			.delete(mealEntries)
			.where(and(eq(mealEntries.id, id), eq(mealEntries.userId, userId)));

		return { success: true };
	},

	// Step 2: save pantry depletions
	updatePantry: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const mealId = String(data.get('mealId') ?? '');
		const selectedIds = data.getAll('itemId').map(String);
		const quantitiesUsed = data.getAll('quantityUsed').map(Number);

		if (!mealId) return fail(400, { error: 'Invalid request.' });

		const meal = await db
			.select()
			.from(mealEntries)
			.where(and(eq(mealEntries.id, mealId), eq(mealEntries.userId, userId)))
			.get();

		if (!meal) return fail(404, { error: 'Meal not found.' });

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

			const newQty = Math.max(0, item.quantity - used);
			await db.update(pantryItems).set({ quantity: newQty }).where(eq(pantryItems.id, itemId));
		}

		redirect(302, '/');
	}
};
