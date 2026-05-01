import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { pantryItems } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { getOrSeedCategories } from '$lib/server/categories';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;

	const [categories, items] = await Promise.all([
		getOrSeedCategories(userId),
		db.select({ id: pantryItems.id, name: pantryItems.name, category: pantryItems.category })
			.from(pantryItems)
			.where(eq(pantryItems.userId, userId))
	]);

	return { categories, items };
};
