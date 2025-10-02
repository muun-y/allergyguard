import { test, expect } from '@playwright/test';

test('should redirect to login page on home visit', async ({ page }) => {
  await page.goto('/'); 
  
  await expect(page).toHaveURL(/\/login$/);


  await expect(page.getByPlaceholder(/email/i)).toBeVisible();
  await expect(page.getByPlaceholder(/password/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /log in/i })).toBeVisible();
});