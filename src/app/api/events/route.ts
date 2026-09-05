import { getFeed } from '@/lib/pipeline';
import { compressedJson } from '@/lib/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const feed = await getFeed();
  return compressedJson(
    feed,
    request.headers.get('Accept-Encoding'),
    'public, max-age=15, s-maxage=30, stale-while-revalidate=30',
  );
}
