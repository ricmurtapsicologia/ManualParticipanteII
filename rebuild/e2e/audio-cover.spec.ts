import { createHash } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { loadSavedPage } from './helpers';

const sha256 = (value: Buffer) => createHash('sha256').update(value).digest('hex');

test('page 1 uses one visible approved digital cover; hero remains metadata-only', async ({ page, request }) => {
  await loadSavedPage(page, 1);
  const cover = page.getByTestId('approved-cover');
  await expect(cover).toHaveCount(1);
  const image = page.getByTestId('approved-cover-image');
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute('src','/assets/manual-cats/2026/manual-cats-capa-digital-2026.jpg');
  await expect(image).toHaveAttribute('alt',/Capa oficial do Manual do Participante CATS/iu);
  const heroFrame = page.getByTestId('canonical-hero');
  const hero = heroFrame.locator('img');
  await expect(heroFrame).toBeHidden();
  await expect(hero).toHaveAttribute('src','/assets/manual-cats/2026/manual-cats-hero-2026.jpg');

  const digital = await request.get('/assets/manual-cats/2026/manual-cats-capa-digital-2026.jpg');
  const heroAsset = await request.get('/assets/manual-cats/2026/manual-cats-hero-2026.jpg');
  expect(digital.status()).toBe(200); expect(heroAsset.status()).toBe(200);
  expect(sha256(await digital.body())).toBe('d63ae8f1ac4037d85e712da570999e437aadd4357485c719e57e587a7a6561ce');
  expect(sha256(await heroAsset.body())).toBe('0a5f39f5cfc870c902ab7e53701fb74960b229b5ef9008bba362f486bd7885ec');
});

test('page 8 exposes accessible audio with transcript and voice preference', async ({ page }) => {
  await loadSavedPage(page, 8);
  const audio = page.getByTestId('audio-resource'); await expect(audio).toHaveCount(1);
  await expect(audio).toHaveAttribute('data-media-id','audio-opening-cats-p8');
  await expect(audio).toHaveAttribute('data-media-src','native://speech-synthesis');
  await expect(audio).toHaveAttribute('data-preferred-voice','Antônio');
  await expect(audio).toHaveAttribute('data-fallback-lang','pt-BR');
  await expect(page.getByTestId('audio-play')).toBeVisible();
  await expect(page.getByTestId('audio-pause')).toBeVisible();
  await expect(page.getByTestId('audio-stop')).toBeVisible();
  const transcript = page.getByTestId('audio-transcript');
  await expect(transcript).toContainText('Uma ocorrência de tentativa de suicídio raramente se apresenta como um problema único.');
  await expect(transcript).toContainText('quando a informação é incompleta e quando o tempo exerce pressão.');
});

test('mobile keeps PDF/EPUB identified and has no horizontal reader overflow', async ({ page }) => {
  await page.setViewportSize({width:320,height:740});
  await loadSavedPage(page,1);
  const pdf = page.getByTestId('pdf-download');
  const epub = page.getByTestId('epub-download');
  await expect(pdf).toBeVisible();
  await expect(epub).toBeVisible();
  await expect(pdf).toContainText('PDF');
  await expect(pdf).toContainText('Baixar PDF');
  await expect(epub).toContainText('EPUB');
  await expect(epub).toContainText('Baixar EPUB');
  const integrity = await page.evaluate(() => ({viewportWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth}));
  expect(integrity.scrollWidth).toBeLessThanOrEqual(integrity.viewportWidth+1);
});

test('cover and audio remain inside the viewport at 320px', async ({ page }) => {
  await page.setViewportSize({width:320,height:740});
  await loadSavedPage(page,8);
  const integrity = await page.evaluate(() => ({viewportWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth}));
  expect(integrity.scrollWidth).toBeLessThanOrEqual(integrity.viewportWidth+1);
  const boxes = await Promise.all([page.getByTestId('book-page'),page.getByTestId('audio-resource')].map(async locator => locator.boundingBox()));
  expect(boxes[0]).toBeTruthy(); expect(boxes[1]).toBeTruthy();
  expect(boxes[1]!.x).toBeGreaterThanOrEqual(boxes[0]!.x-1);
  expect(boxes[1]!.x+boxes[1]!.width).toBeLessThanOrEqual(boxes[0]!.x+boxes[0]!.width+1);
});
