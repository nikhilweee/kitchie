import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword } from '$lib/server/auth';
import { getString } from '$lib/server/form-data';

export const actions: Actions = {
	changePassword: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const currentPassword = getString(data, 'currentPassword');
		const newPassword = getString(data, 'newPassword');
		const confirmPassword = getString(data, 'confirmPassword');

		if (!currentPassword) return fail(400, { error: 'Enter your current password.' });
		if (!newPassword) return fail(400, { error: 'Enter a new password.' });
		if (newPassword.length < 8) return fail(400, { error: 'New password must be at least 8 characters.' });
		if (newPassword !== confirmPassword) return fail(400, { error: 'New passwords do not match.' });

		const existing = await db.select().from(users).where(eq(users.id, userId)).get();
		if (!existing) return fail(404, {});
		const ok = await verifyPassword(currentPassword, existing.passwordHash);
		if (!ok) return fail(400, { error: 'Current password is incorrect.' });

		await db.update(users).set({ passwordHash: await hashPassword(newPassword) }).where(eq(users.id, userId));
		return { success: true };
	}
};
