import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { shoppingLists } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals, params }) => {
	const userId = locals.user!.id;
	const [list] = await db
		.select()
		.from(shoppingLists)
		.where(and(eq(shoppingLists.id, params.id), eq(shoppingLists.userId, userId)));
	if (!list) error(404, 'Cart not found');
	return { list: { ...list, createdAt: list.createdAt.toISOString() } };
};
