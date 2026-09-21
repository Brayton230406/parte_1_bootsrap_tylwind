import { test, expect } from '@playwright/test';

for (const pageName of ['online.html', 'offline.html']) {
  test.describe(`variante ${pageName}`, () => {
    test('mantiene la estructura, estilos y formulario funcional', async ({ page }) => {
      await page.goto(`/${pageName}`);

      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('#reservation-form')).toBeVisible();
      await expect(page.locator('link[href*="styles.css"]')).toHaveCount(1);

      if (pageName === 'online.html') {
        await expect(page.locator('link[href*="bootstrap@5.3.3"]')).toHaveCount(1);
        await expect(page.locator('script[src*="cdn.tailwindcss.com"]')).toHaveCount(1);
      } else {
        await expect(page.locator('link[href="vendor/bootstrap.min.css"]')).toHaveCount(1);
        await expect(page.locator('link[href="vendor/tailwind.css"]')).toHaveCount(1);
      }

      await page.locator('input[name="nombre"]').fill('Ana');
      await page.locator('input[name="telefono"]').fill('0999999999');
      await page.locator('input[name="fecha"]').fill('2099-01-01');
      await page.locator('button[type="submit"]').click();
      await expect(page.locator('#form-message')).toContainText('Gracias');
    });
  });
}