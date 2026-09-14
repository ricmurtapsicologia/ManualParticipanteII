import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const quizData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'content', 'chapter-quizzes.json'), 'utf8')) as {
  chapters: Array<{ chapter: number; title: string; openingPage: number; endingPage: number; questions: Array<{ id: string; choices: unknown[] }> }>;
};

async function loadSavedPage(page: Page, pageNumber: number) {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.evaluate(number => localStorage.setItem('cats-rebuild-page', String(number - 1)), pageNumber);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByTestId('page-counter')).toHaveText(`${pageNumber} / 249`);
}

test('waves 7 and 8: all 34 chapters start on a fresh leaf with objectives and finish with summary + 5x4 quiz', async ({ page }) => {
  expect(quizData.chapters).toHaveLength(34);
  const openingPages = new Set<number>();

  for (const chapter of quizData.chapters) {
    expect(openingPages.has(chapter.openingPage)).toBeFalsy();
    openingPages.add(chapter.openingPage);

    await loadSavedPage(page, chapter.openingPage);
    await expect(page.getByTestId('reader-shell')).toHaveAttribute('data-editorial-wave', '7');
    await expect(page.getByTestId('reader-shell')).toHaveAttribute('data-design-wave', '8');
    await expect(page.getByTestId('reader-shell')).toHaveAttribute('data-wave78-status', 'complete');
    await expect(page.getByTestId('book-page')).toHaveAttribute('data-page-role', 'chapter-opening');
    await expect(page.getByTestId('chapter-title')).toContainText(chapter.title);
    const objectives = page.locator('[data-kind="objectives"]');
    await expect(objectives).toHaveCount(1);
    await expect(objectives.locator('[data-pedagogical-label="objectives"]')).toHaveText('OBJETIVOS DO CAPÍTULO');

    const openingText = await page.getByTestId('book-page').innerText();
    expect(openingText).not.toContain('�');
    expect(openingText).not.toContain('TESTE-SE');

    await loadSavedPage(page, chapter.endingPage);
    const summary = page.locator('[data-kind="summary"]');
    await expect(summary).toHaveCount(1);
    await expect(summary.locator('[data-pedagogical-label="summary"]')).toHaveText('RESUMO DO CAPÍTULO');
    const quiz = page.getByTestId('chapter-quiz');
    await expect(quiz).toHaveCount(1);
    await expect(quiz).toHaveAttribute('data-chapter', String(chapter.chapter));
    const questions = quiz.getByTestId('chapter-quiz-question');
    await expect(questions).toHaveCount(5);
    expect(chapter.questions).toHaveLength(5);

    for (let index = 0; index < 5; index += 1) {
      const question = questions.nth(index);
      const choices = question.getByTestId('chapter-quiz-choice');
      await expect(choices).toHaveCount(4);
      await choices.first().click();
      await expect(question.getByTestId('chapter-quiz-feedback')).toBeVisible();
    }

    const endingText = await page.getByTestId('book-page').innerText();
    expect(endingText).not.toContain('�');
    expect(endingText).not.toContain('TESTE-SE');
    expect(endingText).not.toContain('QUESTÕES DE REVISÃO');
  }
});

test('wave 8 typography keeps emphasis controlled and layout inside viewport', async ({ page }) => {
  for (const pageNumber of [8, 54, 101, 150, 191, 217]) {
    await loadSavedPage(page, pageNumber);
    const metrics = await page.evaluate(() => {
      const paper = document.querySelector<HTMLElement>('[data-testid="book-page"]');
      const text = paper?.innerText ?? '';
      const strongText = [...(paper?.querySelectorAll('strong') ?? [])].map(node => node.textContent ?? '').join(' ');
      const strongWeight = paper?.querySelector('strong') ? getComputedStyle(paper.querySelector('strong') as Element).fontWeight : '0';
      return {
        viewportWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        textLength: text.length,
        strongLength: strongText.length,
        strongWeight
      };
    });
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
    expect(metrics.strongLength / Math.max(metrics.textLength, 1)).toBeLessThan(0.24);
    expect(Number(metrics.strongWeight)).toBeLessThanOrEqual(650);
  }
});
