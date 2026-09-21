import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('catálogo Michoks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/michoks.html');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('muestra un catálogo visual y filtra productos por categoría', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Elige algo');
    await expect(page.locator('.product-card')).toHaveCount(12);
    await page.getByRole('button', { name: /Whisky 3/ }).click();
    await expect(page.locator('.product-card')).toHaveCount(3);
    await expect(page.locator('.product-card').first()).toContainText('Whisky');
  });

  test('busca, abre la galería de producto y cambia de imagen', async ({ page }) => {
    await page.locator('#product-search').fill('Gin Mare');
    await expect(page.locator('.product-card')).toHaveCount(1);
    await page.getByRole('button', { name: 'Vista rápida' }).click();
    await expect(page.locator('#product-dialog')).toBeVisible();
    await expect(page.locator('.dialog-thumb')).toHaveCount(4);
    await page.locator('.dialog-thumb').nth(1).click();
    await expect(page.locator('.dialog-thumb').nth(1)).toHaveClass(/is-selected/);
  });

  test('añade productos, actualiza cantidad y calcula el total del carrito', async ({ page }) => {
    await page.locator('[data-add-product="1"]').click();
    await page.locator('[data-add-product="1"]').click();
    await expect(page.locator('#cart-count')).toHaveText('2');
    await page.locator('.cart-button').click();
    await expect(page.locator('#cart-drawer')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.locator('#cart-total')).toHaveText('$119.80');
    await page.getByRole('button', { name: 'Reducir Whisky Glenfiddich 12' }).click();
    await expect(page.locator('#cart-count')).toHaveText('1');
    await expect(page.locator('#cart-total')).toHaveText('$59.90');
  });

  test('cumple accesibilidad automatizada y no desborda en móvil', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/michoks.html');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);
    const layout = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(layout.overflow, JSON.stringify(layout)).toBe(false);
  });
});