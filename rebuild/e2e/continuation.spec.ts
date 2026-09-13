import { test, expect } from '@playwright/test';

async function setPage(page: any, pageNumber: number) {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.evaluate((n: number) => localStorage.setItem('cats-rebuild-page', String(n - 1)), pageNumber);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByTestId('page-counter')).toContainText(`${pageNumber} / 249`);
}

test('chapter opening and continuation have distinct hierarchy', async ({ page }) => {
  await setPage(page, 106);
  const book = page.getByTestId('book-page');
  await expect(book).toHaveAttribute('data-page-role', 'chapter-opening');
  await expect(page.getByTestId('chapter-title')).toContainText('Perguntas e escuta');
  await expect(page.getByTestId('continuation-heading')).toHaveCount(0);

  await setPage(page, 107);
  await expect(book).toHaveAttribute('data-page-role', 'chapter-continuation');
  await expect(page.getByTestId('continuation-heading')).toContainText('Capítulo 14');
  await expect(page.getByTestId('continuation-heading')).toContainText('Continuação');
  await expect(book.locator('h2')).toHaveCount(0);
});
