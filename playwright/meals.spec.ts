import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

// Covers: MEAL-001, MEAL-002, MEAL-003, MEAL-004, MEAL-005, MEAL-006, MEAL-007

async function addMeal(page: import('@playwright/test').Page, name: string) {
	await page.click('button:has-text("Add Meal")');
	const dialog = page.locator('[role="dialog"]');
	await dialog.waitFor();
	await dialog.getByPlaceholder('What did you eat?').fill(name);
	await dialog.getByRole('button', { name: 'Log meal' }).click();
	// Navigate to / — the meal is logged regardless of updatePantry redirect
	await page.goto('/meals');
}

test('MEAL-001: log a meal and verify it appears in the list', async ({ page }) => {
	await login(page);
	const name = `Meal-${Date.now()}`;
	await page.goto('/meals');
	await addMeal(page, name);
	await expect(page.locator('li', { hasText: name }).first()).toBeVisible();
});

test('MEAL-002: meal type is shown after logging with default (inferred) type', async ({ page }) => {
	await login(page);
	const name = `Meal-${Date.now()}`;
	await page.goto('/meals');
	await addMeal(page, name);
	// The meal entry should show one of the 4 valid meal type labels
	const mealRow = page.locator('li', { hasText: name }).first();
	const typeLabels = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
	const labelText = await mealRow.locator('p.text-xs').textContent();
	expect(typeLabels.some((l) => labelText?.includes(l))).toBe(true);
});

test('MEAL-003: meal name autocomplete suggests previously logged meals', async ({ page }) => {
	await login(page);
	const name = `AutoMeal-${Date.now()}`;
	await page.goto('/meals');

	// Log it once
	await addMeal(page, name);

	// Open add sheet and start typing the meal name
	await page.click('button:has-text("Add Meal")');
	const dialog = page.locator('[role="dialog"]');
	await dialog.waitFor();
	await dialog.getByPlaceholder('What did you eat?').fill(name.slice(0, 4));

	// Suggestion list should appear and include the meal name
	await expect(dialog.locator('ul').locator(`button:has-text("${name}")`)).toBeVisible();
});

test('MEAL-004: "Update pantry" toggle redirects to /?update= after logging', async ({ page }) => {
	await login(page);
	await page.goto('/meals');
	await page.click('button:has-text("Add Meal")');
	const dialog = page.locator('[role="dialog"]');
	await dialog.waitFor();
	await dialog.getByPlaceholder('What did you eat?').fill(`Meal-${Date.now()}`);
	// Ensure toggle is on (it defaults to on)
	await dialog.locator('input[name="updatePantry"]').setChecked(true, { force: true });
	await dialog.getByRole('button', { name: 'Log meal' }).click();
	await page.waitForURL(/\?update=/);
	await expect(page).toHaveURL(/\?update=/);
});

test('MEAL-005: edit a logged meal name', async ({ page }) => {
	await login(page);
	const original = `Meal-${Date.now()}`;
	const updated = `Edited-${Date.now()}`;
	await page.goto('/meals');
	await addMeal(page, original);

	// Click the meal row to open edit sheet
	await page.locator('li', { hasText: original }).first().locator('button').first().click();
	const dialog = page.locator('[role="dialog"]');
	await dialog.waitFor();
	await dialog.getByPlaceholder('What did you eat?').fill(updated);
	await dialog.getByRole('button', { name: 'Save' }).click();

	await expect(page.locator('li', { hasText: updated }).first()).toBeVisible();
	await expect(page.locator('li', { hasText: original })).toHaveCount(0);
});

test('MEAL-006: delete a logged meal', async ({ page }) => {
	await login(page);
	const name = `Meal-${Date.now()}`;
	await page.goto('/meals');
	await addMeal(page, name);
	await expect(page.locator('li', { hasText: name }).first()).toBeVisible();

	// Click the delete (✕) button on that meal row
	await page.locator('li', { hasText: name }).first()
		.locator(`button[aria-label="Delete ${name}"]`).click();

	await expect(page.locator('li', { hasText: name })).toHaveCount(0);
});

test('MEAL-007: meals are displayed grouped by day', async ({ page }) => {
	await login(page);
	const name = `Meal-${Date.now()}`;
	await page.goto('/meals');
	await addMeal(page, name);
	// A day heading (e.g., "Today") should be visible
	await expect(page.locator('h2', { hasText: 'Today' })).toBeVisible();
});
