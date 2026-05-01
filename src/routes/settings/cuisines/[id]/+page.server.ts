import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { userCuisines, recipes } from '$lib/server/db/schema';
import { eq, and, count } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params, locals }) => {
	const userId = locals.user!.id;
	const { id } = params;

	const cuisine = await db
		.select()
		.from(userCuisines)
		.where(and(eq(userCuisines.id, id), eq(userCuisines.userId, userId)))
		.get();

	if (!cuisine) error(404, 'Cuisine not found');

	const usage = await db
		.select({ count: count() })
		.from(recipes)
		.where(and(eq(recipes.userId, userId), eq(recipes.cuisine, id)))
		.get();

	return {
		cuisine: {
			id: cuisine.id,
			name: cuisine.name,
			usageCount: usage?.count ?? 0
		}
	};
};
