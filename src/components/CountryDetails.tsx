'use client';
import { ArrowUpRight, ChevronLeft, ExternalLink, LoaderCircle, X } from 'lucide-react';
import { TYPE_META, type Country, type CountryIntelligence, type GlobalEvent } from '@/lib/types';
import { compact } from '@/lib/format';
export default function CountryDetails({
  country,
  countryData,
  countryLoading,
  countryEvents,
  anchor,
  onClose,
  selectEvent,
}: {
  country: Country;
  countryData: CountryIntelligence | null;
  countryLoading: boolean;
  countryEvents: GlobalEvent[];
  anchor: number;
  onClose: () => void;
  selectEvent: (event: GlobalEvent) => void;
}) {
  return (
    <>
      <div className="stream-header">
        <button className="back-button" onClick={() => onClose()}>
          <ChevronLeft size={15} /> Global stream
        </button>
        <button
          className="icon-button"
          onClick={() => onClose()}
          aria-label="Close country intelligence"
        >
          <X size={16} />
        </button>
      </div>
      <div className="detail-scroll">
        <span className="eyebrow">COUNTRY INTELLIGENCE / {country.code}</span>
        <h2 className="country-title">{country.name}</h2>
        <p className="country-region">
          {country.region} <span>·</span> {country.latitude}°, {country.longitude}°
        </p>
        <div className="country-indicators">
          {countryLoading ? (
            <div className="country-loading">
              <LoaderCircle className="spin" size={20} />
              Retrieving World Bank indicators…
            </div>
          ) : (
            <>
              {(
                [
                  ['Population', countryData?.population, false],
                  ['GDP · current US$', countryData?.gdp, true],
                  ['GDP per capita · current US$', countryData?.gdpPerCapita, true],
                ] as const
              ).map(([label, indicator, currency]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{compact(indicator?.value ?? null, currency)}</strong>
                  <small>
                    {indicator?.year ? `${indicator.year} · World Bank` : 'Source data unavailable'}
                  </small>
                </div>
              ))}
              {countryData?.status === 'stale' && (
                <p className="muted">Showing previously fetched indicators.</p>
              )}
            </>
          )}
        </div>
        <a
          className="text-link"
          href={`https://data.worldbank.org/country/${country.iso3.toLowerCase()}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          World Bank country profile <ExternalLink size={12} />
        </a>
        <div className="detail-section">
          <h3>OBSERVED ACTIVITY</h3>
          <dl>
            <div>
              <dt>Open NASA events</dt>
              <dd>{countryEvents.filter((e) => e.ongoing).length}</dd>
            </div>
            <div>
              <dt>Earthquakes · last 24h</dt>
              <dd>
                {
                  countryEvents.filter(
                    (e) => e.type === 'earthquake' && e.startedAt >= anchor - 86_400_000,
                  ).length
                }
              </dd>
            </div>
            <div>
              <dt>Major GDACS alerts · feed</dt>
              <dd>
                {
                  countryEvents.filter((e) =>
                    e.sources.some(
                      (s) =>
                        s.name === 'GDACS' && ['Red', 'Orange'].includes(s.officialAlert ?? ''),
                    ),
                  ).length
                }
              </dd>
            </div>
          </dl>
          <p className="detail-footnote">
            Counts cover successfully loaded feeds and source-attributed locations only. Offshore
            and unassigned observations may be excluded; zeros do not establish an absence of
            events.
          </p>
        </div>
        <h3 className="eyebrow">RECENT COUNTRY OBSERVATIONS</h3>
        {countryEvents.slice(0, 12).map((e) => (
          <button key={e.id} className="country-event" onClick={() => selectEvent(e)}>
            <span style={{ color: TYPE_META[e.type].color }}>{TYPE_META[e.type].label}</span>
            <strong>{e.title}</strong>
            <ArrowUpRight size={14} />
          </button>
        ))}
        {!countryEvents.length && (
          <p className="detail-description">
            No country-attributed observations in the loaded catalog.
          </p>
        )}
      </div>
    </>
  );
}
