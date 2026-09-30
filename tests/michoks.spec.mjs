import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('catálogo Michoks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/michoks.html');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('muestra un catálogo visual y filtra productos por categoría', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Elige tu');
    await expect(page.locator('.product-card')).toHaveCount(11);
    await page.getByRole('button', { name: /Whiskys 3/ }).click();
    await expect(page.locator('.product-card')).toHaveCount(3);
    await expect(page.locator('.product-card').first()).toContainText('Whisky');
  });

  test('busca, abre la fotografía real y permite ampliar la etiqueta', async ({ page }) => {
    await page.locator('#product-search').fill('Club Verde');
    await expect(page.locator('.product-card')).toHaveCount(1);
    await page.getByRole('button', { name: /Vista rápida: Cerveza Club Verde/ }).click();
    await expect(page.locator('#product-dialog')).toBeVisible();
    await expect(page.locator('.dialog-thumb')).toHaveCount(2);
    await expect(page.locator('#dialog-main-image img')).toHaveAttribute('src', 'assets/products/club-verde.png');
    await page.locator('.dialog-thumb').nth(1).click();
    await expect(page.locator('.dialog-thumb').nth(1)).toHaveClass(/is-selected/);
    await expect(page.locator('#dialog-main-image')).toHaveClass(/view-1/);
  });

  test('añade productos, actualiza cantidad y calcula el total del carrito', async ({ page }) => {
    await page.locator('[data-add-product="1"]').click();
    await page.locator('[data-add-product="1"]').click();
    await expect(page.locator('#cart-count')).toHaveText('2');
    await page.locator('.cart-button').click();
    await expect(page.locator('#cart-drawer')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.locator('#cart-total')).toHaveText('$79.80');
    await page.getByRole('button', { name: 'Reducir Whisky Johnnie Walker Red Label' }).click();
    await expect(page.locator('#cart-count')).toHaveText('1');
    await expect(page.locator('#cart-total')).toHaveText('$39.90');
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

test.describe('rediseño Tailwind de MICHOKS', () => {
  test('las fotografías y las fuentes locales cargan sin red externa', async ({ page }) => {
    await page.route(/^https:\/\//, (route) => route.abort());
    await page.goto('/michoks.html');
    const assets = await page.evaluate(async () => {
      await document.fonts.ready;
      const images = await Promise.all([...document.querySelectorAll('#product-grid .product-photo')].map(async (img) => {
        img.loading = 'eager';
        await img.decode();
        return { source: img.getAttribute('src'), width: img.naturalWidth, alt: img.alt };
      }));
      return { images, fonts: [...document.fonts].filter((font) => font.status === 'loaded').map((font) => font.family) };
    });
    expect(assets.images).toHaveLength(11);
    expect(new Set(assets.images.map((img) => img.source)).size).toBe(11);
    for (const img of assets.images) {
      expect(img.source).toMatch(/^assets\/products\/.+\.(png|jpg)$/);
      expect(img.width).toBeGreaterThanOrEqual(300);
      expect(img.alt).toContain('fotografía');
    }
    expect(assets.fonts).toContain('Barlow Condensed');
    expect(assets.fonts).toContain('Manrope');
    await expect(page.locator('.photo-pending')).toHaveCount(0);
  });

  test('conserva el carrito y prepara una consulta al WhatsApp oficial sin confirmar el pedido', async ({ page }) => {
    await page.goto('/michoks.html');
    await page.locator('[data-add-product="1"]').click();
    await page.reload();
    await expect(page.locator('#cart-count')).toHaveText('1');
    await page.evaluate(() => { window.open = (url) => { window.consultaUrl = url; return null; }; });
    await page.locator('.cart-button').click();
    await page.locator('#checkout-button').click();
    const url = new URL(await page.evaluate(() => window.consultaUrl));
    expect(url.origin + url.pathname).toBe('https://wa.me/593959862988');
    expect(url.searchParams.get('text')).toContain('1 × Whisky Johnnie Walker Red Label (750 ml) — $39.90');
    expect(url.searchParams.get('text')).toContain('Total referencial: $39.90 USD.');
    await expect(page.locator('#checkout-status')).toContainText('aún no está confirmado');
    await expect(page.locator('#whatsapp-fallback')).toHaveAttribute('href', url.href);
    await page.keyboard.press('Escape');
    await expect(page.locator('.cart-button')).toBeFocused();
    await expect(page.locator('#cart-count')).toHaveText('1');
  });

  test('tolera almacenamiento corrupto y cantidades inválidas', async ({ page }) => {
    await page.goto('/michoks.html');
    for (const saved of ['invalid-json', 'null', '[]', '{"1":-2,"2":"3","3":99999,"500":1,"7":2}']) {
      await page.evaluate((value) => localStorage.setItem('michoks-cart', value), saved);
      await page.reload();
      await expect(page.locator('.product-card')).toHaveCount(11);
      await expect(page.locator('#cart-count')).toHaveText('0');
    }
    await page.locator('.cart-button').click();
    await expect(page.locator('#checkout-button')).toBeDisabled();
  });

  test('ordena por precio y permite recuperar una búsqueda sin resultados', async ({ page }) => {
    await page.goto('/michoks.html');
    await page.locator('#product-sort').selectOption('price-asc');
    await expect(page.locator('.product-card').first()).toContainText('Pilsener');
    await page.locator('#product-search').fill('jose');
    await expect(page.locator('.product-card')).toHaveCount(1);
    await expect(page.locator('.product-card')).toContainText('José Cuervo');
    await page.locator('#product-search').fill('inexistente');
    await expect(page.locator('#empty-products')).toBeVisible();
    await page.locator('#reset-filters').click();
    await expect(page.locator('.product-card')).toHaveCount(11);
    await expect(page.locator('#product-search')).toBeFocused();
  });

  test('los diálogos mantienen el foco y cumplen axe con el carrito abierto', async ({ page }) => {
    await page.goto('/michoks.html');
    await page.locator('[data-add-product="1"]').click();
    await page.locator('.cart-button').click();
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => document.querySelector('#cart-drawer').contains(document.activeElement))).toBe(true);
    }
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations).toEqual([]);
    await page.keyboard.press('Escape');
    await page.locator('[data-view-product="1"]').click();
    const detailResults = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(detailResults.violations).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-view-product="1"]')).toBeFocused();
  });

  for (const width of [320, 390, 768, 1440]) {
    test(`funciona sin recursos externos a ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.route(/^https:\/\//, (route) => route.abort());
      await page.goto('/michoks.html');
      await expect(page.locator('.product-card')).toHaveCount(11);
      expect(await page.locator('#product-grid').evaluate((grid) => getComputedStyle(grid).display)).toBe('grid');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await page.locator('.hero-photo').evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true);
      if (width < 768) {
        await page.getByRole('button', { name: 'Abrir menú' }).click();
        await expect(page.locator('#main-nav')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.locator('.menu-button')).toBeFocused();
        await expect(page.locator('#main-nav')).toBeHidden();
      }
      await page.locator('[data-add-product="1"]').click();
      await page.locator('.cart-button').click();
      await expect(page.locator('#cart-total')).toHaveText('$39.90');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }
});
