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

test('SETT-002: add a custom category', async ({ page }) => {
	await login(page);
	const name = `CatTest-${Date.now()}`;
	await page.goto('/settings/categories');

	await page.getByPlaceholder('Name').fill(name);
	await page.locator('input[name="ttlDays"]').fill('21');
	await page.getByRole('button', { name: 'Add' }).click();

	await expect(page.locator('li', { hasText: name }).first()).toBeVisible();
	await expect(page.locator('li', { hasText: name }).first()).toContainText('21 day');

	// Category appears in pantry add sheet
	await page.goto('/pantry');
	await page.click('button:has-text("Add to Pantry")');
	const dialog = page.locator('[role="dialog"]');
	await dialog.waitFor();
	await expect(dialog.locator('#sheet-category option', { hasText: name })).toHaveCount(1);
	await page.keyboard.press('Escape');
});

test('SETT-003: edit a category name and TTL', async ({ page }) => {
	await login(page);
	const original = `CatEdit-${Date.now()}`;
	const updated = `CatEdited-${Date.now()}`;
	await page.goto('/settings/categories');

	// Add first
	await page.getByPlaceholder('Name').fill(original);
	await page.locator('input[name="ttlDays"]').fill('10');
	await page.getByRole('button', { name: 'Add' }).click();
	await expect(page.locator('li', { hasText: original }).first()).toBeVisible();

	// Edit
	await page.locator('li', { hasText: original }).first()
		.locator('button[aria-label^="Edit"]').click();
	const row = page.locator('li').filter({ has: page.locator('input[name="name"]') }).first();
	await row.locator('input[name="name"]').fill(updated);
	await row.locator('input[name="ttlDays"]').fill('45');
	await row.locator('button[aria-label="Save"]').click();

	await expect(page.locator('li', { hasText: updated }).first()).toBeVisible();
	await expect(page.locator('li', { hasText: updated }).first()).toContainText('45 day');
	await expect(page.locator('li', { hasText: original })).toHaveCount(0);
});

test('SETT-004: delete an unused category', async ({ page }) => {
	await login(page);
	const name = `CatDel-${Date.now()}`;
	await page.goto('/settings/categories');

	await page.getByPlaceholder('Name').fill(name);
	await page.locator('input[name="ttlDays"]').fill('7');
	await page.getByRole('button', { name: 'Add' }).click();
	await expect(page.locator('li', { hasText: name }).first()).toBeVisible();

	await page.locator('li', { hasText: name }).first()
		.locator('button[aria-label^="Delete"]').click();

	await expect(page.locator('li', { hasText: name })).toHaveCount(0);
});

test('SETT-005: cannot delete a category in use', async ({ page }) => {
	await login(page);
	await page.goto('/pantry');

	// Add a pantry item — it will infer a category
	await page.click('button:has-text("Add to Pantry")');
	const dialog = page.locator('[role="dialog"]');
	await dialog.waitFor();
	const itemName = `InUseCat-${Date.now()}`;
	await dialog.getByPlaceholder('What did you buy?').fill(itemName);
	// Note which category is selected
	const categoryId = await dialog.locator('#sheet-category').inputValue();
	await dialog.getByRole('button', { name: 'Add item' }).click();
	await expect(page.locator('li', { hasText: itemName }).first()).toBeVisible();

	// Go to settings and find that category's delete button
	await page.goto('/settings/categories');
	// Find the row that corresponds to the inferred category — it should show usage count
	// and have a disabled delete button
	const usedRow = page.locator('li').filter({ has: page.locator('span', { hasText: /\d+ item/ }) }).first();
	await expect(usedRow.locator('button[aria-label^="Delete"]')).toBeDisabled();
});

test('SETT-006: add a custom cuisine', async ({ page }) => {
	await login(page);
	const name = `CuisineTest-${Date.now()}`;
	await page.goto('/settings/cuisines');

	await page.getByPlaceholder('e.g. Ethiopian').fill(name);
	await page.getByRole('button', { name: 'Add' }).click();

	await expect(page.locator('li', { hasText: name }).first()).toBeVisible();

	// Cuisine appears in recipe add sheet
	await page.goto('/recipes');
	await page.click('button:has-text("Add Recipe")');
	const dialog = page.locator('[role="dialog"]');
	await dialog.waitFor();
	await expect(dialog.locator('#recipe-cuisine option', { hasText: name })).toHaveCount(1);
	await page.keyboard.press('Escape');
});

test('SETT-007: edit a cuisine name', async ({ page }) => {
	await login(page);
	const original = `CuisineEdit-${Date.now()}`;
	const updated = `CuisineEdited-${Date.now()}`;
	await page.goto('/settings/cuisines');

	await page.getByPlaceholder('e.g. Ethiopian').fill(original);
	await page.getByRole('button', { name: 'Add' }).click();
	await expect(page.locator('li', { hasText: original }).first()).toBeVisible();

	await page.locator('li', { hasText: original }).first()
		.locator('button[aria-label^="Edit"]').click();
	const row = page.locator('li').filter({ has: page.locator('input[name="name"]') }).first();
	await row.locator('input[name="name"]').fill(updated);
	await row.locator('button[aria-label="Save"]').click();

	await expect(page.locator('li', { hasText: updated }).first()).toBeVisible();
	await expect(page.locator('li', { hasText: original })).toHaveCount(0);
});

test('SETT-008: cannot delete a cuisine in use', async ({ page }) => {
	await login(page);
	const ts = Date.now();
	const recipeName = `InUseCuisine-${ts}`;

	// Add a recipe with a cuisine
	await page.goto('/recipes');
	await page.click('button:has-text("Add Recipe")');
	const dialog = page.locator('[role="dialog"]');
	await dialog.waitFor();
	await dialog.getByPlaceholder('Recipe name').fill(recipeName);
	await dialog.locator('#recipe-cuisine').selectOption({ label: 'Italian' });
	await dialog.getByRole('button', { name: 'Add recipe' }).click();
	await expect(page.locator('li', { hasText: recipeName }).first()).toBeVisible();

	// Go to settings/cuisines — Italian's delete button should be disabled
	await page.goto('/settings/cuisines');
	const italianRow = page.locator('li').filter({ hasText: 'Italian' }).first();
	await expect(italianRow.locator('button[aria-label^="Delete"]')).toBeDisabled();
});
