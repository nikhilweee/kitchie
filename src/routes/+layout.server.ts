import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const isLoginPage = url.pathname === '/login';

	if (!locals.user && !isLoginPage) {
		redirect(302, '/login');
	}

	return {
		user: locals.user
			? { id: locals.user.id, username: locals.user.username }
			: null
	};
};
