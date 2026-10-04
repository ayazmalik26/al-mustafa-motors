import { expect, test } from '@playwright/test';
import { adminApi, TEST_IMAGE, uniqueName, useLanguage } from './helpers';

test.describe('Lead capture', () => {
  test.beforeEach(async ({ page }) => useLanguage(page, 'en'));

  test('vehicle enquiry: open vehicle → submit → success → record saved', async ({ page }) => {
    const name = uniqueName('E2E Buyer');
    await page.goto('/inventory/toyota-fortuner-2024');
    await page.getByTestId('vehicle-enquire').click();

    const form = page.getByTestId('enquiry-form');
    await expect(form).toBeVisible();
    await expect(form).toContainText('Toyota Fortuner Legender 2024');

    // Client-side validation first
    await form.getByLabel('Message').fill('');
    await page.getByTestId('enquiry-submit').click();
    await expect(form.getByText('Please enter your name.')).toBeVisible();
    await expect(form.getByText('Please enter your phone number.')).toBeVisible();

    await form.getByLabel('Name').fill(name);
    await form.getByLabel('Phone').fill('0300 1234567');
    await form.getByLabel('Email').fill('not-an-email');
    await form.getByLabel('Message').fill('Is this Fortuner available for a test drive on Saturday?');
    await page.getByTestId('enquiry-submit').click();
    await expect(form.getByText('Enter a valid email address.')).toBeVisible();

    await form.getByLabel('Email').fill('buyer@example.com');
    await page.getByTestId('enquiry-submit').click();
    await expect(page.getByTestId('enquiry-success')).toBeVisible();
    const followUp = await page.getByTestId('enquiry-whatsapp').getAttribute('href');
    expect(followUp).toContain('wa.me/923368440890');
    expect(decodeURIComponent(followUp!)).toContain(name);

    // Verify the backend record
    const api = await adminApi();
    const res = await api.get('/api/enquiries', { params: { q: name } });
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      name,
      phone: '+923001234567',
      email: 'buyer@example.com',
      vehicleSlug: 'toyota-fortuner-2024',
      source: 'VEHICLE_PAGE',
      status: 'NEW',
    });
    await api.dispose();
  });

  test('sell / exchange: fill form with photo → submit → record saved', async ({ page }) => {
    const name = uniqueName('E2E Seller');
    await page.goto('/sell-exchange?intent=EXCHANGE');
    const form = page.getByTestId('sell-form');
    await expect(page.getByTestId('intent-EXCHANGE')).toBeChecked();

    await page.getByTestId('sell-submit').click();
    await expect(form.getByText('Please enter your name.')).toBeVisible();

    await form.getByLabel('Name').fill(name);
    await form.getByLabel('Phone').fill('+92 321 7654321');
    await form.getByLabel('Make').fill('Honda');
    await form.getByLabel('Model').fill('City Aspire');
    await form.getByLabel('Year').fill('2019');
    await form.getByLabel('Mileage (km)').fill('82,000');
    await form.getByLabel('Condition').selectOption('GOOD');
    await form.getByLabel('Expected price (PKR)').fill('3500000');
    await form.getByLabel('Message').fill('Looking to exchange for an SUV.');
    await page.getByTestId('sell-photos').setInputFiles(TEST_IMAGE);
    await expect(form.getByRole('button', { name: 'Remove photo 1' })).toBeVisible();

    await page.getByTestId('sell-submit').click();
    await expect(page.getByTestId('sell-success')).toBeVisible();
    await expect(page.getByTestId('sell-success')).toContainText(name);
    const wa = await page.getByTestId('sell-whatsapp').getAttribute('href');
    expect(decodeURIComponent(wa!)).toContain('Honda City Aspire 2019');

    const api = await adminApi();
    const body = await (await api.get('/api/sell-requests', { params: { q: name } })).json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      name,
      phone: '+923217654321',
      vehicleMake: 'Honda',
      vehicleModel: 'City Aspire',
      vehicleYear: 2019,
      mileage: 82000,
      expectedPrice: 3500000,
      condition: 'GOOD',
      intent: 'EXCHANGE',
      status: 'NEW',
    });
    expect(body.data[0].images).toHaveLength(1);
    await api.dispose();
  });

  test('contact page general enquiry', async ({ page }) => {
    const name = uniqueName('E2E Contact');
    await page.goto('/contact');
    const form = page.getByTestId('enquiry-form');
    await form.getByLabel('Name').fill(name);
    await form.getByLabel('Phone').fill('03001112233');
    await form.getByLabel('Message').fill('What time do you open on Fridays?');
    await page.getByTestId('enquiry-submit').click();
    await expect(page.getByTestId('enquiry-success')).toBeVisible();

    const api = await adminApi();
    const body = await (await api.get('/api/enquiries', { params: { q: name } })).json();
    expect(body.data[0]).toMatchObject({ name, source: 'CONTACT_PAGE', vehicleId: null });
    await api.dispose();
  });
});
