import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { recipes, pantryItems } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getOrSeedCuisines } from '$lib/server/cuisines';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;

	const [cuisines, pantryAll, allRecipes] = await Promise.all([
		getOrSeedCuisines(userId),
		db.select().from(pantryItems).where(eq(pantryItems.userId, userId)).orderBy(pantryItems.name),
		db.select({ id: recipes.id, name: recipes.name })
			.from(recipes)
			.where(eq(recipes.userId, userId))
			.orderBy(desc(recipes.createdAt))
	]);

	return { cuisines, pantryItems: pantryAll, recipes: allRecipes };
};
