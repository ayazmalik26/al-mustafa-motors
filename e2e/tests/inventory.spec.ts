import { expect, test } from '@playwright/test';
import { useLanguage } from './helpers';

const parsePkr = (text: string) => {
  const m = text.match(/([\d.]+)\s*(crore|lakh)/i);
  if (!m) return null;
  return Number(m[1]) * (m[2].toLowerCase() === 'crore' ? 10_000_000 : 100_000);
};

test.describe('Inventory', () => {
  test.beforeEach(async ({ page }) => useLanguage(page, 'en'));

  test('homepage finder navigates to inventory with query parameters', async ({ page }) => {
    await page.goto('/');
    const finder = page.getByTestId('vehicle-finder');
    await finder.getByLabel('Make').selectOption('Toyota');
    await finder.getByLabel('Model').selectOption('Hilux');
    await finder.getByLabel('Condition').selectOption('USED');
    await page.getByTestId('finder-search').click();
    await expect(page).toHaveURL(/\/inventory\?.*make=Toyota/);
    await expect(page).toHaveURL(/model=Hilux/);
    await expect(page).toHaveURL(/condition=USED/);
    const cards = page.getByTestId('inventory-grid').getByTestId('vehicle-card');
    await expect(cards.first()).toBeVisible();
    for (const text of await cards.allInnerTexts()) expect(text).toContain('Hilux');
  });

  test('filters live in the URL and survive a refresh', async ({ page }) => {
    await page.goto('/inventory?make=Toyota&bodyType=SUV&condition=USED');
    await expect(page.getByTestId('active-filters')).toContainText('Toyota');
    await expect(page.getByTestId('active-filters')).toContainText('SUV');
    const before = await page.getByTestId('results-count').innerText();
    await page.reload();
    await expect(page.getByTestId('results-count')).toHaveText(before);
    await expect(page.getByTestId('active-filters')).toContainText('Used');
  });

  test('search is debounced and updates the URL', async ({ page }) => {
    await page.goto('/inventory');
    await page.getByTestId('inventory-search').fill('civic');
    await expect(page).toHaveURL(/q=civic/);
    const cards = page.getByTestId('inventory-grid').getByTestId('vehicle-card');
    await expect(cards.first()).toContainText('Civic');
    for (const text of await cards.allInnerTexts()) expect(text).toContain('Civic');
  });

  test('sort by price low → high puts "price on request" last', async ({ page }) => {
    await page.goto('/inventory?status=AVAILABLE');
    await page.getByTestId('inventory-sort').selectOption('price_asc');
    await expect(page).toHaveURL(/sort=price_asc/);
    const prices = await page.getByTestId('inventory-grid').getByTestId('vehicle-price').allInnerTexts();
    const numeric = prices.map(parsePkr);
    const known = numeric.filter((n): n is number => n !== null);
    expect(known.length).toBeGreaterThan(2);
    expect([...known].sort((a, b) => a - b)).toEqual(known);
    const firstUnknown = numeric.findIndex((n) => n === null);
    if (firstUnknown >= 0) expect(numeric.slice(firstUnknown).every((n) => n === null)).toBe(true);
  });

  test('pagination moves through results', async ({ page }) => {
    await page.goto('/inventory');
    await expect(page.getByTestId('inventory-grid').getByTestId('vehicle-card')).toHaveCount(12);
    await page.getByRole('button', { name: 'Page 2' }).click();
    await expect(page).toHaveURL(/page=2/);
    const second = page.getByTestId('inventory-grid').getByTestId('vehicle-card');
    await expect(second.first()).toBeVisible();
    expect(await second.count()).toBeLessThanOrEqual(12);
  });

  test('empty state when nothing matches, and clear all', async ({ page }) => {
    await page.goto('/inventory?q=zzzz-no-match');
    await expect(page.getByText('No vehicles found.')).toBeVisible();
    await expect(page.getByText('Try changing your filters.')).toBeVisible();
    await page.getByRole('button', { name: 'Clear all' }).first().click();
    await expect(page).toHaveURL(/\/inventory$/);
    await expect(page.getByTestId('inventory-grid')).toBeVisible();
  });

  test('status filter shows sold vehicles clearly', async ({ page }) => {
    await page.goto('/inventory');
    await page.getByTestId('filter-status-SOLD').click();
    await expect(page).toHaveURL(/status=SOLD/);
    const cards = page.getByTestId('inventory-grid').getByTestId('vehicle-card');
    await expect(cards.first()).toBeVisible();
    for (const text of await cards.allInnerTexts()) expect(text.toUpperCase()).toContain('SOLD');
  });
});
