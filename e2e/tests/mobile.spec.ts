import { expect, test } from '@playwright/test';
import { useLanguage } from './helpers';

/** Runs on a phone-sized device (Pixel 7 project). */
test.describe('Mobile', () => {
  test.beforeEach(async ({ page }) => useLanguage(page, 'en'));

  for (const path of ['/', '/inventory', '/inventory/toyota-fortuner-2024', '/sell-exchange', '/contact', '/about', '/saved']) {
    test(`no horizontal scrolling on ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  test('sticky call / WhatsApp bar and mobile navigation', async ({ page }) => {
    await page.goto('/');
    const bar = page.getByTestId('mobile-action-bar');
    await expect(bar).toBeVisible();
    await expect(bar.getByRole('link', { name: 'Call' })).toHaveAttribute('href', 'tel:+923118382992');
    await expect(bar.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', /wa\.me\/923368440890/);

    await page.getByTestId('menu-button').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('link', { name: 'Inventory' }).click();
    await expect(page).toHaveURL(/\/inventory$/);
    await expect(dialog).toBeHidden();
  });

  test('collapsible filters open in a sheet', async ({ page }) => {
    await page.goto('/inventory');
    await page.getByTestId('open-filters').click();
    const sheet = page.getByRole('dialog', { name: 'Filters' });
    await expect(sheet).toBeVisible();
    await sheet.getByTestId('filter-condition-BRAND_NEW').click();
    await expect(page).toHaveURL(/condition=BRAND_NEW/);
    await sheet.getByTestId('apply-filters').click();
    await expect(sheet).toBeHidden();
    await expect(page.getByTestId('open-filters')).toContainText('Filters (1)');
  });

  test('vehicle page has sticky actions and a swipeable gallery', async ({ page }) => {
    await page.goto('/inventory/kia-sportage-2024');
    await expect(page.getByTestId('vehicle-mobile-bar')).toBeVisible();
    await expect(page.getByTestId('mobile-action-bar')).toHaveCount(0);

    const gallery = page.getByTestId('gallery-main');
    const box = (await gallery.boundingBox())!;
    const y = box.y + box.height / 2;
    const swipe = async (fromX: number, toX: number) => {
      await gallery.dispatchEvent('pointerdown', { pointerType: 'touch', clientX: fromX, clientY: y, isPrimary: true });
      await gallery.dispatchEvent('pointerup', { pointerType: 'touch', clientX: toX, clientY: y, isPrimary: true });
    };
    await expect(page.getByTestId('gallery-counter')).toHaveText(/1 \/ 4/);
    await swipe(box.x + box.width * 0.8, box.x + box.width * 0.2);
    await expect(page.getByTestId('gallery-counter')).toHaveText(/2 \/ 4/);
    await swipe(box.x + box.width * 0.2, box.x + box.width * 0.8);
    await expect(page.getByTestId('gallery-counter')).toHaveText(/1 \/ 4/);
  });
});
