import { expect, type Page } from '@playwright/test';

export async function readTotalPages(page: Page) {
  const shell = page.getByTestId('reader-shell');
  const total = Number(await shell.getAttribute('data-page-count'));
  expect(total).toBeGreaterThan(200);
  expect(total).toBeLessThan(246);
  return total;
}

export async function loadSavedPage(page: Page, pageNumber: number) {
  await page.goto('/', { waitUntil: 'networkidle' });
  const total = await readTotalPages(page);
  expect(pageNumber).toBeGreaterThanOrEqual(1);
  expect(pageNumber).toBeLessThanOrEqual(total);
  await page.evaluate(number => localStorage.setItem('cats-rebuild-page', String(number - 1)), pageNumber);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByTestId('page-counter')).toHaveText(`${pageNumber} / ${total}`);
  return total;
}
