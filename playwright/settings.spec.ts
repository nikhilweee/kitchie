import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

// Covers: SETT-001, SETT-002, SETT-003, SETT-004, SETT-005, SETT-006, SETT-007, SETT-008

test('SETT-001: hamburger opens sidebar with settings links', async ({ page }) => {
	await login(page);
	await page.goto('/meals');
	await page.click('button[aria-label="Open menu"]');
	await expect(page.locator('nav a', { hasText: 'Categories' })).toBeVisible();
	await expect(page.locator('nav a', { hasText: 'Cuisines' })).toBeVisible();
	await expect(page.locator('nav a', { hasText: 'Display' })).toBeVisible();
	// Clicking a link navigates
	await page.locator('nav a', { hasText: 'Categories' }).click();
	await expect(page).toHaveURL('/settings/categories');
});

test('SETT-009: display density toggle persists across navigation', async ({ page }) => {
	await login(page);
	await page.goto('/settings/display');

	const slimBtn = page.getByRole('button', { name: 'Slim' });
	const comfortableBtn = page.getByRole('button', { name: 'Comfortable' });
	await expect(slimBtn).toBeVisible();
	await expect(comfortableBtn).toBeVisible();

	// Switch to slim
	await slimBtn.click();
	await expect(page.locator('html')).toHaveAttribute('data-display', 'slim');

	// Navigate away and back — localStorage should restore the setting
	await page.goto('/pantry');
	await expect(page.locator('html')).toHaveAttribute('data-display', 'slim');

	// Reset to comfortable
	await page.goto('/settings/display');
	await comfortableBtn.click();
	await expect(page.locator('html')).toHaveAttribute('data-display', 'comfortable');
});

async function addCategory(page: any, name: string, ttlDays: string) {
	await page.getByRole('button', { name: 'Add category' }).click();
	await page.waitForURL('/settings/categories/add');
	await page.locator('input[name="name"]').fill(name);
	await page.locator('input[name="ttlDays"]').fill(ttlDays);
	await page.getByRole('button', { name: 'Save' }).click();
	await page.waitForURL('/settings/categories');
	await expect(page.locator('li', { hasText: name }).first()).toBeVisible();
}

async function addCuisine(page: any, name: string) {
	await page.getByRole('button', { name: 'Add cuisine' }).click();
	await page.waitForURL('/settings/cuisines/add');
	await page.locator('input[name="name"]').fill(name);
	await page.getByRole('button', { name: 'Save' }).click();
	await page.waitForURL('/settings/cuisines');
	await expect(page.locator('li', { hasText: name }).first()).toBeVisible();
}

test('SETT-002: add a custom category', async ({ page }) => {
	await login(page);
	const name = `CatTest-${Date.now()}`;
	await page.goto('/settings/categories');

	await addCategory(page, name, '21');

	await expect(page.locator('li', { hasText: name }).first()).toContainText('21 day');

	// Category appears in pantry add page
	await page.goto('/pantry/add');
	await expect(page.locator('#add-category option', { hasText: name })).toHaveCount(1);
	await page.goto('/settings/categories');
});

test('SETT-003: edit a category name and TTL', async ({ page }) => {
	await login(page);
	const original = `CatEdit-${Date.now()}`;
	const updated = `CatEdited-${Date.now()}`;
	await page.goto('/settings/categories');

	await addCategory(page, original, '10');

	// Tap row to navigate to edit page
	await page.locator('li', { hasText: original }).first().click();
	await page.waitForURL(/\/settings\/categories\/.+/);
	await page.locator('input[name="name"]').fill(updated);
	await page.locator('input[name="ttlDays"]').fill('45');
	await page.getByRole('button', { name: 'Save' }).click();
	await page.waitForURL('/settings/categories');

	await expect(page.locator('li', { hasText: updated }).first()).toBeVisible();
	await expect(page.locator('li', { hasText: updated }).first()).toContainText('45 day');
	await expect(page.locator('li', { hasText: original })).toHaveCount(0);
});

test('SETT-004: delete an unused category', async ({ page }) => {
	await login(page);
	const name = `CatDel-${Date.now()}`;
	await page.goto('/settings/categories');

	await addCategory(page, name, '7');

	// Tap row to navigate to edit page, then delete
	await page.locator('li', { hasText: name }).first().click();
	await page.waitForURL(/\/settings\/categories\/.+/);
	await page.getByRole('button', { name: 'Delete category' }).click();
	await page.waitForURL('/settings/categories');

	await expect(page.locator('li', { hasText: name })).toHaveCount(0);
});

test('SETT-005: cannot delete a category in use', async ({ page }) => {
	await login(page);

	// Add a pantry item via /pantry/add
	await page.goto('/pantry/add');
	const itemName = `InUseCat-${Date.now()}`;
	await page.getByPlaceholder('What did you buy?').fill(itemName);
	await page.getByRole('button', { name: 'Add item' }).click();
	await page.waitForURL(/\/pantry/);
	await expect(page.locator('li', { hasText: itemName }).first()).toBeVisible();

	// Go to settings — find a row with usage count and navigate to edit page
	await page.goto('/settings/categories');
	const usedRow = page.locator('li').filter({ has: page.locator('span', { hasText: /\d+ item/ }) }).first();
	await usedRow.click();
	await page.waitForURL(/\/settings\/categories\/.+/);
	await expect(page.getByRole('button', { name: /In use by/ })).toBeDisabled();
});

test('SETT-006: add a custom cuisine', async ({ page }) => {
	await login(page);
	const name = `CuisineTest-${Date.now()}`;
	await page.goto('/settings/cuisines');

	await addCuisine(page, name);

	// Cuisine appears in recipe add page
	await page.goto('/recipes/add');
	await expect(page.locator('#recipe-cuisine option', { hasText: name })).toHaveCount(1);
	await page.goto('/settings/cuisines');
});

test('SETT-007: edit a cuisine name', async ({ page }) => {
	await login(page);
	const original = `CuisineEdit-${Date.now()}`;
	const updated = `CuisineEdited-${Date.now()}`;
	await page.goto('/settings/cuisines');

	await addCuisine(page, original);

	// Tap row to navigate to edit page
	await page.locator('li', { hasText: original }).first().click();
	await page.waitForURL(/\/settings\/cuisines\/.+/);
	await page.locator('input[name="name"]').fill(updated);
	await page.getByRole('button', { name: 'Save' }).click();
	await page.waitForURL('/settings/cuisines');

	await expect(page.locator('li', { hasText: updated }).first()).toBeVisible();
	await expect(page.locator('li', { hasText: original })).toHaveCount(0);
});

test('SETT-008: cannot delete a cuisine in use', async ({ page }) => {
	await login(page);
	const ts = Date.now();
	const recipeName = `InUseCuisine-${ts}`;

	// Add a recipe with a cuisine via /recipes/add
	await page.goto('/recipes/add');
	await page.getByPlaceholder('Recipe name').fill(recipeName);
	await page.locator('#recipe-cuisine').selectOption({ label: 'Italian' });
	await page.getByRole('button', { name: 'Add recipe' }).click();
	await page.waitForURL(/\/recipes/);
	await expect(page.locator('li', { hasText: recipeName }).first()).toBeVisible();

	// Go to settings/cuisines — tap Italian's row to navigate to edit page, delete should be disabled
	await page.goto('/settings/cuisines');
	const italianRow = page.locator('li').filter({ hasText: 'Italian' }).first();
	await italianRow.click();
	await page.waitForURL(/\/settings\/cuisines\/.+/);
	await expect(page.getByRole('button', { name: /In use by/ })).toBeDisabled();
});

test('SETT-010: delete an unused cuisine', async ({ page }) => {
	await login(page);
	const name = `CuisineDel-${Date.now()}`;
	await page.goto('/settings/cuisines');

	await addCuisine(page, name);

	// Tap row to navigate to edit page, then delete
	await page.locator('li', { hasText: name }).first().click();
	await page.waitForURL(/\/settings\/cuisines\/.+/);
	await page.getByRole('button', { name: 'Delete cuisine' }).click();
	await page.waitForURL('/settings/cuisines');

	await expect(page.locator('li', { hasText: name })).toHaveCount(0);
});
