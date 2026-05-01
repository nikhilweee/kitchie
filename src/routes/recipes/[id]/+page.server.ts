import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { recipes, recipeItems, pantryItems } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { getOrSeedCuisines } from '$lib/server/cuisines';

export const load: PageServerLoad = async ({ locals, params }) => {
	const userId = locals.user!.id;
	const { id } = params;

	const [[recipe], items, cuisines, pantryAll] = await Promise.all([
		db.select().from(recipes).where(and(eq(recipes.id, id), eq(recipes.userId, userId))),
		db.select().from(recipeItems).where(eq(recipeItems.recipeId, id)),
		getOrSeedCuisines(userId),
		db.select().from(pantryItems).where(eq(pantryItems.userId, userId)).orderBy(pantryItems.name)
	]);

	if (!recipe) error(404, 'Recipe not found');

	return {
		recipe: { ...recipe, createdAt: recipe.createdAt.toISOString(), items },
		cuisines,
		pantryItems: pantryAll
	};
};
