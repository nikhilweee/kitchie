// Warm up SvelteKit dev-mode pages so Vite compilation doesn't eat into test timeouts.
// Each goto triggers an on-demand compile; without this the first test per route fails.
// Must log in first — protected routes redirect to /login when unauthenticated.
// Also saves auth storageState so individual tests skip the login flow entirely.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'fs';

export const STORAGE_STATE = 'playwright/.auth/user.json';

export default async function globalSetup() {
	mkdirSync('playwright/.auth', { recursive: true });

	const browser = await chromium.launch();
	const page = await browser.newPage();

	// Log in so protected pages compile (not just redirects to /login)
	await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
	await page.fill('input[name="username"]', 'testuser');
	await page.fill('input[name="password"]', 'testpass123');
	await page.click('button[type="submit"]');
	await page.waitForURL('http://localhost:5173/meals');

	for (const url of ['http://localhost:5173/meals', 'http://localhost:5173/pantry', 'http://localhost:5173/recipes', 'http://localhost:5173/profile', 'http://localhost:5173/profile/password']) {
		await page.goto(url, { waitUntil: 'networkidle' }).catch(() => {});
	}

	// Save session cookie for reuse — individual tests skip the login flow
	await page.context().storageState({ path: STORAGE_STATE });

	await browser.close();
}
