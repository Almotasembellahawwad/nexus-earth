import { ADAPTERS, loadAdapter } from './adapters';
import { correlateEvents } from './correlation';
import { enrichCountry } from './countries';
import { calculatePulse } from './pulse';
import type { FeedResponse } from './types';
export async function getFeed(): Promise<FeedResponse> {
  const results = await Promise.all(ADAPTERS.map(loadAdapter));
  const events = correlateEvents(results.flatMap((r) => r.events).map(enrichCountry));
  const sources = results.map((r) => r.health);
  const fetchedAt = Date.now();
  return { events, sources, fetchedAt, pulse: calculatePulse(events, sources, fetchedAt) };
}
