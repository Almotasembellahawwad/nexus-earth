'use client';

import dynamic from 'next/dynamic';
import Modal from './Modal';
import EventDetails from './EventDetails';
import CountryDetails from './CountryDetails';
import InfoModal from './InfoModal';
import { ICONS } from './event-icons';
import { ago, utc } from '@/lib/format';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowDownUp,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Command,
  Earth,
  Focus,
  Globe2,
  Link2,
  LoaderCircle,
  Maximize2,
  Minus,
  Pause,
  Play,
  Plus,
  Radio,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { COUNTRIES } from '@/lib/countries';
import { decodeView, encodeView, type CameraView } from '@/lib/shared-view';
import { DEFAULT_FILTERS, filterEvents, parseCommand, type Filters } from '@/lib/filters';
import {
  EVENT_TYPES,
  TYPE_META,
  type Country,
  type CountryIntelligence,
  type EventType,
  type FeedResponse,
  type GlobalEvent,
} from '@/lib/types';
const Globe = dynamic(() => import('./Globe'), {
  ssr: false,
  loading: () => <div className="globe-loading">Initializing renderer…</div>,
});
const RANGES = [
  { label: '1H', hours: 1 },
  { label: '24H', hours: 24 },
  { label: '7D', hours: 168 },
  { label: '30D', hours: 720 },
];
export default function Workspace() {
  const [data, setData] = useState<FeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState(false);
  const [offline, setOffline] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [selected, setSelected] = useState<GlobalEvent | null>(null);
  const [country, setCountry] = useState<Country | null>(null);
  const [countryData, setCountryData] = useState<CountryIntelligence | null>(null);
  const [countryLoading, setCountryLoading] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [info, setInfo] = useState<'sources' | 'pulse' | null>(null);
  const [rotating, setRotating] = useState(true);
  const [grid, setGrid] = useState(true);
  const [globeCommand, setGlobeCommand] = useState<{
    action: 'in' | 'out' | 'reset';
    nonce: number;
  } | null>(null);
  const [cursor, setCursor] = useState(100);
  const [playing, setPlaying] = useState(false);
  const [mobileTab, setMobileTab] = useState<'earth' | 'events' | 'filters'>('earth');
  const [sort, setSort] = useState<'recent' | 'intensity'>('recent');
  const [feedLimit, setFeedLimit] = useState(60);
  const [expanded, setExpanded] = useState(false);
  const refreshRef = useRef<() => void>(() => {});
  const commandInput = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<CameraView | undefined>(undefined);
  const [initialCamera, setInitialCamera] = useState<CameraView>();
  const [sharedAnchor, setSharedAnchor] = useState<number>();
  const [shareUrl, setShareUrl] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const pendingEvent = useRef<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    pendingEvent.current = params.get('event');
    const view = decodeView(params.get('view'));
    if (view) {
      setFilters(view.filters);
      setCursor(view.cursor);
      setSharedAnchor(view.cursor < 100 ? view.anchor : undefined);
      setInitialCamera(view.camera);
      setGrid(view.grid);
      setRotating(false);
      if (view.country) setCountry(COUNTRIES.find((c) => c.code === view.country) ?? null);
    }
  }, []);

  useEffect(() => {
    let stopped = false,
      pending = false;
    let active: AbortController | null = null;
    const load = async () => {
      if (pending || stopped) return;
      pending = true;
      active = new AbortController();
      const timeout = setTimeout(() => active?.abort(), 25_000);
      try {
        const response = await fetch('/api/events', { signal: active.signal });
        if (!response.ok) throw new Error('Feed unavailable');
        const feed = (await response.json()) as FeedResponse;
        if (!Array.isArray(feed.events) || !Array.isArray(feed.sources) || !feed.pulse)
          throw new Error('Invalid feed');
        if (!stopped) {
          setData(feed);
          setNetworkError(false);
        }
      } catch {
        if (!stopped) setNetworkError(true);
      } finally {
        clearTimeout(timeout);
        pending = false;
        if (!stopped) setLoading(false);
      }
    };
    refreshRef.current = () => {
      setLoading(true);
      void load();
    };
    void load();
    setNow(Date.now());
    setOffline(!navigator.onLine);
    const interval = setInterval(() => {
      if (!document.hidden && navigator.onLine) void load();
    }, 60_000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    const online = () => {
      setOffline(false);
      void load();
    };
    const disconnected = () => setOffline(true);
    const visibility = () => {
      if (!document.hidden) void load();
    };
    window.addEventListener('online', online);
    window.addEventListener('offline', disconnected);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      stopped = true;
      active?.abort();
      clearInterval(interval);
      clearInterval(clock);
      window.removeEventListener('online', online);
      window.removeEventListener('offline', disconnected);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  useEffect(() => {
    const shortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, []);
  useEffect(() => {
    if (commandOpen) commandInput.current?.focus();
  }, [commandOpen]);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(
      () =>
        setCursor((c) => {
          if (c >= 100) {
            setPlaying(false);
            return 100;
          }
          return Math.min(100, c + 0.75);
        }),
      250,
    );
    return () => clearInterval(timer);
  }, [playing]);
  useEffect(() => {
    setCountryData(null);
    if (!country) return;
    const controller = new AbortController();
    let stopped = false;
    setCountryLoading(true);
    const timeout = setTimeout(() => controller.abort(), 20_000);
    fetch(`/api/countries/${country.code}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error('Unavailable');
        return r.json();
      })
      .then((d: CountryIntelligence) => {
        if (!stopped) setCountryData(d);
      })
      .catch(() => {
        if (!stopped) setCountryData(null);
      })
      .finally(() => {
        clearTimeout(timeout);
        if (!stopped) setCountryLoading(false);
      });
    return () => {
      stopped = true;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [country]);

  const anchor = sharedAnchor ?? data?.fetchedAt ?? now ?? 0;
  const asOf = anchor - filters.hours * 3_600_000 * (1 - cursor / 100);
  const events = useMemo(
    () =>
      filterEvents(
        data?.events ?? [],
        { ...filters, hours: filters.hours * Math.max(0.001, cursor / 100) },
        asOf,
      ),
    [data, filters, cursor, asOf],
  );
  const sortedEvents = useMemo(
    () =>
      [...events].sort(
        sort === 'recent'
          ? (a, b) => b.startedAt - a.startedAt || a.id.localeCompare(b.id)
          : (a, b) =>
              ({ critical: 4, high: 3, moderate: 2, low: 1, unknown: 0 })[b.severity] -
                { critical: 4, high: 3, moderate: 2, low: 1, unknown: 0 }[a.severity] ||
              (b.magnitude ?? 0) - (a.magnitude ?? 0),
      ),
    [events, sort],
  );
  useEffect(() => {
    if (selected && !events.some((event) => event.id === selected.id)) setSelected(null);
  }, [events, selected]);
  const typeCounts = useMemo(() => {
    const list = filterEvents(
      data?.events ?? [],
      { ...filters, types: [...EVENT_TYPES], query: '' },
      anchor,
    );
    return Object.fromEntries(
      EVENT_TYPES.map((type) => [type, list.filter((e) => e.type === type).length]),
    ) as Record<EventType, number>;
  }, [data, filters, anchor]);
  const histogram = useMemo(() => {
    const bins = Array.from({ length: 64 }, () => 0);
    const start = anchor - filters.hours * 3_600_000;
    for (const event of filterEvents(data?.events ?? [], filters, anchor)) {
      const index = Math.floor(((event.startedAt - start) / (anchor - start)) * 64);
      if (index >= 0 && index < 64) bins[index]++;
    }
    return bins;
  }, [data, filters, anchor]);
  const selectEvent = useCallback(
    (event: GlobalEvent) => {
      // Search/country panels span the catalog, not just the current filter.
      // Reveal a selected observation in the same view used by globe and stream.
      if (!events.some((visible) => visible.id === event.id)) {
        setFilters({ ...DEFAULT_FILTERS, types: [...EVENT_TYPES], hours: 720 });
        setCursor(100);
        setPlaying(false);
      }
      setSelected(event);
      setCountry(null);
      setRotating(false);
      setMobileTab('events');
    },
    [events],
  );
  const selectCountry = useCallback((c: Country) => {
    setInitialCamera(undefined);
    setCountry(c);
    setSelected(null);
    setRotating(false);
    setMobileTab('events');
    setCommandOpen(false);
  }, []);
  const updateFilters = (patch: Partial<Filters>) => {
    setSharedAnchor(undefined);
    setFilters((f) => ({ ...f, ...patch }));
    setCursor(100);
    setPlaying(false);
    setFeedLimit(60);
    setSelected(null);
  };
  const resetFilters = () => {
    setSharedAnchor(undefined);
    setFilters({ ...DEFAULT_FILTERS, types: [...EVENT_TYPES] });
    setCursor(100);
    setPlaying(false);
    setSelected(null);
  };
  const searchCountries = useMemo(
    () =>
      COUNTRIES.filter((c) =>
        `${c.name} ${c.code} ${c.iso3}`.toLowerCase().includes(search.toLowerCase()),
      ).slice(0, 6),
    [search],
  );
  const searchEvents = useMemo(
    () =>
      search.trim().length < 2
        ? []
        : filterEvents(data?.events ?? [], { ...DEFAULT_FILTERS, hours: 720 }, anchor)
            .filter((e) => `${e.title} ${e.type}`.toLowerCase().includes(search.toLowerCase()))
            .slice(0, 5),
    [search, data, anchor],
  );
  const parsedCommand = parseCommand(search);
  const applySearch = () => {
    if (parsedCommand) updateFilters(parsedCommand);
    else if (searchCountries.length === 1) selectCountry(searchCountries[0]);
    else updateFilters({ query: search });
    setCommandOpen(false);
  };
  const sourceCount = data?.sources.filter((s) => s.status === 'live').length ?? 0;
  const hasAnyData = data?.sources.some((s) => s.status !== 'unavailable') ?? false;
  const correlated = events.filter((e) => e.sources.length > 1).length;
  const high = events.filter((e) =>
    e.sources.some((s) => s.name === 'GDACS' && ['Orange', 'Red'].includes(s.officialAlert ?? '')),
  ).length;
  const countryEvents = country
    ? filterEvents(data?.events ?? [], { ...DEFAULT_FILTERS, hours: 720 }, anchor).filter(
        (e) => e.countryCode === country.code,
      )
    : [];
  const status = offline
    ? 'OFFLINE'
    : networkError
      ? 'CONNECTION LOST'
      : loading && !data
        ? 'CONNECTING'
        : sourceCount === 3
          ? 'LIVE FEEDS'
          : hasAnyData
            ? 'PARTIAL FEEDS'
            : 'FEEDS UNAVAILABLE';
  const chosenEvent = selected
    ? (data?.events.find((e) => e.id === selected.id) ?? selected)
    : null;
  useEffect(() => {
    if (!data || !pendingEvent.current) return;
    const event = data.events.find((e) => e.id === pendingEvent.current);
    pendingEvent.current = null;
    if (event) selectEvent(event);
  }, [data, selectEvent]);
  const shareView = () => {
    const url = new URL('/live', window.location.origin);
    url.searchParams.set(
      'view',
      encodeView({
        filters,
        cursor,
        anchor: cursor < 100 ? anchor : undefined,
        camera: cameraRef.current,
        country: country?.code,
        grid,
      }),
    );
    setShareUrl(url.toString());
    setCopyStatus('');
  };

  return (
    <div className={`workspace ${expanded ? 'expanded' : ''}`}>
      <a href="#event-stream" className="skip-link">
        Skip to event stream
      </a>
      <header className="topbar">
        <a href="/" className="brand" aria-label="NEXUS home">
          <span className="brand-mark">
            <span />
            <span />
            <span />
          </span>
          NEXUS<span className="brand-period">.</span>
        </a>
        <span className="brand-descriptor">EARTH INTELLIGENCE</span>
        <nav className="topnav" aria-label="Workspace navigation">
          <button
            className="topnav-active"
            onClick={() => {
              setInfo(null);
              setCountry(null);
              setSelected(null);
              setMobileTab('earth');
            }}
          >
            Overview
          </button>
          <button onClick={() => setInfo('sources')}>
            Data sources <ArrowUpRight size={12} />
          </button>
        </nav>
        <div className="topbar-end">
          <button className="icon-button" onClick={shareView} aria-label="Share current view">
            <Link2 size={17} />
          </button>
          <button
            className="search-trigger"
            onClick={() => {
              setCommandOpen(true);
              setSearch('');
            }}
          >
            <Search size={15} />
            <span>Explore the planet</span>
            <kbd>⌘ K</kbd>
          </button>
          <span
            className={`connection ${sourceCount < 3 || offline || networkError ? 'degraded' : ''}`}
          >
            <i />
            {status}
          </span>
          <button
            className="icon-button help-button"
            onClick={() => setInfo('pulse')}
            aria-label="About NEXUS"
          >
            <CircleHelp size={19} />
          </button>
        </div>
      </header>

      <div className="workspace-body">
        <aside className="rail" aria-label="Workspace tools">
          <button
            className={`rail-button ${mobileTab === 'earth' ? 'active' : ''}`}
            onClick={() => {
              setMobileTab('earth');
              setExpanded(false);
            }}
            aria-label="Earth view"
          >
            <Earth size={21} />
          </button>
          <button
            className={`rail-button ${mobileTab === 'events' ? 'active' : ''}`}
            onClick={() => {
              setMobileTab('events');
              setSelected(null);
              setCountry(null);
              document.getElementById('event-stream')?.focus();
            }}
            aria-label="Event stream"
          >
            <Radio size={20} />
          </button>
          <button
            className={`rail-button ${mobileTab === 'filters' ? 'active' : ''}`}
            onClick={() => {
              setMobileTab('filters');
              document.getElementById('category-title')?.focus();
            }}
            aria-label="Event filters"
          >
            <SlidersHorizontal size={20} />
          </button>
          <div className="rail-bottom">
            <button
              className="rail-button"
              onClick={() => setInfo('sources')}
              aria-label="Source health"
            >
              <ShieldCheck size={20} />
            </button>
            <span className="rail-version">V.01</span>
          </div>
        </aside>

        <aside className={`filter-panel ${mobileTab === 'filters' ? 'mobile-visible' : ''}`}>
          <div className="panel-intro">
            <span className="eyebrow">THE PLANET, IN PERSPECTIVE</span>
            <h1>
              Global overview<span>Live Earth intelligence.</span>
            </h1>
            <div className="overview-date">
              {now
                ? new Date(now).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    timeZone: 'UTC',
                  })
                : 'Establishing connection'}
            </div>
          </div>
          <button className="pulse-card" onClick={() => setInfo('pulse')}>
            <div className="pulse-top">
              <span>
                <Activity size={14} /> NEXUS PULSE
              </span>
              <ArrowUpRight size={14} />
            </div>
            <div className="pulse-value">
              {data?.pulse.value ?? '—'}
              <span>/ 100</span>
              <span className="pulse-mini-chart">
                {(data?.pulse.components ?? []).map((c) => (
                  <i key={c.name} style={{ height: `${Math.max(4, c.value * 0.55)}px` }} />
                ))}
              </span>
            </div>
            <div className="pulse-label">
              <i />
              {data?.pulse.label ?? 'AWAITING DATA'}
              <span>24H</span>
            </div>
            <p>Global activity. Measured, not predicted.</p>
          </button>
          <section className="categories">
            <div className="section-label">
              <h2 id="category-title" tabIndex={-1}>
                EVENT LAYERS
              </h2>
              <button
                onClick={() =>
                  updateFilters({
                    types: filters.types.length === EVENT_TYPES.length ? [] : [...EVENT_TYPES],
                  })
                }
              >
                {filters.types.length === EVENT_TYPES.length ? 'Clear' : 'Select all'}
              </button>
            </div>
            {EVENT_TYPES.map((type) => {
              const Icon = ICONS[type];
              return (
                <button
                  key={type}
                  className={`category-row ${filters.types.includes(type) ? 'enabled' : ''}`}
                  aria-pressed={filters.types.includes(type)}
                  onClick={() =>
                    updateFilters({
                      types: filters.types.includes(type)
                        ? filters.types.filter((t) => t !== type)
                        : [...filters.types, type],
                    })
                  }
                >
                  <span className="category-icon" style={{ color: TYPE_META[type].color }}>
                    <Icon size={17} />
                  </span>
                  <span>{TYPE_META[type].plural}</span>
                  <span className="category-count">{data ? typeCounts[type] : '—'}</span>
                  <span className="checkbox">
                    {filters.types.includes(type) && <Check size={10} />}
                  </span>
                </button>
              );
            })}
          </section>
          <section className="refine">
            <div className="section-label">
              <h2>REFINE VIEW</h2>
              <Settings2 size={13} />
            </div>
            <label className="filter-label" htmlFor="magnitude">
              Minimum magnitude <strong>M {filters.minMagnitude.toFixed(1)}+</strong>
            </label>
            <input
              id="magnitude"
              type="range"
              min="2.5"
              max="7"
              step="0.5"
              value={filters.minMagnitude}
              onChange={(e) => updateFilters({ minMagnitude: Number(e.target.value) })}
            />
            <div className="range-ticks">
              <span>2.5</span>
              <span>4.5</span>
              <span>7.0+</span>
            </div>
            <label className="select-field">
              <span>Severity</span>
              <select
                value={filters.severity}
                onChange={(e) => updateFilters({ severity: e.target.value as Filters['severity'] })}
              >
                <option value="all">All levels</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="moderate">Moderate</option>
                <option value="low">Low</option>
                <option value="unknown">Unclassified</option>
              </select>
            </label>
            <label className="select-field">
              <span>Region</span>
              <select
                value={filters.region}
                onChange={(e) => updateFilters({ region: e.target.value })}
              >
                <option value="all">Worldwide</option>
                {['Africa', 'Americas', 'Asia', 'Europe', 'Oceania', 'Antarctic'].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <button className="reset-filters" onClick={resetFilters}>
              <RotateCcw size={12} /> Reset filters
            </button>
          </section>
          <div className="filter-footer">
            <span className="tiny-cross">+</span>
            <p>
              One planet.
              <br />
              <strong>A clearer picture.</strong>
            </p>
            <span className="orbit-decoration">◎</span>
          </div>
        </aside>

        <main className="earth-workspace">
          <div className="earth-heading">
            <div>
              <span className="eyebrow">
                OBSERVATION DECK <span className="muted">/ 01</span>
              </span>
              <h2>
                Earth, in real time
                <span className="live-dot" />
              </h2>
              <p className="observatory-intro">A continuous portrait of a world in motion.</p>
            </div>
            <div className="earth-heading-right">
              <span>GLOBAL COVERAGE</span>
              <span>
                <i /> {now ? new Date(now).toISOString().slice(11, 19) : '00:00:00'} <b>UTC</b>
              </span>
            </div>
            <button
              className="mobile-pulse"
              onClick={() => setInfo('pulse')}
              aria-label="NEXUS Pulse methodology"
            >
              <span>
                <Activity size={11} /> PULSE
              </span>
              <strong>
                {data?.pulse.value ?? '—'}
                <small>/100</small>
              </strong>
            </button>
          </div>
          {(networkError || offline) && (
            <div className="connection-banner" role="status">
              {offline ? 'You’re offline.' : 'Connection interrupted.'}{' '}
              {data ? 'Showing the last received observations.' : 'Live data could not be loaded.'}
              <button onClick={() => refreshRef.current()}>Retry</button>
            </div>
          )}
          {filters.query && (
            <div className="search-chip">
              Search: {filters.query}
              <button onClick={() => updateFilters({ query: '' })} aria-label="Clear search">
                <X size={12} />
              </button>
            </div>
          )}
          <div className="globe-stage">
            <div className="globe-coordinate north">90° N</div>
            <div className="globe-coordinate south">90° S</div>
            <div className="globe-coordinate west">180° W</div>
            <div className="globe-coordinate east">180° E</div>
            <div className="orbital-frame" />
            <Globe
              initialCamera={initialCamera}
              onCameraChange={(camera) => {
                cameraRef.current = camera;
              }}
              events={events}
              selected={chosenEvent}
              focus={initialCamera ? null : country}
              onSelect={selectEvent}
              onCountry={selectCountry}
              rotating={rotating}
              grid={grid}
              command={globeCommand}
            />
            <div className="view-mode">
              <span className="small-dot" />
              {cursor < 100 ? 'REPLAY MODE' : 'LIVE OBSERVATIONS'}
              <span className="view-divider" />
              3D EARTH
            </div>
            <div className="globe-controls">
              <button
                onClick={() => setGlobeCommand({ action: 'in', nonce: Date.now() })}
                aria-label="Zoom in"
              >
                <Plus size={17} />
              </button>
              <button
                onClick={() => setGlobeCommand({ action: 'out', nonce: Date.now() })}
                aria-label="Zoom out"
              >
                <Minus size={17} />
              </button>
              <span />
              <button
                onClick={() => {
                  setInitialCamera(undefined);
                  setSelected(null);
                  setCountry(null);
                  setGlobeCommand({ action: 'reset', nonce: Date.now() });
                }}
                aria-label="Reset globe view"
              >
                <Focus size={17} />
              </button>
              <button
                onClick={() => setGrid((v) => !v)}
                aria-label="Toggle coordinate grid"
                aria-pressed={grid}
              >
                <Globe2 size={17} />
              </button>
              <button
                onClick={() => setExpanded((v) => !v)}
                aria-label="Expand Earth view"
                aria-pressed={expanded}
              >
                <Maximize2 size={16} />
              </button>
            </div>
            <div className="earth-caption">
              <span>
                <span className="small-dot" /> {events.length.toLocaleString()} events in view
              </span>
              <span>
                Drag to rotate <b>·</b> Scroll to explore
              </span>
            </div>
            <button
              className={`rotation-toggle ${rotating ? 'on' : ''}`}
              onClick={() => {
                setRotating((v) => !v);
                if (!rotating) setSelected(null);
              }}
              aria-pressed={rotating}
            >
              {rotating ? <Pause size={11} /> : <Play size={11} />} AUTO-ROTATE
            </button>
          </div>
          <div className="observation-stats">
            <div>
              <span className="stat-icon amber">
                <Activity size={17} />
              </span>
              <div>
                <span>EVENTS IN VIEW</span>
                <strong>
                  {data ? events.length.toLocaleString() : '—'} <small>observations</small>
                </strong>
              </div>
            </div>
            <div>
              <span className="stat-icon coral">
                <Radio size={17} />
              </span>
              <div>
                <span>MAJOR ALERTS</span>
                <strong>
                  {data ? high : '—'} <small>GDACS orange / red</small>
                </strong>
              </div>
            </div>
            <div>
              <span className="stat-icon mint">
                <Link2 size={17} />
              </span>
              <div>
                <span>CORRELATED</span>
                <strong>
                  {data ? correlated : '—'} <small>multiple sources</small>
                </strong>
              </div>
            </div>
          </div>
          <section className="timeline" aria-label="Time exploration">
            <div className="timeline-top">
              <div className="timeline-title">
                <button
                  className="play-button"
                  aria-label={playing ? 'Pause replay' : 'Play replay'}
                  onClick={() => {
                    if (cursor === 100) setCursor(0);
                    setPlaying((v) => !v);
                  }}
                >
                  {playing ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <span>
                  TIME EXPLORER
                  <small>
                    {cursor === 100 ? 'Recent observations & ongoing events' : utc(asOf)}
                  </small>
                </span>
              </div>
              <div className="time-ranges">
                {RANGES.map((r) => (
                  <button
                    key={r.label}
                    className={filters.hours === r.hours ? 'active' : ''}
                    onClick={() => updateFilters({ hours: r.hours })}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <button
                className={`live-return ${cursor === 100 ? 'active' : ''}`}
                onClick={() => {
                  setSharedAnchor(undefined);
                  setCursor(100);
                  setPlaying(false);
                }}
              >
                <i />
                LIVE
              </button>
            </div>
            <div className="histogram-wrap">
              <div className="histogram" aria-hidden="true">
                {histogram.map((count, i) => (
                  <i
                    key={i}
                    style={{
                      height: `${Math.max(3, (count / Math.max(1, ...histogram)) * 100)}%`,
                      opacity: (i / 64) * 100 <= cursor ? 1 : 0.2,
                    }}
                  />
                ))}
              </div>
              <input
                aria-label="Replay position"
                className="timeline-slider"
                type="range"
                min="0"
                max="100"
                step="0.25"
                value={cursor}
                onChange={(e) => {
                  setCursor(Number(e.target.value));
                  setPlaying(false);
                }}
              />
              <div className="timeline-cursor" style={{ left: `${cursor}%` }} />
            </div>
            <div className="timeline-labels">
              <span>{anchor ? utc(anchor - filters.hours * 3_600_000) : '—'}</span>
              <span>Occurrence counts · latest known positions</span>
              <span>NOW</span>
            </div>
          </section>
        </main>

        <aside className={`stream-panel ${mobileTab === 'events' ? 'mobile-visible' : ''}`}>
          {chosenEvent ? (
            <EventDetails
              event={chosenEvent}
              onClose={() => setSelected(null)}
              onCountry={selectCountry}
            />
          ) : country ? (
            <CountryDetails
              country={country}
              countryData={countryData}
              countryLoading={countryLoading}
              countryEvents={countryEvents}
              anchor={anchor}
              onClose={() => setCountry(null)}
              selectEvent={selectEvent}
            />
          ) : (
            <>
              <div className="stream-header">
                <div>
                  <span className="small-dot" />
                  <h2 id="event-stream" tabIndex={-1}>
                    Event stream
                  </h2>
                </div>
                <span className="count-badge">{events.length}</span>
              </div>
              <div className="stream-subheader">
                <span>{cursor < 100 ? 'REPLAY OBSERVATIONS' : 'LATEST OBSERVATIONS'}</span>
                <button onClick={() => setSort((s) => (s === 'recent' ? 'intensity' : 'recent'))}>
                  <ArrowDownUp size={11} />
                  {sort === 'recent' ? 'Recent' : 'Intensity'}
                  <ChevronDown size={11} />
                </button>
              </div>
              <div className="feed-list">
                {loading && !data ? (
                  <div className="feed-state">
                    <LoaderCircle size={24} className="spin" />
                    <h3>Listening to the planet</h3>
                    <p>Connecting to public observation networks.</p>
                    <div className="skeleton" />
                    <div className="skeleton" />
                    <div className="skeleton" />
                  </div>
                ) : !hasAnyData ? (
                  <div className="feed-state">
                    <Radio size={27} />
                    <h3>Waiting for observations</h3>
                    <p>
                      The public feeds are temporarily unavailable. NEXUS will retry automatically.
                    </p>
                    <button onClick={() => refreshRef.current()}>Retry connection</button>
                  </div>
                ) : !events.length ? (
                  <div className="feed-state">
                    <Search size={27} />
                    <h3>A quieter view</h3>
                    <p>No observations match these filters and this point in time.</p>
                    <button onClick={resetFilters}>Reset view</button>
                  </div>
                ) : (
                  sortedEvents.slice(0, feedLimit).map((event) => {
                    const Icon = ICONS[event.type];
                    return (
                      <button
                        className="event-card"
                        key={event.id}
                        onClick={() => selectEvent(event)}
                      >
                        <span className="event-icon" style={{ color: TYPE_META[event.type].color }}>
                          <Icon size={17} />
                        </span>
                        <span className="event-content">
                          <span
                            className="event-type"
                            style={{ color: TYPE_META[event.type].color }}
                          >
                            {event.magnitude !== undefined && <b>M{event.magnitude.toFixed(1)} </b>}
                            {TYPE_META[event.type].label}
                            <span className="event-age">{ago(event.startedAt, now ?? anchor)}</span>
                          </span>
                          <strong className="event-title">{event.title}</strong>
                          <span className="event-meta">
                            <span>
                              {event.sources
                                .map((s) => (s.name === 'EONET' ? 'NASA' : s.name))
                                .join(' + ')}
                              {event.sources.length > 1 && <Link2 size={9} />}
                            </span>
                            <span>
                              {event.ongoing
                                ? 'OPEN'
                                : event.severity === 'high' || event.severity === 'critical'
                                  ? 'NOTABLE'
                                  : 'OBSERVED'}
                            </span>
                          </span>
                        </span>
                        <ChevronRight size={13} className="event-chevron" />
                      </button>
                    );
                  })
                )}
                {events.length > feedLimit && (
                  <button className="load-more" onClick={() => setFeedLimit((n) => n + 60)}>
                    Show 60 more <ChevronDown size={13} />
                  </button>
                )}
              </div>
              <div className="stream-footer">
                <span className="small-dot" />
                Refreshes every 60 seconds
                <button
                  className="icon-button"
                  onClick={() => refreshRef.current()}
                  aria-label="Refresh observations"
                >
                  <RotateCcw size={12} className={loading ? 'spin' : ''} />
                </button>
              </div>
            </>
          )}
        </aside>
      </div>
      <footer className="statusbar">
        <span>
          <span className="nexus-status-mark">⌁</span> PLANETARY OBSERVATION NETWORK
        </span>
        <div>
          {data?.sources.map((s) => (
            <button key={s.name} onClick={() => setInfo('sources')}>
              <i className={s.status} />
              {s.name === 'EONET' ? 'NASA EONET' : s.name}
              <span>{s.status === 'live' ? 'CONNECTED' : s.status.toUpperCase()}</span>
            </button>
          ))}
        </div>
        <span className="status-disclaimer">
          Independent visualization · Not an emergency warning system <ArrowUpRight size={10} />
        </span>
      </footer>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        <button
          className={mobileTab === 'earth' ? 'active' : ''}
          onClick={() => setMobileTab('earth')}
        >
          <Earth size={18} />
          Earth
        </button>
        <button
          className={mobileTab === 'events' ? 'active' : ''}
          onClick={() => setMobileTab('events')}
        >
          <Radio size={18} />
          Events <small>{events.length}</small>
        </button>
        <button
          className={mobileTab === 'filters' ? 'active' : ''}
          onClick={() => setMobileTab('filters')}
        >
          <SlidersHorizontal size={18} />
          Filters
        </button>
        <button
          onClick={() => {
            setSearch('');
            setCommandOpen(true);
          }}
        >
          <Search size={18} />
          Search
        </button>
      </nav>

      <Modal
        open={commandOpen}
        close={() => setCommandOpen(false)}
        title="EXPLORE NEXUS"
        className="command-modal"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            applySearch();
          }}
        >
          <div className="command-input">
            <Search size={20} />
            <input
              ref={commandInput}
              aria-label="Search countries, events or commands"
              placeholder="A country, an event, a new perspective…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
            />
            <kbd>↵</kbd>
          </div>
        </form>
        {parsedCommand && (
          <div className="command-group">
            <h3>QUICK ACTION</h3>
            <button onClick={applySearch}>
              <Command size={16} />
              <span>Apply “{search}”</span>
              <ArrowRight size={15} />
            </button>
          </div>
        )}
        <div className="command-group">
          <h3>COUNTRIES</h3>
          {searchCountries.map((c) => (
            <button key={c.code} onClick={() => selectCountry(c)}>
              <Globe2 size={16} />
              <span>
                {c.name}
                <small>{c.region}</small>
              </span>
              <span className="country-code">{c.code}</span>
            </button>
          ))}
        </div>
        {searchEvents.length > 0 && (
          <div className="command-group">
            <h3>OBSERVATIONS</h3>
            {searchEvents.map((e) => (
              <button
                key={e.id}
                onClick={() => {
                  selectEvent(e);
                  setCommandOpen(false);
                }}
              >
                <Activity size={16} />
                <span>{e.title}</span>
                <ArrowUpRight size={13} />
              </button>
            ))}
          </div>
        )}
        {!search && (
          <div className="command-suggestions">
            Try{' '}
            {['M6+', 'Volcanoes', 'Last 7 days', 'Japan'].map((q) => (
              <button key={q} onClick={() => setSearch(q)}>
                {q}
              </button>
            ))}
          </div>
        )}
        {search && !parsedCommand && (
          <button className="search-all" onClick={applySearch}>
            Filter the stream for “{search}”<ArrowRight size={14} />
          </button>
        )}
        <div className="command-footer">
          Search uses source text and structured commands. <span>ESC to close</span>
        </div>
      </Modal>

      <Modal
        open={!!shareUrl}
        close={() => setShareUrl('')}
        title="Share current view"
        className="share-modal"
      >
        <div className="share-content">
          <p>
            Share your filters, globe position and time selection. Live views refresh with the
            feeds; replay links use the saved time against the currently available catalog, not an
            archived snapshot.
          </p>
          <label htmlFor="shared-view-url">View link</label>
          <input
            id="shared-view-url"
            readOnly
            value={shareUrl}
            onFocus={(e) => e.currentTarget.select()}
          />
          <button
            className="share-copy"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(shareUrl);
                setCopyStatus('Link copied');
              } catch {
                setCopyStatus('Select the link above and copy it manually.');
              }
            }}
          >
            Copy link
          </button>
          <p role="status">{copyStatus}</p>
        </div>
      </Modal>
      <InfoModal info={info} data={data} onClose={() => setInfo(null)} />
    </div>
  );
}
