import type { Handle } from '@sveltejs/kit';
import {
	validateSession,
	SESSION_COOKIE,
	purgeExpiredSessions
} from '$lib/server/auth';

// Purge expired sessions roughly once every 100 requests
let requestCount = 0;

export const handle: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get(SESSION_COOKIE);

	if (sessionId) {
		const result = await validateSession(sessionId);
		if (result) {
			event.locals.user = result.user;
			event.locals.session = result.session;
		} else {
			// Session invalid/expired — clear the cookie
			event.cookies.delete(SESSION_COOKIE, { path: '/' });
			event.locals.user = null;
			event.locals.session = null;
		}
	} else {
		event.locals.user = null;
		event.locals.session = null;
	}

	// Opportunistic cleanup of expired sessions
	if (++requestCount % 100 === 0) {
		purgeExpiredSessions().catch(() => {});
	}

	return resolve(event);
};
