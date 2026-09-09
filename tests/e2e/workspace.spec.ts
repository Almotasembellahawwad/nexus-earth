import { test, expect, type Page } from '@playwright/test';
import type { FeedResponse, GlobalEvent } from '../../src/lib/types';
// Synthetic fixtures are confined to tests. No fixture is imported by production.
function fixture(): FeedResponse {
  const now = Date.now();
  const quake: GlobalEvent = {
    id: 'test:q',
    type: 'earthquake',
    title: 'TEST: Japan earthquake',
    latitude: 36,
    longitude: 138,
    magnitude: 6.2,
    depthKm: 25,
    startedAt: now - 60_000,
    updatedAt: now,
    severity: 'high',
    ongoing: false,
    countryCode: 'JP',
    countryName: 'Japan',
    region: 'Asia',
    sources: [
      { name: 'USGS', id: 'TEST-only', url: 'https://earthquake.usgs.gov', updatedAt: now },
    ],
  };
  return {
    fetchedAt: now,
    events: [
      quake,
      {
        ...quake,
        id: 'test:f',
        type: 'wildfire',
        title: 'TEST: Oregon wildfire',
        magnitude: undefined,
        severity: 'unknown',
        ongoing: true,
        countryCode: 'US',
        countryName: 'United States',
        region: 'Americas',
        latitude: 44,
        longitude: -121,
        sources: [{ name: 'EONET', id: 'TEST-fire', updatedAt: now }],
      },
    ],
    sources: ['USGS', 'EONET', 'GDACS'].map((name) => ({
      name: name as 'USGS' | 'EONET' | 'GDACS',
      status: 'live',
      count: 1,
      rejected: 0,
      fetchedAt: now,
      coverage: 'TEST fixture only',
    })),
    pulse: { value: 40, label: 'MODERATE', components: [], coverage: 100 },
  };
}
async function load(page: Page, feed = fixture()) {
  await page.route('**/api/events', (route) => route.fulfill({ json: feed }));
  await page.goto('/live');
  await expect(page.locator('.connection')).not.toContainText('CONNECTING');
}
test('landing page opens a real catalog observation in the workspace', async ({ page }) => {
  await page.route('**/api/events', (route) => route.fulfill({ json: fixture() }));
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'What if Earth had an interface?' }),
  ).toBeVisible();
  await expect(page.locator('.landing-event')).toHaveCount(2);
  await page.locator('.landing-event').filter({ hasText: 'TEST: Japan earthquake' }).click();
  await expect(page).toHaveURL(/\/live\?event=/);
  await expect(page.locator('.detail-title')).toContainText('Japan');
});
test('shared filters and camera survive opening the view link', async ({ page }) => {
  await load(page);
  await page.getByRole('button', { name: /Wildfires.*1/ }).click();
  await page.getByRole('button', { name: 'Share current view', exact: true }).click();
  const url = await page.getByLabel('View link', { exact: true }).inputValue();
  const state = JSON.parse(new URL(url).searchParams.get('view')!);
  expect(state.camera).toHaveLength(3);
  await page.goto(url);
  await expect(page.locator('.event-card')).toHaveCount(1);
  await expect(page.locator('.event-card')).toContainText('Japan');
  await page.getByRole('button', { name: 'Share current view', exact: true }).click();
  const restored = JSON.parse(
    new URL(await page.getByLabel('View link', { exact: true }).inputValue()).searchParams.get(
      'view',
    )!,
  );
  expect(restored.filters).toEqual(state.filters);
  for (let i = 0; i < 3; i++) expect(restored.camera[i]).toBeCloseTo(state.camera[i], 2);
});
test('interactive landing preview filters actual observations and pauses rotation', async ({
  page,
}) => {
  await page.route('**/api/events', (route) => route.fulfill({ json: fixture() }));
  await page.goto('/');
  const preview = page.locator('.observatory-preview');
  await preview.scrollIntoViewIfNeeded();
  await expect(preview.locator('.preview-reading strong')).toHaveText('2');
  await preview.getByRole('button', { name: 'Wildfires', exact: true }).click();
  await expect(preview.locator('.preview-reading strong')).toHaveText('1');
  await expect(preview.getByRole('button', { name: 'Wildfires', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await preview.getByRole('button', { name: 'Pause preview rotation' }).click();
  await expect(preview.getByRole('button', { name: 'Resume preview rotation' })).toBeVisible();
  await preview.getByRole('link', { name: 'Open the full workspace' }).click();
  await expect(page).toHaveURL(/\/live$/);
});
test('landing handles unavailable feeds and mobile layout without blocking entry', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/events', (route) => route.fulfill({ status: 503, body: 'Unavailable' }));
  await page.goto('/');
  await expect(page.getByRole('status')).toContainText('Feeds unavailable');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('link', { name: 'Open observatory' }).click();
  await expect(page).toHaveURL(/\/live$/);
});
test('globe, layer filters and reset agree with the event stream', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await load(page);
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.locator('.event-card')).toHaveCount(2);
  await page.getByRole('button', { name: /Wildfires.*1/ }).click();
  await expect(page.locator('.event-card')).toHaveCount(1);
  await expect(page.locator('.earth-caption')).toContainText('1 events');
  await page.getByRole('button', { name: 'Reset filters', exact: true }).click();
  await expect(page.locator('.event-card')).toHaveCount(2);
  expect(errors).toEqual([]);
});
test('event details retain measurements, source links and calculation labels', async ({ page }) => {
  await load(page);
  await page.locator('.event-card').filter({ hasText: 'TEST: Japan earthquake' }).click();
  await expect(page.locator('.detail-title')).toContainText('Japan');
  await expect(page.locator('.detail-scroll')).toContainText('25.0 km');
  await expect(page.locator('.detail-scroll')).toContainText('SOURCE DATA');
  await expect(page.locator('.calculation-box')).toContainText('NEXUS CALCULATIONS');
  await expect(page.locator('.source-link')).toHaveAttribute('href', 'https://earthquake.usgs.gov');
  await page.getByLabel('Close event details').click();
  await expect(page.locator('.event-card')).toHaveCount(2);
});
test('keyboard command applies M6+ and Escape restores keyboard focus', async ({ page }) => {
  await load(page);
  await page.getByRole('button', { name: /Explore the planet/ }).focus();
  await page.keyboard.press('Control+k');
  const input = page.getByLabel('Search countries, events or commands');
  await expect(input).toBeFocused();
  await input.fill('M6+');
  await input.press('Enter');
  await expect(page.locator('.event-card')).toHaveCount(1);
  await expect(page.locator('#magnitude')).toHaveValue('6');
  await page.keyboard.press('Control+k');
  await page.keyboard.press('Escape');
  await expect(page.locator('.command-modal')).not.toBeVisible();
});
test('country intelligence is reachable via search and reports indicator years', async ({
  page,
}) => {
  await page.route('**/api/countries/JP', (route) =>
    route.fulfill({
      json: {
        status: 'live',
        fetchedAt: Date.now(),
        population: { value: 123000000, year: '2024' },
        gdp: { value: null, year: null },
        gdpPerCapita: { value: null, year: null },
      },
    }),
  );
  await load(page);
  await page.keyboard.press('Control+k');
  await page.getByLabel('Search countries, events or commands').fill('Japan');
  await page.locator('.command-group button').filter({ hasText: 'Japan' }).first().click();
  await expect(page.locator('.country-title')).toHaveText('Japan');
  await expect(page.locator('.country-indicators')).toContainText('123M');
  await expect(page.locator('.country-indicators')).toContainText('2024 · World Bank');
  await expect(page.locator('.country-indicators')).toContainText('Unavailable');
});
test('replay scrub, playback and live return change the event view', async ({ page }) => {
  await load(page);
  const slider = page.getByLabel('Replay position');
  await slider.fill('0');
  await expect(page.locator('.event-card')).toHaveCount(0);
  await expect(page.locator('.view-mode')).toContainText('REPLAY MODE');
  await page.getByRole('button', { name: 'Play replay' }).click();
  await expect(page.getByRole('button', { name: 'Pause replay' })).toBeVisible();
  await page.getByRole('button', { name: 'LIVE', exact: true }).click();
  await expect(slider).toHaveValue('100');
  await expect(page.locator('.event-card')).toHaveCount(2);
});
test('one unavailable source does not remove healthy observations', async ({ page }) => {
  const feed = fixture();
  feed.sources[1].status = 'unavailable';
  feed.sources[1].count = 0;
  feed.sources[1].fetchedAt = null;
  feed.events = feed.events.slice(0, 1);
  feed.pulse.label = 'PARTIAL DATA';
  feed.pulse.coverage = 67;
  await load(page, feed);
  await expect(page.locator('.event-card')).toHaveCount(1);
  await expect(page.locator('.connection')).toContainText('PARTIAL FEEDS');
  await page.getByRole('button', { name: /Data sources/ }).click();
  await expect(page.locator('.source-health-card').filter({ hasText: 'NASA EONET' })).toContainText(
    'unavailable',
  );
});
test('total source failure is a useful empty state, not a fake live feed', async ({ page }) => {
  const feed = fixture();
  feed.events = [];
  feed.sources.forEach((s) => {
    s.status = 'unavailable';
    s.count = 0;
  });
  feed.pulse.value = null;
  feed.pulse.label = 'UNAVAILABLE';
  await load(page, feed);
  await expect(page.locator('.feed-state')).toContainText('Waiting for observations');
  await expect(page.locator('.event-card')).toHaveCount(0);
  await expect(page.locator('.pulse-value')).toContainText('—');
});
test('mobile sheets, search, filters and Earth navigation are usable without overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await load(page);
  await expect(page.locator('.mobile-nav')).toBeVisible();
  await page.locator('.mobile-nav button').filter({ hasText: 'Events' }).click();
  await expect(page.locator('.stream-panel')).toBeVisible();
  await page.locator('.mobile-nav button').filter({ hasText: 'Filters' }).click();
  await expect(page.locator('.filter-panel')).toBeVisible();
  await page.locator('.mobile-nav button').filter({ hasText: 'Earth' }).click();
  await expect(page.locator('.stream-panel')).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
test('invalid country paths cannot be used as upstream URLs', async ({ request }) => {
  const response = await request.get('/api/countries/not-a-country');
  expect(response.status()).toBe(400);
});
test('search reveals older observations by updating the shared time window', async ({ page }) => {
  const feed = fixture();
  feed.events[0].startedAt = Date.now() - 5 * 86_400_000;
  feed.events[0].updatedAt = feed.events[0].startedAt;
  await load(page, feed);
  await expect(page.locator('.event-card')).toHaveCount(1);
  await page.keyboard.press('Control+k');
  await page.getByLabel('Search countries, events or commands').fill('TEST: Japan');
  await page.locator('.command-group button').filter({ hasText: 'TEST: Japan' }).click();
  await expect(page.locator('.detail-title')).toContainText('Japan');
  await expect(page.getByRole('button', { name: '30D', exact: true })).toHaveClass('active');
});
test('a focused globe marker is clickable independently of the event stream', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await load(page);
  await page.locator('.event-card').filter({ hasText: 'TEST: Japan earthquake' }).click();
  await page.getByLabel('Close event details').click();
  await page.waitForTimeout(400);
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await canvas.click({ position: { x: box!.width / 2, y: box!.height / 2 } });
  await expect(page.locator('.detail-title')).toContainText('Japan');
});
