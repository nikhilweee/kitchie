// Resets the test DB to a clean state, seeds testuser, then saves a session
// cookie so individual tests skip the login form.
// Run via: pnpm test:playwright (which builds first, then runs playwright test)
import { chromium } from '@playwright/test';
import { mkdirSync } from 'fs';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

export const STORAGE_STATE = 'playwright/.auth/user.json';

const BASE = 'http://localhost:4173';
const TABLES = ['meal_ingredients', 'meal_entries', 'recipe_items', 'recipes', 'pantry_items', 'sessions', 'users'];

export default async function globalSetup() {
	mkdirSync('playwright/.auth', { recursive: true });

	// Wipe all user data and seed a fresh testuser
	const db = new Database('test.db');
	db.pragma('foreign_keys = OFF');
	for (const table of TABLES) {
		db.prepare(`DELETE FROM ${table}`).run();
	}
	db.pragma('foreign_keys = ON');
	const hash = await bcrypt.hash('testpass123', 4); // low rounds: test-only
	db.prepare(
		'INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)'
	).run(randomUUID(), 'testuser', hash, Math.floor(Date.now() / 1000));
	db.close();

	// Log in and save session cookie for reuse across tests
	const browser = await chromium.launch();
	const page = await browser.newPage();

	await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
	await page.fill('input[name="username"]', 'testuser');
	await page.fill('input[name="password"]', 'testpass123');
	await page.click('button[type="submit"]');
	await page.waitForURL(`${BASE}/meals`);

	await page.context().storageState({ path: STORAGE_STATE });
	await browser.close();
}
