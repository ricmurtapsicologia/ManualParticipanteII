import { test, expect } from '@playwright/test';

async function loadPage(page: import('@playwright/test').Page, pageNumber: number) {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.evaluate(number => localStorage.setItem('cats-rebuild-page', String(number - 1)), pageNumber);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByTestId('page-counter')).toHaveText(`${pageNumber} / 249`);
  return page.getByTestId('book-page');
}

test('wave 7.1 repairs front-matter hierarchy, orphan page and map extraction', async ({ page }) => {
  let paper = await loadPage(page, 3);
  await expect(paper.getByRole('heading', { name: 'Como usar este manual' })).toBeVisible();
  await expect(paper).toContainText('Este Manual do participante acompanha aulas, estudo, simulações e revisão posterior do CATS.');

  paper = await loadPage(page, 5);
  await expect(paper).toContainText('1. ITO 30 vigente e demais normas aplicáveis — fonte normativa');
  await expect(paper).toContainText('o termo normativo da ITO 30 vigente para a linha comunicacional é “abordagem técnica”');

  paper = await loadPage(page, 6);
  await expect(paper).toContainText('Sete partes, uma progressão: compreender → organizar → abordar → integrar.');
  for (const item of ['1. Fenômeno', '2. Ocorrência', '3. Abordagem técnica', '4. Abordagem tática', '5. Pessoas e contextos', '6. Depois da crise', '7. Integração']) await expect(paper).toContainText(item);
  await expect(paper).not.toContainText('.→ → →');
});

test('wave 7.1 removes cross-page sentence fragments and restores section hierarchy', async ({ page }) => {
  let paper = await loadPage(page, 8);
  await expect(paper).toContainText('solicitar apoio, planejar, decidir e manter respeito à dignidade humana.');

  paper = await loadPage(page, 9);
  const page9 = (await paper.innerText()).trim();
  expect(page9).not.toMatch(/^decidir\b/i);

  paper = await loadPage(page, 24);
  await expect(paper).toContainText('4. Violência autoprovocada notificada não é igual a suicídio consumado');
  await expect(paper).not.toContainText('consumado Em 2021');

  paper = await loadPage(page, 25);
  await expect(paper).toContainText('taxas específicas podem ser altas em determinados estratos.');

  paper = await loadPage(page, 26);
  const page26 = (await paper.innerText()).trim();
  expect(page26).not.toMatch(/^estratos\b/i);
});

test('wave 7.1 recomposes TESTE-SE questions as complete units', async ({ page }) => {
  const expected: Array<[number, number[]]> = [[14, [1, 2, 3]], [15, [4, 5]], [20, [6, 7, 8, 9, 10]]];
  for (const [pageNumber, questions] of expected) {
    const paper = await loadPage(page, pageNumber);
    const text = await paper.innerText();
    for (const question of questions) {
      const line = text.split('\n').map(item => item.trim()).find(item => item.startsWith(`${question}. `));
      expect(line, `question ${question} on page ${pageNumber}`).toBeTruthy();
      expect(line!.endsWith('?')).toBeTruthy();
    }
  }
});
