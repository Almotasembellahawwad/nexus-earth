import { gzip } from 'node:zlib';
import { promisify } from 'node:util';
const gzipAsync = promisify(gzip);

// The monthly catalog is useful for instant local filtering but can exceed 1 MB.
// Explicit gzip keeps route-handler payloads small even on hosts that do not
// compress dynamic responses. Vary prevents serving gzip to unsupported clients.
export async function compressedJson(
  data: unknown,
  acceptEncoding: string | null,
  cacheControl: string,
): Promise<Response> {
  const json = JSON.stringify(data);
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': cacheControl,
    Vary: 'Accept-Encoding',
  };
  const acceptsGzip = (acceptEncoding ?? '').split(',').some((entry) => {
    const [name, ...params] = entry.trim().split(';');
    const quality = params.find((p) => p.trim().startsWith('q='));
    return name.trim() === 'gzip' && (!quality || Number(quality.trim().slice(2)) > 0);
  });
  if (!acceptsGzip || json.length < 1024) return new Response(json, { headers });
  return new Response(new Uint8Array(await gzipAsync(json)), {
    headers: { ...headers, 'Content-Encoding': 'gzip' },
  });
}
