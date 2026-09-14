import { test, expect } from '@playwright/test';

test('pedagogical blocks render cleanly without text loss or backstage metadata', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('cats-rebuild-page','7'));
  await page.goto('/');
  await expect(page.getByTestId('page-counter')).toHaveText('8 / 249');
  const opening = page.getByTestId('pedagogical-box').filter({has:page.getByText('SITUAÇÃO DE ABERTURA',{exact:true})});
  await expect(opening).toHaveAttribute('data-kind','opening'); await expect(opening).toContainText('Uma ocorrência de tentativa de suicídio raramente se apresenta como um problema único.');
  const objectives = page.getByTestId('pedagogical-box').filter({has:page.getByText('OBJETIVOS DO CAPÍTULO',{exact:true})});
  await expect(objectives).toHaveAttribute('data-kind','objectives'); await expect(objectives.locator('[data-kind="list-item"]')).toHaveCount(5);
  await page.keyboard.press('ArrowRight'); await expect(page.getByTestId('page-counter')).toHaveText('9 / 249');
  const doctrine = page.locator('[data-testid="pedagogical-box"][data-kind="doctrine"]'); await expect(doctrine).toHaveCount(1);
  await expect(doctrine).not.toContainText(/\bITO\s*30\b/iu);
});

test('front matter retains the semantic pedagogical family', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('cats-rebuild-page','2')); await page.goto('/');
  await expect(page.getByTestId('page-counter')).toHaveText('3 / 249');
  for (const kind of ['doctrine','evidence','practice','attention','decide']) await expect(page.locator(`[data-testid="pedagogical-box"][data-kind="${kind}"]`)).toHaveCount(1);
});
