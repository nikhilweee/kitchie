import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { pantryItems, userCategories } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { calcExpiry } from '$lib/expiry';
import { getString, getNumber } from '$lib/server/form-data';
import { inferItemDefaults } from '$lib/server/infer-item';
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

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = locals.user!.id;

	const [items, categories] = await Promise.all([
		db.select().from(pantryItems).where(eq(pantryItems.userId, userId)).orderBy(pantryItems.expiryDate),
		getOrSeedCategories(userId)
	]);

	return {
		items: items.map((i) => ({
			...i,
			purchaseDate: i.purchaseDate.toISOString(),
			expiryDate: i.expiryDate.toISOString(),
			createdAt: i.createdAt.toISOString()
		})),
		categories,
		editId: url.searchParams.get('edit')
	};
};

async function resolveCategory(userId: string, submittedId: string, inferredName: string) {
	const cats = await db
		.select()
		.from(userCategories)
		.where(eq(userCategories.userId, userId))
		.orderBy(userCategories.sortOrder);

	if (submittedId) {
		const found = cats.find((c) => c.id === submittedId);
		if (found) return found;
	}

	// Fall back to inference
	const byName = cats.find((c) => c.name === inferredName);
	return byName ?? cats.find((c) => c.name === 'Other') ?? cats[0];
}

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();

		const name = getString(data, 'name');
		if (!name) return fail(400, { addError: 'Name is required.' });

		const purchaseDateStr = getString(data, 'purchaseDate');
		const purchaseDate = purchaseDateStr ? new Date(purchaseDateStr) : new Date();

		const submittedCategoryId = getString(data, 'category');
		const submittedQType = getString(data, 'quantityType') as 'count' | 'estimate';
		const inferred = inferItemDefaults(name);
		const cat = await resolveCategory(userId, submittedCategoryId, inferred.category);
		const quantityType = submittedQType || inferred.quantityType;
		const quantity = getNumber(data, 'quantity', 1);
		const unit = quantityType === 'count' ? (getString(data, 'unit') || 'count') : null;

		const expiryDateStr = getString(data, 'expiryDate');
		const expiryDate = expiryDateStr ? new Date(expiryDateStr) : calcExpiry(cat.ttlDays, purchaseDate);
		const expiryOverridden = !!expiryDateStr;

		await db.insert(pantryItems).values({
			userId, name, category: cat.id, quantityType, quantity, unit, purchaseDate, expiryDate, expiryOverridden
		});

		return { success: true };
	},

	update: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();

		const id = getString(data, 'id');
		const name = getString(data, 'name');
		if (!id || !name) return fail(400, { addError: 'Invalid request.' });

		const submittedCategoryId = getString(data, 'category');
		const submittedQType = getString(data, 'quantityType') as 'count' | 'estimate';
		const inferred = inferItemDefaults(name);
		const cat = await resolveCategory(userId, submittedCategoryId, inferred.category);
		const quantityType = submittedQType || inferred.quantityType;
		const quantity = getNumber(data, 'quantity', 1);
		const unit = quantityType === 'count' ? (getString(data, 'unit') || 'count') : null;

		const status = quantity === 0 ? 'consumed' : 'active';
		const finishedAt = quantity === 0 ? new Date() : null;

		// When restoring a consumed/discarded item, check current status and reset dates
		const [current] = await db.select({ status: pantryItems.status }).from(pantryItems)
			.where(and(eq(pantryItems.id, id), eq(pantryItems.userId, userId)));
		const isRestoring = current && current.status !== 'active' && status === 'active';

		const purchaseDateStr = getString(data, 'purchaseDate');
		const purchaseDate = isRestoring ? new Date() : (purchaseDateStr ? new Date(purchaseDateStr) : new Date());
		const expiryDateStr = getString(data, 'expiryDate');
		const expiryDate = isRestoring ? calcExpiry(cat.ttlDays, purchaseDate) : (expiryDateStr ? new Date(expiryDateStr) : calcExpiry(cat.ttlDays, purchaseDate));
		const expiryOverridden = isRestoring ? false : !!expiryDateStr;

		await db
			.update(pantryItems)
			.set({ name, category: cat.id, quantityType, quantity, unit, purchaseDate, expiryDate, expiryOverridden, status, finishedAt })
			.where(and(eq(pantryItems.id, id), eq(pantryItems.userId, userId)));

		return { success: true };
	},

	discard: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const id = getString(data, 'id');

		if (!id) return fail(400, {});

		await db
			.update(pantryItems)
			.set({ status: 'discarded', finishedAt: new Date() })
			.where(and(eq(pantryItems.id, id), eq(pantryItems.userId, userId)));

		return { success: true };
	},

	delete: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const id = getString(data, 'id');

		if (!id) return fail(400, {});

		await db
			.delete(pantryItems)
			.where(and(eq(pantryItems.id, id), eq(pantryItems.userId, userId)));

		return { success: true };
	}
};
