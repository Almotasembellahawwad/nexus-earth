import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(process.env.NEXUS_TEST_URL || 'http://localhost:3000', {
    waitUntil: 'networkidle',
  });
  await page.locator('canvas').waitFor();
  await page.screenshot({ path: 'artifacts/landing-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/landing-mobile.png', fullPage: true });
  const audit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  console.log(
    JSON.stringify({
      errors,
      overflow,
      violations: audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.html) })),
    }),
  );
  if (errors.length || overflow || audit.violations.length) process.exitCode = 1;
} finally {
  await browser.close();
}
