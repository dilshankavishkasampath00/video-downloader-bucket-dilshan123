const { test, expect } = require('@playwright/test');

test('homepage loads and shows download UI', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#urlInput')).toBeVisible();
  await expect(page.locator('#getBtn')).toHaveText('Get Media');
  await expect(page.locator('.nav-badge')).toBeVisible();
});

test('shows errors when URL is empty', async ({ page }) => {
  await page.goto('/');
  await page.click('#getBtn');
  await expect(page.locator('#errorMsg')).toContainText('Please paste a media URL first.');
});
