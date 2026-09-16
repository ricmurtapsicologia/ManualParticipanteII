import { test, expect } from '@playwright/test';
import { loadSavedPage, readTotalPages } from './helpers';

test('representative pages stay inside the viewport and pedagogical boxes stay inside the paper', async ({ page }) => {
  await page.goto('/', { waitUntil:'networkidle' });
  const total = await readTotalPages(page);
  const representativePages = [...new Set([1,3,8,9,53,95,144,166,186,202,total].filter(n => n <= total))];
  for (const pageNumber of representativePages) {
    await loadSavedPage(page,pageNumber);
    const metrics = await page.evaluate(() => {
      const paper = document.querySelector<HTMLElement>('[data-testid="book-page"]');
      const paperRect = paper?.getBoundingClientRect();
      const boxes = [...document.querySelectorAll<HTMLElement>('[data-testid="pedagogical-box"]')].map(box => box.getBoundingClientRect());
      return {viewportWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,paperLeft:paperRect?.left??0,paperRight:paperRect?.right??0,boxes:boxes.map(rect=>({left:rect.left,right:rect.right}))};
    });
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth+1);
    expect(metrics.paperLeft).toBeGreaterThanOrEqual(-1);
    expect(metrics.paperRight).toBeLessThanOrEqual(metrics.viewportWidth+1);
    for (const box of metrics.boxes) {
      expect(box.left).toBeGreaterThanOrEqual(metrics.paperLeft-1);
      expect(box.right).toBeLessThanOrEqual(metrics.paperRight+1);
    }
  }
});

test('canonical cover and hero keep aspect ratios without horizontal overflow', async ({ page }) => {
  for (const width of [320,360,390,430,768,1024,1366,1920]) {
    await page.setViewportSize({width,height:Math.max(740,Math.round(width*0.72))});
    await loadSavedPage(page,1);
    const metrics = await page.evaluate(() => {
      const cover=document.querySelector<HTMLImageElement>('[data-testid="approved-cover-image"]');
      const hero=document.querySelector<HTMLImageElement>('[data-testid="canonical-hero"] img');
      return {viewport:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,cover:cover&&{w:cover.clientWidth,h:cover.clientHeight,nw:cover.naturalWidth,nh:cover.naturalHeight},hero:hero&&{w:hero.clientWidth,h:hero.clientHeight,nw:hero.naturalWidth,nh:hero.naturalHeight}};
    });
    expect(metrics.scroll).toBeLessThanOrEqual(metrics.viewport+1);
    expect(metrics.cover?.nw).toBe(961); expect(metrics.cover?.nh).toBe(1536);
    expect(metrics.hero?.nw).toBe(1536); expect(metrics.hero?.nh).toBe(864);
    expect(Math.abs((metrics.cover!.w/metrics.cover!.h)-(961/1536))).toBeLessThan(0.01);
    expect(Math.abs((metrics.hero!.w/metrics.hero!.h)-(16/9))).toBeLessThan(0.01);
  }
});

test('320px narrow phone keeps header, reader, navigation and drawer usable without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await loadSavedPage(page,8);
  const integrity = await page.evaluate(() => {
    const rect=(selector:string)=>document.querySelector<HTMLElement>(selector)?.getBoundingClientRect();
    const header=rect('.topin'), paper=rect('[data-testid="book-page"]'), nav=rect('.nav');
    const toolbarButtons=[...document.querySelectorAll<HTMLElement>('.tools button')].map(button=>button.getBoundingClientRect());
    return {viewportWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,header:header&&{left:header.left,right:header.right},paper:paper&&{left:paper.left,right:paper.right},nav:nav&&{left:nav.left,right:nav.right},toolbarButtons:toolbarButtons.map(item=>({width:item.width,height:item.height}))};
  });
  expect(integrity.scrollWidth).toBeLessThanOrEqual(integrity.viewportWidth+1);
  for (const item of [integrity.header,integrity.paper,integrity.nav]) {expect(item).toBeTruthy();expect(item!.left).toBeGreaterThanOrEqual(-1);expect(item!.right).toBeLessThanOrEqual(integrity.viewportWidth+1);}
  for (const button of integrity.toolbarButtons) {expect(button.width).toBeGreaterThanOrEqual(36);expect(button.height).toBeGreaterThanOrEqual(36);}
  await page.getByRole('button',{name:'Sumário'}).click();
  const drawer=await page.evaluate(()=>{const panel=document.querySelector<HTMLElement>('.panel')?.getBoundingClientRect();return{viewportWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,left:panel?.left??-999,right:panel?.right??999};});
  expect(drawer.scrollWidth).toBeLessThanOrEqual(drawer.viewportWidth+1);expect(drawer.left).toBeGreaterThanOrEqual(-1);expect(drawer.right).toBeLessThanOrEqual(drawer.viewportWidth+1);
  await expect(page.getByTestId('toc-marker').first()).toBeVisible();
});
