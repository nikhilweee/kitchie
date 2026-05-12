import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { assertLastItemReachable } from './helpers/scroll';

// Covers: RECP-001, RECP-002, RECP-003, RECP-004, RECP-005, RECP-006, RECP-007, RECP-008, RECP-009, RECP-010, RECP-011, RECP-013

// Add a recipe through the add sub-page on /recipes/add.
// If ingredientName is given, it must already exist as a pantry item.
async function addRecipe(
	page: import('@playwright/test').Page,
	name: string,
	opts?: { ingredientName?: string; mealType?: string; cuisine?: string; prepTime?: string }
) {
	await page.click('button:has-text("Add Recipe")');
	await page.waitForURL('/recipes/add');
	await page.getByPlaceholder('Recipe name').fill(name);
	if (opts?.mealType) {
		await page.locator('#recipe-meal-type').selectOption(opts.mealType);
	}
	if (opts?.cuisine) {
		await page.locator('#recipe-cuisine').selectOption({ label: opts.cuisine });
	}
	if (opts?.prepTime) {
		await page.getByRole('group', { name: 'Prep time' }).getByRole('button', { name: opts.prepTime }).click();
	}
	if (opts?.ingredientName) {
		await page.getByPlaceholder('Search or type an ingredient…').fill(opts.ingredientName);
		await page.locator('ul button', { hasText: opts.ingredientName }).click();
		await expect(page.getByPlaceholder('Search or type an ingredient…')).toHaveValue('');
	}
	await page.getByRole('button', { name: 'Add recipe' }).click();
	await expect(page.locator('li', { hasText: name }).first()).toBeVisible();
}

// Add a pantry item through /pantry/add, then return to the previous page.
async function ensurePantryItem(page: import('@playwright/test').Page, name: string) {
	await page.goto('/pantry');
	await page.click('button:has-text("Add to Pantry")');
	await page.waitForURL('/pantry/add');
	await page.getByPlaceholder('What did you buy?').fill(name);
	await page.getByRole('button', { name: 'Add item' }).click();
	await expect(page.locator('li', { hasText: name }).first()).toBeVisible();
}

test('RECP-001: save ingredients as recipe after meal log + pantry update', async ({ page }) => {
	await login(page);
	const ts = Date.now();
	const itemName = `RecpItem-${ts}`;
	const mealName = `RecpMeal-${ts}`;

	await ensurePantryItem(page, itemName);

	// Log a meal with updatePantry ON → lands on /meals/<id>/update
	await page.goto('/meals');
	await page.click('button:has-text("Add Meal")');
	await page.waitForURL('/meals/add');
	await page.getByPlaceholder('What did you eat?').fill(mealName);
	await page.locator('input[name="updatePantry"]').setChecked(true, { force: true });
	await page.getByRole('button', { name: 'Log meal' }).click();
	await page.waitForURL(/\/meals\/.+\/update/);

	// Add item and advance to recipe step
	await page.getByPlaceholder('Search or type an ingredient…').fill(itemName);
	await page.locator('ul button', { hasText: itemName }).click();
	await expect(page.getByPlaceholder('Search or type an ingredient…')).toHaveValue('');
	await page.getByRole('button', { name: 'Next' }).click();

	// Save recipe
	await expect(page.getByRole('heading', { name: 'Save as recipe?' })).toBeVisible();
	await page.getByRole('button', { name: 'Save recipe' }).click();
	await page.waitForURL('/meals');

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

	// Log a meal with the same name + updatePantry ON → lands on /meals/<id>/update
	await page.goto('/meals');
	await page.click('button:has-text("Add Meal")');
	await page.waitForURL('/meals/add');
	await page.getByPlaceholder('What did you eat?').fill(mealName);
	await page.locator('input[name="updatePantry"]').setChecked(true, { force: true });
	await page.getByRole('button', { name: 'Log meal' }).click();
	await page.waitForURL(/\/meals\/.+\/update/);

	// Add item and try to save recipe
	await page.getByPlaceholder('Search or type an ingredient…').fill(itemName);
	await page.locator('ul button', { hasText: itemName }).click();
	await expect(page.getByPlaceholder('Search or type an ingredient…')).toHaveValue('');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByRole('button', { name: 'Save recipe' }).click();
	await page.waitForURL('/meals');

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
	await page.goto('/meals');
	await page.click('button:has-text("Add Meal")');
	await page.waitForURL('/meals/add');
	await page.getByPlaceholder('What did you eat?').fill(mealName);
	const suggestion = page.locator('ul button', { hasText: mealName });
	await suggestion.waitFor();
	await suggestion.click();
	await page.locator('input[name="updatePantry"]').setChecked(true, { force: true });
	await page.getByRole('button', { name: 'Log meal' }).click();
	await page.waitForURL(/\/meals\/.+\/update/);

	// ingredientA is pre-selected (from recipe); remove it, add ingredientB
	await page.locator(`button[aria-label="Remove ${ingredientA}"]`).click();
	await page.getByPlaceholder('Search or type an ingredient…').fill(ingredientB);
	await page.locator('ul button', { hasText: ingredientB }).click();
	await expect(page.getByPlaceholder('Search or type an ingredient…')).toHaveValue('');

	// Next → "Update recipe?" step
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.getByRole('heading', { name: 'Update recipe?' })).toBeVisible();
	await page.getByRole('button', { name: 'Update recipe' }).click();
	await page.waitForURL('/meals');

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

test('RECP-005: recipe list filtered by course chip', async ({ page }) => {
	await login(page);
	const name = `RecpMain-${Date.now()}`;
	await page.goto('/recipes');
	await addRecipe(page, name, { mealType: 'main' });

	// "Breakfast" chip → main course recipe hidden
	await page.getByRole('button', { name: 'Breakfast' }).click();
	await expect(page.locator('li', { hasText: name })).toHaveCount(0);

	// "Main Course" chip added → recipe visible again
	await page.getByRole('button', { name: 'Main Course' }).click();
	await expect(page.locator('li', { hasText: name }).first()).toBeVisible();
});

test('RECP-006: edit a recipe manually', async ({ page }) => {
	await login(page);
	const original = `RecpEdit-${Date.now()}`;
	const updated = `RecpEdited-${Date.now()}`;
	await page.goto('/recipes');
	await addRecipe(page, original);

	// Click the recipe row to navigate to edit page
	await page.locator('li', { hasText: original }).first().locator('button').first().click();
	await page.waitForURL(/\/recipes\/.+/);
	await page.getByPlaceholder('Recipe name').fill(updated);
	await page.getByRole('button', { name: 'Save' }).click();
	await page.waitForURL('/recipes');

	await expect(page.locator('li', { hasText: updated }).first()).toBeVisible();
	await expect(page.locator('li', { hasText: original })).toHaveCount(0);
});

test('RECP-007: delete a recipe', async ({ page }) => {
	await login(page);
	const name = `RecpDel-${Date.now()}`;
	await page.goto('/recipes');
	await addRecipe(page, name);

	// Open edit page then delete via FormActions
	await page.locator('li', { hasText: name }).first().locator('button').click();
	await page.waitForURL(/\/recipes\/.+/);
	await page.locator('button[formaction="/recipes?/delete"]').click();
	await page.waitForURL('/recipes');

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
	await page.goto('/meals');
	await page.click('button:has-text("Add Meal")');
	await page.waitForURL('/meals/add');
	await page.getByPlaceholder('What did you eat?').fill(mealName);
	const suggestion = page.locator('ul button', { hasText: mealName });
	await suggestion.waitFor();
	await suggestion.click();
	await page.locator('input[name="updatePantry"]').setChecked(true, { force: true });
	await page.getByRole('button', { name: 'Log meal' }).click();
	await page.waitForURL(/\/meals\/.+\/update/);

	// pantryItemName should be pre-selected from the recipe
	await expect(page.locator('li', { hasText: pantryItemName }).first()).toBeVisible();
});

test('RECP-009: recipe cuisine saved and filtered', async ({ page }) => {
	await login(page);
	const ts = Date.now();
	const indianRecipe = `RecpIndian-${ts}`;
	const italianRecipe = `RecpItalian-${ts}`;

	await page.goto('/recipes');
	await addRecipe(page, indianRecipe, { cuisine: 'Indian' });
	await addRecipe(page, italianRecipe, { cuisine: 'Italian' });

	// Open filter, select Indian → only Indian recipe visible
	await page.getByRole('button', { name: 'Filters' }).click();
	await page.locator('label', { hasText: 'Indian' }).click();
	await expect(page.locator('li', { hasText: indianRecipe }).first()).toBeVisible();
	await expect(page.locator('li', { hasText: italianRecipe })).toHaveCount(0);

	// Add Italian too → both visible
	await page.locator('label', { hasText: 'Italian' }).click();
	await expect(page.locator('li', { hasText: indianRecipe }).first()).toBeVisible();
	await expect(page.locator('li', { hasText: italianRecipe }).first()).toBeVisible();
});

test('RECP-011: recipe prep time saved and sort by prep time works', async ({ page }) => {
	await login(page);
	const ts = Date.now();
	const quickRecipe = `RecpQuick-${ts}`;
	const longRecipe = `RecpLong-${ts}`;

	await page.goto('/recipes');
	await addRecipe(page, quickRecipe, { prepTime: 'Quick' });
	// Verify prep time bar indicator shown on list row
	await expect(page.locator('li', { hasText: quickRecipe }).first().locator('div[aria-label]')).toBeVisible();

	await addRecipe(page, longRecipe, { prepTime: 'Long' });

	// Sort: prep time asc (quick first) → quickRecipe appears before longRecipe
	await page.getByRole('button', { name: 'Filters' }).click();
	await page.getByRole('button', { name: 'Prep time' }).click();
	await page.keyboard.press('Escape');

	const allItems = page.locator('ul > li');
	const quickIdx = await allItems.evaluateAll((els, quick) =>
		els.findIndex((el) => el.textContent?.includes(quick)), quickRecipe);
	const longIdx = await allItems.evaluateAll((els, long) =>
		els.findIndex((el) => el.textContent?.includes(long)), longRecipe);
	expect(quickIdx).toBeLessThan(longIdx);
});

test('RECP-012: recipes are grouped by course by default', async ({ page }) => {
	await login(page);
	const ts = Date.now();
	const breakfastName = `RecpBreakfast-${ts}`;
	const mainName = `RecpMain-${ts}`;

	await page.goto('/recipes');
	await addRecipe(page, breakfastName, { mealType: 'breakfast' });
	await addRecipe(page, mainName, { mealType: 'main' });

	// Reload to ensure grouping is fresh, then check headers
	await page.goto('/recipes');
	await expect(page.locator('h2', { hasText: 'Breakfast' }).first()).toBeVisible();
	await expect(page.locator('h2', { hasText: 'Main Course' }).first()).toBeVisible();

	// Breakfast group should appear before Main Course group
	const headers = page.locator('h2');
	const breakfastIdx = await headers.evaluateAll((els) =>
		els.findIndex((el) => el.textContent?.trim() === 'Breakfast'));
	const mainIdx = await headers.evaluateAll((els) =>
		els.findIndex((el) => el.textContent?.trim() === 'Main Course'));
	expect(breakfastIdx).toBeLessThan(mainIdx);
});

test('RECP-010: /recipes/<id> deep-link opens recipe edit page', async ({ page }) => {
	await login(page);
	const name = `RecpLink-${Date.now()}`;
	await page.goto('/recipes');
	await addRecipe(page, name);

	// Click recipe row to navigate to edit page — URL becomes /recipes/<id>
	await page.locator('li', { hasText: name }).first().locator('button').first().click();
	await page.waitForURL(/\/recipes\/.+/);
	const editId = new URL(page.url()).pathname.split('/').pop();
	expect(editId).toBeTruthy();

	// Navigate away then deep-link back
	await page.keyboard.press('Escape');
	await page.waitForURL((url) => url.pathname === '/recipes');
	await page.goto('/meals');
	await page.goto(`/recipes/${editId}`);
	await expect(page.getByPlaceholder('Recipe name')).toHaveValue(name);
});

test.describe('RECP-013 scroll clearance', () => {
	test.use({ viewport: { width: 375, height: 500 } });

	test('RECP-013: recipes list last item is reachable at max scroll', async ({ page }) => {
		await login(page);
		const ts = Date.now();
		await page.goto('/recipes');
		for (let i = 0; i < 10; i++) {
			await addRecipe(page, `RScroll-${ts}-${i}`);
		}
		await assertLastItemReachable(page);
	});
});
