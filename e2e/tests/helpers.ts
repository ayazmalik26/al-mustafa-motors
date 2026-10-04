import { fileURLToPath } from 'node:url';
import { expect, request, type APIRequestContext, type Page } from '@playwright/test';

export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3000';
export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@almustafamotors.local';
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'ChangeMe123!';

/** API client authenticated as the admin (used to verify that records reached the database). */
export async function adminApi(): Promise<APIRequestContext> {
  const ctx = await request.newContext({ baseURL: API_URL });
  const res = await ctx.post('/api/auth/login', { data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  expect(res.ok(), `admin login failed: ${res.status()}`).toBeTruthy();
  return ctx;
}

export function uniqueName(prefix: string) {
  return `${prefix} ${Date.now().toString(36).toUpperCase()}`;
}

/** Forces English for a test regardless of what a previous test chose. */
export async function useLanguage(page: Page, lang: 'en' | 'ur') {
  await page.addInitScript((l) => {
    try {
      localStorage.setItem('am-lang', l);
    } catch {
      /* ignore */
    }
  }, lang);
  await page.context().addCookies([{ name: 'am_lang', value: lang, url: process.env.E2E_BASE_URL ?? 'http://localhost:4200' }]);
}

export async function loginAsAdmin(page: Page) {
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/admin$/);
}

/** Path to a small JPEG used by the upload tests. */
export const TEST_IMAGE = fileURLToPath(new URL('../fixtures/test-car.jpg', import.meta.url));
