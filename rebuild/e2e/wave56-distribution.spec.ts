import { test, expect } from '@playwright/test';

async function loadSavedPage(page: import('@playwright/test').Page, pageNumber: number) {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.evaluate(number => localStorage.setItem('cats-rebuild-page', String(number - 1)), pageNumber);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByTestId('page-counter')).toHaveText(`${pageNumber} / 249`);
}

test('selective accessible audio remains available across operational content', async ({ page }) => {
  const cases = [
    { pageNumber:101, id:'audio-approach-boundary-p101', canonical:'Helena percebeu a aproximação, está comunicando limite e ainda não rompeu o canal.' },
    { pageNumber:152, id:'audio-vertical-attention-p152', canonical:'A solução deve ser validada para a cena atual.' },
    { pageNumber:185, id:'audio-violence-high-impact-p185', canonical:'O parceiro deve permanecer fora do espaço crítico' }
  ];
  for (const item of cases) {
    await loadSavedPage(page, item.pageNumber);
    const audio = page.getByTestId('audio-resource');
    await expect(audio).toHaveCount(1);
    await expect(audio).toHaveAttribute('data-media-id', item.id);
    await expect(audio).toHaveAttribute('data-media-src', 'native://speech-synthesis');
    await expect(audio).toHaveAttribute('data-preferred-voice', 'Antônio');
    await expect(audio).toHaveAttribute('data-fallback-lang', 'pt-BR');
    await expect(page.getByTestId('audio-transcript')).toContainText(item.canonical);
    await expect(page.getByTestId('book-page')).toContainText(item.canonical);
  }
});

test('obsolete consolidation microlearning is not rendered over cumulative review', async ({ page }) => {
  for (const pageNumber of [217,219,220,221]) {
    await loadSavedPage(page, pageNumber);
    await expect(page.getByTestId('microlearning-resource')).toHaveCount(0);
    await expect(page.getByTestId('book-page')).toContainText('Revisão cumulativa');
    await expect(page.getByTestId('book-page')).not.toContainText('Resposta orientadora');
  }
});

test('retained selective multimedia remains inside the paper at 320px', async ({ page }) => {
  await page.setViewportSize({ width:320, height:740 });
  for (const pageNumber of [185,54]) {
    await loadSavedPage(page, pageNumber);
    const metrics = await page.evaluate(() => {
      const paper = document.querySelector<HTMLElement>('[data-testid="book-page"]')?.getBoundingClientRect();
      const resource = document.querySelector<HTMLElement>('[data-testid="audio-resource"], [data-testid="multimedia-resource"], [data-testid="video-resource"]')?.getBoundingClientRect();
      return { viewportWidth:document.documentElement.clientWidth, scrollWidth:document.documentElement.scrollWidth, paper:paper && {left:paper.left,right:paper.right}, resource:resource && {left:resource.left,right:resource.right} };
    });
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
    expect(metrics.paper).toBeTruthy(); expect(metrics.resource).toBeTruthy();
    expect(metrics.resource!.left).toBeGreaterThanOrEqual(metrics.paper!.left - 1);
    expect(metrics.resource!.right).toBeLessThanOrEqual(metrics.paper!.right + 1);
  }
});
