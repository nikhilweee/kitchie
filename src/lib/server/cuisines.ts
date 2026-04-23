import { db } from '$lib/server/db';
import { recipes, userCuisines } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { DEFAULT_CUISINES, SLUG_TO_CUISINE_NAME } from '$lib/defaults';

export async function getOrSeedCuisines(userId: string) {
	let cuisines = await db
		.select()
		.from(userCuisines)
		.where(eq(userCuisines.userId, userId))
		.orderBy(userCuisines.sortOrder);

	if (cuisines.length === 0) {
		cuisines = await db
			.insert(userCuisines)
			.values(DEFAULT_CUISINES.map((name, i) => ({ name, sortOrder: i + 1, userId })))
			.returning();
		cuisines.sort((a, b) => a.sortOrder - b.sortOrder);

		// Migrate existing recipes from old slug values to new cuisine IDs
		for (const [slug, name] of Object.entries(SLUG_TO_CUISINE_NAME)) {
			const cuisine = cuisines.find((c) => c.name === name);
			if (cuisine) {
				await db
					.update(recipes)
					.set({ cuisine: cuisine.id })
					.where(and(eq(recipes.userId, userId), eq(recipes.cuisine, slug)));
			}
		}
	}

	return cuisines;
}
