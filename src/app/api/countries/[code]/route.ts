import { findCountry } from '@/lib/countries';
import { getCountryIntelligence } from '@/lib/worldbank';
export const runtime = 'nodejs';
export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  if (!/^[a-z]{2,3}$/i.test(code))
    return Response.json({ error: 'Invalid country code' }, { status: 400 });
  const country = findCountry(code);
  if (!country) return Response.json({ error: 'Country not found' }, { status: 404 });
  const data = await getCountryIntelligence(country.iso3);
  return Response.json(data, {
    headers: {
      'Cache-Control':
        data.status === 'live'
          ? 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800'
          : 'no-store',
    },
  });
}
