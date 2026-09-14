import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const PAGE_COUNT = 246;
const enrichment = JSON.parse(fs.readFileSync(path.join(process.cwd(),'content','chapter-enrichment.json'),'utf8')) as {
  chapters:Array<{chapter:number;title:string;openingPage:number;endingPage:number;microlearning:{pageNumber:number};transfer:{pageNumber:number};resource:{pageNumber:number;url:string;title:string}}>
};
const quizzes = JSON.parse(fs.readFileSync(path.join(process.cwd(),'content','chapter-quizzes.json'),'utf8')) as {
  chapters:Array<{chapter:number;openingPage:number;endingPage:number;questions:Array<{id:string;choices:Array<{id:string;correct:boolean}>}>}>
};

async function loadSavedPage(page:Page,pageNumber:number){
  await page.goto('/',{waitUntil:'networkidle'});
  await page.evaluate(number=>localStorage.setItem('cats-rebuild-page',String(number-1)),pageNumber);
  await page.reload({waitUntil:'networkidle'});
  await expect(page.getByTestId('page-counter')).toHaveText(`${pageNumber} / ${PAGE_COUNT}`);
  await expect(page.getByTestId('reader-surface')).toHaveAttribute('data-turn-direction','idle');
}

const forbiddenPublic = /\bITO\s*30\b|\bminuta\b|vers(?:ão|ões)\s+(?:em andamento|provisória|de trabalho)|COMPLEMENTO DIDÁTICO|NÃO NORMATIVO|resposta canônica|benchmark externo|versão digital canônica|\bChatGPT\b|\bprompt\b|_{5,}|Resposta orientadora/iu;
const removedAnnex = /COMANDANTE-GERAL DO CBMMG|HIERARQUIA DE FONTES|Minutas V3\.1 a V3\.4/iu;

test('Wave10 deep audit traverses all 246 public pages with no backstage or removed-annex residue', async ({page})=>{
  test.setTimeout(360_000);
  await loadSavedPage(page,1);
  const shellAttrs=await page.getByTestId('reader-shell').evaluate(el=>[...el.attributes].map(a=>a.name));
  for(const attr of ['data-wave','data-editorial-wave','data-design-wave','data-wave78-status','data-design-system','data-design-subwave','data-semantic-renderer','data-reader-wave']) expect(shellAttrs).not.toContain(attr);
  await expect(page.getByTestId('reader-shell')).toHaveAttribute('data-page-count',String(PAGE_COUNT));

  for(let pageNumber=1;pageNumber<=PAGE_COUNT;pageNumber+=1){
    await expect(page.getByTestId('page-counter')).toHaveText(`${pageNumber} / ${PAGE_COUNT}`);
    await expect(page.getByTestId('reader-surface')).toHaveAttribute('data-turn-direction','idle');
    const paper=page.getByTestId('book-page');
    const text=(await paper.innerText()).trim();
    if(pageNumber>1) expect(text.length,`page ${pageNumber} written content`).toBeGreaterThan(10);
    expect(text,`page ${pageNumber} removed annex`).not.toMatch(removedAnnex);
    if(pageNumber<239) expect(text,`page ${pageNumber} public residue`).not.toMatch(forbiddenPublic);
    expect(text).not.toContain('�');
    const metrics=await page.evaluate(()=>({viewport:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
    expect(metrics.scroll,`page ${pageNumber} horizontal overflow`).toBeLessThanOrEqual(metrics.viewport+1);
    if(pageNumber<PAGE_COUNT) await page.getByRole('button',{name:'Próxima página'}).click();
  }
  await expect(page.getByRole('button',{name:'Próxima página'})).toBeDisabled();
});

test('all 34 chapters expose objectives, summary, microlearning, transfer, resource and 5x4 quiz contract',async({page})=>{
  test.setTimeout(360_000);
  expect(enrichment.chapters).toHaveLength(34);
  expect(quizzes.chapters).toHaveLength(34);
  for(const chapter of enrichment.chapters){
    const quiz=quizzes.chapters.find(item=>item.chapter===chapter.chapter)!;
    expect(quiz.questions).toHaveLength(5);
    for(const question of quiz.questions){
      expect(question.choices).toHaveLength(4);
      expect(question.choices.filter(choice=>choice.correct)).toHaveLength(1);
    }

    await loadSavedPage(page,chapter.openingPage);
    await expect(page.getByTestId('book-page')).toHaveAttribute('data-page-role','chapter-opening');
    await expect(page.locator('[data-kind="objectives"]')).toHaveCount(1);

    await loadSavedPage(page,chapter.microlearning.pageNumber);
    const micro=page.getByTestId('chapter-microlearning');
    await expect(micro).toHaveCount(1);
    const microChoices=micro.getByTestId('chapter-microlearning-choice');
    await expect(microChoices).toHaveCount(4);
    await microChoices.first().click();
    await expect(micro.getByTestId('chapter-microlearning-feedback')).toBeVisible();

    await loadSavedPage(page,chapter.endingPage);
    await expect(page.locator('[data-kind="summary"]')).toHaveCount(1);
    const transfer=page.getByTestId('application-transfer');
    await expect(transfer).toHaveCount(1);
    for(const label of ['Aplicar','Transferir','Verificar']) await expect(transfer).toContainText(label);
    const resource=page.getByTestId('chapter-resource');
    await expect(resource).toHaveCount(1);
    const link=resource.getByTestId('chapter-resource-link');
    await expect(link).toHaveAttribute('href',/^https:\/\//);
    await expect(link).toHaveAttribute('rel',/noopener/);
    await expect(link).toHaveAttribute('target','_blank');
    const chapterQuiz=page.getByTestId('chapter-quiz');
    await expect(chapterQuiz).toHaveCount(1);
    await expect(chapterQuiz.getByTestId('chapter-quiz-question')).toHaveCount(1);
    await expect(chapterQuiz.getByTestId('chapter-quiz-choice')).toHaveCount(4);
    await chapterQuiz.getByTestId('chapter-quiz-choice').first().click();
    await expect(chapterQuiz.getByTestId('chapter-quiz-feedback')).toBeVisible();
  }
});

test('cumulative review is clean and references are publication-only under the current ABNT practice',async({page})=>{
  test.setTimeout(180_000);
  let chapterHeadings=0;
  for(let pageNumber=214;pageNumber<=236;pageNumber+=1){
    await loadSavedPage(page,pageNumber);
    const paper=page.getByTestId('book-page');
    await expect(paper).toContainText('Revisão cumulativa');
    const text=await paper.innerText();
    expect(text).not.toMatch(/Resposta orientadora|_{5,}|FEEDBACK \/ DÚVIDA|CRITÉRIO DE SUCESSO|Abrir recurso\s+Abrir recurso/iu);
    chapterHeadings+=await paper.locator('h3').filter({hasText:/^Capítulo \d+ —/u}).count();
  }
  expect(chapterHeadings).toBe(34);
  let references=0;
  for(const pageNumber of [239,240,241]){
    await loadSavedPage(page,pageNumber);
    const paper=page.getByTestId('book-page');
    await expect(paper).toContainText('Referências');
    const text=await paper.innerText();
    expect(text).not.toMatch(/\bPPT\b|PowerPoint|\bAula:|material didático de apresentação|Plano de Ensino|benchmark externo|versão digital canônica/iu);
    references+=await paper.locator('[data-kind="reference"]').count();
  }
  expect(references).toBeGreaterThanOrEqual(12);
});

test('chapter 32 presents practical psychological first aid flow, connection, posvention and boundaries',async({page})=>{
  test.setTimeout(120_000);
  const chapter=enrichment.chapters.find(item=>item.chapter===32)!;
  for(let pageNumber=chapter.openingPage;pageNumber<=chapter.endingPage;pageNumber+=1){
    await loadSavedPage(page,pageNumber);
    const text=await page.getByTestId('book-page').innerText();
    expect(text).not.toMatch(/\bITO\s*30\b|aulas oficiais|BASE TÉCNICO-PEDAGÓGICA/iu);
  }
  await loadSavedPage(page,193);
  await expect(page.getByTestId('book-page')).toContainText('Preparar');
  await expect(page.getByTestId('book-page')).toContainText('Olhar');
  await loadSavedPage(page,194);
  await expect(page.getByTestId('book-page')).toContainText('Escutar');
  await loadSavedPage(page,195);
  await expect(page.getByTestId('book-page')).toContainText('Conectar');
  await expect(page.getByTestId('book-page')).toContainText('próximo passo concreto');
  await loadSavedPage(page,196);
  await expect(page.getByTestId('book-page')).toContainText('Posvenção');
  await loadSavedPage(page,197);
  await expect(page.getByTestId('book-page')).toContainText('Debriefing operacional não é debriefing psicológico compulsório');
});

test('reader navigation, search, persistence and TTS remain functional after final cleanup',async({page})=>{
  await page.addInitScript(()=>{
    const voices=[{name:'English Default',lang:'en-US'},{name:'Antônio',lang:'pt-BR'}];
    class FakeUtterance { text:string; voice:any=null; lang=''; rate=1; onend:any=null; onerror:any=null; constructor(text:string){this.text=text;} }
    Object.defineProperty(window,'SpeechSynthesisUtterance',{configurable:true,value:FakeUtterance});
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>voices,cancel:()=>{},speak:(utterance:any)=>{(window as any).__ttsProof={voice:utterance.voice?.name||null,lang:utterance.lang,rate:utterance.rate};}}});
  });
  await loadSavedPage(page,1);
  await page.getByRole('button',{name:'Sumário'}).click();
  await expect(page.getByTestId('hierarchical-toc')).toBeVisible();
  await expect(page.getByTestId('toc-part')).toHaveCount(7);
  await expect(page.getByTestId('toc-chapter')).toHaveCount(34);
  await page.getByRole('button',{name:'Fechar'}).click();

  await page.getByRole('button',{name:'Pesquisar'}).click();
  const input=page.getByPlaceholder('Digite pelo menos 2 caracteres');
  await input.fill('Tenho um plano para revisar e praticar estas competências após o curso.');
  const hit=page.locator('.hits button').filter({hasText:'P. 246'});
  await expect(hit).toHaveCount(1);
  await hit.click();
  await expect(page.getByTestId('page-counter')).toHaveText('246 / 246');

  await loadSavedPage(page,50);
  await page.reload({waitUntil:'networkidle'});
  await expect(page.getByTestId('page-counter')).toHaveText('50 / 246');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('page-counter')).toHaveText('51 / 246');
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByTestId('page-counter')).toHaveText('50 / 246');

  await page.getByRole('button',{name:'Leitura em voz alta'}).click();
  const proof=await page.evaluate(()=>(window as any).__ttsProof);
  expect(proof.voice).toBe('Antônio');
  expect(proof.lang).toBe('pt-BR');
  expect(proof.rate).toBeCloseTo(0.96,2);
});

test('legacy multimedia resources are remapped to the final pagination without regression',async({page})=>{
  await loadSavedPage(page,5);
  await expect(page.getByTestId('audio-resource')).toHaveCount(1);
  await expect(page.getByTestId('audio-resource')).toHaveAttribute('data-preferred-voice','Antônio');
  await loadSavedPage(page,51);
  await expect(page.getByTestId('video-resource')).toHaveCount(1);
  await expect(page.getByTestId('multimedia-resource')).toHaveCount(1);
});

test('final quiz, microlearning and transfer cards stay readable at 320px without heavy emphasis',async({page})=>{
  await page.setViewportSize({width:320,height:740});
  const chapter=enrichment.chapters.find(item=>item.chapter===32)!;
  await loadSavedPage(page,chapter.microlearning.pageNumber);
  await expect(page.getByTestId('chapter-microlearning')).toBeVisible();
  await loadSavedPage(page,chapter.endingPage);
  await expect(page.getByTestId('application-transfer')).toBeVisible();
  await expect(page.getByTestId('chapter-resource')).toBeVisible();
  await expect(page.getByTestId('chapter-quiz')).toBeVisible();
  const metrics=await page.evaluate(()=>{
    const paper=document.querySelector<HTMLElement>('[data-testid="book-page"]');
    const strong=[...(paper?.querySelectorAll('strong')??[])];
    return {viewport:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,paper:paper?.getBoundingClientRect(),maxWeight:Math.max(0,...strong.map(node=>Number(getComputedStyle(node).fontWeight)||0))};
  });
  expect(metrics.scroll).toBeLessThanOrEqual(metrics.viewport+1);
  expect(metrics.paper?.left ?? -10).toBeGreaterThanOrEqual(-1);
  expect(metrics.paper?.right ?? 9999).toBeLessThanOrEqual(metrics.viewport+1);
  expect(metrics.maxWeight).toBeLessThanOrEqual(650);
});
