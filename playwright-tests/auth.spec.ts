import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('User Authentication', () => {

    test('TC004: Login with wrong password shows error', async ({ page }) => {
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"]', 'user.demo@lovask.local');
        await page.fill('input[type="password"]', 'WrongPassword123!');
        await page.click('button[type="submit"]'); // Adjust selector as needed based on code check

        // Expect error message
        // Note: Selectors might need adjustment based on actual UI
        // Target the error alert div specifically
        await expect(page.locator('.text-red-200')).toBeVisible();
    });

    test('TC003: Login with valid credentials redirects to feed', async ({ page }) => {
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"]', 'user.demo@lovask.local');
        await page.fill('input[type="password"]', 'LovaskUser#2026!');
        await page.click('button[type="submit"]');

        // Expect redirection to feed or onboarding
        await expect(page).toHaveURL(/.*\/feed|.*\/onboarding/);
    });

    test('TC006: Logout redirects to login', async ({ page }) => {
        // Login first
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"]', 'user.demo@lovask.local');
        await page.fill('input[type="password"]', 'LovaskUser#2026!');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/.*\/feed|.*\/onboarding/);

        // Go to settings
        await page.goto(`${BASE_URL}/settings`);

        // Click Logout - assuming there is a button with text "Çıkış Yap" or similar since code is Turkish
        // Need to verify settings page content for logout button text.
        // For now, I'll assume "Çıkış" or "Logout". I will check if it fails.
        await page.click('button:has-text("Çıkış"), button:has-text("Logout"), button:has-text("Log out")');

        // Expect redirection to login
        await expect(page).toHaveURL(/.*\/login/);
    });

});
