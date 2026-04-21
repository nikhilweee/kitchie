import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { userCategories, pantryItems } from '$lib/server/db/schema';
import { eq, and, count } from 'drizzle-orm';
import { getString } from '$lib/server/form-data';
import { DEFAULT_CATEGORIES, SLUG_TO_CATEGORY_NAME } from '$lib/defaults';

async function getOrSeedCategories(userId: string) {
	let cats = await db
		.select()
		.from(userCategories)
		.where(eq(userCategories.userId, userId))
		.orderBy(userCategories.sortOrder);

	if (cats.length === 0) {
		cats = await db
			.insert(userCategories)
			.values(DEFAULT_CATEGORIES.map((c, i) => ({ ...c, sortOrder: i + 1, userId })))
			.returning();
		cats.sort((a, b) => a.sortOrder - b.sortOrder);

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

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;
	const cats = await getOrSeedCategories(userId);

	// Count pantry items per category
	const usageCounts = await db
		.select({ categoryId: pantryItems.category, count: count() })
		.from(pantryItems)
		.where(eq(pantryItems.userId, userId))
		.groupBy(pantryItems.category);

	const usageMap = Object.fromEntries(usageCounts.map((r) => [r.categoryId, r.count]));

	return {
		categories: cats.map((c) => ({ ...c, usageCount: usageMap[c.id] ?? 0 }))
	};
};

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const name = getString(data, 'name').trim();
		const ttlDays = parseInt(getString(data, 'ttlDays'), 10);
		if (!name) return fail(400, { error: 'Name is required.' });
		if (!ttlDays || ttlDays < 1) return fail(400, { error: 'Shelf life must be at least 1 day.' });

		const existing = await db
			.select()
			.from(userCategories)
			.where(eq(userCategories.userId, userId))
			.orderBy(userCategories.sortOrder);

		const nextOrder = existing.length > 0 ? Math.max(...existing.map((c) => c.sortOrder)) + 1 : 1;
		await db.insert(userCategories).values({ userId, name, ttlDays, sortOrder: nextOrder });
		return { success: true };
	},

	update: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const id = getString(data, 'id');
		const name = getString(data, 'name').trim();
		const ttlDays = parseInt(getString(data, 'ttlDays'), 10);
		if (!id || !name) return fail(400, { error: 'Invalid input.' });
		if (!ttlDays || ttlDays < 1) return fail(400, { error: 'Shelf life must be at least 1 day.' });

		const existing = await db
			.select()
			.from(userCategories)
			.where(and(eq(userCategories.id, id), eq(userCategories.userId, userId)))
			.get();
		if (!existing) return fail(404, {});

		await db.update(userCategories).set({ name, ttlDays }).where(eq(userCategories.id, id));
		return { success: true };
	},

	delete: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const id = getString(data, 'id');
		if (!id) return fail(400, {});

		// Block delete if category is in use
		const inUse = await db
			.select({ count: count() })
			.from(pantryItems)
			.where(and(eq(pantryItems.userId, userId), eq(pantryItems.category, id)))
			.get();
		if (inUse && inUse.count > 0) {
			return fail(409, { error: `Cannot delete: ${inUse.count} pantry item(s) use this category.` });
		}

		await db
			.delete(userCategories)
			.where(and(eq(userCategories.id, id), eq(userCategories.userId, userId)));
		return { success: true };
	}
};
