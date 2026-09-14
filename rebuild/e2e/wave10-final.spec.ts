import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const enrichment = JSON.parse(fs.readFileSync(path.join(process.cwd(),'content','chapter-enrichment.json'),'utf8')) as {
  chapters:Array<{chapter:number;openingPage:number;endingPage:number;microlearning:{pageNumber:number};resource:{url:string;title:string}}>
};

async function loadSavedPage(page:Page,pageNumber:number){
  await page.goto('/',{waitUntil:'networkidle'});
  await page.evaluate(number=>localStorage.setItem('cats-rebuild-page',String(number-1)),pageNumber);
  await page.reload({waitUntil:'networkidle'});
  await expect(page.getByTestId('page-counter')).toHaveText(`${pageNumber} / 249`);
}

const forbiddenPublic = /\bITO\s*30\b|\bminuta\b|vers(?:ão|ões)\s+(?:em andamento|provisória|de trabalho)|COMPLEMENTO DIDÁTICO|NÃO NORMATIVO|resposta canônica|benchmark externo|versão digital canônica|\bChatGPT\b|\bprompt\b|_{5,}|Resposta orientadora/iu;

test('Wave10 final frontend has no backstage release diagnostics or forbidden public residue', async ({page})=>{
  test.setTimeout(150_000);
  await loadSavedPage(page,1);
  const shellAttrs=await page.getByTestId('reader-shell').evaluate(el=>[...el.attributes].map(a=>a.name));
  for(const attr of ['data-wave','data-editorial-wave','data-design-wave','data-wave78-status','data-design-system','data-design-subwave','data-semantic-renderer','data-reader-wave']) expect(shellAttrs).not.toContain(attr);
  for(const pageNumber of [3,5,8,55,68,69,101,133,134,158,182,189,193,196,198,199,217,239,240,241]){
    await loadSavedPage(page,pageNumber);
    const text=await page.getByTestId('book-page').innerText();
    expect(text,`page ${pageNumber} public residue`).not.toMatch(forbiddenPublic);
  }
});

test('every chapter exposes application-transfer and a safe curated resource',async({page})=>{
  test.setTimeout(180_000);
  expect(enrichment.chapters).toHaveLength(34);
  for(const chapter of enrichment.chapters){
    await loadSavedPage(page,chapter.endingPage);
    const transfer=page.getByTestId('application-transfer');
    await expect(transfer).toHaveCount(1);
    await expect(transfer).toContainText('Aplicar');
    await expect(transfer).toContainText('Transferir');
    await expect(transfer).toContainText('Verificar');
    const resource=page.getByTestId('chapter-resource');
    await expect(resource).toHaveCount(1);
    const link=resource.getByTestId('chapter-resource-link');
    await expect(link).toHaveAttribute('href',/^https:\/\//);
    await expect(link).toHaveAttribute('rel',/noopener/);
    await expect(link).toHaveAttribute('target','_blank');
  }
});

test('cumulative review is uncluttered and bibliography is clean ABNT-oriented publication list',async({page})=>{
  test.setTimeout(120_000);
  let chapterHeadings=0;
  for(let pageNumber=217;pageNumber<=239;pageNumber+=1){
    await loadSavedPage(page,pageNumber);
    const paper=page.getByTestId('book-page');
    await expect(paper).toContainText('Revisão cumulativa');
    const text=await paper.innerText();
    expect(text).not.toMatch(/Resposta orientadora|_{5,}|Abrir recurso\s+Abrir recurso/iu);
    chapterHeadings+=await paper.locator('h3').filter({hasText:/^Capítulo \d+ —/u}).count();
  }
  expect(chapterHeadings).toBe(34);
  let references=0;
  for(const pageNumber of [242,243,244]){
    await loadSavedPage(page,pageNumber);
    const paper=page.getByTestId('book-page');
    await expect(paper).toContainText('Referências');
    const text=await paper.innerText();
    expect(text).not.toMatch(/\bPPT\b|PowerPoint|\bAula:|material didático de apresentação|Plano de Ensino|benchmark externo|versão digital canônica/iu);
    references+=await paper.locator('[data-kind="reference"]').count();
  }
  expect(references).toBeGreaterThanOrEqual(12);
});

test('chapter 32 presents practical psychological first aid flow and boundaries',async({page})=>{
  for(const pageNumber of [196,197,198,199,200,201]){
    await loadSavedPage(page,pageNumber);
    const text=await page.getByTestId('book-page').innerText();
    expect(text).not.toMatch(/\bITO\s*30\b|aulas oficiais|BASE TÉCNICO-PEDAGÓGICA/iu);
  }
  await loadSavedPage(page,196);
  await expect(page.getByTestId('book-page')).toContainText('Preparar');
  await expect(page.getByTestId('book-page')).toContainText('Olhar');
  await loadSavedPage(page,197);
  await expect(page.getByTestId('book-page')).toContainText('Escutar');
  await loadSavedPage(page,198);
  await expect(page.getByTestId('book-page')).toContainText('Conectar');
  await expect(page.getByTestId('book-page')).toContainText('próximo passo concreto');
  await loadSavedPage(page,200);
  await expect(page.getByTestId('book-page')).toContainText('Debriefing operacional não é debriefing psicológico compulsório');
});

test('final didactic cards and stepped quiz remain inside a 320px viewport',async({page})=>{
  await page.setViewportSize({width:320,height:740});
  const chapter=enrichment.chapters.find(item=>item.chapter===32)!;
  await loadSavedPage(page,chapter.microlearning.pageNumber);
  await expect(page.getByTestId('chapter-microlearning')).toBeVisible();
  await loadSavedPage(page,chapter.endingPage);
  await expect(page.getByTestId('application-transfer')).toBeVisible();
  await expect(page.getByTestId('chapter-resource')).toBeVisible();
  await expect(page.getByTestId('chapter-quiz')).toBeVisible();
  const metrics=await page.evaluate(()=>({viewport:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,paper:document.querySelector<HTMLElement>('[data-testid="book-page"]')?.getBoundingClientRect()}));
  expect(metrics.scroll).toBeLessThanOrEqual(metrics.viewport+1);
  expect(metrics.paper?.left ?? -10).toBeGreaterThanOrEqual(-1);
  expect(metrics.paper?.right ?? 9999).toBeLessThanOrEqual(metrics.viewport+1);
});
