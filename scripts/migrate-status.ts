/**
 * Migrate pantry item status values: consumed → finished, discarded → trashed.
 * Usage: npx tsx scripts/migrate-status.ts
 */
import Database from 'better-sqlite3';

const dbPath = process.env.DATABASE_URL ?? 'local.db';
const db = new Database(dbPath);

const r1 = db.prepare("UPDATE pantry_items SET status = 'finished' WHERE status = 'consumed'").run();
const r2 = db.prepare("UPDATE pantry_items SET status = 'trashed' WHERE status = 'discarded'").run();

console.log(`Migrated: ${r1.changes} consumed → finished, ${r2.changes} discarded → trashed`);
db.close();
