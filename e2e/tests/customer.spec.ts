import { expect, test } from '@playwright/test';
import { useLanguage } from './helpers';

test.describe('Customer journey', () => {
  test.beforeEach(async ({ page }) => useLanguage(page, 'en'));

  test('homepage → inventory → filter Toyota → vehicle → details → WhatsApp', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Find a car that feels');
    await expect(page.getByTestId('featured-grid').getByTestId('vehicle-card').first()).toBeVisible();

    await page.getByTestId('hero-browse').click();
    await expect(page).toHaveURL(/\/inventory$/);
    await expect(page.getByTestId('inventory-grid')).toBeVisible();

    await page.getByTestId('filter-make').selectOption('Toyota');
    await expect(page).toHaveURL(/make=Toyota/);
    await expect(page.getByTestId('results-count')).toContainText('vehicles');
    const cards = page.getByTestId('inventory-grid').getByTestId('vehicle-card');
    await expect(cards.first()).toBeVisible();
    for (const text of await cards.allInnerTexts()) expect(text.toUpperCase()).toContain('TOYOTA');

    const firstSlug = await cards.first().getAttribute('data-slug');
    await cards.first().locator('a').first().click();
    await expect(page).toHaveURL(new RegExp(`/inventory/${firstSlug}$`));

    // Details
    await expect(page.getByTestId('vehicle-title')).toContainText('Toyota');
    const specs = page.getByTestId('vehicle-specs');
    for (const label of ['Make', 'Model', 'Year', 'Condition', 'Mileage', 'Fuel', 'Transmission', 'Engine', 'Body type']) {
      await expect(specs).toContainText(label);
    }
    await expect(page.getByTestId('vehicle-price-detail')).not.toBeEmpty();

    // WhatsApp: configured number + pre-filled, encoded message about this vehicle
    const wa = page.getByTestId('vehicle-whatsapp');
    const href = (await wa.getAttribute('href'))!;
    expect(href).toMatch(/^https:\/\/wa\.me\/923368440890\?text=/);
    const message = decodeURIComponent(href.split('text=')[1]);
    expect(message).toContain('Assalam o Alaikum');
    expect(message).toContain('I am interested in:');
    expect(message).toContain('Toyota');
    expect(message).toContain('Is this vehicle available?');
    await expect(wa).toHaveAttribute('target', '_blank');

    // Clicking opens WhatsApp in a new tab (intercepted so the test stays offline-friendly)
    await page.context().route('https://wa.me/**', (route) => route.fulfill({ status: 200, body: 'whatsapp' }));
    const [popup] = await Promise.all([page.waitForEvent('popup'), wa.click()]);
    expect(popup.url()).toContain('wa.me/923368440890');
    await popup.close();

    // Call link uses the configured phone number
    await expect(page.getByTestId('vehicle-call')).toHaveAttribute('href', 'tel:+923118382992');
  });

  test('vehicle gallery: next/previous, thumbnails and fullscreen with Escape', async ({ page }) => {
    await page.goto('/inventory/kia-sportage-2024');
    const counter = page.getByTestId('gallery-counter');
    await expect(counter).toHaveText(/1 \/ 4/);
    await page.getByTestId('gallery-next').click();
    await expect(counter).toHaveText(/2 \/ 4/);
    await page.getByTestId('gallery-prev').click();
    await page.getByTestId('gallery-prev').click();
    await expect(counter).toHaveText(/4 \/ 4/);
    await page.getByRole('tab', { name: 'Show photo 2' }).click();
    await expect(counter).toHaveText(/2 \/ 4/);

    await page.getByTestId('gallery-main').focus();
    await page.keyboard.press('ArrowRight');
    await expect(counter).toHaveText(/3 \/ 4/);

    await page.getByTestId('gallery-fullscreen').click();
    await expect(page.getByText('Photo 3 of 4')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByText('Photo 3 of 4')).toBeHidden();
  });

  test('save a vehicle and find it on the saved page', async ({ page }) => {
    await page.goto('/inventory/toyota-fortuner-2024');
    // The first favourite button on the page belongs to the vehicle summary (later ones are similar-vehicle cards).
    await page.getByTestId('vehicle-detail').getByTestId('favorite-button').first().click();
    await page.goto('/saved');
    await expect(page.getByTestId('saved-grid').getByTestId('vehicle-card')).toHaveCount(1);
    await expect(page.getByTestId('saved-grid')).toContainText('Fortuner');
  });

  test('unknown vehicle shows a not-found state', async ({ page }) => {
    const response = await page.goto('/inventory/this-car-does-not-exist');
    expect(response?.status()).toBe(404);
    await expect(page.getByText('Vehicle not found')).toBeVisible();
  });

  test('unknown page returns 404', async ({ page }) => {
    const response = await page.goto('/no-such-page');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  });
});
