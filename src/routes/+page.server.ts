import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { mealEntries, mealIngredients, pantryItems, recipes, recipeItems } from '$lib/server/db/schema';
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

	// Step 2: ?update=<mealId>[&recipe=<recipeId>]
	const updateMealId = url.searchParams.get('update');
	const recipeId = url.searchParams.get('recipe');
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

			if (recipeId) {
				// Pre-select recipe items; also surface all pantry items for search
				const rItems = await db
					.select()
					.from(recipeItems)
					.where(eq(recipeItems.recipeId, recipeId));
				const recipeItemIds = new Set(rItems.map((i) => i.pantryItemId).filter(Boolean));
				pantrySuggestions = allItems.map((item) => ({
					item,
					suggested: recipeItemIds.has(item.id)
				}));
			} else {
				// Keyword-match fallback
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

	// Step 3: ?save_recipe=<mealId> — offer to save logged ingredients as recipe
	const saveMealId = url.searchParams.get('save_recipe');
	let saveRecipeMeal: { id: string; name: string; ingredients: string[] } | null = null;
	if (saveMealId) {
		const meal = entries.find((e) => e.id === saveMealId) ?? null;
		if (meal) {
			const logged = ingredients.filter((i) => i.mealEntryId === saveMealId);
			// Only offer if no recipe already exists with this name
			const existing = await db
				.select()
				.from(recipes)
				.where(and(eq(recipes.userId, userId), eq(recipes.name, meal.name)))
				.get();
			if (!existing && logged.length > 0) {
				saveRecipeMeal = {
					id: meal.id,
					name: meal.name,
					ingredients: logged.map((i) => i.itemName)
				};
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
		saveRecipeMeal,
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
		const recipeId = String(data.get('recipeId') ?? '');

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

		const params = new URLSearchParams({ update: meal.id });
		if (recipeId) params.set('recipe', recipeId);
		redirect(302, `/?${params}`);
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

	// Step 2: save pantry depletions, then offer to save as recipe
	updatePantry: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const mealId = String(data.get('mealId') ?? '');
		const selectedIds = data.getAll('itemId').map(String);
		const itemNames = data.getAll('itemName').map(String);
		const quantitiesUsed = data.getAll('quantityUsed').map(Number);

		if (!mealId) return fail(400, { error: 'Invalid request.' });

		const meal = await db
			.select()
			.from(mealEntries)
			.where(and(eq(mealEntries.id, mealId), eq(mealEntries.userId, userId)))
			.get();

		if (!meal) return fail(404, { error: 'Meal not found.' });

		for (let i = 0; i < itemNames.length; i++) {
			const pantryItemId = selectedIds[i] || null;
			const itemName = itemNames[i];
			const used = quantitiesUsed[i] ?? 1;

			if (!itemName) continue;

			await db.insert(mealIngredients).values({
				mealEntryId: mealId,
				pantryItemId,
				itemName,
				quantityUsed: used
			});

			// Only deplete pantry for linked items
			if (pantryItemId) {
				const item = await db
					.select()
					.from(pantryItems)
					.where(and(eq(pantryItems.id, pantryItemId), eq(pantryItems.userId, userId)))
					.get();
				if (item) {
					await db
						.update(pantryItems)
						.set({ quantity: Math.max(0, item.quantity - used) })
						.where(eq(pantryItems.id, pantryItemId));
				}
			}
		}

		// If items were selected, offer to save as recipe (handled in load via ?save_recipe=)
		if (selectedIds.length > 0) {
			redirect(302, `/?save_recipe=${mealId}`);
		}
		redirect(302, '/');
	},

	// Step 3: save selected meal ingredients as a new recipe
	saveRecipe: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const mealId = String(data.get('mealId') ?? '');

		if (!mealId) return fail(400, {});

		const meal = await db
			.select()
			.from(mealEntries)
			.where(and(eq(mealEntries.id, mealId), eq(mealEntries.userId, userId)))
			.get();
		if (!meal) return fail(404, {});

		const logged = await db
			.select()
			.from(mealIngredients)
			.where(eq(mealIngredients.mealEntryId, mealId));

		if (logged.length === 0) redirect(302, '/');

		const [recipe] = await db.insert(recipes).values({ userId, name: meal.name }).returning();
		for (const ing of logged) {
			await db.insert(recipeItems).values({
				recipeId: recipe.id,
				pantryItemId: ing.pantryItemId,
				itemName: ing.itemName,
				defaultQuantity: ing.quantityUsed
			});
		}

		redirect(302, '/');
	}
};
