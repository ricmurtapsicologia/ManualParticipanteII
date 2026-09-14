import { test, expect, type Page } from '@playwright/test';

async function loadSavedPage(page: Page, pageNumber: number) {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.evaluate(number => localStorage.setItem('cats-rebuild-page', String(number - 1)), pageNumber);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByTestId('page-counter')).toHaveText(`${pageNumber} / 249`);
}

test('wave 9 accessibility, link integrity, performance, reduced motion and edge cases', async ({ page }) => {
  test.setTimeout(120_000);
  const started = Date.now();
  const response = await page.goto('/', { waitUntil: 'networkidle' });
  const elapsed = Date.now() - started;
  expect(response?.status()).toBe(200);
  expect(elapsed, 'initial local production navigation should remain below 8 seconds').toBeLessThan(8000);

  await expect(page.locator('header')).toBeVisible();
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('nav[aria-label="Navegação do livro"]')).toBeVisible();
  await expect(page.getByTestId('reader-surface')).toHaveAttribute('role', 'region');
  await expect(page.getByTestId('reader-surface')).toHaveAttribute('aria-label', /página 1 de 249/i);

  const missingButtonNames = await page.locator('button:visible').evaluateAll(buttons => buttons.filter(button => {
    const label = button.getAttribute('aria-label')?.trim() || button.textContent?.trim() || button.getAttribute('title')?.trim();
    return !label;
  }).length);
  expect(missingButtonNames, 'visible buttons need accessible names').toBe(0);

  const missingImageAlt = await page.locator('img:visible').evaluateAll(images => images.filter(image => !image.hasAttribute('alt') || image.getAttribute('alt')?.trim() === '').length);
  expect(missingImageAlt, 'visible images need non-empty alt text').toBe(0);

  const brokenAriaLabels = await page.locator('[aria-labelledby]').evaluateAll(elements => elements.filter(element => {
    const ids = (element.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean);
    return !ids.length || ids.some(id => !document.getElementById(id));
  }).length);
  expect(brokenAriaLabels, 'aria-labelledby references must resolve').toBe(0);

  const unsafeLinks = await page.locator('a[href]').evaluateAll(links => links.filter(link => /^javascript:/i.test(link.getAttribute('href') ?? '')).length);
  expect(unsafeLinks, 'javascript: links are forbidden').toBe(0);

  await expect(page.getByRole('button', { name: 'Página anterior' })).toBeDisabled();
  await loadSavedPage(page, 249);
  await expect(page.getByRole('button', { name: 'Próxima página' })).toBeDisabled();

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await loadSavedPage(page, 54);
  await page.getByRole('button', { name: 'Próxima página' }).click();
  await expect(page.getByTestId('page-counter')).toHaveText('55 / 249');
  const animationName = await page.getByTestId('book-page').evaluate(element => getComputedStyle(element).animationName);
  expect(animationName === 'none' || animationName === '').toBeTruthy();
});

test('wave 9 responsive stress and regression audit on representative leaves', async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 320, height: 740 });
  for (const pageNumber of [1, 2, 8, 54, 58, 101, 150, 191, 217, 249]) {
    await loadSavedPage(page, pageNumber);
    const metrics = await page.evaluate(() => {
      const paper = document.querySelector<HTMLElement>('[data-testid="book-page"]');
      const rect = paper?.getBoundingClientRect();
      return {
        viewportWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        paperLeft: rect?.left ?? 0,
        paperRight: rect?.right ?? 0,
        text: paper?.innerText ?? ''
      };
    });
    expect(metrics.scrollWidth, `page ${pageNumber} horizontal overflow`).toBeLessThanOrEqual(metrics.viewportWidth + 1);
    expect(metrics.paperLeft, `page ${pageNumber} paper left`).toBeGreaterThanOrEqual(-1);
    expect(metrics.paperRight, `page ${pageNumber} paper right`).toBeLessThanOrEqual(metrics.viewportWidth + 1);
    expect(metrics.text.length, `page ${pageNumber} written content`).toBeGreaterThan(10);
    expect(metrics.text).not.toContain('�');
  }

  await loadSavedPage(page, 1);
  for (let target = 2; target <= 26; target += 1) {
    await page.getByRole('button', { name: 'Próxima página' }).click();
    await expect(page.getByTestId('page-counter')).toHaveText(`${target} / 249`);
  }
  for (let target = 25; target >= 16; target -= 1) {
    await page.getByRole('button', { name: 'Página anterior' }).click();
    await expect(page.getByTestId('page-counter')).toHaveText(`${target} / 249`);
  }

  await page.getByRole('button', { name: 'Pesquisar' }).click();
  const search = page.getByPlaceholder('Digite pelo menos 2 caracteres');
  await expect(search).toBeVisible();
  await search.fill('suicídio');
  await expect(page.locator('.hits button').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Sumário' }).click();
  await expect(page.getByTestId('hierarchical-toc')).toBeVisible();
  await expect(page.getByTestId('toc-part')).toHaveCount(7);
});
