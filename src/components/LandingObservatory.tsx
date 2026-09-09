'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Pause, Play } from 'lucide-react';
import { TYPE_META, type FeedResponse, type GlobalEvent } from '@/lib/types';
const Globe = dynamic(() => import('./Globe'), { ssr: false });
export default function LandingObservatory() {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [layer, setLayer] = useState('all');
  const [rotating, setRotating] = useState(true);
  const [selected, setSelected] = useState<GlobalEvent | null>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting) setMounted(true);
      },
      { rootMargin: '120px' },
    );
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!mounted) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    fetch('/api/events', { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: FeedResponse) => {
        if (!Array.isArray(data.events)) throw new Error();
        setFeed(data);
      })
      .catch(() => setFailed(true))
      .finally(() => clearTimeout(timeout));
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [mounted]);
  const events = (feed?.events ?? []).filter((e) => layer === 'all' || e.type === layer);
  return (
    <div className="observatory-preview" ref={host}>
      <div className="preview-top">
        <span className="preview-brand">
          NEXUS<span>.</span>
        </span>
        <span className="landing-label">OBSERVATORY / INTERACTIVE PREVIEW</span>
        <Link href="/live" aria-label="Open full workspace">
          <ArrowUpRight size={18} />
        </Link>
      </div>
      <div className="preview-main">
        <div className="preview-earth">
          {mounted && (
            <Globe
              events={events}
              selected={selected}
              focus={null}
              onSelect={setSelected}
              onCountry={() => {}}
              rotating={rotating}
              grid
              command={null}
              paused={!visible}
            />
          )}
          <div className="preview-earth-label">
            <span className="landing-label">GLOBAL FIELD OF VIEW</span>
            <h3>
              Earth, in real time<span>.</span>
            </h3>
          </div>
          <button
            className="preview-motion"
            onClick={() => setRotating((v) => !v)}
            aria-label={rotating ? 'Pause preview rotation' : 'Resume preview rotation'}
          >
            {rotating ? <Pause size={14} /> : <Play size={14} />}
          </button>
        </div>
        <div className="preview-panel">
          <p className="landing-label">EXPLORE / ANALYZE / UNDERSTAND</p>
          <h3>
            Same planet.
            <br />
            <span>More perspective.</span>
          </h3>
          <p>Drag to explore. Choose a layer. Select a signal to see where the story begins.</p>
          <div className="preview-layers" role="group" aria-label="Preview layers">
            {[
              ['all', 'All signals'],
              ['earthquake', 'Seismic'],
              ['wildfire', 'Wildfires'],
            ].map(([value, label]) => (
              <button
                key={value}
                aria-pressed={layer === value}
                onClick={() => {
                  setLayer(value);
                  setSelected(null);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="preview-reading">
            <span className="landing-label">OBSERVATIONS IN CATALOG</span>
            <strong>{feed ? events.length.toLocaleString() : '—'}</strong>
            <span>
              {failed
                ? 'Feeds unavailable'
                : feed
                  ? `${feed.sources.filter((s) => s.status === 'live').length}/${feed.sources.length} sources live`
                  : 'Connecting to public feeds'}
            </span>
          </div>
          {selected && (
            <Link
              className="preview-selection"
              href={`/live?event=${encodeURIComponent(selected.id)}`}
            >
              <span className="landing-label">{TYPE_META[selected.type].label}</span>
              <strong>{selected.title}</strong>Inspect observation <ArrowUpRight size={13} />
            </Link>
          )}
          <Link className="landing-text-link" href="/live">
            Open the full workspace <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
      <div className="preview-bottom">
        <span>NASA Black Marble · 2016 composite basemap</span>
        <span>Colored markers: current source catalog</span>
      </div>
    </div>
  );
}
