import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { pantryItems } from '$lib/server/db/schema';
import type { PantryCategory } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { calcExpiry } from '$lib/expiry';
import { guessQuantityType } from '$lib/quantity';
import { guessCategory } from '$lib/infer';

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

		const name = String(data.get('name') ?? '').trim();
		if (!name) return fail(400, { addError: 'Name is required.' });

		const purchaseDateStr = String(data.get('purchaseDate') ?? '');
		const purchaseDate = purchaseDateStr ? new Date(purchaseDateStr) : new Date();

		// Use submitted values; fall back to inference if absent
		const category = (String(data.get('category') || '') as PantryCategory) || guessCategory(name);
		const quantityType = (String(data.get('quantityType') || '') as 'count' | 'estimate') || guessQuantityType(name);
		const quantity = parseFloat(String(data.get('quantity') ?? '')) || 1;
		const unit = quantityType === 'count' ? (String(data.get('unit') ?? '') || 'count') : null;
		const expiryDateStr = String(data.get('expiryDate') ?? '');
		const expiryDate = expiryDateStr ? new Date(expiryDateStr) : calcExpiry(category, purchaseDate);
		const expiryOverridden = !!expiryDateStr;

		await db.insert(pantryItems).values({
			userId,
			name,
			category,
			quantityType,
			quantity,
			unit,
			purchaseDate,
			expiryDate,
			expiryOverridden
		});

		return { success: true };
	},

	update: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();

		const id = String(data.get('id') ?? '');
		const name = String(data.get('name') ?? '').trim();
		if (!id || !name) return fail(400, { addError: 'Invalid request.' });

		const purchaseDateStr = String(data.get('purchaseDate') ?? '');
		const purchaseDate = purchaseDateStr ? new Date(purchaseDateStr) : new Date();
		const category = (String(data.get('category') || '') as PantryCategory) || guessCategory(name);
		const quantityType = (String(data.get('quantityType') || '') as 'count' | 'estimate') || guessQuantityType(name);
		const quantity = parseFloat(String(data.get('quantity') ?? '')) || 1;
		const unit = quantityType === 'count' ? (String(data.get('unit') ?? '') || 'count') : null;
		const expiryDateStr = String(data.get('expiryDate') ?? '');
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
		const id = String(data.get('id') ?? '');

		if (!id) return fail(400, {});

		await db
			.delete(pantryItems)
			.where(and(eq(pantryItems.id, id), eq(pantryItems.userId, userId)));

		return { success: true };
	}
};
