import { DEFAULT_FILTERS, type Filters } from './filters';
import { EVENT_TYPES } from './types';
export type CameraView = [number, number, number];
export interface SharedView {
  filters: Filters;
  cursor: number;
  anchor?: number;
  camera?: CameraView;
  country?: string;
  grid: boolean;
}
export function decodeView(raw: string | null): SharedView | null {
  if (!raw || raw.length > 4000) return null;
  try {
    const v = JSON.parse(raw);
    if (v.v !== 1 || !v.filters || !Array.isArray(v.filters.types)) return null;
    const f = v.filters;
    const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
    if (
      !f.types.every((t: never) => EVENT_TYPES.includes(t)) ||
      ![1, 24, 168, 720].includes(f.hours) ||
      !finite(f.minMagnitude) ||
      f.minMagnitude < 0 ||
      f.minMagnitude > 10 ||
      !['all', 'low', 'moderate', 'high', 'critical', 'unknown'].includes(f.severity) ||
      !['all', 'Africa', 'Americas', 'Asia', 'Europe', 'Oceania', 'Antarctica'].includes(
        f.region,
      ) ||
      typeof f.query !== 'string' ||
      f.query.length > 200 ||
      !finite(v.cursor) ||
      v.cursor < 0 ||
      v.cursor > 100
    )
      return null;
    const camera =
      Array.isArray(v.camera) &&
      v.camera.length === 3 &&
      v.camera.every(finite) &&
      Math.hypot(...v.camera) >= 1.5 &&
      Math.hypot(...v.camera) <= 5.01
        ? (v.camera as CameraView)
        : undefined;
    return {
      filters: { ...DEFAULT_FILTERS, ...f, types: [...new Set(f.types)] } as Filters,
      cursor: v.cursor,
      anchor:
        finite(v.anchor) && v.anchor > 0 && v.anchor <= Date.now() + 60000 ? v.anchor : undefined,
      camera,
      country:
        typeof v.country === 'string' && /^[A-Z]{2}$/.test(v.country) ? v.country : undefined,
      grid: v.grid !== false,
    };
  } catch {
    return null;
  }
}
export function encodeView(view: SharedView): string {
  return JSON.stringify({ v: 1, ...view });
}
