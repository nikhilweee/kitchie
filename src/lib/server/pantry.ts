import { db } from '$lib/server/db';
import { pantryItems } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';

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
