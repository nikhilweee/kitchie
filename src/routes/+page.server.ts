import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { mealEntries, mealIngredients, pantryItems, recipes, recipeItems } from '$lib/server/db/schema';
import type { MealType } from '$lib/server/db/schema';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { guessMealType } from '$lib/meal-type';
import { calcExpiry } from '$lib/expiry';
import { getString, getStrings, getNumbers } from '$lib/server/form-data';
import { inferItemDefaults } from '$lib/server/infer-item';

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

	// ?update=<mealId>[&recipe=<recipeId>] — open pantry update flow
	const updateMealId = url.searchParams.get('update');
	const recipeId = url.searchParams.get('recipe');
	let updateMeal: (typeof entries)[0] | null = null;
	let pantrySuggestions: Array<{ item: typeof pantryItems.$inferSelect; suggested: boolean }> = [];
	let originalRecipeItems: Array<{ itemName: string; pantryItemId: string | null }> = [];

	if (updateMealId) {
		updateMeal = entries.find((e) => e.id === updateMealId) ?? null;

		if (updateMeal) {
			const allItems = await db
				.select()
				.from(pantryItems)
				.where(eq(pantryItems.userId, userId))
				.orderBy(pantryItems.name);

			if (recipeId) {
				const rItems = await db
					.select()
					.from(recipeItems)
					.where(eq(recipeItems.recipeId, recipeId));
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
				const mealWords = updateMeal.name.toLowerCase().split(/\s+/);
				pantrySuggestions = allItems.map((item) => ({
					item,
					suggested: mealWords.some(
						(word) => word.length > 2 && item.name.toLowerCase().includes(word)
					)
				}));
			}
		}
	}

	return {
		entries: entries.map((e) => ({
			...e,
			loggedAt: e.loggedAt.toISOString(),
			ingredients: ingredients.filter((i) => i.mealEntryId === e.id).map((i) => i.itemName)
		})),
		updateMeal: updateMeal ? { ...updateMeal, loggedAt: updateMeal.loggedAt.toISOString() } : null,
		recipeId,
		originalRecipeItems,
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
	addMeal: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const name = getString(data, 'name');
		const datetimeStr = getString(data, 'datetime');
		const mealType = getString(data, 'mealType') as MealType;
		const recipeId = getString(data, 'recipeId');
		const updatePantry = data.get('updatePantry') === '1';

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

		if (updatePantry) {
			const params = new URLSearchParams({ update: meal.id });
			if (recipeId) params.set('recipe', recipeId);
			redirect(302, `/?${params}`);
		}
		redirect(302, '/');
	},

	updateMeal: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const id = getString(data, 'id');
		const name = getString(data, 'name');
		const datetimeStr = getString(data, 'datetime');
		const mealType = getString(data, 'mealType') as MealType;

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

	deleteMeal: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const id = getString(data, 'id');
		if (!id) return fail(400, {});

		await db
			.delete(mealEntries)
			.where(and(eq(mealEntries.id, id), eq(mealEntries.userId, userId)));

		return { success: true };
	},

	// Single action: write pantry + mealIngredients + optional recipe action in one shot
	finalizeFlow: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const mealId = getString(data, 'mealId');
		const recipeId = getString(data, 'recipeId');
		const recipeAction = getString(data, 'recipeAction'); // 'save' | 'update' | 'skip'
		const itemIds = getStrings(data, 'itemId');
		const itemNames = getStrings(data, 'itemName');
		const newQuantities = getNumbers(data, 'newQuantity');

		if (!mealId) return fail(400, { error: 'Invalid request.' });

		const meal = await db
			.select()
			.from(mealEntries)
			.where(and(eq(mealEntries.id, mealId), eq(mealEntries.userId, userId)))
			.get();

		if (!meal) return fail(404, { error: 'Meal not found.' });

		// Idempotent: clear previously logged ingredients
		await db.delete(mealIngredients).where(eq(mealIngredients.mealEntryId, mealId));

		for (let i = 0; i < itemNames.length; i++) {
			let pantryItemId = itemIds[i] || null;
			const itemName = itemNames[i];
			const newQty = newQuantities[i] ?? 0;

			if (!itemName) continue;

			let used = newQty;

			if (pantryItemId) {
				// Linked pantry item: set remaining quantity, compute depletion
				const item = await db
					.select()
					.from(pantryItems)
					.where(and(eq(pantryItems.id, pantryItemId), eq(pantryItems.userId, userId)))
					.get();
				if (item) {
					used = Math.max(0, item.quantity - newQty);
					await db
						.update(pantryItems)
						.set({ quantity: Math.max(0, newQty) })
						.where(eq(pantryItems.id, pantryItemId));
				}
			} else {
				// Custom item: reuse existing pantry entry or create new
				const existing = await db
					.select()
					.from(pantryItems)
					.where(and(eq(pantryItems.userId, userId), eq(pantryItems.name, itemName)))
					.get();
				if (existing) {
					pantryItemId = existing.id;
					await db.update(pantryItems).set({ quantity: Math.max(0, newQty) }).where(eq(pantryItems.id, pantryItemId));
				} else {
					const { category, quantityType, unit } = inferItemDefaults(itemName);
					const purchaseDate = new Date();
					const expiryDate = calcExpiry(category, purchaseDate);
					const [created] = await db
						.insert(pantryItems)
						.values({ userId, name: itemName, category, quantityType, quantity: Math.max(0, newQty), unit, purchaseDate, expiryDate, expiryOverridden: false })
						.returning();
					pantryItemId = created.id;
				}
				used = 0;
			}

			await db.insert(mealIngredients).values({
				mealEntryId: mealId,
				pantryItemId,
				itemName,
				quantityUsed: used
			});
		}

		if (recipeAction === 'save') {
			// Save logged ingredients as a new recipe (only if one doesn't already exist)
			const existing = db
				.select()
				.from(recipes)
				.where(and(eq(recipes.userId, userId), eq(recipes.name, meal.name)))
				.get();
			if (!existing && itemNames.length > 0) {
				const logged = await db
					.select()
					.from(mealIngredients)
					.where(eq(mealIngredients.mealEntryId, mealId));
				const [recipe] = await db.insert(recipes).values({ userId, name: meal.name }).returning();
				for (const ing of logged) {
					await db.insert(recipeItems).values({
						recipeId: recipe.id,
						pantryItemId: ing.pantryItemId,
						itemName: ing.itemName,
						defaultQuantity: ing.quantityUsed
					});
				}
			}
		} else if (recipeAction === 'update' && recipeId) {
			// Replace recipe items with what was just logged
			const recipe = db
				.select()
				.from(recipes)
				.where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId)))
				.get();
			if (recipe) {
				const logged = await db
					.select()
					.from(mealIngredients)
					.where(eq(mealIngredients.mealEntryId, mealId));
				await db.delete(recipeItems).where(eq(recipeItems.recipeId, recipeId));
				if (logged.length > 0) {
					await db.insert(recipeItems).values(
						logged.map((ing) => ({
							recipeId,
							pantryItemId: ing.pantryItemId,
							itemName: ing.itemName,
							defaultQuantity: 1
						}))
					);
				}
			}
		}

		redirect(302, '/');
	}
};
