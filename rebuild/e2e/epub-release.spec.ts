import { test, expect } from '@playwright/test';

test('reader exposes professional CATS cover and a single PDF download CTA', async ({ page }) => {
  await page.goto('/', { waitUntil:'networkidle' });
  await page.evaluate(() => localStorage.setItem('cats-rebuild-page','0'));
  await page.reload({ waitUntil:'networkidle' });
  const shell = page.getByTestId('reader-shell');
  const total = Number(await shell.getAttribute('data-page-count'));
  expect(total).toBeGreaterThan(200);
  expect(total).toBeLessThan(246);
  await expect(page.getByTestId('approved-cover')).toBeVisible();
  await expect(page.getByTestId('cats-logo')).toContainText('CATS');
  await expect(page.getByRole('heading', { name:/Atendimento a Tentativas de Suicídio/i })).toBeVisible();
  await expect(page.getByTestId('manual-download')).toHaveCount(1);
  await expect(page.getByTestId('manual-download')).toHaveAttribute('href','/api/manual');
  await expect(page.getByTestId('epub-download')).toHaveCount(0);
  await expect(page.locator('a.manualDownload')).toHaveCount(1);
});

test('EPUB 3 endpoint remains valid without exposing a second main download CTA', async ({ request }) => {
  const response = await request.get('/api/epub');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/epub+zip');
  expect(response.headers()['x-cats-epub-edition']).toBe('publication-grade-epub3-2026');
  const body = await response.body();
  expect(body.length).toBeGreaterThan(100_000);
  expect(body.subarray(0,2).toString('latin1')).toBe('PK');
  const binary = body.toString('latin1');
  for (const token of ['mimetype','META-INF/container.xml','OEBPS/content.opf','OEBPS/nav.xhtml','OEBPS/manual.xhtml','OEBPS/cover.webp']) expect(binary).toContain(token);
});
