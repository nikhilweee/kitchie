import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { assertLastItemReachable } from './helpers/scroll';

// Covers: MEAL-001, MEAL-002, MEAL-003, MEAL-004, MEAL-005, MEAL-006, MEAL-007, MEAL-008, MEAL-009, MEAL-010

async function addMeal(page: import('@playwright/test').Page, name: string) {
	await page.click('button:has-text("Add Meal")');
	await page.waitForURL('/meals/add');
	await page.getByPlaceholder('What did you eat?').fill(name);
	await page.getByRole('button', { name: 'Log meal' }).click();
	// Navigate to /meals — the meal is logged regardless of any pantry redirect
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

	// Navigate to /meals/add and start typing the meal name
	await page.click('button:has-text("Add Meal")');
	await page.waitForURL('/meals/add');
	await page.getByPlaceholder('What did you eat?').fill(name.slice(0, 4));

	// Suggestion list should appear and include the meal name
	await expect(page.locator('ul').locator(`button:has-text("${name}")`)).toBeVisible();
});

test('MEAL-004: "Update pantry" toggle redirects to /?update= after logging', async ({ page }) => {
	await login(page);
	await page.goto('/meals');
	await page.click('button:has-text("Add Meal")');
	await page.waitForURL('/meals/add');
	await page.getByPlaceholder('What did you eat?').fill(`Meal-${Date.now()}`);
	// Ensure toggle is on (it defaults to on)
	await page.locator('input[name="updatePantry"]').setChecked(true, { force: true });
	await page.getByRole('button', { name: 'Log meal' }).click();
	await page.waitForURL(/\/meals\/.+\/update/);
	await expect(page).toHaveURL(/\/meals\/.+\/update/);
});

test('MEAL-005: edit a logged meal name', async ({ page }) => {
	await login(page);
	const original = `Meal-${Date.now()}`;
	const updated = `Edited-${Date.now()}`;
	await page.goto('/meals');
	await addMeal(page, original);

	// Click the meal row to navigate to edit page
	await page.locator('li', { hasText: original }).first().locator('button').first().click();
	await page.waitForURL(/\/meals\/.+/);
	await page.getByPlaceholder('What did you eat?').fill(updated);
	await page.getByRole('button', { name: 'Save' }).click();
	await page.waitForURL((url) => url.pathname === '/meals');

	await expect(page.locator('li', { hasText: updated }).first()).toBeVisible();
	await expect(page.locator('li', { hasText: original })).toHaveCount(0);
});

test('MEAL-006: delete a logged meal', async ({ page }) => {
	await login(page);
	const name = `Meal-${Date.now()}`;
	await page.goto('/meals');
	await addMeal(page, name);
	await expect(page.locator('li', { hasText: name }).first()).toBeVisible();

	// Navigate to edit page then delete
	await page.locator('li', { hasText: name }).first().locator('button').click();
	await page.waitForURL(/\/meals\/.+/);
	await page.locator('button[formaction="/meals?/deleteMeal"]').click();
	await page.waitForURL((url) => url.pathname === '/meals');

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

test('MEAL-008: /meals/<id> deep-link opens meal edit page', async ({ page }) => {
	await login(page);
	const name = `MealLink-${Date.now()}`;
	await page.goto('/meals');
	await addMeal(page, name);

	// Click the meal row — URL navigates to /meals/<id>
	await page.locator('li', { hasText: name }).first().locator('button').first().click();
	await page.waitForURL(/\/meals\/.+/);
	const mealId = new URL(page.url()).pathname.split('/').pop();
	expect(mealId).toBeTruthy();

	// Navigate away then deep-link back
	await page.goto('/pantry');
	await page.goto(`/meals/${mealId}`);
	await page.waitForURL(/\/meals\/.+/);
	await expect(page.getByPlaceholder('What did you eat?')).toHaveValue(name);
});

test('MEAL-009: meal edit page shows recipe link when recipeId is set', async ({ page }) => {
	await login(page);
	const ts = Date.now();
	const itemName = `RecpItem-${ts}`;
	const mealName = `RecpMeal-${ts}`;

	// Add pantry item via sub-route
	await page.goto('/pantry');
	await page.click('button:has-text("Add to Pantry")');
	await page.waitForURL('/pantry/add');
	await page.getByPlaceholder('What did you buy?').fill(itemName);
	await page.getByRole('button', { name: 'Add item' }).click();
	await expect(page.locator('li', { hasText: itemName }).first()).toBeVisible();

	// Log meal + pantry update + save recipe
	await page.goto('/meals');
	await page.click('button:has-text("Add Meal")');
	await page.waitForURL('/meals/add');
	await page.getByPlaceholder('What did you eat?').fill(mealName);
	await page.locator('input[name="updatePantry"]').setChecked(true, { force: true });
	await page.getByRole('button', { name: 'Log meal' }).click();

	await page.waitForURL(/\/meals\/.+\/update/);
	await page.getByPlaceholder('Search or type an ingredient…').waitFor();
	await page.getByPlaceholder('Search or type an ingredient…').fill(itemName);
	await page.locator('ul button', { hasText: itemName }).click();
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Save recipe' }).click();
	await page.waitForURL('/meals');

	// Open the meal edit page — recipe link should be visible
	await page.locator('li', { hasText: mealName }).first().locator('button').first().click();
	await page.waitForURL(/\/meals\/.+/);
	const recipeLink = page.locator('a[href^="/recipes/"]');
	await expect(recipeLink).toBeVisible();

	// Clicking navigates to /recipes/<recipeId>
	await recipeLink.click();
	await expect(page).toHaveURL(/\/recipes\/.+/);
	await expect(page.getByPlaceholder('Recipe name')).toBeVisible();
});

test.describe('MEAL-010 scroll clearance', () => {
	test.use({ viewport: { width: 375, height: 500 } });

	test('MEAL-010: meals list last item is reachable at max scroll', async ({ page }) => {
		await login(page);
		const ts = Date.now();
		await page.goto('/meals');
		for (let i = 0; i < 10; i++) {
			await addMeal(page, `MScroll-${ts}-${i}`);
		}
		await assertLastItemReachable(page);
	});
});
