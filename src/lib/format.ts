export function ago(time: number, now: number) {
  const m = Math.max(0, Math.floor((now - time) / 60_000));
  return m < 1
    ? 'just now'
    : m < 60
      ? `${m}m ago`
      : m < 1440
        ? `${Math.floor(m / 60)}h ago`
        : `${Math.floor(m / 1440)}d ago`;
}
export function utc(time: number) {
  return (
    new Date(time).toLocaleString('en-GB', {
      timeZone: 'UTC',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }) + ' UTC'
  );
}
export function compact(value: number | null, currency = false) {
  return value === null
    ? 'Unavailable'
    : (currency ? '$' : '') +
        new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(
          value,
        );
}
