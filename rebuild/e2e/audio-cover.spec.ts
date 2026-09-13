import { test, expect } from '@playwright/test';

async function loadSavedPage(page: import('@playwright/test').Page, pageNumber: number) {
  await page.evaluate(number => localStorage.setItem('cats-rebuild-page', String(number - 1)), pageNumber);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByTestId('page-counter')).toHaveText(`${pageNumber} / 249`);
}

test('page 1 uses the approved legacy cover', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.setItem('cats-rebuild-page', '0'));
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByTestId('page-counter')).toHaveText('1 / 249');

  const cover = page.getByTestId('approved-cover');
  await expect(cover).toHaveCount(1);
  const image = page.getByTestId('approved-cover-image');
  await expect(image).toHaveAttribute('src', /^data:image\/webp;base64,/);
  await expect(image).toHaveAttribute('alt', /Capa oficial do Manual do Participante CATS/);
});

test('page 8 exposes accessible audio with canonical transcript and voice preference', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await loadSavedPage(page, 8);

  await expect(page.getByTestId('reader-shell')).toHaveAttribute('data-multimedia-wave', '5.5');
  const audio = page.getByTestId('audio-resource');
  await expect(audio).toHaveCount(1);
  await expect(audio).toHaveAttribute('data-media-id', 'audio-opening-cats-p8');
  await expect(audio).toHaveAttribute('data-media-src', 'native://speech-synthesis');
  await expect(audio).toHaveAttribute('data-preferred-voice', 'Antônio');
  await expect(audio).toHaveAttribute('data-fallback-lang', 'pt-BR');
  await expect(page.getByTestId('audio-play')).toBeVisible();
  await expect(page.getByTestId('audio-pause')).toBeVisible();
  await expect(page.getByTestId('audio-stop')).toBeVisible();

  const transcript = page.getByTestId('audio-transcript');
  await expect(transcript).toContainText('Uma ocorrência de tentativa de suicídio raramente se apresenta como um problema único.');
  await expect(transcript).toContainText('quando a informação é incompleta e quando o tempo exerce pressão.');

  const paper = page.getByTestId('book-page');
  await expect(paper).toContainText('Uma ocorrência de tentativa de suicídio raramente se apresenta como um problema único.');
});

test('wave 5.5 cover and audio remain inside the viewport at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/', { waitUntil: 'networkidle' });
  await loadSavedPage(page, 8);
  const integrity = await page.evaluate(() => ({ viewportWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(integrity.scrollWidth).toBeLessThanOrEqual(integrity.viewportWidth + 1);

  const paper = page.getByTestId('book-page');
  const audio = page.getByTestId('audio-resource');
  const boxes = await Promise.all([paper, audio].map(async locator => locator.boundingBox()));
  expect(boxes[0]).toBeTruthy();
  expect(boxes[1]).toBeTruthy();
  expect(boxes[1]!.x).toBeGreaterThanOrEqual(boxes[0]!.x - 1);
  expect(boxes[1]!.x + boxes[1]!.width).toBeLessThanOrEqual(boxes[0]!.x + boxes[0]!.width + 1);
});
