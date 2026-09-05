'use client';
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="error-page">
      <span className="eyebrow">NEXUS / CONNECTION INTERRUPTED</span>
      <h1>The observation deck needs a moment.</h1>
      <p>
        An unexpected application error occurred. Your browser can reconnect without changing any
        data.
      </p>
      <button onClick={reset}>Reconnect to NEXUS</button>
    </main>
  );
}
