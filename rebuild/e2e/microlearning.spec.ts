import { test, expect } from '@playwright/test';

async function loadSavedPage(page: import('@playwright/test').Page, pageNumber: number) {
  await page.evaluate(number => localStorage.setItem('cats-rebuild-page', String(number - 1)), pageNumber);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByTestId('page-counter')).toHaveText(`${pageNumber} / 249`);
}

test('page 58 microlearning is interactive, source-grounded and preserves the canonical DECIDA block', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await loadSavedPage(page, 58);

  await expect(page.getByTestId('reader-shell')).toHaveAttribute('data-multimedia-wave', '5.6');
  const card = page.getByTestId('microlearning-resource');
  await expect(card).toHaveCount(1);
  await expect(card).toHaveAttribute('data-media-id', 'microlearning-high-impact-hypothesis-p58');
  await expect(page.getByTestId('microlearning-prompt')).toContainText('Se o solicitante diz que a pessoa possui uma arma');
  await expect(page.getByTestId('microlearning-choice')).toHaveCount(3);
  await expect(page.getByTestId('microlearning-feedback')).toHaveCount(0);

  await page.getByTestId('microlearning-choice').filter({ hasText: 'Certeza' }).click();
  await expect(page.getByTestId('microlearning-feedback')).toContainText('Compare com a resposta canônica.');
  await expect(page.getByTestId('microlearning-feedback')).toContainText('A resposta mais prudente é hipótese de alto impacto');

  await page.getByTestId('microlearning-choice').filter({ hasText: 'Hipótese de alto impacto' }).click();
  await expect(page.getByTestId('microlearning-feedback')).toContainText('Correto.');
  await expect(page.getByTestId('book-page')).toContainText('DECIDA');
  await expect(page.getByTestId('book-page')).toContainText('Se o solicitante diz que a pessoa possui uma arma, mas ninguém a viu');
});

test('page 58 microlearning remains usable without horizontal overflow at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/', { waitUntil: 'networkidle' });
  await loadSavedPage(page, 58);

  const metrics = await page.evaluate(() => {
    const paper = document.querySelector<HTMLElement>('[data-testid="book-page"]')?.getBoundingClientRect();
    const card = document.querySelector<HTMLElement>('[data-testid="microlearning-resource"]')?.getBoundingClientRect();
    const choices = [...document.querySelectorAll<HTMLElement>('[data-testid="microlearning-choice"]')].map(item => item.getBoundingClientRect());
    return {
      viewportWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      paper: paper && { left: paper.left, right: paper.right },
      card: card && { left: card.left, right: card.right },
      choices: choices.map(item => ({ left: item.left, right: item.right, height: item.height }))
    };
  });

  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.paper).toBeTruthy();
  expect(metrics.card).toBeTruthy();
  expect(metrics.card!.left).toBeGreaterThanOrEqual(metrics.paper!.left - 1);
  expect(metrics.card!.right).toBeLessThanOrEqual(metrics.paper!.right + 1);
  for (const choice of metrics.choices) {
    expect(choice.left).toBeGreaterThanOrEqual(metrics.card!.left - 1);
    expect(choice.right).toBeLessThanOrEqual(metrics.card!.right + 1);
    expect(choice.height).toBeGreaterThanOrEqual(40);
  }
});
