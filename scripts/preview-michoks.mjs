import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { startServer } from '../dev-server.mjs';

const server = startServer(4174);
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
try {
  await mkdir('test-results/michoks-preview', { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:4174/michoks.html');
  const images = await page.evaluate(async () => {
    await document.fonts.ready;
    return Promise.all([...document.images].map(async (img) => {
      img.loading = 'eager';
      try { await img.decode(); return { src: img.getAttribute('src'), loaded: true }; }
      catch { return { src: img.getAttribute('src'), loaded: false }; }
    }));
  });
  await page.locator('.product-card').last().scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: 'test-results/michoks-preview/desktop.png', fullPage: true });
  await page.screenshot({ path: 'test-results/michoks-preview/desktop-top.png' });
  await page.locator('[data-add-product="1"]').click();
  await page.locator('.cart-button').click();
  await page.screenshot({ path: 'test-results/michoks-preview/cart.png' });
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((img) => { img.loading = 'eager'; return img.decode().catch(() => {}); }));
  });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: 'test-results/michoks-preview/mobile.png', fullPage: true });
  await page.screenshot({ path: 'test-results/michoks-preview/mobile-top.png' });
  await page.locator('#catalogo').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/michoks-preview/mobile-catalog.png' });
  console.log(JSON.stringify({ errors, brokenImages: images.filter((img) => !img.loaded), desktop: 'test-results/michoks-preview/desktop.png', mobile: 'test-results/michoks-preview/mobile.png' }));
} finally {
  await browser.close();
  server.close();
}
