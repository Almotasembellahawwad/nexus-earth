'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { TYPE_META, type FeedResponse } from '@/lib/types';
export default function LandingSnapshot() {
  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    fetch('/api/events', { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: FeedResponse) => {
        if (!Array.isArray(data.events) || !Array.isArray(data.sources)) throw new Error();
        setFeed(data);
      })
      .catch(() => setFailed(true))
      .finally(() => clearTimeout(timeout));
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);
  const events = [...(feed?.events ?? [])].sort((a, b) => b.startedAt - a.startedAt).slice(0, 3);
  const live = feed?.sources.filter((s) => s.status === 'live').length ?? 0;
  return (
    <div className="landing-snapshot">
      <p className="landing-feed-status" role="status">
        {failed
          ? 'Feeds unavailable — open the observatory for source status.'
          : !feed
            ? 'Connecting to public observation feeds…'
            : `${live}/${feed.sources.length} sources live · Snapshot ${new Date(feed.fetchedAt).toISOString().replace('T', ' ').slice(0, 16)} UTC`}
      </p>
      <div className="landing-event-list">
        {events.map((event, i) => (
          <Link
            key={event.id}
            href={`/live?event=${encodeURIComponent(event.id)}`}
            className="landing-event"
          >
            <span className="landing-event-index">0{i + 1}</span>
            <div>
              <span className="landing-label" style={{ color: TYPE_META[event.type].color }}>
                {TYPE_META[event.type].label}
              </span>
              <h3>{event.title}</h3>
              <p>
                {event.sources.map((s) => s.name).join(' / ')}
                <span>
                  Observed {new Date(event.startedAt).toISOString().replace('T', ' ').slice(0, 16)}{' '}
                  UTC
                </span>
              </p>
            </div>
            <ArrowUpRight size={19} />
          </Link>
        ))}
      </div>
      {feed && events.length === 0 && (
        <p className="landing-empty">
          No observations available in this snapshot. Source coverage may be incomplete.
        </p>
      )}
      {feed && live < feed.sources.length && (
        <p className="landing-empty">Partial coverage. Some sources are delayed or unavailable.</p>
      )}
    </div>
  );
}
