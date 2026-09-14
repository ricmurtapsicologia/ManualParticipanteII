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
  await expect(page.getByTestId('reader-surface')).toHaveAttribute('data-turn-direction', 'idle');
}

test('waves 7 and 8 E2E every written leaf, all chapter starts, objectives, summaries and 5x4 quizzes', async ({ page }) => {
  test.setTimeout(240_000);
  expect(quizData.chapters).toHaveLength(34);
  const openings = new Map(quizData.chapters.map(chapter => [chapter.openingPage, chapter]));
  const endings = new Map(quizData.chapters.map(chapter => [chapter.endingPage, chapter]));
  expect(new Set(quizData.chapters.map(chapter => chapter.openingPage)).size).toBe(34);

  await loadSavedPage(page, 1);
  await expect(page.getByTestId('reader-shell')).toHaveAttribute('data-editorial-wave', '7');
  await expect(page.getByTestId('reader-shell')).toHaveAttribute('data-design-wave', '8');
  await expect(page.getByTestId('reader-shell')).toHaveAttribute('data-wave78-status', 'complete');

  for (let pageNumber = 1; pageNumber <= 249; pageNumber += 1) {
    await expect(page.getByTestId('page-counter')).toHaveText(`${pageNumber} / 249`);
    await expect(page.getByTestId('reader-surface')).toHaveAttribute('data-turn-direction', 'idle');
    const paper = page.getByTestId('book-page');
    const text = (await paper.innerText()).trim();
    expect(text.length, `page ${pageNumber} must have written content`).toBeGreaterThan(10);
    expect(text, `page ${pageNumber} must not contain replacement glyphs`).not.toContain('�');
    expect(text, `page ${pageNumber} must not contain arrow extraction artifacts`).not.toMatch(/\.→|→\s*→\s*→/u);

    const openingChapter = openings.get(pageNumber);
    if (openingChapter) {
      await expect(paper).toHaveAttribute('data-page-role', 'chapter-opening');
      await expect(page.getByTestId('chapter-title')).toContainText(openingChapter.title);
      const objectives = page.locator('[data-kind="objectives"]');
      await expect(objectives).toHaveCount(1);
      await expect(objectives.locator('[data-pedagogical-label="objectives"]')).toHaveText('OBJETIVOS DO CAPÍTULO');
    }

    const endingChapter = endings.get(pageNumber);
    if (endingChapter) {
      const summary = page.locator('[data-kind="summary"]');
      await expect(summary).toHaveCount(1);
      await expect(summary.locator('[data-pedagogical-label="summary"]')).toHaveText('RESUMO DO CAPÍTULO');
      const quiz = page.getByTestId('chapter-quiz');
      await expect(quiz).toHaveCount(1);
      await expect(quiz).toHaveAttribute('data-chapter', String(endingChapter.chapter));
      const questions = quiz.getByTestId('chapter-quiz-question');
      await expect(questions).toHaveCount(5);
      expect(endingChapter.questions).toHaveLength(5);
      for (let index = 0; index < 5; index += 1) {
        const question = questions.nth(index);
        const choices = question.getByTestId('chapter-quiz-choice');
        await expect(choices).toHaveCount(4);
        await choices.first().click();
        await expect(question.getByTestId('chapter-quiz-feedback')).toBeVisible();
      }
    }

    const metrics = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth
    }));
    expect(metrics.scrollWidth, `page ${pageNumber} must fit viewport`).toBeLessThanOrEqual(metrics.viewportWidth + 1);

    if (pageNumber < 249) await page.getByRole('button', { name: 'Próxima página' }).click();
  }
});

test('wave 8 typography keeps emphasis controlled on representative chapter, media and appendix leaves', async ({ page }) => {
  test.setTimeout(90_000);
  for (const pageNumber of [8, 54, 101, 150, 191, 217, 249]) {
    await loadSavedPage(page, pageNumber);
    const metrics = await page.evaluate(() => {
      const paper = document.querySelector<HTMLElement>('[data-testid="book-page"]');
      const text = paper?.innerText ?? '';
      const strongText = [...(paper?.querySelectorAll('strong') ?? [])].map(node => node.textContent ?? '').join(' ');
      const strongWeight = paper?.querySelector('strong') ? getComputedStyle(paper.querySelector('strong') as Element).fontWeight : '0';
      return {
        textLength: text.length,
        strongLength: strongText.length,
        strongWeight
      };
    });
    expect(metrics.strongLength / Math.max(metrics.textLength, 1)).toBeLessThan(0.24);
    expect(Number(metrics.strongWeight)).toBeLessThanOrEqual(650);
  }
});
