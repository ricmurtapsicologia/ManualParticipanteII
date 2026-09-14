import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseURL = process.env.CATS_BASE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true });

async function installTtsMock(page) {
  await page.addInitScript(() => {
    const voices = [{ name: 'Antônio', voiceURI: 'Antônio', lang: 'pt-BR' }];
    let last = null;
    class MockUtterance {
      constructor(text) { this.text = text; this.voice = null; this.lang = ''; this.rate = 1; this.onend = null; this.onerror = null; }
    }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: MockUtterance });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        getVoices: () => voices,
        addEventListener: () => {},
        removeEventListener: () => {},
        cancel: () => {},
        speak: (utterance) => { last = utterance; setTimeout(() => utterance.onend?.(), 25); },
      },
    });
    window.__ttsMock = { getLast: () => last };
  });
}

async function assertNoConsoleErrors(page, errors) {
  const fatal = errors.filter((entry) => !/favicon|net::ERR_ABORTED/i.test(entry));
  assert.deepEqual(fatal, [], `Console/page errors: ${fatal.join(' | ')}`);
}

async function mobileFlow() {
  const context = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(err.message));
  await installTtsMock(page);

  const response = await page.goto(baseURL, { waitUntil: 'networkidle' });
  assert.equal(response?.status(), 200);
  await page.waitForFunction(() => Boolean(window.__CATS_TEST__));

  assert.equal(await page.title(), 'Manual do Participante CATS | CBMMG');
  assert.equal(await page.locator('#count').textContent(), '1 / 15');
  assert.match(await page.locator('#bookStatus').textContent(), /15 de 249 páginas/);
  assert.equal(await page.locator('.cover img').count(), 1);

  const api = await page.evaluate(async () => {
    const [health, book] = await Promise.all([
      fetch('/api/health', { cache: 'no-store' }).then(async (r) => ({ status: r.status, body: await r.json() })),
      fetch('/api/book', { cache: 'no-store' }).then(async (r) => ({ status: r.status, body: await r.json() })),
    ]);
    return { health, book };
  });
  assert.equal(api.health.status, 200);
  assert.equal(api.health.body.status, 'ok');
  assert.equal(api.health.body.availablePages, 15);
  assert.equal(api.book.status, 200);
  assert.equal(api.book.body.availablePages, 15);
  assert.equal(api.book.body.targetPages, 249);

  await page.locator('#next').click();
  await page.waitForTimeout(350);
  assert.equal(await page.locator('#count').textContent(), '2 / 15');
  assert.equal(await page.locator('.page p').first().evaluate((el) => getComputedStyle(el).textAlign), 'justify');

  await page.locator('#tocB').click();
  await page.locator('#tocD.on').waitFor();
  assert.ok(await page.locator('#toc [data-p]').count() > 0);
  await page.locator('#toc [data-p]').first().click();

  await page.locator('#searchB').click();
  await page.locator('#q').fill('CATS');
  await page.waitForTimeout(100);
  assert.ok(await page.locator('#hits [data-h]').count() > 0);
  await page.locator('#searchD [data-close]').click();

  await page.locator('#scrollB').click();
  assert.equal(await page.locator('#scroll').evaluate((el) => el.classList.contains('on')), true);
  assert.equal(await page.locator('#workspace').evaluate((el) => el.classList.contains('hidden')), true);
  await page.locator('#bookB').click();
  assert.equal(await page.locator('#workspace').evaluate((el) => el.classList.contains('hidden')), false);

  await page.locator('#speakB').click();
  await page.waitForTimeout(100);
  const tts = await page.evaluate(() => ({
    activeVoice: window.__CATS_TEST__.getTtsStatus().activeVoice,
    utteranceVoice: window.__ttsMock.getLast()?.voice?.name || null,
  }));
  assert.equal(tts.activeVoice, 'Antônio');
  assert.equal(tts.utteranceVoice, 'Antônio');

  await assertNoConsoleErrors(page, errors);
  await context.close();
}

async function desktopFlow() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(err.message));
  await installTtsMock(page);
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__CATS_TEST__));
  assert.equal((await page.evaluate(() => window.__CATS_TEST__.getState())).doublePage, true);
  await page.evaluate(() => window.__CATS_TEST__.goToPage(2));
  await page.waitForTimeout(50);
  assert.equal(await page.locator('#count').textContent(), '2–3 / 15');
  await page.locator('#next').click();
  await page.waitForTimeout(350);
  assert.equal(await page.locator('#count').textContent(), '4–5 / 15');
  await assertNoConsoleErrors(page, errors);
  await context.close();
}

try {
  await mobileFlow();
  await desktopFlow();
  console.log(JSON.stringify({ status: 'PASS', suite: 'wave1-e2e', mobile: 'PASS', desktop: 'PASS', tts: 'Antônio mocked browser voice PASS' }, null, 2));
} finally {
  await browser.close();
}
