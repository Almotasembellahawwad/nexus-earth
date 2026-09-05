export function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 6371.0088 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}
export function validCoordinates(lon: number, lat: number): boolean {
  return (
    Number.isFinite(lon) && Number.isFinite(lat) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
  );
}
export function safeUrl(input: unknown): string | undefined {
  if (typeof input !== 'string') return;
  try {
    const url = new URL(input);
    if (url.protocol !== 'https:' || url.username || url.password) return;
    return url.href;
  } catch {
    return;
  }
}
