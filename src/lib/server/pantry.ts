import { db } from '$lib/server/db';
import { pantryItems } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { inferItemDefaults } from '$lib/server/infer-item';
import { getOrSeedCategories, resolveCatByName } from '$lib/server/categories';
import { calcExpiry } from '$lib/expiry';

type Category = Awaited<ReturnType<typeof getOrSeedCategories>>[number];

/** Update an existing pantry item's quantity, automatically setting consumed state. */
export async function updatePantryQuantity(
	pantryItemId: string,
	newQty: number,
	userId: string,
	extra: Partial<typeof pantryItems.$inferInsert> = {}
) {
	const finalQty = Math.max(0, newQty);
	await db
		.update(pantryItems)
		.set({
			quantity: finalQty,
			status: finalQty === 0 ? 'consumed' : 'active',
			finishedAt: finalQty === 0 ? new Date() : null,
			...extra
		})
		.where(and(eq(pantryItems.id, pantryItemId), eq(pantryItems.userId, userId)));
}

/** Compute quantity/status/finishedAt fields for an insert, handling consumed state. */
export function pantryStatusFields(qty: number) {
	const finalQty = Math.max(0, qty);
	return {
		quantity: finalQty,
		status: (finalQty === 0 ? 'consumed' : 'active') as 'consumed' | 'active',
		finishedAt: finalQty === 0 ? new Date() : null
	};
}

/**
 * Create a new pantry item from a name, inferring category/quantityType/unit from the name.
 * Pass pre-fetched `allCats` to avoid a redundant DB query.
 */
export async function createPantryItemFromName(
	userId: string,
	name: string,
	qty: number,
	allCats: Category[]
) {
	const { category: categoryName, quantityType, unit: inferredUnit } = inferItemDefaults(name);
	const cat = resolveCatByName(allCats, categoryName);
	const purchaseDate = new Date();
	const expiryDate = calcExpiry(cat.ttlDays, purchaseDate);
	const unit = quantityType === 'count' ? (inferredUnit ?? 'count') : null;

	const [created] = await db
		.insert(pantryItems)
		.values({
			userId,
			name,
			category: cat.id,
			quantityType,
			unit,
			purchaseDate,
			expiryDate,
			expiryOverridden: false,
			...pantryStatusFields(qty)
		})
		.returning();

	return created;
}
