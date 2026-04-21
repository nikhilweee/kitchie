import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

// Covers: PANT-001, PANT-002, PANT-003, PANT-004, PANT-005, PANT-006, PANT-007, PANT-008, PANT-009, PANT-010

async function addPantryItem(page: import('@playwright/test').Page, name: string) {
	await page.click('button:has-text("Add to Pantry")');
	const dialog = page.locator('[role="dialog"]');
	await dialog.waitFor();
	await dialog.getByPlaceholder('What did you buy?').fill(name);
	await dialog.getByRole('button', { name: 'Add item' }).click();
	await expect(page.locator('li', { hasText: name }).first()).toBeVisible();
}

test('PANT-001: add a pantry item and verify it appears in the list', async ({ page }) => {
	await login(page);
	const name = `Pantry-${Date.now()}`;
	await page.goto('/pantry');
	await addPantryItem(page, name);
});

test('PANT-002: category and quantity type inferred from name; user can override', async ({ page }) => {
	await login(page);
	await page.goto('/pantry');

	await page.click('button:has-text("Add to Pantry")');
	const dialog = page.locator('[role="dialog"]');
	await dialog.waitFor();

	// "Eggs-{ts}" → count type inferred
	await dialog.getByPlaceholder('What did you buy?').fill(`Eggs-${Date.now()}`);
	await expect(dialog.getByRole('button', { name: 'Count' })).toHaveClass(/bg-stone-800/);

	// Override to estimate
	await dialog.getByRole('button', { name: 'Estimate' }).click();
	await expect(dialog.getByRole('button', { name: 'Estimate' })).toHaveClass(/bg-stone-800/);

	await page.keyboard.press('Escape');
});

test('PANT-003: expiry date auto-calculated from category; user can override', async ({ page }) => {
	await login(page);
	await page.goto('/pantry');

	await page.click('button:has-text("Add to Pantry")');
	const dialog = page.locator('[role="dialog"]');
	await dialog.waitFor();
	await dialog.getByPlaceholder('What did you buy?').fill(`Milk-${Date.now()}`);

	// Expiry should be auto-populated after typing the name
	const expiry = dialog.locator('#sheet-expiry');
	const val = await expiry.inputValue();
	expect(val).not.toBe('');

	// User can override the auto-calculated date
	await expiry.fill('2099-12-31');
	await expect(expiry).toHaveValue('2099-12-31');

	await page.keyboard.press('Escape');
});

test('PANT-004: edit an existing pantry item', async ({ page }) => {
	await login(page);
	const original = `PantEdit-${Date.now()}`;
	const updated = `PantEdited-${Date.now()}`;
	await page.goto('/pantry');
	await addPantryItem(page, original);

	// Click the item row to open edit sheet
	await page.locator('li', { hasText: original }).first().locator('button').first().click();
	const dialog = page.locator('[role="dialog"]');
	await dialog.waitFor();
	await dialog.getByPlaceholder('What did you buy?').fill(updated);
	await dialog.getByRole('button', { name: 'Save' }).click();

	await expect(page.locator('li', { hasText: updated }).first()).toBeVisible();
	await expect(page.locator('li', { hasText: original })).toHaveCount(0);
});

test('PANT-005: delete a pantry item', async ({ page }) => {
	await login(page);
	const name = `PantDel-${Date.now()}`;
	await page.goto('/pantry');
	await addPantryItem(page, name);

	await page.locator('li', { hasText: name }).first()
		.locator(`button[aria-label="Delete ${name}"]`).click();

	await expect(page.locator('li', { hasText: name })).toHaveCount(0);
});

test('PANT-006: pantry list filtered by text search on item name', async ({ page }) => {
	await login(page);
	const name = `PantSearch-${Date.now()}`;
	await page.goto('/pantry');
	await addPantryItem(page, name);

	// Partial match → item visible
	await page.getByPlaceholder('Search pantry…').fill(name.slice(0, 10));
	await expect(page.locator('li', { hasText: name }).first()).toBeVisible();

	// Unrelated query → item hidden
	await page.getByPlaceholder('Search pantry…').fill('xyznotfound');
	await expect(page.locator('li', { hasText: name })).toHaveCount(0);
});

test('PANT-007: pantry list filtered by category', async ({ page }) => {
	await login(page);
	const ts = Date.now();
	const dairyName = `Milk-${ts}`;   // infers to 'dairy'
	const otherName = `Pantry-${ts}`; // infers to 'other'
	await page.goto('/pantry');
	await addPantryItem(page, dairyName);
	await addPantryItem(page, otherName);

	// Open filter panel and check "Dairy" category
	await page.getByRole('button', { name: 'Filters' }).click();
	await page.locator('label', { hasText: 'Dairy' }).click();

	// Dairy item visible; other-category item hidden
	await expect(page.locator('li', { hasText: dairyName }).first()).toBeVisible();
	await expect(page.locator('li', { hasText: otherName })).toHaveCount(0);
});

test('PANT-009: finalizing pantry update step writes updated quantities', async ({ page }) => {
	await login(page);
	const ts = Date.now();
	const itemName = `PantStock-${ts}`; // no count keyword → estimate type
	const mealName = `Meal-${ts}`;

	// Add estimate item (full by default)
	await page.goto('/pantry');
	await addPantryItem(page, itemName);

	// Log a meal with updatePantry ON
	await page.goto('/meals');
	await page.click('button:has-text("Add Meal")');
	const mealDialog = page.locator('[role="dialog"]');
	await mealDialog.waitFor();
	await mealDialog.getByPlaceholder('What did you eat?').fill(mealName);
	await mealDialog.locator('input[name="updatePantry"]').setChecked(true, { force: true });
	await mealDialog.getByRole('button', { name: 'Log meal' }).click();

	await page.waitForURL(/\?update=/);
	const flowDialog = page.locator('[role="dialog"]');
	await flowDialog.getByRole('heading', { name: 'Update pantry' }).waitFor();

	// Search, add item, set quantity to half
	await flowDialog.getByPlaceholder('Search or type an ingredient…').fill(itemName);
	await flowDialog.locator('ul button', { hasText: itemName }).click();
	await expect(flowDialog.getByPlaceholder('Search or type an ingredient…')).toHaveValue('');

	const picker = flowDialog.locator('[aria-label="Quantity level"]').first();
	await picker.locator('button[aria-label="Half"]').click();

	// Next → Skip recipe
	await flowDialog.getByRole('button', { name: 'Next' }).click();
	await flowDialog.getByRole('button', { name: 'Skip' }).click();
	await page.waitForURL('/meals');

	// Verify pantry item now shows half (zone 2 lit, zone 3 unlit)
	await page.goto('/pantry');
	const itemRow = page.locator('li', { hasText: itemName }).first();
	const halfZone = itemRow.locator('[aria-label="Quantity level"] div').nth(1);
	await expect(halfZone).not.toHaveClass(/bg-stone-200/);
	const fullZone = itemRow.locator('[aria-label="Quantity level"] div').nth(2);
	await expect(fullZone).toHaveClass(/bg-stone-200/);
});

test('PANT-010: free-text ingredient in pantry update step creates a new pantry item', async ({ page }) => {
	await login(page);
	const ts = Date.now();
	const customItem = `CustomIngr-${ts}`;
	const mealName = `Meal-${ts}`;

	// Log a meal with updatePantry ON
	await page.goto('/meals');
	await page.click('button:has-text("Add Meal")');
	const mealDialog = page.locator('[role="dialog"]');
	await mealDialog.waitFor();
	await mealDialog.getByPlaceholder('What did you eat?').fill(mealName);
	await mealDialog.locator('input[name="updatePantry"]').setChecked(true, { force: true });
	await mealDialog.getByRole('button', { name: 'Log meal' }).click();

	await page.waitForURL(/\?update=/);
	const flowDialog = page.locator('[role="dialog"]');
	await flowDialog.getByRole('heading', { name: 'Update pantry' }).waitFor();

	// Type a custom ingredient that doesn't exist in pantry
	await flowDialog.getByPlaceholder('Search or type an ingredient…').fill(customItem);
	await flowDialog.locator('li button', { hasText: `Add "${customItem}" as ingredient` }).click();
	await expect(flowDialog.getByPlaceholder('Search or type an ingredient…')).toHaveValue('');

	// Next → Skip recipe
	await flowDialog.getByRole('button', { name: 'Next' }).click();
	await flowDialog.getByRole('button', { name: 'Skip' }).click();
	await page.waitForURL('/meals');

	// Verify the new item was created in pantry (item is created at qty=0 → running low)
	await page.goto('/pantry');
	await page.getByRole('button', { name: 'Running low' }).click();
	await expect(page.locator('li', { hasText: customItem }).first()).toBeVisible();
});

test('PANT-008: count item shows correct quantity in update-pantry step', async ({ page }) => {
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
	await page.goto('/meals');
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

test('PANT-008: estimate item shows correct zone in update-pantry step', async ({ page }) => {
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
	await page.goto('/meals');
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
