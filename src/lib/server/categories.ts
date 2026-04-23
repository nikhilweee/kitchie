import { db } from '$lib/server/db';
import { pantryItems, userCategories } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { DEFAULT_CATEGORIES, SLUG_TO_CATEGORY_NAME } from '$lib/defaults';

export async function getOrSeedCategories(userId: string) {
	let cats = await db
		.select()
		.from(userCategories)
		.where(eq(userCategories.userId, userId))
		.orderBy(userCategories.sortOrder);

	if (cats.length === 0) {
		cats = await db
			.insert(userCategories)
			.values(DEFAULT_CATEGORIES.map((c) => ({ ...c, userId })))
			.returning();
		cats.sort((a, b) => a.sortOrder - b.sortOrder);

		// Migrate existing pantry items from old slug values to new category IDs
		for (const [slug, name] of Object.entries(SLUG_TO_CATEGORY_NAME)) {
			const cat = cats.find((c) => c.name === name);
			if (cat) {
				await db
					.update(pantryItems)
					.set({ category: cat.id })
					.where(and(eq(pantryItems.userId, userId), eq(pantryItems.category, slug)));
			}
		}
	}

	return cats;
}

/** Find a category by name, falling back to 'Other' then the first category. */
export function resolveCatByName(
	cats: Awaited<ReturnType<typeof getOrSeedCategories>>,
	name: string
) {
	return cats.find((c) => c.name === name) ?? cats.find((c) => c.name === 'Other') ?? cats[0];
}
