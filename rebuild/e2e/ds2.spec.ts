import { test, expect } from '@playwright/test';

test('DS2 tokens and semantic marker iconography are active', async ({ page }) => {
  const response = await page.goto('/', { waitUntil: 'networkidle' });
  expect(response?.status()).toBe(200);

  const shell = page.getByTestId('reader-shell');
  await expect(shell).toHaveAttribute('data-design-system', 'DS2');
  await expect(shell).toHaveAttribute('data-design-subwave', '8');

  const tokens = await page.evaluate(() => {
    const styles = getComputedStyle(document.documentElement);
    return {
      accent: styles.getPropertyValue('--ds2-accent').trim(),
      teal: styles.getPropertyValue('--ds2-teal').trim(),
      evidence: styles.getPropertyValue('--ds2-evidence').trim(),
      attention: styles.getPropertyValue('--ds2-attention').trim()
    };
  });
  expect(tokens.accent).toBe('#e86d2b');
  expect(tokens.teal).toBe('#0f6260');
  expect(tokens.evidence).toBe('#315f8c');
  expect(tokens.attention).toBe('#a9512a');

  await page.getByRole('button', { name: 'Sumário' }).click();
  const markers = page.getByTestId('toc-marker');
  await expect(markers).toHaveCount(216);

  for (const kind of ['doctrine', 'evidence', 'practice', 'attention', 'decide']) {
    expect(await page.locator(`[data-testid="toc-marker"][data-kind="${kind}"]`).count()).toBeGreaterThan(0);
  }

  const doctrine = page.locator('[data-testid="toc-marker"][data-kind="doctrine"]').first();
  await expect(doctrine.locator('.markerIcon')).toHaveText('§');
  const evidence = page.locator('[data-testid="toc-marker"][data-kind="evidence"]').first();
  await expect(evidence.locator('.markerIcon')).toHaveText('◆');
  const attention = page.locator('[data-testid="toc-marker"][data-kind="attention"]').first();
  await expect(attention.locator('.markerIcon')).toHaveText('!');
});
