import { test, expect } from '@playwright/test';

async function loadSavedPage(page: import('@playwright/test').Page, pageNumber: number) {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.evaluate(number => localStorage.setItem('cats-rebuild-page', String(number - 1)), pageNumber);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByTestId('page-counter')).toHaveText(`${pageNumber} / 249`);
}

test('reader exposes accessible ebook navigation and keyboard page turns', async ({ page }) => {
  await loadSavedPage(page, 10);
  const surface = page.getByTestId('reader-surface');
  await expect(surface).toHaveAttribute('role', 'region');
  await expect(surface).toHaveAttribute('aria-describedby', 'reader-instructions');
  await expect(surface).toHaveAttribute('aria-label', /página 10 de 249/i);

  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('page-counter')).toHaveText('11 / 249');
  await expect(surface).toHaveAttribute('data-turn-direction', 'next');
  await expect(page.getByTestId('reader-announcement')).toHaveText('Página 11 de 249');

  await page.keyboard.press('ArrowLeft');
  await expect(page.getByTestId('page-counter')).toHaveText('10 / 249');
});

test('edge click and drag both turn pages without breaking persistence', async ({ page }) => {
  await loadSavedPage(page, 20);
  const surface = page.getByTestId('reader-surface');
  const box = await surface.boundingBox();
  expect(box).toBeTruthy();
  await surface.click({ position: { x: box!.width - 3, y: Math.min(120, box!.height / 3) } });
  await expect(page.getByTestId('page-counter')).toHaveText('21 / 249');

  const current = await surface.boundingBox();
  expect(current).toBeTruthy();
  const startX = current!.x + current!.width * 0.62;
  const y = current!.y + Math.min(180, current!.height * 0.35);
  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(startX - 100, y, { steps: 5 });
  await expect(surface).toHaveAttribute('data-dragging', 'true');
  await page.mouse.up();
  await expect(page.getByTestId('page-counter')).toHaveText('22 / 249');
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByTestId('page-counter')).toHaveText('22 / 249');
});

test('reader preserves controls and narrow mobile layout', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await loadSavedPage(page, 54);
  await expect(page.getByTestId('video-resource')).toHaveCount(1);
  await page.getByRole('button', { name: 'Pesquisar' }).click();
  const search = page.locator('input.search');
  await search.fill('sistema');
  await search.press('ArrowRight');
  await expect(page.getByTestId('page-counter')).toHaveText('54 / 249');
  await search.press('Escape');

  const metrics = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    surface: document.querySelector<HTMLElement>('[data-testid="reader-surface"]')?.getBoundingClientRect(),
    paper: document.querySelector<HTMLElement>('[data-testid="book-page"]')?.getBoundingClientRect()
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.surface).toBeTruthy();
  expect(metrics.paper).toBeTruthy();
  expect(metrics.paper!.left).toBeGreaterThanOrEqual(metrics.surface!.left - 1);
  expect(metrics.paper!.right).toBeLessThanOrEqual(metrics.surface!.right + 1);
});
