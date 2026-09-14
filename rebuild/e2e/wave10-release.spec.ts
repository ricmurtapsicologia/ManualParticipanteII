import { test, expect, type Page } from '@playwright/test';
import navigationData from '../content/navigation.json';

async function loadSavedPage(page: Page, pageNumber: number) {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.evaluate(number => localStorage.setItem('cats-rebuild-page', String(number - 1)), pageNumber);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByTestId('page-counter')).toHaveText(`${pageNumber} / 249`);
}

const chapters = navigationData.parts.flatMap(part => part.chapters).sort((a,b) => a.chapter - b.chapter);

test('release: every chapter ends with application, microlearning, external resource and 5x4 quiz', async ({ page }) => {
  test.setTimeout(300_000);
  expect(chapters).toHaveLength(34);
  for (const chapter of chapters) {
    const endingPage = chapter.pageNumbers.at(-1)!;
    await loadSavedPage(page, endingPage);
    const learning = page.getByTestId('chapter-learning');
    await expect(learning).toHaveAttribute('data-chapter', String(chapter.chapter));
    await expect(learning.getByText('Aplicação e transferência')).toBeVisible();
    await expect(learning.getByText(/Microlearning • 60 segundos/i)).toBeVisible();
    const link = learning.getByTestId('chapter-resource-link');
    await expect(link).toBeVisible();
    expect(await link.getAttribute('href')).toMatch(/^https:\/\//);
    const quiz = page.getByTestId('chapter-quiz');
    await expect(quiz).toHaveAttribute('data-chapter', String(chapter.chapter));
    await expect(quiz.getByTestId('chapter-quiz-question')).toHaveCount(5);
    await expect(quiz.getByTestId('chapter-quiz-choice')).toHaveCount(20);
  }

  const representativeEnd = chapters[15].pageNumbers.at(-1)!;
  await loadSavedPage(page, representativeEnd);
  await page.getByRole('button', { name: /Conferir ponto-chave/i }).click();
  await expect(page.getByTestId('chapter-microlearning-answer')).toBeVisible();
  await page.getByTestId('chapter-quiz-question').first().getByTestId('chapter-quiz-choice').first().click();
  await expect(page.getByTestId('chapter-quiz-question').first().getByTestId('chapter-quiz-feedback')).toBeVisible();
});

test('release: frontend is clean, PSP is strengthened, cumulative review and references are publication-ready', async ({ page }) => {
  test.setTimeout(180_000);
  await loadSavedPage(page, 1);
  const internalReleaseAttributes = await page.getByTestId('reader-shell').evaluate(element => Array.from(element.attributes).map(attribute => attribute.name).filter(name => /wave|editorial|design|semantic|multimedia|runtime/i.test(name)));
  expect(internalReleaseAttributes).toEqual([]);
  const readerText = await page.locator('body').innerText();
  expect(readerText).not.toMatch(/\b(?:Wave|Onda)\s*\d+\b|ChatGPT|OpenAI|prompt|Vercel|GitHub/i);

  await loadSavedPage(page, 115);
  await expect(page.getByTestId('chapter-title')).toContainText('Ferramentas de diálogo na abordagem de dissuasão');
  await expect(page.getByTestId('book-page')).not.toContainText(/ITO\s*30/i);

  await loadSavedPage(page, 196);
  const psp = page.getByTestId('book-page');
  await expect(psp).toContainText('PREPARAR • OLHAR • ESCUTAR • CONECTAR');
  await expect(psp).toContainText(/não é psicoterapia/i);
  await expect(psp).not.toContainText(/ITO\s*30/i);

  for (const pageNumber of [217, 225, 239]) {
    await loadSavedPage(page, pageNumber);
    await expect(page.getByTestId('book-page')).toContainText('Revisão cumulativa');
    await expect(page.getByTestId('book-page')).not.toContainText(/Resposta orientadora|TESTE-SE|QUESTÕES DE REVISÃO|_{8,}/i);
  }

  for (const pageNumber of [242, 243, 244]) {
    await loadSavedPage(page, pageNumber);
    const paper = page.getByTestId('book-page');
    await expect(paper).toContainText('Referências');
    await expect(paper).not.toContainText(/PowerPoint|\bPPT\b|Aula\s*:|Plano de Ensino|benchmark|v3\.6/i);
    const entries = paper.locator('.referenceEntry');
    expect(await entries.count()).toBeGreaterThan(0);
    const alignment = await entries.first().evaluate(element => getComputedStyle(element).textAlign);
    expect(alignment).toBe('left');
  }

  await page.setViewportSize({ width: 320, height: 740 });
  for (const pageNumber of [15, 115, 196, 217, 242]) {
    await loadSavedPage(page, pageNumber);
    const metrics = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
    expect(metrics.scroll, `page ${pageNumber} horizontal overflow`).toBeLessThanOrEqual(metrics.viewport + 1);
  }
});
