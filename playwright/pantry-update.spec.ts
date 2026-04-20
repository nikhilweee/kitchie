import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

// Verify that when a pantry item is added to the update-pantry step,
// the quantity picker is initialised with the item's current pantry quantity.
// Uses timestamped unique names to avoid autocomplete suggestions from prior runs.

test('count item shows correct quantity in update-pantry step', async ({ page }) => {
	await login(page);

	const ts = Date.now();
	// "Apple-N" contains "apple" → infers to count type automatically
	const itemName = `Apple-${ts}`;

	// 1. Add count-type item with quantity 5 (stepper starts at 1, click + 4 times)
	await page.goto('/pantry');
	await page.click('button:has-text("Add to Pantry")');
	const dialog = page.locator('[role="dialog"]');
	await dialog.waitFor();
	await dialog.getByPlaceholder('What did you buy?').fill(itemName);
	for (let i = 0; i < 4; i++) {
		await dialog.locator('button:has-text("+")').click();
	}
	await dialog.getByRole('button', { name: 'Add item' }).click();
	await expect(page.locator('li', { hasText: itemName }).first()).toBeVisible();

	// 2. Log a meal
	await page.goto('/');
	await page.click('button:has-text("Add Meal")');
	const mealDialog = page.locator('[role="dialog"]');
	await mealDialog.waitFor();
	await mealDialog.getByPlaceholder('What did you eat?').fill(`Snack-${ts}`);
	await mealDialog.getByRole('button', { name: 'Log meal' }).click();

	// Wait for the pantry update content to render
	await page.waitForURL(/\?update=/);
	const flowDialog = page.locator('[role="dialog"]');
	await flowDialog.getByRole('heading', { name: 'Update pantry' }).waitFor();

	// 3. Search for the item and add it
	await flowDialog.getByPlaceholder('Search or type an ingredient…').fill(itemName);
	await flowDialog.locator('ul button', { hasText: itemName }).click();
	await expect(flowDialog.getByPlaceholder('Search or type an ingredient…')).toHaveValue('');

	// 4. Assert the quantity display shows 5 (the pantry stock)
	const itemRow = flowDialog.locator('li', { hasText: itemName }).last();
	await expect(itemRow.getByText('5', { exact: true })).toBeVisible();
});

test('estimate item shows correct zone in update-pantry step', async ({ page }) => {
	await login(page);

	const ts = Date.now();
	// "Oil-N" has no count keyword → infers to estimate type
	const itemName = `Oil-${ts}`;

	// 1. Add estimate item set to half
	await page.goto('/pantry');
	await page.click('button:has-text("Add to Pantry")');
	const dialog = page.locator('[role="dialog"]');
	await dialog.waitFor();
	await dialog.getByPlaceholder('What did you buy?').fill(itemName);
	const addPicker = dialog.locator('[aria-label="Quantity level"]').first();
	await addPicker.locator('button[aria-label="Half"]').click();
	await dialog.getByRole('button', { name: 'Add item' }).click();
	await expect(page.locator('li', { hasText: itemName }).first()).toBeVisible();

	// 2. Log a meal
	await page.goto('/');
	await page.click('button:has-text("Add Meal")');
	const mealDialog = page.locator('[role="dialog"]');
	await mealDialog.waitFor();
	await mealDialog.getByPlaceholder('What did you eat?').fill(`Salad-${ts}`);
	await mealDialog.getByRole('button', { name: 'Log meal' }).click();

	// Wait for pantry update content to render
	await page.waitForURL(/\?update=/);
	const flowDialog = page.locator('[role="dialog"]');
	await flowDialog.getByRole('heading', { name: 'Update pantry' }).waitFor();

	// 3. Search for the item and add it
	await flowDialog.getByPlaceholder('Search or type an ingredient…').fill(itemName);
	await flowDialog.locator('ul button', { hasText: itemName }).click();
	await expect(flowDialog.getByPlaceholder('Search or type an ingredient…')).toHaveValue('');

	// 4. SmallEstimatePicker should show half: zone 2 lit, zone 3 unlit
	const itemPicker = flowDialog.locator('li', { hasText: itemName }).last()
		.locator('[aria-label="Quantity level"]');
	await expect(itemPicker.locator('button[aria-label="Half"]')).not.toHaveClass(/bg-stone-200/);
	await expect(itemPicker.locator('button[aria-label="Full"]')).toHaveClass(/bg-stone-200/);
});
