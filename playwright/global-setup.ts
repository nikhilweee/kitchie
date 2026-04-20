// Warm up SvelteKit dev-mode pages so Vite compilation doesn't eat into test timeouts.
// Each goto triggers an on-demand compile; without this the first test per route fails.
// Must log in first — protected routes redirect to /login when unauthenticated.
import { chromium } from '@playwright/test';

export default async function globalSetup() {
	const browser = await chromium.launch();
	const page = await browser.newPage();

	// Log in so protected pages compile (not just redirects to /login)
	await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
	await page.fill('input[name="username"]', 'testuser');
	await page.fill('input[name="password"]', 'testpass123');
	await page.click('button[type="submit"]');
	await page.waitForURL('http://localhost:5173/');

	for (const url of ['http://localhost:5173/', 'http://localhost:5173/pantry', 'http://localhost:5173/recipes', 'http://localhost:5173/profile']) {
		await page.goto(url, { waitUntil: 'networkidle' }).catch(() => {});
	}

	await browser.close();
}
