import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { pantryItems } from '$lib/server/db/schema';
import type { PantryCategory } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { calcExpiry } from '$lib/expiry';
import { getString, getNumber } from '$lib/server/form-data';
import { inferItemDefaults } from '$lib/server/infer-item';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;

	const items = await db
		.select()
		.from(pantryItems)
		.where(eq(pantryItems.userId, userId))
		.orderBy(pantryItems.expiryDate);

	return {
		items: items.map((i) => ({
			...i,
			purchaseDate: i.purchaseDate.toISOString(),
			expiryDate: i.expiryDate.toISOString(),
			createdAt: i.createdAt.toISOString()
		}))
	};
};

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();

		const name = getString(data, 'name');
		if (!name) return fail(400, { addError: 'Name is required.' });

		const purchaseDateStr = getString(data, 'purchaseDate');
		const purchaseDate = purchaseDateStr ? new Date(purchaseDateStr) : new Date();

		const submittedCategory = getString(data, 'category') as PantryCategory;
		const submittedQType = getString(data, 'quantityType') as 'count' | 'estimate';
		const inferred = inferItemDefaults(name);
		const category = submittedCategory || inferred.category;
		const quantityType = submittedQType || inferred.quantityType;
		const quantity = getNumber(data, 'quantity', 1);
		const unit = quantityType === 'count' ? (getString(data, 'unit') || 'count') : null;

		const expiryDateStr = getString(data, 'expiryDate');
		const expiryDate = expiryDateStr ? new Date(expiryDateStr) : calcExpiry(category, purchaseDate);
		const expiryOverridden = !!expiryDateStr;

		await db.insert(pantryItems).values({
			userId, name, category, quantityType, quantity, unit, purchaseDate, expiryDate, expiryOverridden
		});

		return { success: true };
	},

	update: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();

		const id = getString(data, 'id');
		const name = getString(data, 'name');
		if (!id || !name) return fail(400, { addError: 'Invalid request.' });

		const purchaseDateStr = getString(data, 'purchaseDate');
		const purchaseDate = purchaseDateStr ? new Date(purchaseDateStr) : new Date();
		const submittedCategory = getString(data, 'category') as PantryCategory;
		const submittedQType = getString(data, 'quantityType') as 'count' | 'estimate';
		const inferred = inferItemDefaults(name);
		const category = submittedCategory || inferred.category;
		const quantityType = submittedQType || inferred.quantityType;
		const quantity = getNumber(data, 'quantity', 1);
		const unit = quantityType === 'count' ? (getString(data, 'unit') || 'count') : null;

		const expiryDateStr = getString(data, 'expiryDate');
		const expiryDate = expiryDateStr ? new Date(expiryDateStr) : calcExpiry(category, purchaseDate);
		const expiryOverridden = !!expiryDateStr;

		await db
			.update(pantryItems)
			.set({ name, category, quantityType, quantity, unit, purchaseDate, expiryDate, expiryOverridden })
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
