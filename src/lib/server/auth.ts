import bcrypt from 'bcryptjs';
import { db } from '$lib/server/db';
import { sessions, users } from '$lib/server/db/schema';
import { eq, lt } from 'drizzle-orm';

const SESSION_COOKIE = 'kitchie_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ---------------------------------------------------------------------------
// Password
// ---------------------------------------------------------------------------

export function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
	return bcrypt.compare(password, hash);
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export async function createSession(userId: string) {
	const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
	const [session] = await db
		.insert(sessions)
		.values({ userId, expiresAt })
		.returning();
	return session;
}

export async function validateSession(sessionId: string) {
	const result = await db
		.select({ session: sessions, user: users })
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(eq(sessions.id, sessionId))
		.get();

	if (!result) return null;

	const { session, user } = result;

	if (session.expiresAt < new Date()) {
		await db.delete(sessions).where(eq(sessions.id, sessionId));
		return null;
	}

	// Extend session if more than halfway through its TTL
	const halfTTL = SESSION_TTL_MS / 2;
	if (session.expiresAt.getTime() - Date.now() < halfTTL) {
		const newExpiry = new Date(Date.now() + SESSION_TTL_MS);
		await db.update(sessions).set({ expiresAt: newExpiry }).where(eq(sessions.id, sessionId));
	}

	return { session, user };
}

export async function deleteSession(sessionId: string) {
	await db.delete(sessions).where(eq(sessions.id, sessionId));
}

// Periodically clean up expired sessions (called opportunistically)
export async function purgeExpiredSessions() {
	await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

export { SESSION_COOKIE };

export function sessionCookieOptions(expiresAt: Date) {
	return {
		httpOnly: true,
		sameSite: 'lax' as const,
		secure: process.env.NODE_ENV === 'production',
		path: '/',
		expires: expiresAt
	};
}
