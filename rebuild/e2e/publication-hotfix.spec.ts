import { test, expect } from '@playwright/test';

const normalize = (value:string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();

test('reader editorial hotfix traverses every page and resets quizzes by chapter', async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto('/');
  await expect(page.getByTestId('reader-shell')).toBeVisible();
  await expect(page.getByTestId('approved-cover')).toBeVisible();
  await expect(page.getByTestId('approved-cover').locator('[data-testid="cats-logo"]')).toBeVisible();
  await expect(page.getByTestId('multimedia-layer').locator('[data-media-kind="video"]')).toHaveCount(0);

  const counter = (await page.getByTestId('page-counter').innerText()).trim();
  const match = counter.match(/1\s*\/\s*(\d+)/);
  expect(match).not.toBeNull();
  const total = Number(match?.[1]);
  expect(total).toBeGreaterThan(200);
  expect(total).toBeLessThan(246);

  const quizChapters = new Set<number>();
  let vivaLinks = 0;
  let infographicCount = 0;
  let tacticalPages = 0;

  for (let expectedPage = 1; expectedPage <= total; expectedPage += 1) {
    await expect(page.getByTestId('page-counter')).toContainText(`${expectedPage} / ${total}`);
    const article = page.getByTestId('book-page');
    const text = (await article.innerText()).trim();
    expect(text.length, `page ${expectedPage} should contain written content`).toBeGreaterThan(8);
    const lines = text.split(/\n+/).map(normalize).filter(Boolean);
    expect(lines).not.toContain('REVISAO CUMULATIVA');
    expect(lines).not.toContain('CASO DE TRANSFERENCIA');
    expect(lines).not.toContain('APLICACAO E TRANSFERENCIA');
    expect(lines).not.toContain('CENARIO');
    expect(await article.locator('[data-media-kind="video"]').count()).toBe(0);

    const media = article.locator('[data-media-kind="infographic"]');
    infographicCount += await media.count();

    if (/CAP[IÍ]TULO\s+23/iu.test(text)) {
      tacticalPages += 1;
      expect(await article.locator('[data-kind="heading"]').count(), `chapter 23 page ${expectedPage} internal headings`).toBe(0);
    }

    const resources = article.getByTestId('chapter-resource-link');
    if (await resources.count()) {
      const href = await resources.first().getAttribute('href');
      expect(href).toMatch(/^https:\/\//u);
      expect(href).not.toMatch(/who\.int\//iu);
      await expect(resources.first()).toHaveAttribute('lang','pt-BR');
      if (/VIVA\/SINAN/iu.test(text)) {
        expect(href).toBe('https://www.gov.br/saude/pt-br/composicao/svsa/inqueritos-de-saude/viva-sinan');
        vivaLinks += 1;
      }
    }

    const quiz = article.getByTestId('chapter-quiz');
    if (await quiz.count()) {
      const chapter = Number(await quiz.getAttribute('data-chapter'));
      expect(chapter).toBeGreaterThanOrEqual(1);
      expect(chapter).toBeLessThanOrEqual(34);
      expect(quizChapters.has(chapter), `quiz repeated for chapter ${chapter}`).toBeFalsy();
      quizChapters.add(chapter);
      await expect(quiz.getByTestId('chapter-quiz-question')).toHaveAttribute('data-question-index','1');
      const legend = quiz.locator('legend');
      expect(await legend.evaluate(el => getComputedStyle(el).fontWeight)).toBe('400');
      await quiz.getByTestId('chapter-quiz-choice').first().click();
      const feedback = quiz.getByTestId('chapter-quiz-feedback');
      await expect(feedback).toBeVisible();
      const legendBox = await legend.boundingBox();
      const feedbackBox = await feedback.boundingBox();
      expect(feedbackBox && legendBox && feedbackBox.y > legendBox.y + legendBox.height).toBeTruthy();
      if (chapter < 34) {
        await quiz.getByRole('button',{name:'Próxima questão'}).click();
        await expect(quiz.getByTestId('chapter-quiz-question')).toHaveAttribute('data-question-index','2');
      }
    }

    if (expectedPage < total) await page.getByRole('button',{name:'Próxima página'}).click();
  }

  expect(quizChapters.size).toBe(34);
  expect(tacticalPages).toBeGreaterThan(0);
  expect(vivaLinks).toBe(1);
  expect(infographicCount).toBeGreaterThanOrEqual(3);
});

test('downloadable PDF has ITE44 front matter and physical TOC contract', async ({ request }) => {
  test.setTimeout(90_000);
  const response = await request.get('/api/manual');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/pdf');
  expect(response.headers()['x-cats-editorial-edition']).toBe('publication-grade-ite44-frontmatter-2026');
  const body = await response.body();
  expect(body.length).toBeGreaterThan(100_000);
  const binary = body.toString('latin1');
  expect(binary.startsWith('%PDF-1.4')).toBeTruthy();
  expect((binary.match(/\/Type \/Page\b/g) || []).length).toBeGreaterThan(100);
  expect((binary.match(/ Tw /g) || []).length).toBeGreaterThan(100);

  const decodeCommands = (stream:string) => [...stream.matchAll(/<([0-9A-F]+)>/g)].map(match => Buffer.from(match[1], 'hex').toString('latin1'));
  const streams = [...binary.matchAll(/stream\n([\s\S]*?)\nendstream/g)].map(match => match[1]);
  const pageCommands = streams.map(decodeCommands);
  const allText = pageCommands.flat().join('\n');
  expect(allText).toContain('AUTORIA INSTITUCIONAL');
  expect(allText).toContain('PREFÁCIO DO COORDENADOR');
  expect(allText).toContain('Maj BM Richelmy Murta Pinto - Coordenador');
  expect(allText).toContain('Sd BM Mike Hollander dos Santos Guimarães - Membro');
  expect(allText).not.toContain('__PDF_PAGE_');

  const physical = new Map<number, number>();
  for (let chapter = 1; chapter <= 34; chapter += 1) {
    const pattern = new RegExp(`^CAPÍTULO ${chapter}(?:\\s|$)`, 'u');
    const pageIndex = pageCommands.findIndex(commands => commands.some(command => pattern.test(command)));
    expect(pageIndex, `physical page for chapter ${chapter}`).toBeGreaterThanOrEqual(0);
    physical.set(chapter, pageIndex + 1);
  }
  const firstChapterPage = physical.get(1) ?? 0;
  const frontCommands = pageCommands.slice(0, firstChapterPage - 1).flat();
  for (let chapter = 1; chapter <= 34; chapter += 1) {
    const start = frontCommands.findIndex(command => command.startsWith(`Capítulo ${chapter} `));
    expect(start, `TOC entry for chapter ${chapter}`).toBeGreaterThanOrEqual(0);
    let end = frontCommands.length;
    for (let next = chapter + 1; next <= 34; next += 1) {
      const candidate = frontCommands.findIndex((command, index) => index > start && command.startsWith(`Capítulo ${next} `));
      if (candidate >= 0) { end = candidate; break; }
    }
    const expected = String(physical.get(chapter));
    expect(frontCommands.slice(start, end).some(command => command.trim().endsWith(expected)), `TOC physical page for chapter ${chapter}`).toBeTruthy();
  }
});
