import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

// Full flow: add meal → update pantry → save recipe
// Verifies both recipe and pantry rows are written correctly.
test('add meal + update pantry + save recipe', async ({ page }) => {
	await login(page);

	const ts = Date.now();
	// Unique names ensure no autocomplete suggestions interfere
	const itemName = `Milk-${ts}`;   // estimate type (no count keyword)
	const mealName = `Pasta-${ts}`;

	// 1. Add a pantry item (estimate, full by default)
	await page.goto('/pantry');
	await page.click('button:has-text("Add to Pantry")');
	const pantryDialog = page.locator('[role="dialog"]');
	await pantryDialog.waitFor();
	await pantryDialog.getByPlaceholder('What did you buy?').fill(itemName);
	await pantryDialog.getByRole('button', { name: 'Add item' }).click();
	await expect(page.locator('li', { hasText: itemName }).first()).toBeVisible();

	// 2. Log a meal
	await page.goto('/');
	await page.click('button:has-text("Add Meal")');
	const mealDialog = page.locator('[role="dialog"]');
	await mealDialog.waitFor();
	await mealDialog.getByPlaceholder('What did you eat?').fill(mealName);
	await mealDialog.getByRole('button', { name: 'Log meal' }).click();

	// Redirects to /?update=<id>; wait for pantry update content to render
	await page.waitForURL(/\?update=/);
	const flowDialog = page.locator('[role="dialog"]');
	await flowDialog.getByRole('heading', { name: 'Update pantry' }).waitFor();

	// 3. Search for the item and add it
	await flowDialog.getByPlaceholder('Search or type an ingredient…').fill(itemName);
	await flowDialog.locator('ul button', { hasText: itemName }).click();
	// Wait for search to clear (confirms item was added to selected list)
	await expect(flowDialog.getByPlaceholder('Search or type an ingredient…')).toHaveValue('');

	// Set the quantity to half via the SmallEstimatePicker
	const picker = flowDialog.locator('[aria-label="Quantity level"]').first();
	await picker.locator('button[aria-label="Half"]').click();

	// 4. Next → recipe step
	await flowDialog.getByRole('button', { name: 'Next' }).click();
	await expect(flowDialog.getByRole('heading', { name: 'Save as recipe?' })).toBeVisible();
	await expect(flowDialog.locator('text=' + itemName)).toBeVisible();

	// 5. Save recipe
	await flowDialog.getByRole('button', { name: 'Save recipe' }).click();
	await page.waitForURL('/');

	// 6. Recipe appears on /recipes
	await page.goto('/recipes');
	await expect(page.locator('text=' + mealName)).toBeVisible();

	// 7. Item quantity updated to half in pantry
	await page.goto('/pantry');
	const itemRow = page.locator('li', { hasText: itemName }).first();
	await expect(itemRow).toBeVisible();
	// Middle (half) zone should be lit, rightmost (full) should be unlit
	const halfZone = itemRow.locator('[aria-label="Quantity level"] div').nth(1);
	await expect(halfZone).not.toHaveClass(/bg-stone-200/);
});
