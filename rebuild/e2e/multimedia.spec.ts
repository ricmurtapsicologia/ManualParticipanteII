import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { loadSavedPage } from './helpers';

const multimedia = JSON.parse(fs.readFileSync(path.join(process.cwd(),'content','multimedia-manifest.json'),'utf8')) as { resources:Array<{id:string;kind:string;pageNumber:number}> };
const macro = multimedia.resources.find(resource => resource.id === 'ats-system-macro-p54');
if (!macro) throw new Error('ats-system-macro-p54 ausente');

test('ATS macro infographic renders on its canonical remapped page without replacing chapter text', async ({ page }) => {
  await loadSavedPage(page,macro.pageNumber);
  const resource = page.getByTestId('multimedia-resource'); await expect(resource).toHaveCount(1);
  await expect(resource).toHaveAttribute('data-media-id','ats-system-macro-p54');
  await expect(resource).toHaveAttribute('data-media-src','native://ats-system-macro');
  await expect(resource).toContainText('Sistema ATS • visão macro');
  await expect(resource).toContainText('REAVALIAR QUANDO RISCO, AMBIENTE, COMPORTAMENTO, RECURSOS OU RESPOSTA MUDAREM');
  const steps = page.getByTestId('multimedia-step'); await expect(steps).toHaveCount(7);
  for (const title of ['Acionamento','Deslocamento','Estabelecimento','Observação + avaliação','Desenvolvimento','Encerramento','Continuidade']) await expect(resource).toContainText(title);
  const paper = page.getByTestId('book-page');
  await expect(paper).toContainText('Fases operacionais com avaliação dinâmica transversal.');
  await expect(paper).toContainText('1 Acionamento Receber e qualificar dados.');
});

test('native infographic remains inside the paper at 320px', async ({ page }) => {
  await page.setViewportSize({width:320,height:740});
  await loadSavedPage(page,macro.pageNumber);
  const integrity = await page.evaluate(() => { const paper=document.querySelector<HTMLElement>('[data-testid="book-page"]')?.getBoundingClientRect(); const figure=document.querySelector<HTMLElement>('[data-testid="multimedia-resource"]')?.getBoundingClientRect(); const steps=[...document.querySelectorAll<HTMLElement>('[data-testid="multimedia-step"]')].map(item=>item.getBoundingClientRect()); return {viewportWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,paper:paper&&{left:paper.left,right:paper.right},figure:figure&&{left:figure.left,right:figure.right},steps:steps.map(item=>({left:item.left,right:item.right}))}; });
  expect(integrity.scrollWidth).toBeLessThanOrEqual(integrity.viewportWidth+1); expect(integrity.paper).toBeTruthy(); expect(integrity.figure).toBeTruthy();
  expect(integrity.figure!.left).toBeGreaterThanOrEqual(integrity.paper!.left-1); expect(integrity.figure!.right).toBeLessThanOrEqual(integrity.paper!.right+1);
  for (const step of integrity.steps){expect(step.left).toBeGreaterThanOrEqual(integrity.figure!.left-1);expect(step.right).toBeLessThanOrEqual(integrity.figure!.right+1);}
});
