import { test, expect } from '@playwright/test';

async function loadSavedPage(page: import('@playwright/test').Page, pageNumber: number) {
  await page.evaluate(number => localStorage.setItem('cats-rebuild-page', String(number - 1)), pageNumber);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByTestId('page-counter')).toHaveText(`${pageNumber} / 249`);
}

test('wave 5.6 distributes accessible audio selectively across operational content', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  const cases = [
    { pageNumber: 101, id: 'audio-approach-boundary-p101', canonical: 'Helena percebeu a aproximação, está comunicando limite e ainda não rompeu o canal.' },
    { pageNumber: 152, id: 'audio-vertical-attention-p152', canonical: 'A solução deve ser validada para a cena atual.' },
    { pageNumber: 185, id: 'audio-violence-high-impact-p185', canonical: 'O parceiro deve permanecer fora do espaço crítico' }
  ];

  for (const item of cases) {
    await loadSavedPage(page, item.pageNumber);
    await expect(page.getByTestId('reader-shell')).toHaveAttribute('data-multimedia-wave', '5.6');
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

test('wave 5.6 active recall is source-grounded and interactive in consolidation', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  const cases = [
    { pageNumber: 217, id: 'microlearning-observable-language-p217', correct: 'mais auditáveis e compartilháveis', canonical: 'Por que descrever comportamentos observáveis costuma ser superior a usar rótulos diagnósticos' },
    { pageNumber: 219, id: 'microlearning-validation-p219', correct: 'reconhecer a experiência e a emoção comunicadas como compreensíveis naquele contexto', canonical: 'Qual é a diferença entre validar sofrimento e concordar com a conclusão suicida?' },
    { pageNumber: 220, id: 'microlearning-remote-judgment-p220', correct: 'averiguação, segurança e avaliação no local', canonical: 'julgamento remoto sobre sua “seriedade”' },
    { pageNumber: 221, id: 'microlearning-command-handover-p221', correct: 'organiza situação atual, riscos, linha operacional em curso', canonical: 'O que diferencia passagem de comando informativa de uma passagem realmente útil para decisão?' }
  ];

  for (const item of cases) {
    await loadSavedPage(page, item.pageNumber);
    const card = page.getByTestId('microlearning-resource');
    await expect(card).toHaveCount(1);
    await expect(card).toHaveAttribute('data-media-id', item.id);
    await expect(page.getByTestId('microlearning-choice')).toHaveCount(3);
    await page.getByTestId('microlearning-choice').filter({ hasText: item.correct }).click();
    await expect(page.getByTestId('microlearning-feedback')).toContainText('Correto.');
    await expect(page.getByTestId('book-page')).toContainText(item.canonical);
  }
});

test('wave 5.6 selective resources remain inside the paper at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/', { waitUntil: 'networkidle' });

  for (const pageNumber of [185, 221]) {
    await loadSavedPage(page, pageNumber);
    const metrics = await page.evaluate(() => {
      const paper = document.querySelector<HTMLElement>('[data-testid="book-page"]')?.getBoundingClientRect();
      const resource = document.querySelector<HTMLElement>('[data-testid="audio-resource"], [data-testid="microlearning-resource"]')?.getBoundingClientRect();
      return {
        viewportWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        paper: paper && { left: paper.left, right: paper.right },
        resource: resource && { left: resource.left, right: resource.right }
      };
    });
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
    expect(metrics.paper).toBeTruthy();
    expect(metrics.resource).toBeTruthy();
    expect(metrics.resource!.left).toBeGreaterThanOrEqual(metrics.paper!.left - 1);
    expect(metrics.resource!.right).toBeLessThanOrEqual(metrics.paper!.right + 1);
  }
});
