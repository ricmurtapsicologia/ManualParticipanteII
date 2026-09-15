import { test, expect } from '@playwright/test';

test('reader exposes two distinct and explicit download formats: PDF and EPUB', async ({ page }) => {
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

  const pdf = page.getByTestId('pdf-download');
  const epub = page.getByTestId('epub-download');
  await expect(pdf).toBeVisible();
  await expect(epub).toBeVisible();
  await expect(pdf).toHaveAttribute('href','/api/manual');
  await expect(epub).toHaveAttribute('href','/api/epub');
  await expect(pdf).toHaveAttribute('data-format','PDF');
  await expect(epub).toHaveAttribute('data-format','EPUB');
  await expect(pdf).toContainText('Baixar PDF');
  await expect(epub).toContainText('Baixar EPUB');
  await expect(pdf).toHaveClass(/formatDownloadPdf/);
  await expect(epub).toHaveClass(/formatDownloadEpub/);
  await expect(page.locator('a.formatDownload')).toHaveCount(2);
  await expect(page.getByTestId('manual-download')).toBeHidden();
});

test('EPUB 3.3 endpoint is reflowable, semantically navigable and page-addressable', async ({ request }) => {
  const response = await request.get('/api/epub');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/epub+zip');
  expect(response.headers()['content-disposition']).toContain('Manual-do-Participante-CATS-Edicao-Digital-2026.epub');
  expect(response.headers()['x-cats-epub-edition']).toBe('epub3.3-reflowable-2026');
  expect(response.headers()['x-cats-epub-accessibility']).toBe('semantic-navigation-page-list-pt-BR');
  const body = await response.body();
  expect(body.length).toBeGreaterThan(100_000);
  expect(body.subarray(0,2).toString('latin1')).toBe('PK');
  const binary = body.toString('latin1');
  for (const token of [
    'mimetype', 'META-INF/container.xml', 'OEBPS/content.opf', 'OEBPS/nav.xhtml', 'OEBPS/manual.xhtml', 'OEBPS/cover.webp',
    'epub:type="page-list"', 'epub:type="landmarks"', 'schema:accessMode', 'schema:accessModeSufficient',
    'pageNavigation', 'pageBreakMarkers', 'displayTransformability', 'role="doc-pagebreak"', 'rendition:layout'
  ]) expect(binary).toContain(token);
  expect((binary.match(/epub:type="pagebreak"/g) ?? []).length).toBe(223);
  expect(binary).toContain('Parte 1');
  expect(binary).toContain('Capítulo 34');
});
