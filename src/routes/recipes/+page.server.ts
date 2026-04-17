import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { recipes, recipeItems, pantryItems } from '$lib/server/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;

	const allRecipes = await db
		.select()
		.from(recipes)
		.where(eq(recipes.userId, userId))
		.orderBy(desc(recipes.createdAt));

	const recipeIds = allRecipes.map((r) => r.id);
	const allItems =
		recipeIds.length > 0
			? await db.select().from(recipeItems).where(inArray(recipeItems.recipeId, recipeIds))
			: [];

	const pantryAll = await db
		.select()
		.from(pantryItems)
		.where(eq(pantryItems.userId, userId))
		.orderBy(pantryItems.name);

	return {
		recipes: allRecipes.map((r) => ({
			...r,
			createdAt: r.createdAt.toISOString(),
			items: allItems.filter((i) => i.recipeId === r.id)
		})),
		pantryItems: pantryAll
	};
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		const name = String(data.get('name') ?? '').trim();
		const pantryIds = data.getAll('pantryItemId').map(String);
		const itemNames = data.getAll('itemName').map(String);
		const quantities = data.getAll('quantity').map(Number);

		if (!name) return fail(400, { error: 'Recipe name is required.' });

		let recipeId: string;

		if (id) {
			// Update: verify ownership
			const existing = await db
				.select()
				.from(recipes)
				.where(and(eq(recipes.id, id), eq(recipes.userId, userId)))
				.get();
			if (!existing) return fail(404, {});
			await db.update(recipes).set({ name }).where(eq(recipes.id, id));
			await db.delete(recipeItems).where(eq(recipeItems.recipeId, id));
			recipeId = id;
		} else {
			const [recipe] = await db.insert(recipes).values({ userId, name }).returning();
			recipeId = recipe.id;
		}

		for (let i = 0; i < itemNames.length; i++) {
			if (!itemNames[i]) continue;
			await db.insert(recipeItems).values({
				recipeId,
				pantryItemId: pantryIds[i] || null,
				itemName: itemNames[i],
				defaultQuantity: quantities[i] ?? 1
			});
		}

		return { success: true };
	},

	delete: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		if (!id) return fail(400, {});
		await db.delete(recipes).where(and(eq(recipes.id, id), eq(recipes.userId, userId)));
		return { success: true };
	}
};
