import { distanceKm } from './geo';
import type { GlobalEvent } from './types';

// Deliberately conservative: only independent earthquake reports with precise
// origin times and magnitudes are eligible. Long-lived disasters need identity
// evidence (track/name/area) unavailable consistently in these feeds.
export function correlationScore(a: GlobalEvent, b: GlobalEvent) {
  if (a.type !== 'earthquake' || b.type !== a.type) return null;
  if (a.sources.some((s) => b.sources.some((t) => t.name === s.name))) return null;
  if (a.magnitude === undefined || b.magnitude === undefined) return null;
  if (a.countryCode && b.countryCode && a.countryCode !== b.countryCode) return null;
  const distance = distanceKm(a, b);
  const minutes = Math.abs(a.startedAt - b.startedAt) / 60_000;
  const magnitudeDelta = Math.abs(a.magnitude - b.magnitude);
  if (distance > 80 || minutes > 3 || magnitudeDelta > 0.5) return null;
  const score =
    0.45 * (1 - distance / 80) + 0.4 * (1 - minutes / 3) + 0.15 * (1 - magnitudeDelta / 0.5);
  return score >= 0.75
    ? {
        score: Math.round(score * 100),
        distanceKm: Math.round(distance * 10) / 10,
        timeDeltaMinutes: Math.round(minutes * 100) / 100,
        method:
          'Earthquake match v1: ≤80 km, ≤3 min, ΔM≤0.5; weighted score ≥75%. Heuristic, not a probability.',
      }
    : null;
}
export function correlateEvents(events: GlobalEvent[]): GlobalEvent[] {
  const deduped = new Map<string, GlobalEvent>();
  for (const event of events) {
    const key = event.sources
      .map((s) => `${s.name}:${s.id}`)
      .sort()
      .join('|');
    const prior = deduped.get(key);
    if (!prior || event.updatedAt > prior.updatedAt) deduped.set(key, event);
  }
  // Keep USGS as the earthquake measurement authority and stable canonical ID.
  const ordered = [...deduped.values()].sort(
    (a, b) =>
      Number(b.sources.some((s) => s.name === 'USGS')) -
        Number(a.sources.some((s) => s.name === 'USGS')) || a.id.localeCompare(b.id),
  );
  const result: GlobalEvent[] = [];
  const severity = { unknown: 0, low: 1, moderate: 2, high: 3, critical: 4 };
  for (const event of ordered) {
    let best:
      { index: number; match: NonNullable<ReturnType<typeof correlationScore>> } | undefined;
    for (let i = 0; i < result.length; i++) {
      const match = correlationScore(result[i], event);
      if (match && (!best || match.score > best.match.score)) best = { index: i, match };
    }
    if (!best) {
      result.push({ ...event, sources: [...event.sources] });
      continue;
    }
    const target = result[best.index];
    target.sources = [...target.sources, ...event.sources];
    target.updatedAt = Math.max(target.updatedAt, event.updatedAt);
    if (severity[event.severity] > severity[target.severity]) target.severity = event.severity;
    target.correlation = best.match;
  }
  return result.sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id));
}
