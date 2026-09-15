import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const canonical = 'https://manual-participante-cats-digital.vercel.app/';

async function open(page: any) {
  const response = await page.goto('/', { waitUntil: 'networkidle' });
  expect(response?.status()).toBe(200);
  await expect(page.getByTestId('reader-shell')).toBeVisible();
}

test('acessibilidade: skip link, busca rotulada, focus trap e retorno do foco', async ({ page }) => {
  await open(page);
  const skip = page.getByRole('link', { name: 'Pular para o conteúdo' });
  await page.keyboard.press('Tab');
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#conteudo-principal')).toBeFocused();

  const searchButton = page.getByRole('button', { name: 'Pesquisar' });
  await searchButton.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const input = page.getByRole('textbox', { name: 'Pesquisar no conteúdo do manual' });
  await expect(input).toBeFocused();
  await expect(input).toHaveAttribute('aria-describedby', 'manual-search-help');

  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Fechar painel' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(input).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(searchButton).toBeFocused();
});

test('axe não encontra violações críticas ou sérias', async ({ page }) => {
  await open(page);
  const result = await new AxeBuilder({ page: page as any }).analyze();
  const blocking = result.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);

  await page.getByRole('button', { name: 'Pesquisar' }).click();
  const dialogResult = await new AxeBuilder({ page: page as any }).include('.drawer').analyze();
  const dialogBlocking = dialogResult.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
  expect(dialogBlocking, JSON.stringify(dialogBlocking, null, 2)).toEqual([]);
});

test('headers de segurança são enviados', async ({ request }) => {
  const response = await request.get('/');
  expect(response.status()).toBe(200);
  const headers = response.headers();
  expect(headers['content-security-policy']).toContain("default-src 'self'");
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['permissions-policy']).toContain('camera=()');
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['x-content-type-options']).toBe('nosniff');
});

test('SEO e identidade editorial digital estão completos', async ({ page }) => {
  await open(page);
  await expect(page).toHaveTitle(/Manual do Participante CATS/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /Manual do Participante CATS/);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /opengraph-image/);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  const structured = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() || '{}');
  expect(structured['@type']).toContain('Book');
  expect(structured['@type']).toContain('LearningResource');
  expect(structured.inLanguage).toBe('pt-BR');
  expect(structured.version).toContain('2026');
});

test('PDF publicado é real, estável e entregue pelo CTA/API', async ({ request }) => {
  const response = await request.get('/api/manual');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/pdf');
  expect(response.headers()['content-disposition']).toContain('Manual-do-Participante-CATS-Edicao-Digital-2026.pdf');
  const body = Buffer.from(await response.body());
  expect(body.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  expect(body.byteLength).toBeGreaterThan(100_000);
});

test('responsividade em 320, 768 e 1440 px, paisagem e zoom 200%', async ({ page }) => {
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 320 ? 720 : 900 });
    await open(page);
    const layout = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
    expect(layout.scroll).toBeLessThanOrEqual(layout.viewport + 1);
    await expect(page.getByTestId('book-page')).toBeVisible();
  }
  await page.setViewportSize({ width: 844, height: 390 });
  await open(page);
  await expect(page.getByTestId('book-page')).toBeVisible();
  await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
  const zoomLayout = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(zoomLayout.scroll).toBeLessThanOrEqual(zoomLayout.viewport + 2);
});

test('interação principal responde sem latência grave', async ({ page }) => {
  await open(page);
  const latency = await page.evaluate(async () => {
    const button = document.querySelector('button[aria-label="Sumário"]') as HTMLButtonElement | null;
    if (!button) return 9999;
    const start = performance.now();
    button.click();
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    return performance.now() - start;
  });
  expect(latency).toBeLessThan(250);
  await expect(page.getByRole('dialog')).toBeVisible();
});