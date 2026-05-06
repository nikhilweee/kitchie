import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { deleteSession, SESSION_COOKIE } from '$lib/server/auth';
import { getString } from '$lib/server/form-data';

export const load: PageServerLoad = async ({ locals }) => {
	return { user: locals.user! };
};

export const actions: Actions = {
	updateProfile: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const name = getString(data, 'name');
		const username = getString(data, 'username');

		if (!username) return fail(400, { error: 'Username is required.' });

		const existing = await db.select().from(users).where(eq(users.id, userId)).get();
		if (!existing) return fail(404, {});

		// Check username uniqueness (only if changing)
		if (username !== existing.username) {
			const taken = await db.select().from(users).where(eq(users.username, username)).get();
			if (taken) return fail(400, { error: 'Username already taken.' });
		}

		await db.update(users).set({ name: name || null, username }).where(eq(users.id, userId));
		return { success: true };
	},

	logout: async ({ cookies }) => {
		const sessionId = cookies.get(SESSION_COOKIE);
		if (sessionId) {
			await deleteSession(sessionId);
			cookies.delete(SESSION_COOKIE, { path: '/' });
		}
		redirect(302, '/login');
	}
};
