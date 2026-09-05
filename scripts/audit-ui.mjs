import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
fs.mkdirSync('artifacts', { recursive: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
await page.goto(process.env.NEXUS_TEST_URL || 'http://localhost:3000', {
  waitUntil: 'networkidle',
});
const report = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
console.log(
  JSON.stringify(
    report.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      nodes: v.nodes.map((n) => ({ html: n.html, summary: n.failureSummary })).slice(0, 30),
    })),
    null,
    2,
  ),
);
fs.writeFileSync(
  'artifacts/accessibility.json',
  JSON.stringify(
    { date: new Date().toISOString(), violations: report.violations, passes: report.passes.length },
    null,
    2,
  ),
);
const frames = await page.evaluate(async () => {
  const deltas = [];
  let last = performance.now();
  for (let i = 0; i < 120; i++) {
    const current = await new Promise(requestAnimationFrame);
    deltas.push(current - last);
    last = current;
  }
  return { medianMs: deltas.sort((a, b) => a - b)[60], p95Ms: deltas[114] };
});
const timing = await page.evaluate(() => ({
  resources: performance.getEntriesByType('resource').map((r) => ({
    name: new URL(r.name).pathname,
    bytes: r.transferSize,
    durationMs: Math.round(r.duration),
  })),
  heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
}));
console.log(
  JSON.stringify({
    frames,
    heapMB: timing.heapMB,
    transferredBytes: timing.resources.reduce((sum, r) => sum + r.bytes, 0),
  }),
);
fs.writeFileSync(
  'artifacts/performance.json',
  JSON.stringify(
    {
      date: new Date().toISOString(),
      environment:
        'Headless Chrome on development machine; not representative of hardware GPU performance',
      frames,
      ...timing,
    },
    null,
    2,
  ),
);
await browser.close();
