import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

// Covers: SHOP-005

test('SHOP-005: rename a shopping list', async ({ page }) => {
	await login(page);
	await page.goto('/shopping');

	// Create a list — server redirects to /shopping/{id} after create
	const originalName = `List-${Date.now()}`;
	await page.getByRole('button', { name: 'New list' }).click();
	await page.locator('[role="dialog"]').waitFor();
	await page.getByPlaceholder('e.g. Whole Foods, Costco…').fill(originalName);
	await page.getByRole('button', { name: 'Create list' }).click();
	await page.waitForURL(/\/shopping\/.+/);

	// Navigate back to index and wait for the new list to appear
	await page.goto('/shopping');
	const listItem = page.locator('li', { hasText: originalName }).first();
	await expect(listItem).toBeVisible();

	// Click the pencil (rename) button — the only type="button" in each list item
	await listItem.locator('button[type="button"]').click();
	await page.locator('[role="dialog"]').waitFor();
	await expect(page.getByRole('heading', { name: 'Rename list' })).toBeVisible();

	// Rename it
	const newName = `Renamed-${Date.now()}`;
	const input = page.getByPlaceholder('e.g. Whole Foods, Costco…');
	await input.clear();
	await input.fill(newName);
	await page.getByRole('button', { name: 'Save' }).click();

	// New name should appear; old name gone
	await expect(page.locator('li', { hasText: newName }).first()).toBeVisible();
	await expect(page.locator('li', { hasText: originalName })).toHaveCount(0);
});
