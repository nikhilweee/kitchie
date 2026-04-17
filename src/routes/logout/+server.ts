import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteSession, SESSION_COOKIE } from '$lib/server/auth';

export const POST: RequestHandler = async ({ cookies, locals }) => {
	if (locals.session) {
		await deleteSession(locals.session.id);
	}
	cookies.delete(SESSION_COOKIE, { path: '/' });
	redirect(302, '/login');
};
