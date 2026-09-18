import { createHash } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { loadSavedPage } from './helpers';

const COVER_SHA = 'f875ce298711604d1fce6aa3dec4acb67e37396ab754e0ab8b276c0686edbf9f';
const sha256=(value:Buffer)=>createHash('sha256').update(value).digest('hex');

test('reader exposes two distinct download formats and canonical cover artwork', async ({ page, request }) => {
  await loadSavedPage(page,1);
  await expect(page.getByTestId('approved-cover-image')).toHaveAttribute('src','/assets/manual-cats/2026/manual-cats-capa-digital-2026.jpg');
  const pdf=page.getByTestId('pdf-download'), epub=page.getByTestId('epub-download');
  await expect(pdf).toBeVisible(); await expect(epub).toBeVisible();
  await expect(pdf).toHaveAttribute('href','/api/manual'); await expect(epub).toHaveAttribute('href','/api/epub');
  await expect(pdf).toHaveAttribute('data-format','PDF'); await expect(epub).toHaveAttribute('data-format','EPUB');
  await expect(pdf).toContainText('Baixar PDF'); await expect(epub).toContainText('Baixar EPUB');
  await expect(page.locator('a.formatDownload')).toHaveCount(2);
  const ebookCover=await request.get('/assets/manual-cats/2026/manual-cats-capa-ebook-2026.jpg');
  expect(ebookCover.status()).toBe(200); expect(sha256(await ebookCover.body())).toBe(COVER_SHA);
});

test('EPUB 3.3 endpoint embeds the exact canonical eBook cover and remains semantically navigable', async ({ request }) => {
  const response=await request.get('/api/epub');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/epub+zip');
  expect(response.headers()['content-disposition']).toContain('Manual-do-Participante-CATS-Edicao-Digital-2026.epub');
  expect(response.headers()['x-cats-epub-edition']).toBe('epub3.3-reflowable-2026');
  expect(response.headers()['x-cats-epub-accessibility']).toBe('semantic-navigation-page-list-pt-BR');
  expect(response.headers()['x-cats-epub-cover-sha256']).toBe(COVER_SHA);
  const body=await response.body(); expect(body.length).toBeGreaterThan(100_000); expect(body.subarray(0,2).toString('latin1')).toBe('PK');
  const binary=body.toString('latin1');
  for (const token of ['mimetype','META-INF/container.xml','OEBPS/content.opf','OEBPS/nav.xhtml','OEBPS/manual.xhtml','OEBPS/cover.svg','data:image/jpeg;base64,','epub:type="page-list"','epub:type="landmarks"','schema:accessMode','schema:accessModeSufficient','pageNavigation','pageBreakMarkers','displayTransformability','role="doc-pagebreak"','rendition:layout']) expect(binary).toContain(token);
  expect((binary.match(/epub:type="pagebreak"/g)??[]).length).toBe(223);
  expect(body.includes(Buffer.from('Parte 1','utf8'))).toBe(true);
  expect(body.includes(Buffer.from('Capítulo 34','utf8'))).toBe(true);
});
