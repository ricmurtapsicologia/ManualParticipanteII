import { test, expect } from '@playwright/test';

async function loadSavedPage(page: import('@playwright/test').Page, pageNumber: number) {
  await page.evaluate(number => localStorage.setItem('cats-rebuild-page', String(number - 1)), pageNumber);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByTestId('page-counter')).toHaveText(`${pageNumber} / 249`);
}

test('page 54 renders the source-grounded ATS macro infographic without replacing canonical text', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await loadSavedPage(page, 54);

  const shell = page.getByTestId('reader-shell');
  await expect(shell).toHaveAttribute('data-multimedia-wave', '5.5');

  const resource = page.getByTestId('multimedia-resource');
  await expect(resource).toHaveCount(1);
  await expect(resource).toHaveAttribute('data-media-id', 'ats-system-macro-p54');
  await expect(resource).toHaveAttribute('data-media-src', 'native://ats-system-macro');
  await expect(resource).toContainText('Sistema ATS • visão macro');
  await expect(resource).toContainText('REAVALIAR QUANDO RISCO, AMBIENTE, COMPORTAMENTO, RECURSOS OU RESPOSTA MUDAREM');

  const steps = page.getByTestId('multimedia-step');
  await expect(steps).toHaveCount(7);
  for (const title of ['Acionamento', 'Deslocamento', 'Estabelecimento', 'Observação + avaliação', 'Desenvolvimento', 'Encerramento', 'Continuidade']) {
    await expect(resource).toContainText(title);
  }

  const paper = page.getByTestId('book-page');
  await expect(paper).toContainText('Fases operacionais com avaliação dinâmica transversal.');
  await expect(paper).toContainText('1 Acionamento Receber e qualificar dados.');
  await expect(paper).toContainText('O COBOM recebe ligação de uma irmã relatando que Roberto enviou mensagens de despedida');
});

test('page 54 native infographic remains inside the paper at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/', { waitUntil: 'networkidle' });
  await loadSavedPage(page, 54);

  const integrity = await page.evaluate(() => {
    const paper = document.querySelector<HTMLElement>('[data-testid="book-page"]')?.getBoundingClientRect();
    const figure = document.querySelector<HTMLElement>('[data-testid="multimedia-resource"]')?.getBoundingClientRect();
    const steps = [...document.querySelectorAll<HTMLElement>('[data-testid="multimedia-step"]')].map(item => item.getBoundingClientRect());
    return {
      viewportWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      paper: paper && { left: paper.left, right: paper.right },
      figure: figure && { left: figure.left, right: figure.right },
      steps: steps.map(item => ({ left: item.left, right: item.right }))
    };
  });

  expect(integrity.scrollWidth).toBeLessThanOrEqual(integrity.viewportWidth + 1);
  expect(integrity.paper).toBeTruthy();
  expect(integrity.figure).toBeTruthy();
  expect(integrity.figure!.left).toBeGreaterThanOrEqual(integrity.paper!.left - 1);
  expect(integrity.figure!.right).toBeLessThanOrEqual(integrity.paper!.right + 1);
  for (const step of integrity.steps) {
    expect(step.left).toBeGreaterThanOrEqual(integrity.figure!.left - 1);
    expect(step.right).toBeLessThanOrEqual(integrity.figure!.right + 1);
  }
});
