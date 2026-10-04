import { expect, test } from '@playwright/test';

/**
 * Visual review helper: full-page screenshots of the main pages at every target width.
 * Run with:  SCREENSHOTS=1 npx playwright test --project=screenshots
 * Output:    e2e/screenshots/<page>-<width>.png
 */
const WIDTHS = (process.env.SCREENSHOT_WIDTHS ?? '375,390,430,768,1024,1280,1440,1920').split(',').map(Number);
const PAGES = (process.env.SCREENSHOT_PAGES ?? '/,/inventory,/inventory/toyota-fortuner-2024,/sell-exchange,/contact,/about').split(',');
const LANG = process.env.SCREENSHOT_LANG ?? 'en';

test.skip(!process.env.SCREENSHOTS, 'Set SCREENSHOTS=1 to capture review screenshots');

for (const path of PAGES) {
  for (const width of WIDTHS) {
    test(`${path} @ ${width}px (${LANG})`, async ({ page, context }) => {
      await context.addCookies([{ name: 'am_lang', value: LANG, url: test.info().project.use.baseURL! }]);
      await page.addInitScript((lang) => localStorage.setItem('am-lang', lang), LANG);
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path, { waitUntil: 'networkidle' });
      await page.evaluate(async () => {
        // Scroll through the page so lazy images and reveal animations trigger.
        for (let y = 0; y < document.body.scrollHeight; y += 600) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 120));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(800);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, 'page must not scroll horizontally').toBeLessThanOrEqual(1);
      const name = path === '/' ? 'home' : path.replace(/^\//, '').replace(/\//g, '_');
      await page.screenshot({ path: `screenshots/${name}-${width}${LANG === 'ur' ? '-ur' : ''}.png`, fullPage: true });
    });
  }
}
