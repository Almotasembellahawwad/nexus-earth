import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ADAPTERS,
  loadAdapter,
  normalizeUSGS,
  normalizeEONET,
  normalizeGDACS,
} from '../src/lib/adapters';
import { distanceKm, safeUrl, validCoordinates } from '../src/lib/geo';
import { correlateEvents, correlationScore } from '../src/lib/correlation';
import { calculatePulse } from '../src/lib/pulse';
import { DEFAULT_FILTERS, filterEvents, parseCommand } from '../src/lib/filters';
import { DataCache, fetchJson } from '../src/lib/cache';
import { enrichCountry } from '../src/lib/countries';
import { normalizeWorldBank } from '../src/lib/worldbank';
import { compressedJson } from '../src/lib/http';
import { gunzipSync } from 'node:zlib';
import type { GlobalEvent, SourceHealth } from '../src/lib/types';

const now = Date.UTC(2026, 8, 5, 12);
function event(patch: Partial<GlobalEvent> = {}): GlobalEvent {
  return {
    id: 'usgs:a',
    type: 'earthquake',
    title: 'Test earthquake',
    latitude: 36,
    longitude: 138,
    startedAt: now - 60_000,
    updatedAt: now,
    ongoing: false,
    severity: 'moderate',
    magnitude: 5,
    sources: [{ name: 'USGS', id: 'a', updatedAt: now }],
    ...patch,
  };
}
const health: SourceHealth[] = ['USGS', 'EONET', 'GDACS'].map((name) => ({
  name: name as SourceHealth['name'],
  status: 'live',
  fetchedAt: now,
  count: 1,
  rejected: 0,
  coverage: 'test',
}));
const usgs = {
  id: 'test',
  geometry: { type: 'Point', coordinates: [138, 36, 20] },
  properties: {
    mag: 5.4,
    place: 'Japan',
    time: now - 1000,
    updated: now,
    type: 'earthquake',
    url: 'https://earthquake.usgs.gov/earthquakes/eventpage/test',
  },
};
const nasa = {
  id: 'EONET_test',
  title: 'Test storm',
  closed: null,
  categories: [{ id: 'severeStorms' }],
  geometry: [
    { type: 'Point', coordinates: [140, 20], date: '2026-09-01T00:00:00Z' },
    { type: 'Point', coordinates: [141, 22], date: '2026-09-03T00:00:00Z' },
  ],
};
const gdacs = {
  properties: {
    eventtype: 'EQ',
    eventid: 123,
    title: 'Earthquake in Japan',
    fromdate: '2026-09-05 11:59:00',
    todate: '2026-09-05 11:59:00',
    alertlevel: 'Orange',
    severity: 5,
    severityunit: 'M',
    country: 'Japan',
  },
  geometry: { type: 'Point', coordinates: [[138, 36]] },
};

test('USGS preserves coordinates, origin, magnitude, depth, and official URL', () => {
  const e = normalizeUSGS(usgs)!;
  assert.equal(e.latitude, 36);
  assert.equal(e.longitude, 138);
  assert.equal(e.depthKm, 20);
  assert.equal(e.magnitude, 5.4);
  assert.equal(e.startedAt, now - 1000);
  assert.match(e.sources[0].url!, /^https:/);
});
test('USGS rejects missing magnitude, malformed coordinates and non-earthquakes', () => {
  assert.equal(normalizeUSGS({ ...usgs, properties: { ...usgs.properties, mag: null } }), null);
  assert.equal(
    normalizeUSGS({ ...usgs, geometry: { type: 'Point', coordinates: [20, 138] } }),
    null,
  );
  assert.equal(
    normalizeUSGS({ ...usgs, properties: { ...usgs.properties, type: 'quarry blast' } }),
    null,
  );
});
test('NASA uses earliest origin and latest valid point without inventing severity', () => {
  const e = normalizeEONET(nasa)!;
  assert.equal(e.startedAt, Date.parse('2026-09-01T00:00:00Z'));
  assert.equal(e.latitude, 22);
  assert.equal(e.type, 'storm');
  assert.equal(e.severity, 'unknown');
  assert.equal(e.ongoing, true);
});
test('NASA rejects polygon-only and invalid geometry; it does not guess centroids', () => {
  assert.equal(
    normalizeEONET({
      ...nasa,
      geometry: [{ type: 'Polygon', coordinates: [[[30, 150]]], date: '2026-09-01T00:00:00Z' }],
    }),
    null,
  );
  assert.equal(
    normalizeEONET({ ...nasa, geometry: [{ type: 'Point', coordinates: [30, 150], date: 'bad' }] }),
    null,
  );
});
test('NASA handles closed records and skips a bad observation inside a good event', () => {
  const e = normalizeEONET({
    ...nasa,
    closed: '2026-09-04T00:00:00Z',
    geometry: [null, ...nasa.geometry],
  })!;
  assert.equal(e.ongoing, false);
  assert.equal(e.endedAt, Date.parse('2026-09-04T00:00:00Z'));
});
test('GDACS normalizes nested coordinates and timezone-less dates as UTC', () => {
  const e = normalizeGDACS(gdacs)!;
  assert.equal(e.startedAt, now - 60_000);
  assert.equal(e.latitude, 36);
  assert.equal(e.magnitude, 5);
  assert.equal(e.severity, 'high');
  assert.equal(e.sources[0].officialAlert, 'Orange');
});
test('GDACS supports flat points and rejects unsupported types and invalid times', () => {
  assert.ok(normalizeGDACS({ ...gdacs, geometry: { type: 'Point', coordinates: [138, 36] } }));
  assert.equal(
    normalizeGDACS({ ...gdacs, properties: { ...gdacs.properties, eventtype: 'INVALID' } }),
    null,
  );
  assert.equal(
    normalizeGDACS({ ...gdacs, properties: { ...gdacs.properties, fromdate: 'bad' } }),
    null,
  );
});
test('World Bank selects latest non-null independently for each indicator', () => {
  const d = normalizeWorldBank([
    { pages: 1 },
    [
      { indicator: { id: 'SP.POP.TOTL' }, date: '2025', value: null },
      { indicator: { id: 'SP.POP.TOTL' }, date: '2024', value: 123 },
      { indicator: { id: 'NY.GDP.MKTP.CD' }, date: '2023', value: 456 },
    ],
  ]);
  assert.deepEqual(d.population, { value: 123, year: '2024' });
  assert.deepEqual(d.gdp, { value: 456, year: '2023' });
  assert.equal(d.gdpPerCapita.value, null);
});
test('World Bank rejects source errors and nonnumeric indicators', () => {
  assert.throws(() => normalizeWorldBank([{ message: 'bad' }]));
  assert.throws(() =>
    normalizeWorldBank([
      { pages: 1 },
      [{ indicator: { id: 'SP.POP.TOTL' }, date: '2024', value: '123' }],
    ]),
  );
});
test('geography handles zero distance, antimeridian, poles and antipodes', () => {
  assert.equal(distanceKm(event(), event()), 0);
  assert.ok(distanceKm({ latitude: 0, longitude: 179.9 }, { latitude: 0, longitude: -179.9 }) < 23);
  assert.ok(
    Math.abs(
      distanceKm({ latitude: 90, longitude: 0 }, { latitude: -90, longitude: 0 }) - 20015.1,
    ) < 1,
  );
  assert.equal(validCoordinates(NaN, 10), false);
  assert.equal(validCoordinates(180, 90), true);
});
test('source URLs prohibit scripts, insecure protocols, and embedded credentials', () => {
  for (const u of [
    'javascript:alert(1)',
    'http://example.com',
    'data:text/html,x',
    'https://user:pass@example.com',
  ])
    assert.equal(safeUrl(u), undefined);
  assert.equal(safeUrl('https://example.com/report'), 'https://example.com/report');
});
test('correlation merges only independent same-event reports and retains USGS identity', () => {
  const gd = event({
    id: 'gdacs:b',
    magnitude: 5.1,
    longitude: 138.01,
    sources: [{ name: 'GDACS', id: 'b', updatedAt: now, officialAlert: 'Orange' }],
    severity: 'high',
  });
  const merged = correlateEvents([gd, event()]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].id, 'usgs:a');
  assert.equal(merged[0].sources.length, 2);
  assert.equal(merged[0].severity, 'high');
  assert.ok(merged[0].correlation!.score >= 75);
  assert.equal(gd.sources.length, 1);
});
test('correlation never merges two USGS aftershocks', () => {
  assert.equal(
    correlateEvents([
      event(),
      event({ id: 'usgs:b', sources: [{ name: 'USGS', id: 'b', updatedAt: now }] }),
    ]).length,
    2,
  );
});
test('correlation hard gates distance, time, type, magnitude and conflicting countries', () => {
  const base = event({ sources: [{ name: 'GDACS', id: 'b', updatedAt: now }] });
  for (const patch of [
    { longitude: 142 },
    { startedAt: now - 600_000 },
    { type: 'wildfire' as const },
    { magnitude: 6 },
    { magnitude: undefined },
  ])
    assert.equal(correlationScore(event(), { ...base, ...patch }), null);
  assert.equal(
    correlationScore(event({ countryCode: 'JP' }), { ...base, countryCode: 'CN' }),
    null,
  );
});
test('nearby independent fires are not merged without identity evidence', () => {
  assert.equal(
    correlationScore(
      event({ type: 'wildfire' }),
      event({ type: 'wildfire', sources: [{ name: 'EONET', id: 'b', updatedAt: now }] }),
    ),
    null,
  );
});
test('duplicate source IDs keep newest report without creating phantom sources', () => {
  const result = correlateEvents([event({ updatedAt: now - 5 }), event()]);
  assert.equal(result.length, 1);
  assert.equal(result[0].updatedAt, now);
  assert.equal(result[0].sources.length, 1);
});
test('pulse unavailable is null, never a misleading zero', () => {
  assert.equal(
    calculatePulse(
      [],
      health.map((h) => ({ ...h, status: 'unavailable' })),
      now,
    ).value,
    null,
  );
});
test('pulse is bounded and reports complete, partial and stale coverage', () => {
  const many = Array.from({ length: 10_000 }, (_, i) => event({ id: String(i), magnitude: 9 }));
  const p = calculatePulse(many, health, now);
  assert.ok(p.value! >= 0 && p.value! <= 100);
  assert.equal(p.coverage, 100);
  const partial = calculatePulse(
    [],
    health.map((h) => (h.name === 'GDACS' ? { ...h, status: 'unavailable' } : h)),
    now,
  );
  assert.equal(partial.coverage, 67);
  assert.equal(partial.label, 'PARTIAL DATA');
  assert.equal(
    calculatePulse(
      [],
      health.map((h) => ({ ...h, status: 'stale' })),
      now,
    ).label,
    'STALE DATA',
  );
});
test('pulse excludes future and old earthquakes even if recently revised', () => {
  const p = calculatePulse(
    [event({ startedAt: now + 1 }), event({ startedAt: now - 2 * 86_400_000 })],
    health,
    now,
  );
  assert.equal(p.value, 0);
});
test('one high-volume source cannot consume the entire pulse', () => {
  const list = Array.from({ length: 5000 }, (_, i) =>
    event({
      type: 'wildfire',
      id: String(i),
      ongoing: true,
      sources: [{ name: 'EONET', id: String(i), updatedAt: now }],
    }),
  );
  assert.ok(calculatePulse(list, health, now).value! <= 35);
});
test('filters apply type, magnitude, severity, region and search together', () => {
  const e = event({ region: 'Asia', title: 'Japan test' });
  assert.equal(
    filterEvents(
      [e],
      {
        ...DEFAULT_FILTERS,
        types: ['earthquake'],
        minMagnitude: 5,
        severity: 'moderate',
        region: 'Asia',
        query: 'japan',
      },
      now,
    ).length,
    1,
  );
  for (const patch of [
    { types: [] },
    { minMagnitude: 6 },
    { severity: 'high' as const },
    { region: 'Africa' },
    { query: 'unknown' },
  ])
    assert.equal(filterEvents([e], { ...DEFAULT_FILTERS, ...patch }, now).length, 0);
});
test('24h earthquake view uses origin time, not revision time', () => {
  assert.equal(
    filterEvents([event({ startedAt: now - 2 * 86_400_000, updatedAt: now })], DEFAULT_FILTERS, now)
      .length,
    0,
  );
});
test('time exploration excludes future events and includes open long-lived events', () => {
  assert.equal(filterEvents([event({ startedAt: now + 1 })], DEFAULT_FILTERS, now).length, 0);
  assert.equal(
    filterEvents(
      [
        event({
          type: 'wildfire',
          startedAt: now - 10 * 86_400_000,
          updatedAt: now - 9 * 86_400_000,
          ongoing: true,
        }),
      ],
      DEFAULT_FILTERS,
      now,
    ).length,
    1,
  );
});
test('deterministic commands parse magnitudes, categories and ranges', () => {
  assert.deepEqual(parseCommand('M6+'), { types: ['earthquake'], minMagnitude: 6 });
  assert.deepEqual(parseCommand('volcanoes'), { types: ['volcano'] });
  assert.deepEqual(parseCommand('last 30 days'), { hours: 720 });
  assert.equal(parseCommand('predict earthquakes tomorrow'), null);
});
test('US state abbreviations are not interpreted as ISO country codes', () => {
  assert.equal(enrichCountry(event({ title: '4 km NE of Temecula, CA' })).countryCode, 'US');
  assert.equal(enrichCountry(event({ title: 'An event, IN' })).countryCode, 'US');
  assert.equal(enrichCountry(event({ title: 'A town, Japan' })).countryCode, 'JP');
  assert.equal(enrichCountry(event({ title: 'Pacific Ocean' })).countryCode, undefined);
});
test('cache coalesces concurrent requests and retains fresh data', async () => {
  const cache = new DataCache();
  let calls = 0;
  const loader = async () => {
    calls++;
    await new Promise((r) => setTimeout(r, 10));
    return [1, 2];
  };
  const results = await Promise.all([
    cache.get('a', 1000, 2000, loader),
    cache.get('a', 1000, 2000, loader),
  ]);
  assert.equal(calls, 1);
  assert.deepEqual(results[0].value, [1, 2]);
  await cache.get('a', 1000, 2000, loader);
  assert.equal(calls, 1);
});
test('cache serves stale after failure, backs off, then expires instead of inventing data', async (t) => {
  let time = now;
  t.mock.method(Date, 'now', () => time);
  const cache = new DataCache();
  await cache.get('a', 100, 1000, async () => [1]);
  time += 101;
  let calls = 0;
  const fail = async () => {
    calls++;
    throw new Error('source offline');
  };
  const stale = await cache.get('a', 100, 1000, fail);
  assert.equal(stale.status, 'stale');
  assert.deepEqual(stale.value, [1]);
  await cache.get('a', 100, 1000, fail);
  assert.equal(calls, 1);
  time += 1500;
  const expired = await cache.get('a', 100, 1000, fail);
  assert.equal(expired.status, 'unavailable');
  assert.equal(expired.value, undefined);
});
test('new failing cache key returns unavailable with no fake value', async () => {
  const r = await new DataCache().get('bad', 10, 20, async () => {
    throw new Error('timeout');
  });
  assert.equal(r.status, 'unavailable');
  assert.equal(r.value, undefined);
});
test('fetch transport handles HTTP errors and allows static GeoJSON content negotiation', async (t) => {
  t.mock.method(globalThis, 'fetch', async (_url: string, options: RequestInit) => {
    assert.match((options.headers as Record<string, string>).Accept, /\*\/\*/);
    assert.ok(options.signal);
    return new Response('bad', { status: 503 });
  });
  await assert.rejects(() => fetchJson('https://example.com'), /503/);
});
test('adapter pipeline isolates a failed source while accepting valid siblings', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    if (url.includes('eonet')) return new Response('Unavailable', { status: 503 });
    return Response.json({
      features: url.includes('gdacs') ? [gdacs] : [usgs, { malformed: true }],
    });
  });
  const results = await Promise.all(ADAPTERS.map(loadAdapter));
  assert.equal(results[0].health.status, 'live');
  assert.equal(results[0].health.rejected, 1);
  assert.equal(results[1].health.status, 'unavailable');
  assert.deepEqual(results[1].events, []);
  assert.equal(results[2].health.status, 'live');
});
test('catalog compression round-trips data and respects gzip opt-out', async () => {
  const data = { events: Array.from({ length: 100 }, () => event()) };
  const compressed = await compressedJson(data, 'gzip, deflate, br', 'public, max-age=15');
  assert.equal(compressed.headers.get('Content-Encoding'), 'gzip');
  assert.equal(compressed.headers.get('Vary'), 'Accept-Encoding');
  const body = Buffer.from(await compressed.arrayBuffer());
  assert.ok(body.length < JSON.stringify(data).length / 4);
  assert.deepEqual(JSON.parse(gunzipSync(body).toString()), data);
  const uncompressed = await compressedJson(data, 'gzip;q=0, br', 'no-store');
  assert.equal(uncompressed.headers.get('Content-Encoding'), null);
  assert.deepEqual(await uncompressed.json(), data);
});
