import { test, expect } from '@playwright/test';

test('pedagogical blocks render as DS2 components without text loss', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('cats-rebuild-page', '7'));
  await page.goto('/');

  const shell = page.getByTestId('reader-shell');
  await expect(shell).toHaveAttribute('data-design-subwave', '4.3');
  await expect(page.getByTestId('page-counter')).toHaveText('8 / 249');

  const opening = page.getByTestId('pedagogical-box').filter({ has: page.getByText('SITUAÇÃO DE ABERTURA', { exact: true }) });
  await expect(opening).toHaveAttribute('data-kind', 'opening');
  await expect(opening).toContainText('Uma ocorrência de tentativa de suicídio raramente se apresenta como um problema único.');

  const objectives = page.getByTestId('pedagogical-box').filter({ has: page.getByText('O que você deverá conseguir fazer', { exact: true }) });
  await expect(objectives).toHaveAttribute('data-kind', 'objectives');
  await expect(objectives.locator('[data-kind="list-item"]')).toHaveCount(5);

  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('page-counter')).toHaveText('9 / 249');
  const doctrine = page.getByTestId('pedagogical-box').filter({ has: page.getByText('DOUTRINA', { exact: true }) });
  await expect(doctrine).toHaveAttribute('data-kind', 'doctrine');
  await expect(doctrine).toContainText('A ITO 30 vigente é a referência normativa primária deste manual.');
});

test('front matter demonstrates the DS2 semantic family', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('cats-rebuild-page', '2'));
  await page.goto('/');
  await expect(page.getByTestId('page-counter')).toHaveText('3 / 249');

  for (const kind of ['doctrine', 'evidence', 'practice', 'attention', 'decide']) {
    await expect(page.locator(`[data-testid="pedagogical-box"][data-kind="${kind}"]`)).toHaveCount(1);
  }
});
