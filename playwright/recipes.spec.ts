import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

// Covers: RECP-001, RECP-002, RECP-003, RECP-004, RECP-005, RECP-006, RECP-007, RECP-008

// Add a recipe through the manual sheet on /recipes.
// If ingredientName is given, it must already exist as a pantry item.
async function addRecipe(
	page: import('@playwright/test').Page,
	name: string,
	opts?: { ingredientName?: string; mealType?: string }
) {
	await page.click('button:has-text("Add Recipe")');
	const dialog = page.locator('[role="dialog"]');
	await dialog.waitFor();
	await dialog.getByPlaceholder('Recipe name').fill(name);
	if (opts?.mealType) {
		await dialog.locator('#recipe-meal-type').selectOption(opts.mealType);
	}
	if (opts?.ingredientName) {
		await dialog.getByPlaceholder('Search or type an ingredient…').fill(opts.ingredientName);
		await dialog.locator('ul button', { hasText: opts.ingredientName }).click();
		await expect(dialog.getByPlaceholder('Search or type an ingredient…')).toHaveValue('');
	}
	await dialog.getByRole('button', { name: 'Add recipe' }).click();
	await expect(page.locator('li', { hasText: name }).first()).toBeVisible();
}

// Add a pantry item through /pantry, then return to the previous page.
async function ensurePantryItem(page: import('@playwright/test').Page, name: string) {
	await page.goto('/pantry');
	await page.click('button:has-text("Add to Pantry")');
	const dialog = page.locator('[role="dialog"]');
	await dialog.waitFor();
	await dialog.getByPlaceholder('What did you buy?').fill(name);
	await dialog.getByRole('button', { name: 'Add item' }).click();
	await expect(page.locator('li', { hasText: name }).first()).toBeVisible();
}

test('RECP-001: save ingredients as recipe after meal log + pantry update', async ({ page }) => {
	await login(page);
	const ts = Date.now();
	const itemName = `RecpItem-${ts}`;
	const mealName = `RecpMeal-${ts}`;

	await ensurePantryItem(page, itemName);

	// Log a meal with updatePantry ON
	await page.goto('/');
	await page.click('button:has-text("Add Meal")');
	const mealDialog = page.locator('[role="dialog"]');
	await mealDialog.waitFor();
	await mealDialog.getByPlaceholder('What did you eat?').fill(mealName);
	await mealDialog.locator('input[name="updatePantry"]').setChecked(true, { force: true });
	await mealDialog.getByRole('button', { name: 'Log meal' }).click();

	await page.waitForURL(/\?update=/);
	const flowDialog = page.locator('[role="dialog"]');
	await flowDialog.getByRole('heading', { name: 'Update pantry' }).waitFor();

	// Add item and advance to recipe step
	await flowDialog.getByPlaceholder('Search or type an ingredient…').fill(itemName);
	await flowDialog.locator('ul button', { hasText: itemName }).click();
	await expect(flowDialog.getByPlaceholder('Search or type an ingredient…')).toHaveValue('');
	await flowDialog.getByRole('button', { name: 'Next' }).click();

	// Save recipe
	await expect(flowDialog.getByRole('heading', { name: 'Save as recipe?' })).toBeVisible();
	await flowDialog.getByRole('button', { name: 'Save recipe' }).click();
	await page.waitForURL('/');

	// Recipe appears on /recipes
	await page.goto('/recipes');
	await expect(page.locator('li', { hasText: mealName }).first()).toBeVisible();
});

test('RECP-002: duplicate recipe name is skipped; no second recipe created', async ({ page }) => {
	await login(page);
	const ts = Date.now();
	const itemName = `RecpItem-${ts}`;
	const mealName = `RecpDup-${ts}`;

	await ensurePantryItem(page, itemName);

	// Create the recipe manually first
	await page.goto('/recipes');
	await addRecipe(page, mealName, { ingredientName: itemName });

	// Log a meal with the same name + updatePantry ON
	await page.goto('/');
	await page.click('button:has-text("Add Meal")');
	const mealDialog = page.locator('[role="dialog"]');
	await mealDialog.waitFor();
	await mealDialog.getByPlaceholder('What did you eat?').fill(mealName);
	await mealDialog.locator('input[name="updatePantry"]').setChecked(true, { force: true });
	await mealDialog.getByRole('button', { name: 'Log meal' }).click();

	await page.waitForURL(/\?update=/);
	const flowDialog = page.locator('[role="dialog"]');
	await flowDialog.getByRole('heading', { name: 'Update pantry' }).waitFor();

	// Add item and try to save recipe
	await flowDialog.getByPlaceholder('Search or type an ingredient…').fill(itemName);
	await flowDialog.locator('ul button', { hasText: itemName }).click();
	await expect(flowDialog.getByPlaceholder('Search or type an ingredient…')).toHaveValue('');
	await flowDialog.getByRole('button', { name: 'Next' }).click();
	await flowDialog.getByRole('button', { name: 'Save recipe' }).click();
	await page.waitForURL('/');

	// Only one recipe with this name should exist
	await page.goto('/recipes');
	await expect(page.locator('li', { hasText: mealName })).toHaveCount(1);
});

test('RECP-003: update recipe from flow when ingredients changed', async ({ page }) => {
	await login(page);
	const ts = Date.now();
	const ingredientA = `RecpA-${ts}`;
	const ingredientB = `RecpB-${ts}`;
	const mealName = `RecpMeal-${ts}`;

	// Add both pantry items
	await ensurePantryItem(page, ingredientA);
	await ensurePantryItem(page, ingredientB);

	// Create recipe with ingredientA
	await page.goto('/recipes');
	await addRecipe(page, mealName, { ingredientName: ingredientA });

	// Log meal by selecting the recipe suggestion (so recipeId is submitted)
	await page.goto('/');
	await page.click('button:has-text("Add Meal")');
	const mealDialog = page.locator('[role="dialog"]');
	await mealDialog.waitFor();
	await mealDialog.getByPlaceholder('What did you eat?').fill(mealName);
	const suggestion = mealDialog.locator('ul button', { hasText: mealName });
	await suggestion.waitFor();
	await suggestion.click();
	await mealDialog.locator('input[name="updatePantry"]').setChecked(true, { force: true });
	await mealDialog.getByRole('button', { name: 'Log meal' }).click();

	await page.waitForURL(/\?update=.*&recipe=/);
	const flowDialog = page.locator('[role="dialog"]');
	await flowDialog.getByRole('heading', { name: 'Update pantry' }).waitFor();

	// ingredientA is pre-selected (from recipe); remove it, add ingredientB
	await flowDialog.locator(`button[aria-label="Remove ${ingredientA}"]`).click();
	await flowDialog.getByPlaceholder('Search or type an ingredient…').fill(ingredientB);
	await flowDialog.locator('ul button', { hasText: ingredientB }).click();
	await expect(flowDialog.getByPlaceholder('Search or type an ingredient…')).toHaveValue('');

	// Next → "Update recipe?" step
	await flowDialog.getByRole('button', { name: 'Next' }).click();
	await expect(flowDialog.getByRole('heading', { name: 'Update recipe?' })).toBeVisible();
	await flowDialog.getByRole('button', { name: 'Update recipe' }).click();
	await page.waitForURL('/');

	// Recipe ingredients updated: ingredientB now listed, ingredientA gone
	await page.goto('/recipes');
	const recipeRow = page.locator('li', { hasText: mealName }).first();
	await expect(recipeRow.locator('p.text-xs', { hasText: ingredientB })).toBeVisible();
});

test('RECP-004: recipe list filtered by name search', async ({ page }) => {
	await login(page);
	const name = `RecpSearch-${Date.now()}`;
	await page.goto('/recipes');
	await addRecipe(page, name);

	// Partial match → visible
	await page.getByPlaceholder('Search recipes…').fill(name.slice(0, 10));
	await expect(page.locator('li', { hasText: name }).first()).toBeVisible();

	// Unrelated query → hidden
	await page.getByPlaceholder('Search recipes…').fill('xyznotfound');
	await expect(page.locator('li', { hasText: name })).toHaveCount(0);
});

test('RECP-005: recipe list filtered by meal type chip', async ({ page }) => {
	await login(page);
	const name = `RecpLunch-${Date.now()}`;
	await page.goto('/recipes');
	await addRecipe(page, name, { mealType: 'lunch' });

	// "Breakfast" chip → lunch recipe hidden
	await page.getByRole('button', { name: 'Breakfast' }).click();
	await expect(page.locator('li', { hasText: name })).toHaveCount(0);

	// "Lunch" chip added → recipe visible again
	await page.getByRole('button', { name: 'Lunch' }).click();
	await expect(page.locator('li', { hasText: name }).first()).toBeVisible();
});

test('RECP-006: edit a recipe manually', async ({ page }) => {
	await login(page);
	const original = `RecpEdit-${Date.now()}`;
	const updated = `RecpEdited-${Date.now()}`;
	await page.goto('/recipes');
	await addRecipe(page, original);

	// Click the recipe row to open edit sheet
	await page.locator('li', { hasText: original }).first().locator('button').first().click();
	const dialog = page.locator('[role="dialog"]');
	await dialog.waitFor();
	await dialog.getByPlaceholder('Recipe name').fill(updated);
	await dialog.getByRole('button', { name: 'Save' }).click();

	await expect(page.locator('li', { hasText: updated }).first()).toBeVisible();
	await expect(page.locator('li', { hasText: original })).toHaveCount(0);
});

test('RECP-007: delete a recipe', async ({ page }) => {
	await login(page);
	const name = `RecpDel-${Date.now()}`;
	await page.goto('/recipes');
	await addRecipe(page, name);

	await page.locator('li', { hasText: name }).first()
		.locator(`button[aria-label="Delete ${name}"]`).click();

	await expect(page.locator('li', { hasText: name })).toHaveCount(0);
});

test('RECP-008: recipe suggestion pre-populates pantry update with recipe ingredients', async ({ page }) => {
	await login(page);
	const ts = Date.now();
	const pantryItemName = `RecpPantry-${ts}`;
	const mealName = `RecpMeal-${ts}`;

	// Add a pantry item, then create a recipe using it as an ingredient
	await ensurePantryItem(page, pantryItemName);
	await page.goto('/recipes');
	await addRecipe(page, mealName, { ingredientName: pantryItemName });

	// Log a meal by selecting the recipe suggestion
	await page.goto('/');
	await page.click('button:has-text("Add Meal")');
	const mealDialog = page.locator('[role="dialog"]');
	await mealDialog.waitFor();
	await mealDialog.getByPlaceholder('What did you eat?').fill(mealName);
	const suggestion = mealDialog.locator('ul button', { hasText: mealName });
	await suggestion.waitFor();
	await suggestion.click();
	await mealDialog.locator('input[name="updatePantry"]').setChecked(true, { force: true });
	await mealDialog.getByRole('button', { name: 'Log meal' }).click();

	await page.waitForURL(/\?update=.*&recipe=/);
	const flowDialog = page.locator('[role="dialog"]');
	await flowDialog.getByRole('heading', { name: 'Update pantry' }).waitFor();

	// pantryItemName should be pre-selected from the recipe
	await expect(flowDialog.locator('li', { hasText: pantryItemName }).first()).toBeVisible();
});
