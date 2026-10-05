import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('gestor de tareas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tareas.html');
  });

  test('crea, completa, filtra y conserva tareas', async ({ page }) => {
    const taskName = 'Preparar entrega final';
    await page.getByRole('button', { name: /Nueva tarea/ }).click();
    await page.getByLabel('¿Qué necesitas hacer?').fill(taskName);
    await page.getByLabel('Categoría').selectOption('Estudio');
    await page.getByLabel('Fecha límite').fill('2027-01-20');
    await page.getByRole('button', { name: /Añadir tarea/ }).click();

    const task = page.getByRole('listitem').filter({ hasText: taskName });
    await expect(task).toBeVisible();
    await expect(page.locator('#pending-total')).toHaveText('4');
    await task.getByRole('button', { name: `Completar "${taskName}"` }).click();
    await page.locator('[data-filter="completed"]').click();
    await expect(task).toBeVisible();
    await expect(page.locator('#progress-percent')).toHaveText('40');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-filter="completed"]').click();
    await expect(page.getByRole('listitem').filter({ hasText: taskName })).toBeVisible();
  });

  test('busca y elimina tareas', async ({ page }) => {
    await page.getByRole('searchbox', { name: 'Buscar tareas' }).fill('curso');
    await expect(page.getByRole('listitem')).toHaveCount(1);
    await expect(page.getByRole('listitem')).toContainText('curso');
    await page.getByRole('searchbox', { name: 'Buscar tareas' }).fill('');
    await page.getByRole('button', { name: 'Eliminar "Revisar propuesta del proyecto"' }).click();
    await expect(page.getByRole('listitem')).toHaveCount(3);
  });

  test('cumple reglas automatizables WCAG 2.2 AA', async ({ page }) => {
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);
  });

  for (const width of [320, 390, 768, 1440]) {
    test(`se adapta sin overflow a ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const dimensions = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(dimensions.scrollWidth, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.clientWidth);
    });
  }
});
