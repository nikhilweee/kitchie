import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import {
	verifyPassword,
	createSession,
	SESSION_COOKIE,
	sessionCookieOptions
} from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(302, '/');
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const username = String(data.get('username') ?? '').trim().toLowerCase();
		const password = String(data.get('password') ?? '');

		if (!username || !password) {
			return fail(400, { error: 'Username and password are required.' });
		}

		const user = await db
			.select()
			.from(users)
			.where(eq(users.username, username))
			.get();

		// Constant-time-ish: always run verify even if user not found
		const validPassword = user
			? await verifyPassword(password, user.passwordHash)
			: (await verifyPassword(password, '$2b$12$placeholder.hash.to.prevent.timing'), false);

		if (!user || !validPassword) {
			return fail(401, { error: 'Invalid username or password.' });
		}

		const session = await createSession(user.id);
		cookies.set(SESSION_COOKIE, session.id, sessionCookieOptions(session.expiresAt));

		redirect(302, '/');
	}
};
