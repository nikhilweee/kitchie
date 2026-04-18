import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword, deleteSession, SESSION_COOKIE } from '$lib/server/auth';
import { getString } from '$lib/server/form-data';

export const load: PageServerLoad = async ({ locals }) => {
	return { user: locals.user! };
};

export const actions: Actions = {
	updateProfile: async ({ request, locals, cookies }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const name = getString(data, 'name');
		const username = getString(data, 'username');
		const currentPassword = getString(data, 'currentPassword');
		const newPassword = getString(data, 'newPassword');
		const confirmPassword = getString(data, 'confirmPassword');

		if (!username) return fail(400, { error: 'Username is required.' });

		const existing = await db.select().from(users).where(eq(users.id, userId)).get();
		if (!existing) return fail(404, {});

		// If changing password, verify current one
		if (newPassword) {
			if (newPassword !== confirmPassword) return fail(400, { error: 'New passwords do not match.' });
			if (!currentPassword) return fail(400, { error: 'Enter your current password to set a new one.' });
			const ok = await verifyPassword(currentPassword, existing.passwordHash);
			if (!ok) return fail(400, { error: 'Current password is incorrect.' });
			if (newPassword.length < 8) return fail(400, { error: 'New password must be at least 8 characters.' });
		}

		// Check username uniqueness (only if changing)
		if (username !== existing.username) {
			const taken = await db.select().from(users).where(eq(users.username, username)).get();
			if (taken) return fail(400, { error: 'Username already taken.' });
		}

		const updates: Partial<typeof users.$inferInsert> = { name: name || null, username };
		if (newPassword) updates.passwordHash = await hashPassword(newPassword);

		await db.update(users).set(updates).where(eq(users.id, userId));
		return { success: true };
	},

	logout: async ({ locals, cookies }) => {
		const sessionId = cookies.get(SESSION_COOKIE);
		if (sessionId) {
			await deleteSession(sessionId);
			cookies.delete(SESSION_COOKIE, { path: '/' });
		}
		redirect(302, '/login');
	}
};
