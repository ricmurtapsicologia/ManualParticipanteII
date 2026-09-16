import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { loadSavedPage } from './helpers';

const enrichment = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'content', 'chapter-enrichment.json'), 'utf8')) as {
  chapters: Array<{ chapter:number; microlearning:{ pageNumber:number; choices:Array<{id:string;label:string;correct:boolean}>; reveal:string } }>;
};

test('Wave10 exposes exactly one grounded microlearning box in every chapter', async ({ page }) => {
  test.setTimeout(180_000);
  expect(enrichment.chapters).toHaveLength(34);
  for (const chapter of enrichment.chapters) {
    await loadSavedPage(page, chapter.microlearning.pageNumber);
    const card = page.getByTestId('chapter-microlearning');
    await expect(card).toHaveCount(1);
    const choices = card.getByTestId('chapter-microlearning-choice');
    await expect(choices).toHaveCount(4);
    const correct = chapter.microlearning.choices.find(choice => choice.correct);
    expect(correct).toBeTruthy();
    await choices.filter({ hasText: correct!.label }).click();
    await expect(card.getByTestId('chapter-microlearning-feedback')).toContainText('Correto.');
    await expect(card.getByTestId('chapter-microlearning-feedback')).toContainText(correct!.label);
  }
});

test('Wave10 microlearning remains usable without horizontal overflow at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const chapter = enrichment.chapters.find(item => item.chapter === 32) ?? enrichment.chapters[0];
  await loadSavedPage(page, chapter.microlearning.pageNumber);
  const metrics = await page.evaluate(() => {
    const paper = document.querySelector<HTMLElement>('[data-testid="book-page"]')?.getBoundingClientRect();
    const card = document.querySelector<HTMLElement>('[data-testid="chapter-microlearning"]')?.getBoundingClientRect();
    const choices = [...document.querySelectorAll<HTMLElement>('[data-testid="chapter-microlearning-choice"]')].map(item => item.getBoundingClientRect());
    return { viewportWidth:document.documentElement.clientWidth, scrollWidth:document.documentElement.scrollWidth, paper:paper && {left:paper.left,right:paper.right}, card:card && {left:card.left,right:card.right}, choices:choices.map(item => ({left:item.left,right:item.right,height:item.height})) };
  });
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.paper).toBeTruthy(); expect(metrics.card).toBeTruthy();
  expect(metrics.card!.left).toBeGreaterThanOrEqual(metrics.paper!.left - 1);
  expect(metrics.card!.right).toBeLessThanOrEqual(metrics.paper!.right + 1);
  for (const choice of metrics.choices) {
    expect(choice.left).toBeGreaterThanOrEqual(metrics.card!.left - 1);
    expect(choice.right).toBeLessThanOrEqual(metrics.card!.right + 1);
    expect(choice.height).toBeGreaterThanOrEqual(40);
  }
});
