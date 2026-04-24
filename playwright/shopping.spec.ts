import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

// Covers: SHOP-005, SHOP-006

test('SHOP-005: rename a cart', async ({ page }) => {
	await login(page);
	await page.goto('/shopping');

	// Create a list — server redirects to /shopping/{id} after create
	const originalName = `List-${Date.now()}`;
	await page.getByRole('button', { name: 'New cart' }).click();
	await page.locator('[role="dialog"]').waitFor();
	await page.getByPlaceholder('e.g. Whole Foods, Costco…').fill(originalName);
	await page.getByRole('button', { name: 'Create cart' }).click();
	await page.waitForURL(/\/shopping\/.+/);

	// Navigate back to index and wait for the new list to appear
	await page.goto('/shopping');
	const listItem = page.locator('li', { hasText: originalName }).first();
	await expect(listItem).toBeVisible();

	// Click the pencil (rename) button — the only type="button" in each list item
	await listItem.locator('button[type="button"]').click();
	await page.locator('[role="dialog"]').waitFor();
	await expect(page.getByRole('heading', { name: 'Rename cart' })).toBeVisible();

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

test('SHOP-006: add items to a cart via inline search', async ({ page }) => {
	await login(page);

	// Create a list and land on its detail page
	await page.goto('/shopping');
	await page.getByRole('button', { name: 'New cart' }).click();
	await page.locator('[role="dialog"]').waitFor();
	await page.getByPlaceholder('e.g. Whole Foods, Costco…').fill(`ShopSearch-${Date.now()}`);
	await page.getByRole('button', { name: 'Create cart' }).click();
	await page.waitForURL(/\/shopping\/.+/);

	// Add a pantry item via inline search
	await page.goto('/pantry');
	await page.getByRole('button', { name: 'Add to Pantry' }).click();
	await page.locator('[role="dialog"]').waitFor();
	const pantryItem = `PantryForShop-${Date.now()}`;
	await page.locator('[role="dialog"]').getByPlaceholder('What did you buy?').fill(pantryItem);
	await page.locator('[role="dialog"]').getByRole('button', { name: 'Add item' }).click();
	await expect(page.locator('li', { hasText: pantryItem }).first()).toBeVisible();

	// Go back to the shopping list and search for the pantry item
	await page.goBack();
	await page.getByPlaceholder('Search or type an item…').fill(pantryItem.slice(0, 6));
	await page.getByRole('button', { name: pantryItem }).click();
	await expect(page.locator('li', { hasText: pantryItem }).first()).toBeVisible();

	// Add a free-text item
	const freeItem = `FreeItem-${Date.now()}`;
	await page.getByPlaceholder('Search or type an item…').fill(freeItem);
	await page.getByRole('button', { name: `Add "${freeItem}" to cart` }).click();
	await expect(page.locator('li', { hasText: freeItem }).first()).toBeVisible();
});
