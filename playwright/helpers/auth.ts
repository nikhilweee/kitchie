import type { Page } from '@playwright/test';

export const TEST_USER = { username: 'testuser', password: 'testpass123' };

export async function loginAs(page: Page, username: string, password: string) {
	await page.goto('/login');
	await page.fill('input[name="username"]', username);
	await page.fill('input[name="password"]', password);
	await page.click('button[type="submit"]');
	await page.waitForURL('/meals');
}

// Auth state is pre-loaded via storageState in playwright.config.ts.
// waitUntil: 'networkidle' ensures Svelte hydration completes before tests interact.
export async function login(page: Page) {
	await page.goto('/meals', { waitUntil: 'networkidle' });
}
