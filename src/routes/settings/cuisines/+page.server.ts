import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { userCuisines, recipes } from '$lib/server/db/schema';
import { eq, and, count } from 'drizzle-orm';
import { getString } from '$lib/server/form-data';
import { DEFAULT_CUISINES, SLUG_TO_CUISINE_NAME } from '$lib/defaults';

async function getOrSeedCuisines(userId: string) {
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

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;
	const cuisines = await getOrSeedCuisines(userId);

	const usageCounts = await db
		.select({ cuisineId: recipes.cuisine, count: count() })
		.from(recipes)
		.where(eq(recipes.userId, userId))
		.groupBy(recipes.cuisine);

	const usageMap = Object.fromEntries(
		usageCounts.filter((r) => r.cuisineId).map((r) => [r.cuisineId!, r.count])
	);

	return {
		cuisines: cuisines.map((c) => ({ ...c, usageCount: usageMap[c.id] ?? 0 }))
	};
};

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const name = getString(data, 'name').trim();
		if (!name) return fail(400, { error: 'Name is required.' });

		const existing = await db
			.select()
			.from(userCuisines)
			.where(eq(userCuisines.userId, userId))
			.orderBy(userCuisines.sortOrder);

		const nextOrder = existing.length > 0 ? Math.max(...existing.map((c) => c.sortOrder)) + 1 : 1;
		await db.insert(userCuisines).values({ userId, name, sortOrder: nextOrder });
		return { success: true };
	},

	update: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const id = getString(data, 'id');
		const name = getString(data, 'name').trim();
		if (!id || !name) return fail(400, { error: 'Invalid input.' });

		const existing = await db
			.select()
			.from(userCuisines)
			.where(and(eq(userCuisines.id, id), eq(userCuisines.userId, userId)))
			.get();
		if (!existing) return fail(404, {});

		await db.update(userCuisines).set({ name }).where(eq(userCuisines.id, id));
		return { success: true };
	},

	delete: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const id = getString(data, 'id');
		if (!id) return fail(400, {});

		const inUse = await db
			.select({ count: count() })
			.from(recipes)
			.where(and(eq(recipes.userId, userId), eq(recipes.cuisine, id)))
			.get();
		if (inUse && inUse.count > 0) {
			return fail(409, { error: `Cannot delete: ${inUse.count} recipe(s) use this cuisine.` });
		}

		await db
			.delete(userCuisines)
			.where(and(eq(userCuisines.id, id), eq(userCuisines.userId, userId)));
		return { success: true };
	}
};
