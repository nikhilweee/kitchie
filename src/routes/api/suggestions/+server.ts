import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSuggestions } from '$lib/server/suggestions';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) return json([], { status: 401 });

	const query = url.searchParams.get('q') ?? '';
	const suggestions = await getSuggestions(locals.user.id, query);
	return json(suggestions);
};
