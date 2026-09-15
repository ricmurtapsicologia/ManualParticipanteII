import { test, expect } from '@playwright/test';

async function readTotalPages(page: any) {
  const shell = page.getByTestId('reader-shell');
  const total = Number(await shell.getAttribute('data-page-count'));
  expect(total).toBeGreaterThan(200);
  expect(total).toBeLessThan(246);
  return total;
}

async function gotoBook(page: any, suffix = '') {
  const response = await page.goto(`/${suffix}`, { waitUntil: 'networkidle' });
  expect(response?.status()).toBe(200);
  await expect(page.getByTestId('reader-shell')).toBeVisible();
  return readTotalPages(page);
}

async function setPage(page: any, pageNumber: number, total: number) {
  await page.evaluate((n: number) => localStorage.setItem('cats-rebuild-page', String(n - 1)), pageNumber);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByTestId('page-counter')).toContainText(`${pageNumber} / ${total}`);
  await expect(page.getByTestId('book-page')).toBeVisible();
  const text = (await page.getByTestId('book-page').innerText()).trim();
  expect(text.length).toBeGreaterThan(20);
}

test('publication health and direct URL are release-clean with dynamic pagination', async ({ page, request }) => {
  const healthRes = await request.get('/api/health');
  expect(healthRes.status()).toBe(200);
  const health = await healthRes.json();
  expect(health).toMatchObject({
    status: 'ok', architecture: 'rebuild-clean', wave: 10, chapters: 34,
    corpus: 'canonical-hybrid-recovered'
  });
  expect(Number(health.pages)).toBeGreaterThan(200);
  expect(Number(health.pages)).toBeLessThan(246);
  expect(String(health.bibliography)).toMatch(/ABNT NBR 6023:2018/u);

  const total = await gotoBook(page, '?e2e=direct');
  expect(total).toBe(Number(health.pages));
  await expect(page).toHaveTitle('Manual do Participante CATS | Edição Digital');
  const shell = page.getByTestId('reader-shell');
  const attrs = await shell.evaluate((el: Element) => [...el.attributes].map(attr => attr.name));
  for (const forbidden of ['data-wave','data-editorial-wave','data-design-wave','data-wave78-status','data-design-system','data-design-subwave','data-semantic-renderer','data-reader-wave']) expect(attrs).not.toContain(forbidden);
});

test('representative pages and the final dynamic page render', async ({ page }) => {
  const total = await gotoBook(page);
  const checkpoints = [...new Set([1, 2, 10, 50, 100, 150, 200, total].filter(pageNumber => pageNumber <= total))];
  for (const pageNumber of checkpoints) await setPage(page, pageNumber, total);
  await setPage(page, total, total);
  await expect(page.getByRole('button', { name: 'Próxima página' })).toBeDisabled();
});

test('hierarchical table of contents, navigation and search work end to end', async ({ page }) => {
  const total = await gotoBook(page);
  await setPage(page, 1, total);
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('page-counter')).toContainText(`2 / ${total}`);
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByTestId('page-counter')).toContainText(`1 / ${total}`);

  await page.getByRole('button', { name: 'Sumário' }).click();
  await expect(page.getByTestId('hierarchical-toc')).toBeVisible();
  await expect(page.getByTestId('toc-part')).toHaveCount(7);
  await expect(page.getByTestId('toc-chapter')).toHaveCount(34);
  expect(await page.getByTestId('toc-marker').count()).toBeGreaterThan(150);

  const part3 = page.getByTestId('toc-part').filter({ hasText: 'Parte 3' });
  await part3.locator(':scope > summary').click();
  const chapter14 = part3.getByTestId('toc-chapter').filter({ hasText: 'Cap. 14' });
  await chapter14.locator(':scope > summary').click();
  await chapter14.getByTestId('toc-chapter-open').click();
  const chapterCounter = (await page.getByTestId('page-counter').innerText()).trim();
  const chapterMatch = chapterCounter.match(/^(\d+)\s*\/\s*(\d+)$/u);
  expect(chapterMatch).not.toBeNull();
  expect(Number(chapterMatch?.[1])).toBeGreaterThan(1);
  expect(Number(chapterMatch?.[1])).toBeLessThanOrEqual(total);
  expect(Number(chapterMatch?.[2])).toBe(total);

  await page.getByRole('button', { name: 'Pesquisar' }).click();
  const input = page.getByPlaceholder('Digite pelo menos 2 caracteres');
  await input.fill('Tenho um plano para revisar e praticar estas competências após o curso.');
  const hits = page.locator('.hits button');
  expect(await hits.count()).toBeGreaterThanOrEqual(1);
  const target = hits.first();
  const label = (await target.innerText()).trim();
  const hitPage = Number(label.match(/P\.\s*(\d+)/u)?.[1]);
  expect(hitPage).toBeGreaterThan(0);
  expect(hitPage).toBeLessThanOrEqual(total);
  await target.click();
  await expect(page.getByTestId('page-counter')).toContainText(`${hitPage} / ${total}`);
});

test('saved progress survives refresh', async ({ page }) => {
  const total = await gotoBook(page);
  const target = Math.min(150, total);
  await setPage(page, target, total);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByTestId('page-counter')).toContainText(`${target} / ${total}`);
});

test('TTS prefers Antônio and keeps pt-BR contract', async ({ page }) => {
  await page.addInitScript(() => {
    const voices = [{ name: 'English Default', lang: 'en-US' }, { name: 'Antônio', lang: 'pt-BR' }];
    class FakeUtterance { text: string; voice: any = null; lang = ''; rate = 1; onend: any = null; onerror: any = null; constructor(text: string) { this.text = text; } }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: FakeUtterance });
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { getVoices: () => voices, cancel: () => {}, speak: (utterance: any) => { (window as any).__ttsProof = { voice: utterance.voice?.name || null, lang: utterance.lang, rate: utterance.rate, textLength: utterance.text.length }; } } });
  });
  await gotoBook(page);
  await page.getByRole('button', { name: 'Leitura em voz alta' }).click();
  const proof = await page.evaluate(() => (window as any).__ttsProof);
  expect(proof.voice).toBe('Antônio'); expect(proof.lang).toBe('pt-BR'); expect(proof.rate).toBeCloseTo(0.96, 2); expect(proof.textLength).toBeGreaterThan(20);
});

test('layout is responsive and critical resources have no 404/500', async ({ page }) => {
  const failures: string[] = [];
  page.on('response', response => { const type = response.request().resourceType(); if (['document','script','stylesheet','fetch','xhr'].includes(type) && response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
  const consoleErrors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', error => consoleErrors.push(error.message));
  await gotoBook(page);
  const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.viewport + 1); expect(failures).toEqual([]); expect(consoleErrors).toEqual([]);
});
