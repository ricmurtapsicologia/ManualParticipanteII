import { test, expect } from '@playwright/test';

async function loadPage(page: import('@playwright/test').Page, pageNumber: number) {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.evaluate(number => localStorage.setItem('cats-rebuild-page', String(number - 1)), pageNumber);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByTestId('page-counter')).toHaveText(`${pageNumber} / 249`);
  return page.getByTestId('book-page');
}

async function assertCompleteQuestions(page: import('@playwright/test').Page, pageNumber: number, questions: number[]) {
  const paper = await loadPage(page, pageNumber);
  const text = await paper.innerText();
  for (const question of questions) {
    const line = text.split('\n').map(item => item.trim()).find(item => item.startsWith(`${question}. `));
    expect(line, `question ${question} on page ${pageNumber}`).toBeTruthy();
    expect(line!.endsWith('?')).toBeTruthy();
  }
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
  expect((await paper.innerText()).trim()).not.toMatch(/^decidir\b/i);

  paper = await loadPage(page, 24);
  await expect(paper).toContainText('4. Violência autoprovocada notificada não é igual a suicídio consumado');

  paper = await loadPage(page, 25);
  await expect(paper).toContainText('taxas específicas podem ser altas em determinados estratos.');

  paper = await loadPage(page, 26);
  expect((await paper.innerText()).trim()).not.toMatch(/^estratos\b/i);
});

test('wave 7.1 recomposes TESTE-SE questions as complete units', async ({ page }) => {
  for (const [pageNumber, questions] of [[14,[1,2,3]],[15,[4,5]],[20,[6,7,8,9,10]]] as Array<[number, number[]]>) {
    await assertCompleteQuestions(page, pageNumber, questions);
  }
});

test('wave 7.2 repairs continuations, orphan feedback page and chapter-opening hierarchy', async ({ page }) => {
  let paper = await loadPage(page, 27);
  expect((await paper.innerText()).trim()).not.toMatch(/^para quem decide\b/i);

  paper = await loadPage(page, 29);
  await expect(paper).toContainText('Compreender processos sem reduzir a pessoa a um mecanismo');

  paper = await loadPage(page, 30);
  expect((await paper.innerText()).trim()).not.toMatch(/^desligou/i);

  paper = await loadPage(page, 35);
  await expect(paper.getByRole('heading', { name: 'FEEDBACK / DÚVIDA' })).toBeVisible();
  await expect(paper).toContainText('Registre um acerto, um ajuste para a próxima prática ou uma dúvida para o instrutor.');

  paper = await loadPage(page, 36);
  await expect(paper).toContainText('Usar contexto sem transformar listas em oráculos');

  paper = await loadPage(page, 40);
  expect((await paper.innerText()).trim()).not.toMatch(/^decisão\?/i);

  paper = await loadPage(page, 47);
  expect((await paper.innerText()).trim()).not.toMatch(/^explicita\b/i);
});

test('wave 7.2 restores interlude hierarchy and TESTE-SE questions 11 to 40', async ({ page }) => {
  for (const [pageNumber, questions] of [
    [28,[11,12,13,14,15]],
    [34,[16,17,18,19,20]],
    [41,[21,22,23,24,25]],
    [44,[26,27,28,29,30]],
    [46,[31,32,33,34,35]],
    [48,[36,37,38,39,40]]
  ] as Array<[number, number[]]>) await assertCompleteQuestions(page, pageNumber, questions);

  let paper = await loadPage(page, 41);
  await expect(paper.getByRole('heading', { name: 'Pensar além do procedimento' })).toBeVisible();
  await expect(paper.getByRole('heading', { name: 'Aprofundamento 1 — Pensar o suicídio como fenômeno complexo' })).toBeVisible();

  paper = await loadPage(page, 44);
  await expect(paper.getByRole('heading', { name: 'Aprofundamento 2 — Alfabetização epidemiológica para o CATS' })).toBeVisible();

  paper = await loadPage(page, 46);
  await expect(paper.getByRole('heading', { name: 'Aprofundamento 3 — Modelos cognitivos: utilidade e limites' })).toBeVisible();
});

test('wave 7.3 repairs operational chapter extraction and assessment units', async ({ page }) => {
  let paper = await loadPage(page, 55);
  await expect(paper).toContainText('1. O primeiro contato pode ocorrer sem que a pessoa em crise esteja na linha');
  await expect(paper).toContainText('A ITO 30 atribui ao sistema de despacho e à guarnição');

  for (const [pageNumber, questions] of [
    [59,[46,47,48,49,50]],
    [65,[51,52,53,54,55]],
    [70,[56,57,58,59,60]]
  ] as Array<[number, number[]]>) await assertCompleteQuestions(page, pageNumber, questions);

  paper = await loadPage(page, 68);
  await expect(paper).toContainText('4. Werther não é palavra para censurar; é razão para comunicar com cuidado');
  await expect(paper).toContainText('O chamado efeito Werther descreve');

  paper = await loadPage(page, 72);
  for (const item of ['Comando — prioridades • segurança • recursos • decisão','Abordador — díade e comunicação','Auxiliar — escuta, apoio e filtro','Segurança — EPI, riscos, rota de fuga','Tática — prontidão e oportunidade','Coleta de informação — dados úteis e verificação','Integração/APH — rede e continuidade']) await expect(paper).toContainText(item);

  paper = await loadPage(page, 74);
  await expect(paper).toContainText('5. Coleta de informações: ampliar conhecimento sem transformar a pessoa em prontuário ambulante');

  paper = await loadPage(page, 75);
  expect((await paper.innerText()).trim()).not.toMatch(/^sensação\b/i);
});

test('wave 7.10 preserves every editorial batch boundary through page 249', async ({ page }) => {
  const checkpoints = [51,75,76,100,101,125,126,150,151,175,176,200,201,225,226,249];
  for (const pageNumber of checkpoints) {
    const paper = await loadPage(page, pageNumber);
    const content = (await paper.innerText()).trim();
    expect(content.length, `page ${pageNumber} should contain editorial content`).toBeGreaterThan(20);
    expect(content, `page ${pageNumber} should not contain replacement glyphs`).not.toContain('�');
  }
});
