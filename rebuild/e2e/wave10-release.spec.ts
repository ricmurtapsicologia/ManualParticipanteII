import { test, expect, type Page } from '@playwright/test';
import quizData from '../content/chapter-quizzes.json';

async function loadSavedPage(page: Page, pageNumber: number) {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.evaluate(number => localStorage.setItem('cats-rebuild-page', String(number - 1)), pageNumber);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByTestId('page-counter')).toHaveText(`${pageNumber} / 249`);
}

test('release frontend is clean and every chapter closes with learning, transfer, resource and test', async ({ page }) => {
  test.setTimeout(360_000);
  await page.goto('/', { waitUntil: 'networkidle' });
  const shell = page.getByTestId('reader-shell');
  for (const attribute of ['data-wave','data-editorial-wave','data-design-wave','data-wave78-status','data-design-system','data-design-subwave','data-reader-wave']) {
    await expect(shell).not.toHaveAttribute(attribute, /.+/);
  }

  for (const chapter of quizData.chapters) {
    await loadSavedPage(page, chapter.endingPage);
    await expect(page.getByTestId('chapter-learning')).toHaveCount(1);
    await expect(page.getByTestId('microlearning-chapter')).toHaveCount(1);
    await expect(page.getByTestId('application-transfer')).toHaveCount(1);
    const resource = page.getByTestId('chapter-resource');
    await expect(resource).toHaveCount(1);
    await expect(resource).toHaveAttribute('href', /^https:\/\//);
    await expect(page.getByTestId('chapter-quiz')).toHaveCount(1);
    await expect(page.getByTestId('chapter-quiz-question')).toHaveCount(5);
  }
});

test('microlearning reveal, cumulative review, PFA and ABNT references are clean and readable', async ({ page }) => {
  test.setTimeout(150_000);
  await loadSavedPage(page, 201);
  await page.getByRole('button', { name: 'Mostrar ponto-chave' }).click();
  await expect(page.getByText('Ponto-chave', { exact: true })).toBeVisible();
  await expect(page.getByTestId('chapter-resource')).toHaveAttribute('href', /9789241548205/);

  await loadSavedPage(page, 196);
  const pfa = page.getByTestId('book-page');
  await expect(pfa).toContainText('Preparar');
  await expect(pfa).toContainText('Observar');
  await expect(pfa).toContainText('Escutar');
  await expect(pfa).toContainText('Conectar');
  await expect(pfa).toContainText('sem pressionar');

  await loadSavedPage(page, 216);
  await expect(page.getByTestId('book-page')).toContainText('REVISÃO CUMULATIVA');
  await expect(page.getByTestId('book-page')).not.toContainText('Fontes nucleares do capítulo');

  for (const pageNumber of [242,243,244]) {
    await loadSavedPage(page, pageNumber);
    await expect(page.getByRole('heading', { name: 'Referências' })).toBeVisible();
    const text = await page.getByTestId('book-page').innerText();
    expect(text).not.toMatch(/Plano de Ensino|Aula:|PowerPoint|\.pptx?|benchmark externo/i);
  }
});

test('chapter test and transfer cards remain readable at 320px', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 740 });
  for (const pageNumber of [7,54,100,157,201,216]) {
    await loadSavedPage(page, pageNumber);
    const metrics = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
    expect(metrics.scroll, `horizontal overflow on page ${pageNumber}`).toBeLessThanOrEqual(metrics.viewport + 1);
  }
  await loadSavedPage(page, 216);
  const legendWeight = await page.locator('.chapterQuizQuestion legend').first().evaluate(element => Number.parseInt(getComputedStyle(element).fontWeight, 10));
  expect(legendWeight).toBeLessThanOrEqual(500);
  await expect(page.getByTestId('application-transfer')).toBeVisible();
});
