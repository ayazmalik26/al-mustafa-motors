import { expect, test } from '@playwright/test';
import { ADMIN_EMAIL, adminApi, loginAsAdmin, TEST_IMAGE } from './helpers';

test.describe('Admin', () => {
  test('protected routes redirect to login, and bad credentials are rejected', async ({ page }) => {
    await page.goto('/admin/vehicles');
    await expect(page).toHaveURL(/\/admin\/login\?returnUrl=%2Fadmin%2Fvehicles/);
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password', { exact: true }).fill('wrong-password');
    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('login-error')).toHaveText('Incorrect email or password.');
  });

  test('login → dashboard → create → edit → photos → mark sold → enquiry → logout', async ({ page }) => {
    const model = `Cultus E2E${Date.now().toString(36).toUpperCase()}`;

    // Login & dashboard
    await loginAsAdmin(page);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByTestId('dashboard-stats')).toContainText('Total vehicles');

    // Create vehicle
    await page.getByRole('link', { name: 'Vehicles', exact: true }).click();
    await page.getByTestId('add-vehicle').click();
    await expect(page.getByTestId('vehicle-form-title')).toHaveText('Add a vehicle');
    await page.getByTestId('save-vehicle').click();
    await expect(page.getByText('Please fix the highlighted fields.')).toBeVisible();

    await page.getByTestId('v-make').fill('Suzuki');
    await page.getByTestId('v-model').fill(model);
    await page.getByTestId('v-year').fill('2022');
    await page.getByTestId('v-condition').selectOption('USED');
    await page.getByTestId('v-body').selectOption('HATCHBACK');
    await page.getByTestId('v-mileage').fill('15000');
    await page.getByTestId('v-price').fill('3200000');
    await page.getByTestId('save-vehicle').click();
    await expect(page).toHaveURL(/\/admin\/vehicles\/[0-9a-f-]+\/edit$/);
    await expect(page.getByTestId('vehicle-form-title')).toHaveText('Edit vehicle');

    // Upload a photo
    await page.getByTestId('image-upload-input').setInputFiles([TEST_IMAGE, TEST_IMAGE]);
    await expect(page.getByTestId('image-list').locator('li')).toHaveCount(2);
    await expect(page.getByTestId('image-item-0')).toContainText('Primary');
    await page.getByTestId('set-primary-1').click();
    await expect(page.getByTestId('image-item-1')).toContainText('Primary');

    // Edit
    await page.getByTestId('v-variant').fill('VXL AGS');
    await page.getByTestId('v-price').fill('3150000');
    await page.getByTestId('v-featured').check();
    await page.getByTestId('save-vehicle').click();
    await expect(page.getByText('Vehicle saved.')).toBeVisible();

    // Mark sold from the list
    await page.getByRole('link', { name: 'All vehicles' }).click();
    await page.getByTestId('admin-vehicle-search').fill(model);
    const slug = `suzuki-${model.toLowerCase().replace(/\s+/g, '-')}-2022`;
    const row = page.getByTestId(`vehicle-row-${slug}`);
    await expect(row).toBeVisible();
    await expect(row).toContainText('VXL AGS');
    await page.getByTestId(`mark-sold-${slug}`).click();
    await expect(page.getByTestId(`status-select-${slug}`)).toHaveValue('SOLD');

    // The public page reflects the change
    const publicPage = await page.context().newPage();
    await publicPage.goto(`/inventory/${slug}`);
    await expect(publicPage.getByTestId('vehicle-price-detail')).toHaveText('Sold');
    await publicPage.close();

    // Enquiries
    await page.getByRole('link', { name: 'Enquiries' }).click();
    await expect(page.getByTestId('enquiry-row').first()).toBeVisible();
    await page.getByTestId('view-enquiry').first().click();
    await expect(page.getByTestId('enquiry-detail')).toBeVisible();
    await page.getByLabel('Internal notes').fill('Called back — E2E test');
    await page.getByLabel('Status', { exact: true }).selectOption('CONTACTED');
    await page.getByTestId('save-enquiry').click();
    await expect(page.getByText('Enquiry updated.')).toBeVisible();
    await expect(page.getByTestId('enquiry-status').first()).toHaveText('Contacted');

    // Sell requests page loads
    await page.getByRole('link', { name: 'Sell requests' }).click();
    await expect(page.getByRole('heading', { name: 'Sell & exchange requests' })).toBeVisible();

    // Delete the test vehicle (with confirmation)
    await page.getByRole('link', { name: 'Vehicles', exact: true }).click();
    await page.getByTestId('admin-vehicle-search').fill(model);
    await page.getByTestId(`delete-${slug}`).click();
    await page.getByTestId('confirm-yes').click();
    await expect(page.getByRole('status').filter({ hasText: model }).filter({ hasText: 'deleted' })).toBeVisible();
    await expect(page.getByTestId(`vehicle-row-${slug}`)).toHaveCount(0);

    // Logout
    await page.getByTestId('logout-button').click();
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('settings: admin can update the WhatsApp number used across the site', async ({ page }) => {
    const api = await adminApi();
    const original = (await (await api.get('/api/settings')).json()).data.whatsapp as string;
    try {
      await loginAsAdmin(page);
      await page.getByRole('link', { name: 'Settings' }).click();
      await page.getByTestId('settings-whatsapp').fill('+92 300 0000001');
      await page.getByTestId('save-settings').click();
      await expect(page.getByText('Settings saved.')).toBeVisible();

      await page.goto('/inventory/toyota-fortuner-2024');
      await expect(page.getByTestId('vehicle-whatsapp')).toHaveAttribute('href', /^https:\/\/wa\.me\/923000000001\?/);
    } finally {
      await api.patch('/api/settings', { data: { whatsapp: original } });
      await api.dispose();
    }
  });

  test('staff accounts cannot open settings or delete vehicles', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByLabel('Email').fill('staff@almustafamotors.local');
    await page.getByLabel('Password', { exact: true }).fill(process.env.E2E_ADMIN_PASSWORD ?? 'ChangeMe123!');
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('link', { name: 'Settings' })).toHaveCount(0);
    await page.goto('/admin/settings');
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto('/admin/vehicles');
    await expect(page.locator('[data-testid^="vehicle-row-"]').first()).toBeVisible();
    await expect(page.locator('[data-testid^="delete-"]')).toHaveCount(0);
  });
});
