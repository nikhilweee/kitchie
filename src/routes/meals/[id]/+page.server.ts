import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { mealEntries } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const userId = locals.user!.id;
	const [entry] = await db.select().from(mealEntries)
		.where(and(eq(mealEntries.id, params.id), eq(mealEntries.userId, userId)));
	if (!entry) error(404, 'Meal not found');
	return { entry: { ...entry, loggedAt: entry.loggedAt.toISOString() } };
};
