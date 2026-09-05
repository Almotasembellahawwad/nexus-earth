import { EVENT_TYPES, type EventType, type GlobalEvent, type Severity } from './types';
export interface Filters {
  types: EventType[];
  hours: number;
  minMagnitude: number;
  severity: Severity | 'all';
  region: string;
  query: string;
}
export const DEFAULT_FILTERS: Filters = {
  types: [...EVENT_TYPES],
  hours: 24,
  minMagnitude: 2.5,
  severity: 'all',
  region: 'all',
  query: '',
};
export function filterEvents(events: GlobalEvent[], filters: Filters, asOf: number): GlobalEvent[] {
  const from = asOf - filters.hours * 3_600_000;
  const query = filters.query.trim().toLowerCase();
  return events.filter((e) => {
    if (!filters.types.includes(e.type) || e.startedAt > asOf) return false;
    // Recency uses occurrences/observations, with ongoing events included.
    // Replay never treats a later observation as if it were available earlier.
    const observedAt =
      e.type === 'earthquake' ? e.startedAt : e.updatedAt <= asOf ? e.updatedAt : e.startedAt;
    if (observedAt < from && !(e.ongoing && (!e.endedAt || e.endedAt > asOf))) return false;
    if (
      e.type === 'earthquake' &&
      (e.magnitude === undefined || e.magnitude < filters.minMagnitude)
    )
      return false;
    if (filters.severity !== 'all' && e.severity !== filters.severity) return false;
    if (filters.region !== 'all' && e.region !== filters.region) return false;
    return !query || `${e.title} ${e.countryName ?? ''} ${e.type}`.toLowerCase().includes(query);
  });
}
export function parseCommand(query: string): Partial<Filters> | null {
  const q = query.trim().toLowerCase();
  const mag = /^m\s*(\d(?:\.\d)?)\+?$/.exec(q);
  if (mag) return { types: ['earthquake'], minMagnitude: Number(mag[1]) };
  const types: Record<string, EventType> = {
    earthquakes: 'earthquake',
    earthquake: 'earthquake',
    wildfires: 'wildfire',
    volcanoes: 'volcano',
    storms: 'storm',
    cyclones: 'storm',
    floods: 'flood',
    droughts: 'drought',
    icebergs: 'iceberg',
  };
  if (types[q]) return { types: [types[q]] };
  const times: Record<string, number> = {
    'last hour': 1,
    'last 24 hours': 24,
    'last 7 days': 168,
    'last 30 days': 720,
  };
  if (times[q]) return { hours: times[q] };
  return null;
}
