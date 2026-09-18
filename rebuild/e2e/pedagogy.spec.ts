import { test, expect } from '@playwright/test';
import navigationData from '../content/navigation.json';
import { loadSavedPage, readTotalPages } from './helpers';

type Marker = { kind: string; pageNumber: number; blockId: string };
type Chapter = { chapter: number; pedagogicalMarkers: Marker[] };
type Part = { chapters: Chapter[] };
type FrontMatter = { pedagogicalMarkers: Marker[] };
type Navigation = { frontMatter: FrontMatter[]; parts: Part[] };

const navigation = navigationData as Navigation;

function markerFor(markers: Marker[], kind: string) {
  const marker = markers.find(item => item.kind === kind);
  if (!marker) throw new Error(`Marcador pedagógico ausente: ${kind}`);
  return marker;
}

test('pedagogical blocks render cleanly without text loss or backstage metadata', async ({ page }) => {
  const chapter1 = navigation.parts.flatMap(part => part.chapters).find(chapter => chapter.chapter === 1);
  if (!chapter1) throw new Error('Capítulo 1 ausente da navegação final');

  const openingMarker = markerFor(chapter1.pedagogicalMarkers, 'opening');
  const objectivesMarker = markerFor(chapter1.pedagogicalMarkers, 'objectives');
  expect(openingMarker.pageNumber).toBe(objectivesMarker.pageNumber);

  await loadSavedPage(page, openingMarker.pageNumber);
  const opening = page.locator('[data-testid="pedagogical-box"][data-kind="opening"]');
  await expect(opening).toHaveCount(1);
  await expect(opening).toContainText('SITUAÇÃO DE ABERTURA');
  await expect(opening).toContainText('Uma ocorrência de tentativa de suicídio raramente se apresenta como um problema único.');

  const objectives = page.locator('[data-testid="pedagogical-box"][data-kind="objectives"]');
  await expect(objectives).toHaveCount(1);
  await expect(objectives.locator('[data-kind="list-item"]')).toHaveCount(5);

  const doctrineMarker = markerFor(chapter1.pedagogicalMarkers, 'doctrine');
  await loadSavedPage(page, doctrineMarker.pageNumber);
  const doctrine = page.locator('[data-testid="pedagogical-box"][data-kind="doctrine"]');
  await expect(doctrine).toHaveCount(1);
  await expect(doctrine).not.toContainText(/\bITO\s*30\b/iu);
});

test('front matter retains the semantic pedagogical family', async ({ page }) => {
  const front = navigation.frontMatter[0];
  if (!front) throw new Error('Front matter ausente da navegação final');
  const kinds = ['doctrine','evidence','practice','attention','decide'];
  const markers = kinds.map(kind => markerFor(front.pedagogicalMarkers, kind));
  const pageNumbers = [...new Set(markers.map(marker => marker.pageNumber))];
  expect(pageNumbers).toHaveLength(1);

  await loadSavedPage(page, pageNumbers[0]);
  await readTotalPages(page);
  for (const kind of kinds) {
    await expect(page.locator(`[data-testid="pedagogical-box"][data-kind="${kind}"]`)).toHaveCount(1);
  }
});
