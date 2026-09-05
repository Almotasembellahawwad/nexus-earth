import { z } from 'zod';
import { fetchJson, sourceCache } from './cache';
import { safeUrl, validCoordinates } from './geo';
import type { EventType, GlobalEvent, Severity, SourceHealth, SourceName } from './types';

const number = z.number().finite();
const text = z.string().min(1).max(2000);
const timestamp = number.min(0).max(8_640_000_000_000_000);
const coordinates = z
  .array(number)
  .min(2)
  .refine((c) => validCoordinates(c[0], c[1]));
const usgsSchema = z.object({
  id: text,
  geometry: z.object({ type: z.literal('Point'), coordinates }),
  properties: z.object({
    mag: number.nullable(),
    place: z.string().nullable(),
    time: timestamp,
    updated: timestamp,
    url: z.string().optional(),
    type: z.string().optional(),
    title: z.string().optional(),
  }),
});
export function normalizeUSGS(input: unknown): GlobalEvent | null {
  const result = usgsSchema.safeParse(input);
  if (
    !result.success ||
    (result.data.properties.type && result.data.properties.type !== 'earthquake')
  )
    return null;
  const { id, properties: p, geometry: g } = result.data;
  if (p.mag === null) return null;
  const severity: Severity =
    p.mag >= 7 ? 'critical' : p.mag >= 6 ? 'high' : p.mag >= 4.5 ? 'moderate' : 'low';
  return {
    id: `usgs:${id}`,
    type: 'earthquake',
    title: p.place || 'Unspecified earthquake location',
    latitude: g.coordinates[1],
    longitude: g.coordinates[0],
    startedAt: p.time,
    updatedAt: Math.max(p.time, p.updated),
    ongoing: false,
    magnitude: p.mag,
    depthKm: g.coordinates[2],
    severity,
    sources: [{ name: 'USGS', id, url: safeUrl(p.url), updatedAt: p.updated }],
  };
}
const dateText = z.string().refine((value) => Number.isFinite(Date.parse(value)));
const eonetSchema = z.object({
  id: text,
  title: text,
  description: z.string().nullable().optional(),
  link: z.string().optional(),
  closed: dateText.nullable(),
  categories: z.array(z.object({ id: text })).min(1),
  geometry: z.array(z.unknown()).min(1),
});
const pointSchema = z.object({ type: z.literal('Point'), coordinates, date: dateText });
const eonetTypes: Record<string, EventType> = {
  wildfires: 'wildfire',
  volcanoes: 'volcano',
  severeStorms: 'storm',
  floods: 'flood',
  drought: 'drought',
  seaLakeIce: 'iceberg',
  earthquakes: 'earthquake',
};
export function normalizeEONET(input: unknown): GlobalEvent | null {
  const result = eonetSchema.safeParse(input);
  if (!result.success) return null;
  const p = result.data;
  const points = p.geometry
    .flatMap((value) => {
      const point = pointSchema.safeParse(value);
      return point.success ? [point.data] : [];
    })
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  if (!points.length) return null;
  const latest = points[points.length - 1];
  const startedAt = Date.parse(points[0].date);
  const updatedAt = Date.parse(latest.date);
  return {
    id: `eonet:${p.id}`,
    type: eonetTypes[p.categories[0].id] ?? 'other',
    title: p.title,
    latitude: latest.coordinates[1],
    longitude: latest.coordinates[0],
    startedAt,
    updatedAt,
    endedAt: p.closed ? Date.parse(p.closed) : undefined,
    ongoing: p.closed === null,
    severity: 'unknown',
    description: p.description?.slice(0, 2000),
    sources: [{ name: 'EONET', id: p.id, url: safeUrl(p.link), updatedAt }],
  };
}
const gdacsSchema = z.object({
  geometry: z.object({
    type: z.literal('Point'),
    coordinates: z
      .union([coordinates, z.array(coordinates).length(1)])
      .transform((c) => (Array.isArray(c[0]) ? (c[0] as number[]) : (c as number[]))),
  }),
  properties: z.object({
    eventtype: text,
    eventid: z.union([text, number]),
    title: text,
    fromdate: text,
    todate: text,
    alertlevel: z.string(),
    country: z.string().optional(),
    description: z.string().optional(),
    severity: number.optional(),
    severityunit: z.string().optional(),
  }),
});
function gdacsTime(value: string): number {
  // GDACS documents feed times in UTC but omits the timezone suffix.
  return Date.parse(/(?:Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : value.replace(' ', 'T') + 'Z');
}
const gdacsTypes: Record<string, EventType> = {
  EQ: 'earthquake',
  TC: 'storm',
  FL: 'flood',
  VO: 'volcano',
  DR: 'drought',
  WF: 'wildfire',
};
export function normalizeGDACS(input: unknown): GlobalEvent | null {
  const result = gdacsSchema.safeParse(input);
  if (!result.success) return null;
  const { properties: p, geometry: g } = result.data;
  const type = gdacsTypes[p.eventtype];
  const startedAt = gdacsTime(p.fromdate),
    updatedAt = gdacsTime(p.todate);
  if (!type || !Number.isFinite(startedAt) || !Number.isFinite(updatedAt)) return null;
  const severity: Severity =
    ({ red: 'critical', orange: 'high', green: 'low' } as const)[
      p.alertlevel.toLowerCase() as 'red' | 'orange' | 'green'
    ] ?? 'unknown';
  return {
    id: `gdacs:${p.eventtype}:${p.eventid}`,
    type,
    title: p.title,
    latitude: g.coordinates[1],
    longitude: g.coordinates[0],
    startedAt,
    updatedAt: Math.max(startedAt, updatedAt),
    ongoing: false,
    severity,
    magnitude: type === 'earthquake' && p.severityunit === 'M' ? p.severity : undefined,
    countryName: p.country,
    description: p.description?.slice(0, 2000),
    sources: [
      {
        name: 'GDACS',
        id: `${p.eventtype}:${p.eventid}`,
        url: `https://www.gdacs.org/report.aspx?eventtype=${p.eventtype}&eventid=${encodeURIComponent(p.eventid)}`,
        officialAlert: p.alertlevel,
        updatedAt,
      },
    ],
  };
}

interface Adapter {
  name: SourceName;
  url: string;
  ttl: number;
  coverage: string;
  collection: string;
  normalize: (value: unknown) => GlobalEvent | null;
}
export const ADAPTERS: Adapter[] = [
  {
    name: 'USGS',
    url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_month.geojson',
    ttl: 60_000,
    coverage: 'Rolling 30 days · M2.5+ earthquakes',
    collection: 'features',
    normalize: normalizeUSGS,
  },
  {
    name: 'EONET',
    url: 'https://eonet.gsfc.nasa.gov/api/v3/events?status=all&days=30',
    ttl: 300_000,
    coverage: 'Recent 30-day catalog · valid point observations; open events remain visible',
    collection: 'events',
    normalize: normalizeEONET,
  },
  {
    name: 'GDACS',
    url: 'https://www.gdacs.org/contentdata/xml/gdacsAPP_Home.geojson',
    ttl: 300_000,
    coverage: 'Current public alert feed · limited recent history',
    collection: 'features',
    normalize: normalizeGDACS,
  },
];
export async function loadAdapter(
  adapter: Adapter,
): Promise<{ events: GlobalEvent[]; health: SourceHealth }> {
  const result = await sourceCache.get(adapter.name, adapter.ttl, 3_600_000, async () => {
    const data = await fetchJson(adapter.url);
    const collection = z.record(z.string(), z.unknown()).parse(data)[adapter.collection];
    if (!Array.isArray(collection)) throw new Error('Source returned an unexpected data format');
    const events: GlobalEvent[] = [];
    let rejected = 0;
    for (const row of collection) {
      const event = adapter.normalize(row);
      if (event) events.push(event);
      else rejected++;
    }
    if (collection.length && !events.length) throw new Error('No source records passed validation');
    if (rejected && process.env.NODE_ENV === 'development')
      console.warn(`[${adapter.name}] Skipped ${rejected} unsupported or malformed records`);
    return { events, rejected };
  });
  return {
    events: result.value?.events ?? [],
    health: {
      name: adapter.name,
      status: result.status,
      fetchedAt: result.fetchedAt,
      count: result.value?.events.length ?? 0,
      rejected: result.value?.rejected ?? 0,
      coverage: adapter.coverage,
      message: result.error
        ? 'Source temporarily unreachable or returned invalid data. Automatic retry enabled.'
        : undefined,
    },
  };
}
