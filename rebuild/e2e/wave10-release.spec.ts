import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const assets = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'content', 'chapter-learning-assets.json'), 'utf8')) as {
  chapters: Array<{ chapter: number; openingPage: number; endingPage: number; resource: { url: string; title: string }; microlearning: { prompt: string; reveal: string } }>;
};

async function loadSavedPage(page: Page, pageNumber: number) {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.evaluate(number => localStorage.setItem('cats-rebuild-page', String(number - 1)), pageNumber);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByTestId('page-counter')).toHaveText(`${pageNumber} / 249`);
}

test('every chapter exposes one microlearning box with reveal', async ({ page }) => {
  test.setTimeout(180_000);
  expect(assets.chapters).toHaveLength(34);
  for (const asset of assets.chapters) {
    await loadSavedPage(page, asset.openingPage);
    const card = page.getByTestId('chapter-microlearning');
    await expect(card, `chapter ${asset.chapter} microlearning`).toHaveCount(1);
    await expect(card).toContainText('60 segundos');
    await expect(card).toContainText(asset.microlearning.prompt.slice(0, 35));
    await card.getByRole('button', { name: 'Revelar ponto de comparação' }).click();
    await expect(card.getByTestId('chapter-microlearning-reveal')).toBeVisible();
  }
});

test('every chapter ending exposes transfer, authoritative link and organized 5x4 test', async ({ page }) => {
  test.setTimeout(210_000);
  for (const asset of assets.chapters) {
    await loadSavedPage(page, asset.endingPage);
    await expect(page.getByTestId('chapter-transfer'), `chapter ${asset.chapter} transfer`).toHaveCount(1);
    const resource = page.getByTestId('chapter-resource');
    await expect(resource, `chapter ${asset.chapter} resource`).toHaveCount(1);
    const link = resource.getByTestId('chapter-resource-link');
    await expect(link).toHaveAttribute('href', /^https:\/\//u);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener/u);
    const quiz = page.getByTestId('chapter-quiz');
    await expect(quiz, `chapter ${asset.chapter} quiz`).toHaveCount(1);
    await expect(quiz.getByTestId('chapter-quiz-question')).toHaveCount(5);
    const firstQuestion = quiz.getByTestId('chapter-quiz-question').first();
    await expect(firstQuestion.getByTestId('chapter-quiz-choice')).toHaveCount(4);
    await firstQuestion.getByTestId('chapter-quiz-choice').first().click();
    await expect(firstQuestion.getByTestId('chapter-quiz-feedback')).toBeVisible();
  }
});

test('cumulative review and references are clean, readable and free of presentation residue', async ({ page }) => {
  test.setTimeout(120_000);
  for (const pageNumber of [217, 220, 225, 230, 235, 239]) {
    await loadSavedPage(page, pageNumber);
    const text = await page.getByTestId('book-page').innerText();
    expect(text).toContain('Revisão cumulativa');
    expect(text).toContain('Recupere sem consultar');
    expect(text).toContain('Transfira');
    expect(text).not.toMatch(/Resposta orientadora|Fontes nucleares|Abrir recurso Abrir recurso/iu);
  }
  let references = '';
  for (const pageNumber of [242, 243, 244]) {
    await loadSavedPage(page, pageNumber);
    references += `\n${await page.getByTestId('book-page').innerText()}`;
  }
  expect(references).toContain('Instrução Técnica Operacional n. 30');
  expect(references).toContain('Boletim Epidemiológico');
  expect(references).toContain('Tratado de suicidologia');
  expect(references).toContain('Applied and Preventive Psychology');
  expect(references).not.toMatch(/PowerPoint|\.pptx?\b|Plano de Ensino|Aula:|Material didático de apresentação/iu);
});

test('PSP chapter is applied, direct and body text has no backstage or narrative ITO citation', async ({ page }) => {
  test.setTimeout(120_000);
  let psp = '';
  for (const pageNumber of [195, 196, 197, 198, 199, 200, 201]) {
    await loadSavedPage(page, pageNumber);
    psp += `\n${await page.getByTestId('book-page').innerText()}`;
  }
  for (const term of ['Preparar', 'Olhar', 'Escutar', 'Conectar', 'não é psicoterapia', 'debriefing psicológico compulsório', 'Posvenção']) expect(psp).toContain(term);
  expect(psp).not.toMatch(/ITO 30|versões? em andamento|aula oficial|plano de ensino|prompt|ChatGPT/iu);

  await loadSavedPage(page, 198);
  await expect(page.getByTestId('book-page')).toContainText('próximo passo concreto');
  await loadSavedPage(page, 200);
  await expect(page.getByTestId('book-page')).toContainText('Acompanhar sem vigiar');
});

test('frontend presents only learner-facing release content', async ({ page }) => {
  await loadSavedPage(page, 8);
  const html = await page.content();
  for (const forbidden of ['data-wave=', 'data-editorial-wave=', 'data-design-wave=', 'data-wave78-status=', 'data-design-system=', 'data-design-subwave=', 'data-semantic-renderer=', 'data-multimedia-wave=', 'data-reader-wave=', 'ChatGPT', 'system prompt', 'sourceBlockId']) expect(html).not.toContain(forbidden);
  const paperText = await page.getByTestId('book-page').innerText();
  expect(paperText).not.toMatch(/onda\s*\d|wave\s*\d|runtime|sourceBlockId|prompt/iu);
});
