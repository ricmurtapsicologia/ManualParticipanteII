import { test, expect } from '@playwright/test';

const checkpoints = [1, 2, 10, 50, 100, 150, 200, 249];

async function gotoBook(page: any, suffix = '') {
  const response = await page.goto(`/${suffix}`, { waitUntil: 'networkidle' });
  expect(response?.status()).toBe(200);
  await expect(page.getByTestId('reader-shell')).toHaveAttribute('data-page-count', '249');
}

async function setPage(page: any, pageNumber: number) {
  await page.evaluate((n: number) => localStorage.setItem('cats-rebuild-page', String(n - 1)), pageNumber);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByTestId('page-counter')).toContainText(`${pageNumber} / 249`);
  await expect(page.getByTestId('book-page')).toBeVisible();
  const text = (await page.getByTestId('book-page').innerText()).trim();
  expect(text.length).toBeGreaterThan(20);
}

test('production health and direct URL are canonical', async ({ page, request }) => {
  const healthRes = await request.get('/api/health');
  expect(healthRes.status()).toBe(200);
  const health = await healthRes.json();
  expect(health).toMatchObject({
    status: 'ok',
    architecture: 'rebuild-clean',
    wave: 8,
    pages: 249,
    corpus: 'canonical-hybrid-recovered',
    deployment: { platform: 'vercel', environment: 'production', branch: 'main' }
  });
  expect(health.deployment.commit).toMatch(/^[0-9a-f]{40}$/);

  await gotoBook(page, '?e2e=direct');
  await expect(page).toHaveTitle('Manual do Participante CATS | Edição Digital');
});

test('key pages 1, 2, 10, 50, 100, 150, 200 and 249 render', async ({ page }) => {
  await gotoBook(page);
  for (const pageNumber of checkpoints) await setPage(page, pageNumber);
  await expect(page.getByRole('button', { name: 'Próxima página' })).toBeDisabled();
});

test('navigation, table of contents and search work end to end', async ({ page }) => {
  await gotoBook(page);
  await setPage(page, 1);
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('page-counter')).toContainText('2 / 249');
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByTestId('page-counter')).toContainText('1 / 249');

  await page.getByRole('button', { name: 'Sumário' }).click();
  const toc = page.locator('.toc button');
  await expect(toc).toHaveCount(249);
  await toc.nth(99).click();
  await expect(page.getByTestId('page-counter')).toContainText('100 / 249');

  await page.getByRole('button', { name: 'Pesquisar' }).click();
  const input = page.getByPlaceholder('Digite pelo menos 2 caracteres');
  await input.fill('Tenho um plano para revisar e praticar estas competências após o curso.');
  const hit = page.locator('.hits button').filter({ hasText: 'P. 249' });
  await expect(hit).toHaveCount(1);
  await hit.click();
  await expect(page.getByTestId('page-counter')).toContainText('249 / 249');
});

test('saved progress survives refresh', async ({ page }) => {
  await gotoBook(page);
  await setPage(page, 150);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByTestId('page-counter')).toContainText('150 / 249');
});

test('TTS prefers Antônio and keeps pt-BR contract', async ({ page }) => {
  await page.addInitScript(() => {
    const voices = [
      { name: 'English Default', lang: 'en-US' },
      { name: 'Antônio', lang: 'pt-BR' }
    ];
    class FakeUtterance {
      text: string;
      voice: any = null;
      lang = '';
      rate = 1;
      onend: any = null;
      onerror: any = null;
      constructor(text: string) { this.text = text; }
    }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: FakeUtterance });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        getVoices: () => voices,
        cancel: () => {},
        speak: (utterance: any) => {
          (window as any).__ttsProof = {
            voice: utterance.voice?.name || null,
            lang: utterance.lang,
            rate: utterance.rate,
            textLength: utterance.text.length
          };
        }
      }
    });
  });

  await gotoBook(page);
  await page.getByRole('button', { name: 'Leitura em voz alta' }).click();
  const proof = await page.evaluate(() => (window as any).__ttsProof);
  expect(proof.voice).toBe('Antônio');
  expect(proof.lang).toBe('pt-BR');
  expect(proof.rate).toBeCloseTo(0.96, 2);
  expect(proof.textLength).toBeGreaterThan(20);
});

test('layout is responsive and critical resources have no 404/500', async ({ page }) => {
  const failures: string[] = [];
  page.on('response', response => {
    const type = response.request().resourceType();
    if (['document', 'script', 'stylesheet', 'fetch', 'xhr'].includes(type) && response.status() >= 400) {
      failures.push(`${response.status()} ${response.url()}`);
    }
  });
  const consoleErrors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', error => consoleErrors.push(error.message));

  await gotoBook(page);
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.viewport + 1);
  expect(failures).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
