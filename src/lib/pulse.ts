import type { GlobalEvent, Pulse, SourceHealth } from './types';
const logScale = (value: number, reference: number) =>
  Math.min(100, (100 * Math.log1p(Math.max(0, value))) / Math.log1p(reference));
// Pulse v1 is a descriptive activity index, not risk or a historical percentile.
// Fixed reference caps + logarithms keep volume-heavy feeds from dominating.
// Compute on the rolling 24h full dataset, independent of the user's filters.
// Missing sources retain their weights (no misleading inflation); expose coverage.
export function calculatePulse(events: GlobalEvent[], sources: SourceHealth[], now: number): Pulse {
  const available = sources.filter((s) => s.status !== 'unavailable').length;
  const coverage = Math.round((available / 3) * 100);
  if (!available) return { value: null, label: 'UNAVAILABLE', components: [], coverage: 0 };
  const recent = events.filter(
    (e) =>
      e.startedAt <= now &&
      (e.type === 'earthquake'
        ? e.startedAt >= now - 86_400_000
        : e.updatedAt >= now - 86_400_000 || (e.ongoing && (!e.endedAt || e.endedAt > now))),
  );
  const quakes = recent.filter((e) => e.type === 'earthquake' && e.startedAt >= now - 86_400_000);
  const energyProxy = quakes.reduce(
    (sum, e) => sum + Math.pow(Math.max(0, (e.magnitude ?? 2.5) - 2), 2),
    0,
  );
  const alerts = recent.reduce(
    (sum, e) =>
      sum +
      (e.sources.some((s) => s.name === 'GDACS')
        ? { critical: 8, high: 4, moderate: 1, low: 0.25, unknown: 0 }[e.severity]
        : 0),
    0,
  );
  const natural = recent.filter(
    (e) => e.sources.some((s) => s.name === 'EONET') && e.ongoing,
  ).length;
  const cells = new Set(
    recent.map(
      (e) => `${Math.floor((e.latitude + 90) / 30)}:${Math.floor((e.longitude + 180) / 30)}`,
    ),
  ).size;
  const components = [
    { name: 'Seismic activity', value: logScale(energyProxy, 1000), weight: 0.35 },
    { name: 'Disaster alerts', value: logScale(alerts, 100), weight: 0.3 },
    { name: 'Active natural events', value: logScale(natural, 300), weight: 0.2 },
    { name: 'Geographical spread', value: Math.min(100, (cells / 40) * 100), weight: 0.15 },
  ];
  const value = Math.round(components.reduce((sum, c) => sum + c.value * c.weight, 0));
  return {
    value,
    label:
      coverage < 100
        ? 'PARTIAL DATA'
        : sources.some((s) => s.status === 'stale')
          ? 'STALE DATA'
          : value < 30
            ? 'QUIET'
            : value < 60
              ? 'MODERATE'
              : value < 80
                ? 'ELEVATED'
                : 'HIGH ACTIVITY',
    components,
    coverage,
  };
}
