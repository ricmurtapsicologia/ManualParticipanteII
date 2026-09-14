import { test, expect } from '@playwright/test';

async function loadPage(page: import('@playwright/test').Page, pageNumber: number) {
  await page.goto('/', { waitUntil:'networkidle' });
  await page.evaluate(number => localStorage.setItem('cats-rebuild-page', String(number - 1)), pageNumber);
  await page.reload({ waitUntil:'networkidle' });
  await expect(page.getByTestId('page-counter')).toHaveText(`${pageNumber} / 249`);
  return page.getByTestId('book-page');
}

test('editorial hierarchy and repaired continuations remain intact', async ({ page }) => {
  let paper = await loadPage(page,3);
  await expect(paper.getByRole('heading',{name:'Como usar este manual'})).toBeVisible();
  paper = await loadPage(page,6);
  await expect(paper).toContainText('Sete partes, uma progressão: compreender → organizar → abordar → integrar.');
  paper = await loadPage(page,24);
  await expect(paper).toContainText('4. Violência autoprovocada notificada não é igual a suicídio consumado');
  paper = await loadPage(page,29);
  await expect(paper).toContainText('Compreender processos sem reduzir a pessoa a um mecanismo');
  paper = await loadPage(page,36);
  await expect(paper).toContainText('Usar contexto sem transformar listas em oráculos');
  paper = await loadPage(page,68);
  await expect(paper).toContainText('Werther não é palavra para censurar; é razão para comunicar com cuidado');
  await expect(paper).toContainText('O chamado efeito Werther descreve');
});

test('legacy assessment and worksheet clutter is absent from chapter development', async ({ page }) => {
  for (const pageNumber of [14,20,28,34,41,44,46,48,59,65,70,136,180,190,194,201]) {
    const paper = await loadPage(page,pageNumber);
    const text = await paper.innerText();
    expect(text).not.toMatch(/_{5,}/u);
    expect(text).not.toMatch(/Referências principais:|Fontes nucleares do capítulo:/iu);
    expect(text).not.toMatch(/COMPLEMENTO DIDÁTICO|NÃO NORMATIVO|versão em andamento|\bminuta\b/iu);
  }
});

test('operational content remains direct and free of source-attribution prose', async ({ page }) => {
  for (const pageNumber of [55,68,69,101,115,133,134,145,158,182,189,193,196,198,199]) {
    const paper = await loadPage(page,pageNumber);
    const text = await paper.innerText();
    expect(text).not.toMatch(/\bITO\s*30\b/iu);
    expect(text).not.toMatch(/\bA ITO\b/iu);
  }
  const paper72 = await loadPage(page,72);
  for (const item of ['Comando — prioridades • segurança • recursos • decisão','Abordador — díade e comunicação','Auxiliar — escuta, apoio e filtro','Segurança — EPI, riscos, rota de fuga']) await expect(paper72).toContainText(item);
});

test('editorial coverage remains complete through page 249', async ({ page }) => {
  const checkpoints = [1,25,50,75,100,125,150,175,200,217,239,242,249];
  for (const pageNumber of checkpoints) {
    const paper = await loadPage(page,pageNumber);
    const content = (await paper.innerText()).trim();
    expect(content.length, `page ${pageNumber} should contain editorial content`).toBeGreaterThan(20);
    expect(content).not.toContain('�');
    expect(content).not.toMatch(/\.→|→\s*→\s*→/u);
  }
});
