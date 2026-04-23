import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { shoppingLists, shoppingListItems } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getString } from '$lib/server/form-data';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;

	const lists = await db
		.select()
		.from(shoppingLists)
		.where(eq(shoppingLists.userId, userId))
		.orderBy(desc(shoppingLists.createdAt));

	const listIds = lists.map((l) => l.id);
	const allItems =
		listIds.length > 0
			? await db
					.select()
					.from(shoppingListItems)
					.where(eq(shoppingListItems.userId, userId))
			: [];

	return {
		lists: lists.map((l) => ({
			...l,
			createdAt: l.createdAt.toISOString(),
			itemCount: allItems.filter((i) => i.listId === l.id).length,
			shoppedCount: allItems.filter((i) => i.listId === l.id && i.shopped).length
		}))
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const name = getString(data, 'name');
		if (!name) return fail(400, { error: 'Name is required.' });

		const [list] = await db
			.insert(shoppingLists)
			.values({ userId, name })
			.returning({ id: shoppingLists.id });

		redirect(303, `/shopping/${list.id}`);
	},

	rename: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const id = getString(data, 'id');
		const name = getString(data, 'name');
		if (!id || !name) return fail(400, {});

		await db
			.update(shoppingLists)
			.set({ name })
			.where(and(eq(shoppingLists.id, id), eq(shoppingLists.userId, userId)));

		return { success: true };
	},

	delete: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const id = getString(data, 'id');
		if (!id) return fail(400, {});

		await db
			.delete(shoppingLists)
			.where(and(eq(shoppingLists.id, id), eq(shoppingLists.userId, userId)));

		return { success: true };
	}
};
