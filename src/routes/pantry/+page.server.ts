import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { pantryItems } from '$lib/server/db/schema';
import type { PantryCategory } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { calcExpiry } from '$lib/expiry';
import { guessQuantityType } from '$lib/quantity';

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

// Shared helper: parse and insert one pantry item
async function insertItem(
	userId: string,
	name: string,
	category: PantryCategory,
	quantityType: 'count' | 'estimate',
	quantity: number,
	purchaseDate: Date,
	expiryDateOverride?: Date
) {
	const expiryDate = expiryDateOverride ?? calcExpiry(category, purchaseDate);
	const expiryOverridden = !!expiryDateOverride;

	await db.insert(pantryItems).values({
		userId,
		name: name.trim(),
		category,
		quantityType,
		quantity,
		purchaseDate,
		expiryDate,
		expiryOverridden
	});
}

export const actions: Actions = {
	// Single item entry
	addSingle: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();

		const name = String(data.get('name') ?? '').trim();
		const category = String(data.get('category') ?? 'other') as PantryCategory;
		const quantityType = String(data.get('quantityType') ?? 'count') as 'count' | 'estimate';
		const quantity = parseFloat(String(data.get('quantity') ?? '1'));
		const purchaseDateStr = String(data.get('purchaseDate') ?? '');
		const expiryDateStr = String(data.get('expiryDate') ?? '');

		if (!name) return fail(400, { addError: 'Name is required.' });
		if (isNaN(quantity) || quantity <= 0) return fail(400, { addError: 'Invalid quantity.' });

		const purchaseDate = purchaseDateStr ? new Date(purchaseDateStr) : new Date();
		const expiryOverride = expiryDateStr ? new Date(expiryDateStr) : undefined;

		await insertItem(userId, name, category, quantityType, quantity, purchaseDate, expiryOverride);
		return { success: true };
	},

	// Bulk entry: multiple items sharing a purchase date + category
	addBulk: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();

		const category = String(data.get('category') ?? 'other') as PantryCategory;
		const purchaseDateStr = String(data.get('purchaseDate') ?? '');
		const purchaseDate = purchaseDateStr ? new Date(purchaseDateStr) : new Date();

		const names = data.getAll('name').map(String);
		const quantities = data.getAll('quantity').map((q) => parseFloat(String(q)));
		const quantityTypes = data.getAll('quantityType').map(String) as Array<'count' | 'estimate'>;

		const rows = names
			.map((name, i) => ({ name: name.trim(), quantity: quantities[i] ?? 1, quantityType: quantityTypes[i] ?? 'count' }))
			.filter((r) => r.name);

		if (rows.length === 0) return fail(400, { addError: 'Add at least one item.' });

		for (const row of rows) {
			if (!isNaN(row.quantity) && row.quantity > 0) {
				await insertItem(userId, row.name, category, row.quantityType, row.quantity, purchaseDate);
			}
		}

		return { success: true };
	},

	// Delete a single pantry item
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
