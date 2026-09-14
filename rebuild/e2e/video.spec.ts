import { test, expect } from '@playwright/test';

async function loadSavedPage(page: import('@playwright/test').Page, pageNumber: number) {
  await page.evaluate(number => localStorage.setItem('cats-rebuild-page', String(number - 1)), pageNumber);
  await page.reload({ waitUntil:'networkidle' });
  await expect(page.getByTestId('page-counter')).toHaveText(`${pageNumber} / 249`);
}

test('page 54 exposes the source-grounded native didactic video with transcript and controls', async ({ page }) => {
  await page.goto('/',{waitUntil:'networkidle'}); await loadSavedPage(page,54);
  const video = page.getByTestId('video-resource'); await expect(video).toHaveCount(1);
  await expect(video).toHaveAttribute('data-media-id','video-ats-operational-flow-p54'); await expect(video).toHaveAttribute('data-media-src','native://ats-system-video'); await expect(video).toHaveAttribute('data-renderer','native-animation');
  await expect(video).toContainText('Sistema ATS • sequência operacional'); await expect(page.getByTestId('video-stage')).toContainText('Acionamento'); await expect(page.getByTestId('video-stage')).toContainText('Receber e qualificar dados.');
  await expect(page.getByTestId('video-play')).toBeVisible(); await expect(page.getByTestId('video-pause')).toBeVisible(); await expect(page.getByTestId('video-restart')).toBeVisible();
  await page.getByTestId('video-play').click(); await expect(page.getByTestId('video-status')).toContainText('Em reprodução'); await page.getByTestId('video-pause').click(); await expect(page.getByTestId('video-status')).toContainText('Pausado'); await page.getByTestId('video-restart').click();
  const transcript = page.getByTestId('video-transcript'); await expect(transcript).toContainText('Observação + avaliação. Ler risco, ambiente e comportamento.'); await expect(transcript).toContainText('Continuidade. APH, rede, registro e cuidado.');
  await expect(page.getByTestId('book-page')).toContainText('Fases operacionais com avaliação dinâmica transversal.');
});

test('page 54 native video remains usable without horizontal overflow at 320px', async ({ page }) => {
  await page.setViewportSize({width:320,height:740}); await page.goto('/',{waitUntil:'networkidle'}); await loadSavedPage(page,54);
  const metrics = await page.evaluate(() => { const paper=document.querySelector<HTMLElement>('[data-testid="book-page"]')?.getBoundingClientRect(); const video=document.querySelector<HTMLElement>('[data-testid="video-resource"]')?.getBoundingClientRect(); const stage=document.querySelector<HTMLElement>('[data-testid="video-stage"]')?.getBoundingClientRect(); return {viewportWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,paper:paper&&{left:paper.left,right:paper.right},video:video&&{left:video.left,right:video.right},stage:stage&&{left:stage.left,right:stage.right}}; });
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth+1); expect(metrics.paper).toBeTruthy(); expect(metrics.video).toBeTruthy(); expect(metrics.stage).toBeTruthy(); expect(metrics.video!.left).toBeGreaterThanOrEqual(metrics.paper!.left-1); expect(metrics.video!.right).toBeLessThanOrEqual(metrics.paper!.right+1); expect(metrics.stage!.left).toBeGreaterThanOrEqual(metrics.video!.left-1); expect(metrics.stage!.right).toBeLessThanOrEqual(metrics.video!.right+1);
});
