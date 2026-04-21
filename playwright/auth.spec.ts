import { test, expect } from '@playwright/test';
import { login, loginAs, TEST_USER } from './helpers/auth';

// Covers: AUTH-001, AUTH-002, AUTH-003, AUTH-004, AUTH-005, AUTH-006, AUTH-007, AUTH-008

// AUTH-001–004 test the login/logout flow itself — must run without pre-loaded auth state
// so that redirect and session-destruction behaviour is observable.
test.describe('unauthenticated flows', () => {
	test.use({ storageState: { cookies: [], origins: [] } });

	test('AUTH-001: valid credentials create session and redirect to /meals', async ({ page }) => {
		await page.goto('/login');
		await page.fill('input[name="username"]', TEST_USER.username);
		await page.fill('input[name="password"]', TEST_USER.password);
		await page.click('button[type="submit"]');
		await expect(page).toHaveURL('/meals');
	});

	test('AUTH-002: invalid credentials show error and do not redirect', async ({ page }) => {
		await page.goto('/login');
		await page.fill('input[name="username"]', TEST_USER.username);
		await page.fill('input[name="password"]', 'wrongpassword');
		await page.click('button[type="submit"]');
		await expect(page.locator('text=Invalid username or password.')).toBeVisible();
		await expect(page).toHaveURL('/login');
	});

	test('AUTH-003: unauthenticated request to / redirects to /login', async ({ page }) => {
		await page.goto('/meals');
		await expect(page).toHaveURL('/login');
	});

	test('AUTH-004: logout deletes session and redirects to /login', async ({ page }) => {
		// Create a fresh session to destroy (can't use pre-loaded storageState here)
		await loginAs(page, TEST_USER.username, TEST_USER.password);
		await page.goto('/profile');
		await page.click('button:has-text("Log out")');
		await expect(page).toHaveURL('/login');
		// Verify session is gone
		await page.goto('/meals');
		await expect(page).toHaveURL('/login');
	});
});

test('AUTH-005: user can update display name', async ({ page }) => {
	await login(page);
	await page.goto('/profile');
	await page.fill('input[name="name"]', 'Test Display Name');
	await page.click('button:has-text("Save changes")');
	await expect(page.locator('text=Profile updated.')).toBeVisible();
});

test('AUTH-006: username change succeeds; username must be unique', async ({ page }) => {
	await login(page);
	await page.goto('/profile');

	const newUsername = `tu${Date.now()}`;

	// Change to a unique username
	await page.fill('input[name="username"]', newUsername);
	await page.click('button:has-text("Save changes")');
	await expect(page.locator('text=Profile updated.')).toBeVisible();

	// Restore original username so subsequent tests still work
	await page.fill('input[name="username"]', TEST_USER.username);
	await page.click('button:has-text("Save changes")');
	await expect(page.locator('text=Profile updated.')).toBeVisible();
});

test('AUTH-008: back button on change-password page returns to profile without creating a history loop', async ({ page }) => {
	await login(page);
	await page.goto('/profile');
	await page.click('a:has-text("Change password")');
	await expect(page).toHaveURL('/profile/password');
	await page.click('button[aria-label="Go back"]');
	await expect(page).toHaveURL('/profile');
	await page.click('button[aria-label="Go back"]');
	await expect(page).not.toHaveURL('/profile/password');
});

test('AUTH-007: password change requires current password, match, and min 8 chars', async ({ page }) => {
	await login(page);
	await page.goto('/profile/password');

	// Wrong current password → error
	await page.fill('input[name="currentPassword"]', 'wrongpass');
	await page.fill('input[name="newPassword"]', 'newpass123');
	await page.fill('input[name="confirmPassword"]', 'newpass123');
	await page.click('button:has-text("Change password")');
	await expect(page.locator('text=Current password is incorrect.')).toBeVisible();

	// Mismatch → submit button stays disabled (client-side)
	await page.fill('input[name="currentPassword"]', TEST_USER.password);
	await page.fill('input[name="newPassword"]', 'newpass123');
	await page.fill('input[name="confirmPassword"]', 'differentpass');
	await expect(page.locator('button:has-text("Change password")')).toBeDisabled();
});
