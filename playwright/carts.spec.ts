import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

// Covers: CART-001 through CART-011

async function createCart(page: any, name = `Cart-${Date.now()}`) {
	await page.goto('/shopping');
	await page.getByRole('button', { name: 'New cart' }).click();
	await page.waitForURL('/shopping/new');
	await page.getByPlaceholder('e.g. Whole Foods, Costco…').fill(name);
	await page.getByRole('button', { name: 'Create cart' }).click();
	await page.waitForURL(/\/shopping\/.+/);
	return name;
}

test('CART-001: rename a cart', async ({ page }) => {
	await login(page);
	const originalName = await createCart(page);

	// Navigate back to list and open rename page via pencil button
	await page.goto('/shopping');
	const listItem = page.locator('li', { hasText: originalName }).first();
	await expect(listItem).toBeVisible();
	await listItem.locator('button[type="button"]').click();
	await page.waitForURL(/\/shopping\/.+\/edit/);
	await expect(page.getByPlaceholder('e.g. Whole Foods, Costco…')).toBeVisible();

	// Rename it
	const newName = `Renamed-${Date.now()}`;
	const input = page.getByPlaceholder('e.g. Whole Foods, Costco…');
	await input.clear();
	await input.fill(newName);
	await page.getByRole('button', { name: 'Save' }).click();
	await page.waitForURL((url) => url.pathname === '/shopping');

	// New name should appear; old name gone
	await expect(page.locator('li', { hasText: newName }).first()).toBeVisible();
	await expect(page.locator('li', { hasText: originalName })).toHaveCount(0);
});

test('CART-002: add items to a cart via inline search', async ({ page }) => {
	await login(page);
	await createCart(page, `ShopSearch-${Date.now()}`);

	// Add a pantry item via pantry sub-route
	await page.goto('/pantry');
	await page.getByRole('button', { name: 'Add to Pantry' }).click();
	await page.waitForURL('/pantry/add');
	const pantryItem = `PantryForShop-${Date.now()}`;
	await page.getByPlaceholder('What did you buy?').fill(pantryItem);
	await page.getByRole('button', { name: 'Add item' }).click();
	await expect(page.locator('li', { hasText: pantryItem }).first()).toBeVisible();

	// Go to the cart and search for the pantry item
	await page.goto('/shopping');
	await page.locator('li').locator('a').first().click();
	await page.waitForURL(/\/shopping\/.+/);
	await page.getByPlaceholder('Search or type an item…').fill(pantryItem.slice(0, 6));
	await page.getByRole('button', { name: pantryItem }).click();
	await expect(page.locator('li', { hasText: pantryItem }).first()).toBeVisible();

	// Add a free-text item
	const freeItem = `FreeItem-${Date.now()}`;
	await page.getByPlaceholder('Search or type an item…').fill(freeItem);
	await page.getByRole('button', { name: `Add "${freeItem}" to cart` }).click();
	await expect(page.locator('li', { hasText: freeItem }).first()).toBeVisible();
});

test('CART-003: create cart redirects to detail and shows empty state', async ({ page }) => {
	await login(page);
	const name = await createCart(page);

	// Should be on the detail page
	await expect(page).toHaveURL(/\/shopping\/.+/);
	await expect(page.getByRole('heading', { name })).toBeVisible();
	await expect(page.getByText('No items yet')).toBeVisible();
});

test('CART-004: delete a cart', async ({ page }) => {
	await login(page);
	const name = await createCart(page);

	// Go back to list and open rename/edit page
	await page.goto('/shopping');
	const listItem = page.locator('li', { hasText: name }).first();
	await listItem.locator('button[type="button"]').click();
	await page.waitForURL(/\/shopping\/.+\/edit/);

	// Delete the cart
	await page.getByRole('button', { name: 'Delete' }).click();
	await page.waitForURL((url) => url.pathname === '/shopping');

	await expect(page.locator('li', { hasText: name })).toHaveCount(0);
});

test('CART-005: remove an item from a cart', async ({ page }) => {
	await login(page);
	await createCart(page);

	// Add a free-text item
	const item = `RemoveMe-${Date.now()}`;
	await page.getByPlaceholder('Search or type an item…').fill(item);
	await page.getByRole('button', { name: `Add "${item}" to cart` }).click();
	await expect(page.locator('li', { hasText: item }).first()).toBeVisible();

	// Click the X button to remove it
	await page.getByRole('button', { name: `Remove ${item}` }).click();

	await expect(page.locator('li', { hasText: item })).toHaveCount(0);
});

test('CART-006: toggling item as shopped moves it to Picked Up and shows Checkout', async ({ page }) => {
	await login(page);
	await createCart(page);

	const item = `ShopMe-${Date.now()}`;
	await page.getByPlaceholder('Search or type an item…').fill(item);
	await page.getByRole('button', { name: `Add "${item}" to cart` }).click();
	await expect(page.locator('li', { hasText: item }).first()).toBeVisible();

	// Picked Up section and Checkout button should not be visible yet
	await expect(page.getByText(/Picked up/i)).not.toBeVisible();
	await expect(page.getByRole('button', { name: 'Checkout' })).not.toBeVisible();

	// Mark as picked up
	await page.getByRole('button', { name: `Mark ${item} as picked up` }).click();

	// Item should move to Picked Up section; Checkout FAB should appear
	await expect(page.getByText(/Picked up \(1\)/i)).toBeVisible();
	await expect(page.getByRole('button', { name: 'Checkout' })).toBeVisible();
});

test('CART-007: checkout writes item to pantry and clears cart', async ({ page }) => {
	await login(page);
	await createCart(page);

	const item = `BuyMe-${Date.now()}`;
	await page.getByPlaceholder('Search or type an item…').fill(item);
	await page.getByRole('button', { name: `Add "${item}" to cart` }).click();
	await expect(page.locator('li', { hasText: item }).first()).toBeVisible();

	// Mark as picked up
	await page.getByRole('button', { name: `Mark ${item} as picked up` }).click();
	await expect(page.getByRole('button', { name: 'Checkout' })).toBeVisible();

	// Checkout
	await page.getByRole('button', { name: 'Checkout' }).click();

	// Toast confirmation and cart is empty
	await expect(page.getByText('Added to pantry')).toBeVisible();
	await expect(page.getByText('No items yet')).toBeVisible();

	// Item should appear in pantry
	await page.goto('/pantry');
	await expect(page.locator('li', { hasText: item }).first()).toBeVisible();
});

test('CART-008: progress counter on list page reflects shopped vs total', async ({ page }) => {
	await login(page);
	const cartName = await createCart(page);

	// Add two items
	const itemA = `ProgressA-${Date.now()}`;
	const itemB = `ProgressB-${Date.now()}`;
	await page.getByPlaceholder('Search or type an item…').fill(itemA);
	await page.getByRole('button', { name: `Add "${itemA}" to cart` }).click();
	await expect(page.locator('li', { hasText: itemA }).first()).toBeVisible();
	await page.getByPlaceholder('Search or type an item…').fill(itemB);
	await page.getByRole('button', { name: `Add "${itemB}" to cart` }).click();
	await expect(page.locator('li', { hasText: itemB }).first()).toBeVisible();

	// Go to list page — should show 0/2
	await page.goto('/shopping');
	await expect(page.locator('li', { hasText: cartName }).first()).toContainText('0/2');

	// Mark one item as shopped
	await page.locator('li', { hasText: cartName }).first().locator('a').click();
	await page.getByRole('button', { name: `Mark ${itemA} as picked up` }).click();

	// Go back — should show 1/2
	await page.goto('/shopping');
	await expect(page.locator('li', { hasText: cartName }).first()).toContainText('1/2');
});

test('CART-009: duplicate item not added when already in cart', async ({ page }) => {
	await login(page);
	await createCart(page);

	const item = `DupeTest-${Date.now()}`;

	// Add item once
	await page.getByPlaceholder('Search or type an item…').fill(item);
	await page.getByRole('button', { name: `Add "${item}" to cart` }).click();
	await expect(page.locator('li', { hasText: item }).first()).toBeVisible();

	// Try adding again — free-text option should not appear (exact match suppresses it)
	await page.getByPlaceholder('Search or type an item…').fill(item);
	await expect(page.getByRole('button', { name: `Add "${item}" to cart` })).not.toBeVisible();

	// Item still appears exactly once
	await expect(page.locator('li', { hasText: item })).toHaveCount(1);
});

test('CART-010: clicking a cart row on the list page navigates to the cart detail page', async ({ page }) => {
	await login(page);
	const name = await createCart(page);

	// Go back to the list page and click the cart row (the <a> link, not the pencil)
	await page.goto('/shopping');
	await page.locator('li', { hasText: name }).first().locator('a').click();

	await expect(page).toHaveURL(/\/shopping\/.+/);
	await expect(page.getByRole('heading', { name })).toBeVisible();
});

test('CART-011: FAB navigates to /shopping/new and ESC returns to list', async ({ page }) => {
	await login(page);
	await page.goto('/shopping');
	await page.getByRole('button', { name: 'New cart' }).click();
	await page.waitForURL('/shopping/new');
	await expect(page.getByPlaceholder('e.g. Whole Foods, Costco…')).toBeVisible();
	// ESC navigates back
	await page.keyboard.press('Escape');
	await page.waitForURL('/shopping');
});
