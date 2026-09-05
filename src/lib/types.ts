export const EVENT_TYPES = [
  'earthquake',
  'wildfire',
  'volcano',
  'storm',
  'flood',
  'drought',
  'iceberg',
  'other',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];
export type SourceName = 'USGS' | 'EONET' | 'GDACS';
export type Severity = 'low' | 'moderate' | 'high' | 'critical' | 'unknown';
export interface EventSource {
  name: SourceName;
  id: string;
  url?: string;
  updatedAt: number;
  officialAlert?: string;
}
export interface GlobalEvent {
  id: string;
  type: EventType;
  title: string;
  latitude: number;
  longitude: number;
  startedAt: number;
  updatedAt: number;
  endedAt?: number;
  ongoing: boolean;
  severity: Severity;
  magnitude?: number;
  depthKm?: number;
  countryCode?: string;
  countryName?: string;
  region?: string;
  description?: string;
  sources: EventSource[];
  correlation?: { score: number; distanceKm: number; timeDeltaMinutes: number; method: string };
}
export interface SourceHealth {
  name: SourceName;
  status: 'live' | 'stale' | 'unavailable';
  fetchedAt: number | null;
  count: number;
  rejected: number;
  message?: string;
  coverage: string;
}
export interface FeedResponse {
  events: GlobalEvent[];
  sources: SourceHealth[];
  fetchedAt: number;
  pulse: Pulse;
}
export interface Pulse {
  value: number | null;
  label: string;
  components: { name: string; value: number; weight: number }[];
  coverage: number;
}
export interface Country {
  code: string;
  iso3: string;
  numeric: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
}
export interface Indicator {
  value: number | null;
  year: string | null;
}
export interface CountryIntelligence {
  population: Indicator;
  gdp: Indicator;
  gdpPerCapita: Indicator;
  fetchedAt: number | null;
  status: 'live' | 'stale' | 'unavailable';
}
export const TYPE_META: Record<EventType, { label: string; color: string; plural: string }> = {
  earthquake: { label: 'Earthquake', plural: 'Earthquakes', color: '#e9b36b' },
  wildfire: { label: 'Wildfire', plural: 'Wildfires', color: '#ee806c' },
  volcano: { label: 'Volcano', plural: 'Volcanoes', color: '#b299e0' },
  storm: { label: 'Storm', plural: 'Storms & cyclones', color: '#70b9e3' },
  flood: { label: 'Flood', plural: 'Floods', color: '#67c9bd' },
  drought: { label: 'Drought', plural: 'Droughts', color: '#d2c38a' },
  iceberg: { label: 'Iceberg', plural: 'Icebergs', color: '#a5dce8' },
  other: { label: 'Other', plural: 'Other events', color: '#a5afb9' },
};
