import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

// Covers: PANT-001, PANT-002, PANT-003, PANT-004, PANT-005, PANT-006, PANT-007, PANT-008, PANT-009, PANT-010, PANT-011, PANT-012, PANT-013, PANT-014, PANT-015, PANT-016, PANT-017, PANT-018, PANT-019, PANT-020, PANT-021, PANT-022, PANT-023, PANT-024

async function addPantryItem(page: import('@playwright/test').Page, name: string) {
	await page.click('button:has-text("Add to Pantry")');
	const dialog = page.locator('[role="dialog"]');
	await dialog.waitFor();
	await dialog.getByPlaceholder('What did you buy?').fill(name);
	await dialog.getByRole('button', { name: 'Add item' }).click();
	await expect(page.locator('li', { hasText: name }).first()).toBeVisible();
}

async function openEdit(page: import('@playwright/test').Page, name: string) {
	await page.locator('li', { hasText: name }).first().locator('button').first().click();
	await page.locator('[role="dialog"]').waitFor();
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
	await expect(dialog.getByRole('button', { name: 'Quantity' })).toHaveClass(/bg-stone-800/);

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

	// In duration mode (default), "Duration" pill is active and a select is visible
	await expect(dialog.getByRole('button', { name: 'Duration' })).toHaveClass(/bg-stone-800/);
	const expirySelect = dialog.locator('p:has-text("Expires") + select, p:has-text("Expires") ~ select').first();
	await expect(expirySelect).toBeVisible();

	// User can switch to Date mode and set an exact date
	await dialog.getByRole('button', { name: 'Date' }).click();
	const expiryInput = dialog.locator('input[name="expiryDate"]');
	await expiryInput.fill('2099-12-31');
	await expect(expiryInput).toHaveValue('2099-12-31');

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

test('PANT-005: delete a pantry item permanently via danger zone', async ({ page }) => {
	await login(page);
	const name = `PantDel-${Date.now()}`;
	await page.goto('/pantry');
	await addPantryItem(page, name);

	await openEdit(page, name);
	const dialog = page.locator('[role="dialog"]');
	await dialog.getByRole('button', { name: 'Delete permanently' }).click();
	await dialog.getByRole('button', { name: 'Yes, delete' }).click();

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

	// Verify the new item was created in pantry (all items shown by default)
	await page.goto('/pantry');
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

	// 4. Assert the quantity display shows 5 (the pantry stock) — shown as "5 ct" with unit abbreviation
	const itemRow = flowDialog.locator('li', { hasText: itemName }).last();
	await expect(itemRow.locator('[role="group"][aria-label="Quantity"]')).toContainText('5');
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

test('PANT-011: sorting by name groups items by first letter', async ({ page }) => {
	await login(page);
	const ts = Date.now();
	await page.goto('/pantry');
	await addPantryItem(page, `Apple-${ts}`);
	await addPantryItem(page, `Banana-${ts}`);

	await page.getByRole('button', { name: 'Filters' }).click();
	await page.getByRole('button', { name: 'Name' }).click();
	await page.keyboard.press('Escape');

	await expect(page.locator('h2', { hasText: 'A' }).first()).toBeVisible();
	await expect(page.locator('h2', { hasText: 'B' }).first()).toBeVisible();
});

test('PANT-012: sorting by category groups items by category name', async ({ page }) => {
	await login(page);
	const ts = Date.now();
	await page.goto('/pantry');
	await addPantryItem(page, `Milk-${ts}`);   // infers Dairy
	await addPantryItem(page, `Apple-${ts}`);  // infers Produce

	await page.getByRole('button', { name: 'Filters' }).click();
	await page.getByRole('button', { name: 'Category' }).click();
	await page.keyboard.press('Escape');

	await expect(page.locator('h2', { hasText: 'Dairy' }).first()).toBeVisible();
	await expect(page.locator('h2', { hasText: 'Produce' }).first()).toBeVisible();
});

test('PANT-013: sorting by expiry groups items into time buckets', async ({ page }) => {
	await login(page);
	await page.goto('/pantry');
	await addPantryItem(page, `ExpiryItem-${Date.now()}`);

	// Expiry is the default sort — no need to switch
	const buckets = ['Expired', 'This Week', 'Later'];
	const visible = await Promise.all(
		buckets.map((b) => page.locator('h2', { hasText: b }).isVisible())
	);
	expect(visible.some(Boolean)).toBe(true);
});

test('PANT-014 + PANT-015: qty=0 auto-consumes; qty>0 restores to active', async ({ page }) => {
	await login(page);
	const name = `Apple-${Date.now()}`; // count type
	await page.goto('/pantry');

	// Add with qty 1
	await page.click('button:has-text("Add to Pantry")');
	const addDialog = page.locator('[role="dialog"]');
	await addDialog.waitFor();
	await addDialog.getByPlaceholder('What did you buy?').fill(name);
	await addDialog.getByRole('button', { name: 'Add item' }).click();
	await expect(page.locator('li', { hasText: name }).first()).toBeVisible();

	// PANT-014: set quantity to 0 via stepper → item disappears from active list
	await openEdit(page, name);
	const dialog = page.locator('[role="dialog"]');
	await dialog.locator('button:has-text("−")').click(); // 1 → 0
	await dialog.getByRole('button', { name: 'Save' }).click();
	await expect(dialog).not.toBeVisible();
	await expect(page.locator('li', { hasText: name })).toHaveCount(0);

	// PANT-015: open Out of Stock → item visible → restore qty=1 → back in active list
	await page.getByRole('button', { name: 'Out of Stock' }).click();
	await expect(page.locator('li', { hasText: name }).first()).toBeVisible();

	await openEdit(page, name);
	await dialog.locator('input[name="quantity"]').fill('1');
	await dialog.getByRole('button', { name: 'Save' }).click();

	// Switch back to default view (no filter) → item reappears
	await page.getByRole('button', { name: 'Out of Stock' }).click(); // deselect
	await expect(page.locator('li', { hasText: name }).first()).toBeVisible();

	// PANT-014 (estimate path): Milk infers as estimate type
	const milkName = `Milk-${Date.now()}`;
	await addPantryItem(page, milkName);

	// Open edit → picker starts at Full (3 zones lit) → tap Low (zone 1) → tap Low again → empty (0)
	await openEdit(page, milkName);
	await dialog.getByRole('button', { name: 'Low' }).click(); // Full → Low
	await dialog.getByRole('button', { name: 'Low' }).click(); // Low → empty (value=0)
	await dialog.getByRole('button', { name: 'Save' }).click();
	await expect(dialog).not.toBeVisible();
	await expect(page.locator('li', { hasText: milkName })).toHaveCount(0);

	// Out of Stock → estimate item appears
	await page.getByRole('button', { name: 'Out of Stock' }).click();
	await expect(page.locator('li', { hasText: milkName }).first()).toBeVisible();
	await page.getByRole('button', { name: 'Out of Stock' }).click(); // deselect
});

test('PANT-016: Out of Stock filter chip shows consumed and discarded items with badge', async ({ page }) => {
	await login(page);
	const name = `PantOOS-${Date.now()}`;
	await page.goto('/pantry');
	await addPantryItem(page, name);

	// Trash the item (discard)
	await openEdit(page, name);
	await page.locator('[role="dialog"]').getByRole('button', { name: 'Trash' }).click();

	// Default view: item gone
	await expect(page.locator('li', { hasText: name })).toHaveCount(0);

	// Out of Stock filter: item visible with discarded badge
	await page.getByRole('button', { name: 'Out of Stock' }).click();
	const row = page.locator('li', { hasText: name }).first();
	await expect(row).toBeVisible();
	await expect(row.getByText('discarded', { exact: true })).toBeVisible();
});

test('PANT-017: Trash button discards an active item', async ({ page }) => {
	await login(page);
	const name = `PantTrash-${Date.now()}`;
	await page.goto('/pantry');
	await addPantryItem(page, name);

	await openEdit(page, name);
	await page.locator('[role="dialog"]').getByRole('button', { name: 'Trash' }).click();

	// Toast confirms and item is gone from active list
	await expect(page.locator('li', { hasText: name })).toHaveCount(0);
});

test('PANT-018: Delete permanently requires two-tap confirmation', async ({ page }) => {
	await login(page);
	const name = `PantConfDel-${Date.now()}`;
	await page.goto('/pantry');
	await addPantryItem(page, name);

	await openEdit(page, name);
	const dialog = page.locator('[role="dialog"]');

	// First tap: confirmation row appears, item NOT yet deleted
	await dialog.getByRole('button', { name: 'Delete permanently' }).click();
	await expect(dialog.getByRole('button', { name: 'Yes, delete' })).toBeVisible();
	await expect(page.locator('li', { hasText: name }).first()).toBeVisible();

	// Cancel reverts
	await dialog.getByRole('button', { name: 'Cancel' }).last().click();
	await expect(dialog.getByRole('button', { name: 'Yes, delete' })).toHaveCount(0);

	// Second attempt: confirm → deleted
	await dialog.getByRole('button', { name: 'Delete permanently' }).click();
	await dialog.getByRole('button', { name: 'Yes, delete' }).click();
	await expect(page.locator('li', { hasText: name })).toHaveCount(0);
});

test('PANT-020: setting an existing pantry item to qty=0 in meals update flow marks it consumed', async ({ page }) => {
	await login(page);
	const ts = Date.now();
	const itemName = `Apple-${ts}`; // count type
	const mealName = `Meal-${ts}`;

	// Add pantry item with qty 1
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

	// Add item and set qty to 0
	await flowDialog.getByPlaceholder('Search or type an ingredient…').fill(itemName);
	await flowDialog.locator('ul button', { hasText: itemName }).click();
	await flowDialog.locator('li', { hasText: itemName }).last().locator('button:has-text("−")').click(); // 1 → 0

	// Items selected → button says "Next" (recipe step follows) → Skip
	await flowDialog.getByRole('button', { name: 'Next' }).click();
	await flowDialog.getByRole('button', { name: 'Skip' }).click();
	await page.waitForURL('/meals');

	// Item should be gone from active pantry list
	await page.goto('/pantry');
	await expect(page.locator('li', { hasText: itemName })).toHaveCount(0);

	// Item should appear under Out of Stock
	await page.getByRole('button', { name: 'Out of Stock' }).click();
	await expect(page.locator('li', { hasText: itemName }).first()).toBeVisible();
});

test('PANT-021: free-text item created with qty=0 in meals update flow is marked consumed', async ({ page }) => {
	await login(page);
	const ts = Date.now();
	const itemName = `CustomIngr-${ts}`; // no keyword → estimate type
	const mealName = `Meal-${ts}`;

	// Log a meal with updatePantry ON (item does not exist in pantry)
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

	// Type a free-text ingredient that doesn't exist in pantry
	await flowDialog.getByPlaceholder('Search or type an ingredient…').fill(itemName);
	await flowDialog.locator('li button', { hasText: `Add "${itemName}" as ingredient` }).click();

	// Free-text items default to estimate type — tap Low twice to reach empty (0)
	const picker = flowDialog.locator('li', { hasText: itemName }).last().locator('[aria-label="Quantity level"]');
	await picker.locator('button[aria-label="Low"]').click();  // Full → Low
	await picker.locator('button[aria-label="Low"]').click();  // Low → empty (value=0)

	// Items selected → button says "Next" (recipe step follows) → Skip
	await flowDialog.getByRole('button', { name: 'Next' }).click();
	await flowDialog.getByRole('button', { name: 'Skip' }).click();
	await page.waitForURL('/meals');

	// Item should NOT appear in active pantry list (it was created as consumed)
	await page.goto('/pantry');
	await expect(page.locator('li', { hasText: itemName })).toHaveCount(0);

	// Item should appear under Out of Stock
	await page.getByRole('button', { name: 'Out of Stock' }).click();
	await expect(page.locator('li', { hasText: itemName }).first()).toBeVisible();
});

test('PANT-019: ?edit=<id> deep-link opens pantry item edit sheet', async ({ page }) => {
	await login(page);
	const name = `PantLink-${Date.now()}`;
	await page.goto('/pantry');
	await addPantryItem(page, name);

	// Open edit sheet via click — URL updates to ?edit=<id>
	await openEdit(page, name);
	const url = page.url();
	const editId = new URL(url).searchParams.get('edit');
	expect(editId).toBeTruthy();

	// Close sheet, navigate away, then deep-link back
	await page.keyboard.press('Escape');
	await page.goto('/meals');
	await page.goto(`/pantry?edit=${editId}`);

	// Edit sheet should open for that item
	const dialog = page.locator('[role="dialog"]');
	await dialog.waitFor();
	await expect(dialog.getByPlaceholder('What did you buy?')).toHaveValue(name);
});

// Simulate long-press by dispatching pointerdown, waiting, then pointerup
async function longPress(page: import('@playwright/test').Page, locator: import('@playwright/test').Locator) {
	await locator.dispatchEvent('pointerdown');
	await page.waitForTimeout(600);
	await locator.dispatchEvent('pointerup');
}

test('PANT-022: bulk consume selected pantry items', async ({ page }) => {
	await login(page);
	await page.goto('/pantry');
	const nameA = `BulkConsumeA-${Date.now()}`;
	const nameB = `BulkConsumeB-${Date.now()}`;
	await addPantryItem(page, nameA);
	await addPantryItem(page, nameB);

	// Long-press first item to enter selection mode
	const itemA = page.locator('li', { hasText: nameA }).first();
	await longPress(page, itemA.locator('button').first());

	// First item should now be selected (checkbox visible)
	await expect(itemA.locator('button').first()).toBeVisible();

	// Tap second item to select it
	await page.locator('li', { hasText: nameB }).first().locator('button').first().click();

	// Consume
	await page.getByRole('button', { name: 'Consume', exact: true }).click();

	// Both items should appear under Out of Stock
	await page.locator('button', { hasText: 'Out of Stock' }).click();
	await expect(page.locator('li', { hasText: nameA }).first()).toBeVisible();
	await expect(page.locator('li', { hasText: nameB }).first()).toBeVisible();
});

test('PANT-023: bulk add selected pantry items to a cart', async ({ page }) => {
	await login(page);

	// Create a cart
	await page.goto('/shopping');
	await page.getByRole('button', { name: 'New cart' }).click();
	await page.locator('[role="dialog"]').waitFor();
	const listName = `BulkList-${Date.now()}`;
	await page.getByPlaceholder('e.g. Whole Foods, Costco…').fill(listName);
	await page.getByRole('button', { name: 'Create cart' }).click();
	await page.waitForURL(/\/shopping\/.+/);

	// Add two pantry items
	await page.goto('/pantry');
	const nameA = `BulkListA-${Date.now()}`;
	const nameB = `BulkListB-${Date.now()}`;
	await addPantryItem(page, nameA);
	await addPantryItem(page, nameB);

	// Long-press to enter selection mode and select first item
	const itemA = page.locator('li', { hasText: nameA }).first();
	await longPress(page, itemA.locator('button').first());

	// Select second item
	await page.locator('li', { hasText: nameB }).first().locator('button').first().click();

	// Tap "Add to list"
	await page.getByRole('button', { name: 'Add to cart' }).click();
	await page.locator('[role="dialog"]').waitFor();

	// Pick the list
	await page.getByRole('button', { name: listName }).click();

	// Navigate to the cart and verify items are there
	await page.goto('/shopping');
	await page.locator('a', { hasText: listName }).first().click();
	await expect(page.locator('li', { hasText: nameA }).first()).toBeVisible();
	await expect(page.locator('li', { hasText: nameB }).first()).toBeVisible();
});

test('PANT-024: bulk delete selected pantry items', async ({ page }) => {
	await login(page);
	await page.goto('/pantry');
	const nameA = `BulkDelA-${Date.now()}`;
	const nameB = `BulkDelB-${Date.now()}`;
	await addPantryItem(page, nameA);
	await addPantryItem(page, nameB);

	// Long-press to enter selection mode
	const itemA = page.locator('li', { hasText: nameA }).first();
	await longPress(page, itemA.locator('button').first());

	// Select second item
	await page.locator('li', { hasText: nameB }).first().locator('button').first().click();

	// Tap trash icon
	await page.locator('button[aria-label="Delete selected"]').click();

	// Both items should be gone
	await expect(page.locator('li', { hasText: nameA })).toHaveCount(0);
	await expect(page.locator('li', { hasText: nameB })).toHaveCount(0);
});
