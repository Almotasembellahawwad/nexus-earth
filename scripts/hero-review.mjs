import { chromium } from '@playwright/test';
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage();
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: width > 800 ? 1000 : 844 });
    await page.goto(process.env.NEXUS_TEST_URL || 'http://localhost:3005', {
      waitUntil: 'networkidle',
    });
    await page.locator('.landing-earth canvas').waitFor();
    await page.waitForFunction(() => !document.querySelector('.landing-earth .globe-loading'));
    await page.getByRole('button', { name: 'Pause Earth rotation' }).click();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page
      .locator('.landing-hero')
      .screenshot({
        path: `artifacts/hero-${process.env.NEXUS_REVIEW_STAGE || 'after'}-${width}.png`,
      });
    console.log(
      JSON.stringify(
        await page.evaluate(() => {
          const rect = (selector) => {
            const r = document.querySelector(selector).getBoundingClientRect();
            return {
              x: r.x,
              y: r.y,
              width: r.width,
              height: r.height,
              right: r.right,
              bottom: r.bottom,
            };
          };
          const hero = rect('.landing-hero'),
            earth = rect('.landing-earth'),
            copy = rect('.landing-hero-copy');
          return {
            viewport: innerWidth,
            hero,
            earth,
            copy,
            contained:
              earth.x >= hero.x &&
              earth.right <= hero.right &&
              earth.y >= hero.y &&
              earth.bottom <= hero.bottom,
            overlap:
              earth.x < copy.right &&
              earth.right > copy.x &&
              earth.y < copy.bottom &&
              earth.bottom > copy.y,
          };
        }),
      ),
    );
  }
} finally {
  await browser.close();
}
