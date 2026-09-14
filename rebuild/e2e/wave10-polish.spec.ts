import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const enrichment=JSON.parse(fs.readFileSync(path.join(process.cwd(),'content','chapter-enrichment.json'),'utf8')) as {chapters:Array<{chapter:number;endingPage:number;resource:{title:string;url:string;language:string;type:string}}>};
const navigation=JSON.parse(fs.readFileSync(path.join(process.cwd(),'content','navigation.json'),'utf8')) as {parts:Array<{chapters:Array<{chapter:number}>}>};
const semantic=JSON.parse(fs.readFileSync(path.join(process.cwd(),'content','semantic-pages.json'),'utf8')) as {pages:Array<{chapter?:number|null;blocks:Array<{kind:string;text:string}>}>};
const PAGE_COUNT=246;

async function loadSavedPage(page:Page,pageNumber:number){
  await page.goto('/',{waitUntil:'networkidle'});
  await page.evaluate(number=>localStorage.setItem('cats-rebuild-page',String(number-1)),pageNumber);
  await page.reload({waitUntil:'networkidle'});
  await expect(page.getByTestId('page-counter')).toHaveText(`${pageNumber} / ${PAGE_COUNT}`);
  await expect(page.getByTestId('reader-surface')).toHaveAttribute('data-turn-direction','idle');
}

test('cover is edited and manual PDF has a dedicated download control',async({page,request})=>{
  await loadSavedPage(page,1);
  await expect(page.getByTestId('approved-cover')).toHaveCount(1);
  const art=page.getByTestId('approved-cover-image');
  await expect(art).toHaveCount(1);
  await expect(art.locator('text')).toContainText(['CATS','Manual do','Participante']);
  const download=page.getByTestId('manual-download');
  await expect(download).toBeVisible();
  await expect(download).toHaveAttribute('href','/api/manual');
  await expect(download).toHaveAttribute('download','Manual-do-Participante-CATS.pdf');
  const response=await request.get('/api/manual');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/pdf');
  expect(response.headers()['content-disposition']).toContain('Manual-do-Participante-CATS.pdf');
  const body=await response.body();
  expect(body.length).toBeGreaterThan(50000);
  expect(body.subarray(0,8).toString('latin1')).toContain('%PDF-1.4');
});

test('all 34 chapter resources are unique, written, Portuguese and never point to GTO',async({page})=>{
  test.setTimeout(240_000);
  expect(enrichment.chapters).toHaveLength(34);
  const urls=enrichment.chapters.map(item=>item.resource.url);
  const titles=enrichment.chapters.map(item=>item.resource.title.toLocaleLowerCase('pt-BR'));
  expect(new Set(urls).size).toBe(34);
  expect(new Set(titles).size).toBe(34);
  for(const chapter of enrichment.chapters){
    expect(chapter.resource.language).toBe('pt-BR');
    expect(chapter.resource.type).toBe('link');
    expect(chapter.resource.url).toMatch(/^https:\/\//);
    expect(chapter.resource.url).not.toMatch(/gto\.bombeiros\.mg\.gov\.br/i);
    await loadSavedPage(page,chapter.endingPage);
    const resource=page.getByTestId('chapter-resource');
    await expect(resource).toHaveCount(1);
    await expect(resource).toContainText(chapter.resource.title);
    await expect(resource.getByTestId('chapter-resource-link')).toHaveAttribute('href',chapter.resource.url);
  }
});

test('chapter and numbered structure sequence is contiguous',async()=>{
  const chapters=navigation.parts.flatMap(part=>part.chapters).map(item=>item.chapter).sort((a,b)=>a-b);
  expect(chapters).toEqual(Array.from({length:34},(_,i)=>i+1));
  const skip=/^(cap[ií]tulo|parte|objetivos do cap[ií]tulo|resumo do cap[ií]tulo|revis[aã]o cumulativa|refer[eê]ncias|gabarito|continua[cç][aã]o)\b/iu;
  for(let chapter=1;chapter<=34;chapter+=1){
    const numbers=semantic.pages.filter(page=>page.chapter===chapter).flatMap(page=>page.blocks).filter(block=>block.kind==='heading'&&!skip.test(block.text.trim())).map(block=>block.text.trim().match(/^(\d+)[.)]\s+/u)).filter(Boolean).map(match=>Number(match![1]));
    numbers.forEach((value,index)=>expect(value,`chapter ${chapter} heading sequence ${numbers.join(',')}`).toBe(index+1));
  }
});

test('cover, download control and resource cards remain usable at 320px',async({page})=>{
  await page.setViewportSize({width:320,height:740});
  await loadSavedPage(page,1);
  await expect(page.getByTestId('manual-download')).toBeVisible();
  await expect(page.getByTestId('approved-cover-image')).toBeVisible();
  let metrics=await page.evaluate(()=>({viewport:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  expect(metrics.scroll).toBeLessThanOrEqual(metrics.viewport+1);
  const chapter=enrichment.chapters[31];
  await loadSavedPage(page,chapter.endingPage);
  await expect(page.getByTestId('chapter-resource')).toBeVisible();
  metrics=await page.evaluate(()=>({viewport:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  expect(metrics.scroll).toBeLessThanOrEqual(metrics.viewport+1);
});
