import { z } from 'zod';
import { fetchJson, sourceCache } from './cache';
import type { CountryIntelligence, Indicator } from './types';
const recordSchema = z.object({
  indicator: z.object({ id: z.string() }),
  date: z.string().regex(/^\d{4}$/),
  value: z.number().finite().nullable(),
});
export function normalizeWorldBank(
  input: unknown,
): Omit<CountryIntelligence, 'fetchedAt' | 'status'> {
  const outer = z
    .tuple([z.object({ pages: z.number() }).passthrough(), z.array(z.unknown())])
    .parse(input);
  const records = outer[1].flatMap((item) => {
    const result = recordSchema.safeParse(item);
    return result.success ? [result.data] : [];
  });
  if (!records.length) throw new Error('No valid World Bank indicators');
  const indicator = (id: string): Indicator => {
    const latest = records
      .filter((r) => r.indicator.id === id && r.value !== null)
      .sort((a, b) => Number(b.date) - Number(a.date))[0];
    return { value: latest?.value ?? null, year: latest?.date ?? null };
  };
  return {
    population: indicator('SP.POP.TOTL'),
    gdp: indicator('NY.GDP.MKTP.CD'),
    gdpPerCapita: indicator('NY.GDP.PCAP.CD'),
  };
}
export async function getCountryIntelligence(iso3: string): Promise<CountryIntelligence> {
  const result = await sourceCache.get(`wb:${iso3}`, 7 * 86_400_000, 30 * 86_400_000, async () =>
    normalizeWorldBank(
      await fetchJson(
        `https://api.worldbank.org/v2/country/${iso3}/indicator/SP.POP.TOTL;NY.GDP.MKTP.CD;NY.GDP.PCAP.CD?format=json&source=2&mrnev=1&per_page=100`,
      ),
    ),
  );
  const empty: Indicator = { value: null, year: null };
  return {
    ...(result.value ?? { population: empty, gdp: empty, gdpPerCapita: empty }),
    status: result.status,
    fetchedAt: result.fetchedAt,
  };
}
