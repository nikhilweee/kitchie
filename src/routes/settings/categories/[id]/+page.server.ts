import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { userCategories, pantryItems } from '$lib/server/db/schema';
import { eq, and, count } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params, locals }) => {
	const userId = locals.user!.id;
	const { id } = params;

	const category = await db
		.select()
		.from(userCategories)
		.where(and(eq(userCategories.id, id), eq(userCategories.userId, userId)))
		.get();

	if (!category) error(404, 'Category not found');

	const usage = await db
		.select({ count: count() })
		.from(pantryItems)
		.where(and(eq(pantryItems.userId, userId), eq(pantryItems.category, id)))
		.get();

	return {
		category: {
			id: category.id,
			name: category.name,
			ttlDays: category.ttlDays,
			usageCount: usage?.count ?? 0
		}
	};
};
