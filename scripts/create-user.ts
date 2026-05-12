/**
 * Creates the initial admin user.
 * Usage: pnpm exec tsx scripts/create-user.ts <username> <password>
 */
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const [, , username, password] = process.argv;

if (!username || !password) {
	console.error('Usage: pnpm exec tsx scripts/create-user.ts <username> <password>');
	process.exit(1);
}

const dbPath = process.env.DATABASE_URL ?? 'local.db';
const db = new Database(dbPath);

const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.toLowerCase());
if (existing) {
	console.error(`User "${username}" already exists.`);
	process.exit(1);
}

const passwordHash = await bcrypt.hash(password, 12);
const id = randomUUID();
const now = Math.floor(Date.now() / 1000);

db.prepare('INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)').run(
	id,
	username.toLowerCase(),
	passwordHash,
	now
);

console.log(`User "${username}" created successfully.`);
db.close();
