import { expect, test } from '@playwright/test';
import { useLanguage } from './helpers';

test.describe('English / Urdu', () => {
  test('switching to Urdu translates the UI, flips to RTL and persists', async ({ page }) => {
    // Start from a clean slate (no stored preference) so the reload below proves persistence.
    await page.context().clearCookies();
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('am-lang'));
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    await page.getByTestId('lang-ur').first().click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ur');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('وہ گاڑی تلاش کریں');
    await expect(page.getByTestId('finder-search')).toContainText('گاڑیاں تلاش کریں');
    expect(await page.evaluate(() => localStorage.getItem('am-lang'))).toBe('ur');

    // Survives a full reload — and the server renders Urdu directly (cookie)
    const response = await page.reload();
    expect(await response!.text()).toContain('dir="rtl"');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    // Vehicle labels, buttons and form messages are translated
    await page.goto('/inventory/toyota-fortuner-2024');
    await expect(page.getByTestId('vehicle-specs')).toContainText('ٹرانسمیشن');
    await expect(page.getByTestId('vehicle-whatsapp')).toContainText('واٹس ایپ');
    await page.getByTestId('vehicle-enquire').click();
    await page.getByTestId('enquiry-form').getByRole('textbox').last().fill('');
    await page.getByTestId('enquiry-submit').click();
    await expect(page.getByText('براہِ کرم اپنا نام لکھیں۔')).toBeVisible();

    // WhatsApp message switches to Urdu too
    await page.keyboard.press('Escape');
    const href = await page.getByTestId('vehicle-whatsapp').getAttribute('href');
    expect(decodeURIComponent(href!.split('text=')[1])).toContain('السلام علیکم');

    // Back to English
    await page.getByTestId('lang-en').first().click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByTestId('vehicle-specs')).toContainText('Transmission');
  });

  test('admin panel stays English/LTR even when Urdu is selected', async ({ page }) => {
    await useLanguage(page, 'ur');
    await page.goto('/admin/login');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });
});
