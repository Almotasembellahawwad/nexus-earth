import { chromium } from '@playwright/test';
import fs from 'node:fs';
fs.mkdirSync('artifacts', { recursive: true });
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--enable-webgl', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
await page.goto(new URL('/live', process.env.NEXUS_TEST_URL || 'http://localhost:3000').href, {
  waitUntil: 'networkidle',
});
await page.waitForFunction(() => document.querySelectorAll('.event-card').length > 0, {
  timeout: 35000,
});
await page.waitForTimeout(2000);
await page.screenshot({ path: 'artifacts/desktop.png', fullPage: true });
console.log(
  JSON.stringify({
    title: await page.title(),
    errors,
    cards: await page.locator('.event-card').count(),
    status: await page.locator('.connection').innerText(),
    canvas: await page.locator('canvas').count(),
    overflow: await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
  }),
);
await page.locator('.event-card').first().click();
await page.screenshot({ path: 'artifacts/details.png', fullPage: true });
await page.getByLabel('Close event details').click();
await page.keyboard.press('Control+k');
await page.getByLabel('Search countries, events or commands').fill('Japan');
await page.locator('.command-group button').filter({ hasText: 'Japan' }).first().click();
await page.waitForFunction(() => !document.querySelector('.country-loading'), { timeout: 25000 });
console.log('Country:', await page.locator('.country-indicators').innerText());
await page.screenshot({ path: 'artifacts/country.png', fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
await page.getByRole('button', { name: 'Earth', exact: true }).click();
await page.waitForTimeout(1000);
await page.screenshot({ path: 'artifacts/mobile.png', fullPage: true });
console.log(
  'Mobile overflow:',
  await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
);
await browser.close();
