'use client';
import { ArrowRight, ChevronLeft, ExternalLink, Globe2, Link2, X } from 'lucide-react';
import { TYPE_META, type Country, type GlobalEvent } from '@/lib/types';
import { COUNTRIES } from '@/lib/countries';
import { utc } from '@/lib/format';
import { ICONS } from './event-icons';
export default function EventDetails({
  event: chosenEvent,
  onClose,
  onCountry: selectCountry,
}: {
  event: GlobalEvent;
  onClose: () => void;
  onCountry: (country: Country) => void;
}) {
  return (
    <>
      <div className="stream-header">
        <button className="back-button" onClick={() => onClose()}>
          <ChevronLeft size={15} /> Event stream
        </button>
        <button className="icon-button" aria-label="Close event details" onClick={() => onClose()}>
          <X size={16} />
        </button>
      </div>
      <div className="detail-scroll">
        <div className="detail-category" style={{ color: TYPE_META[chosenEvent.type].color }}>
          {(() => {
            const Icon = ICONS[chosenEvent.type];
            return <Icon size={25} />;
          })()}{' '}
          {TYPE_META[chosenEvent.type].label}
        </div>
        <h2 className="detail-title">{chosenEvent.title}</h2>
        <div className={`severity-badge ${chosenEvent.severity}`}>
          {chosenEvent.severity === 'unknown'
            ? 'Severity unclassified'
            : `${chosenEvent.severity} activity`}
        </div>
        <div className="detail-section">
          <h3>SOURCE DATA</h3>
          <dl>
            {chosenEvent.magnitude !== undefined && (
              <div>
                <dt>Magnitude</dt>
                <dd>M {chosenEvent.magnitude.toFixed(1)}</dd>
              </div>
            )}
            {chosenEvent.depthKm !== undefined && (
              <div>
                <dt>Depth</dt>
                <dd>{chosenEvent.depthKm.toFixed(1)} km</dd>
              </div>
            )}
            <div>
              <dt>First observation</dt>
              <dd>{utc(chosenEvent.startedAt)}</dd>
            </div>
            <div>
              <dt>Latest observation</dt>
              <dd>{utc(chosenEvent.updatedAt)}</dd>
            </div>
            <div>
              <dt>Coordinates</dt>
              <dd>
                {chosenEvent.latitude.toFixed(3)}°, {chosenEvent.longitude.toFixed(3)}°
              </dd>
            </div>
            {chosenEvent.sources
              .filter((s) => s.officialAlert)
              .map((s) => (
                <div key={s.name}>
                  <dt>{s.name} alert</dt>
                  <dd>{s.officialAlert}</dd>
                </div>
              ))}
            {chosenEvent.sources.some((s) => s.name === 'EONET') && (
              <div>
                <dt>NASA catalog status</dt>
                <dd>{chosenEvent.ongoing ? 'Open' : 'Closed'}</dd>
              </div>
            )}
          </dl>
          {chosenEvent.description && (
            <p className="detail-description">{chosenEvent.description}</p>
          )}
        </div>
        <div className="detail-section">
          <h3>
            PROVENANCE{' '}
            <span>
              {chosenEvent.sources.length} SOURCE{chosenEvent.sources.length > 1 ? 'S' : ''}
            </span>
          </h3>
          {chosenEvent.sources.map((s) => (
            <a
              key={s.name + s.id}
              className="source-link"
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="source-symbol">{s.name.slice(0, 1)}</span>
              <span>
                <strong>{s.name === 'EONET' ? 'NASA EONET' : s.name}</strong>
                <small>{s.id}</small>
              </span>
              {s.url && <ExternalLink size={13} />}
            </a>
          ))}
        </div>
        <div className="calculation-box">
          <span>
            <Link2 size={13} /> NEXUS CALCULATIONS
          </span>
          {chosenEvent.correlation ? (
            <>
              <strong>{chosenEvent.correlation.score}% match score</strong>
              <p>
                {chosenEvent.correlation.distanceKm} km apart ·{' '}
                {chosenEvent.correlation.timeDeltaMinutes} min difference. A heuristic match, not an
                agency confidence rating.
              </p>
            </>
          ) : (
            <p>Single-source observation. No independent match established.</p>
          )}
          <p>
            {chosenEvent.type === 'earthquake'
              ? 'Activity tier uses magnitude thresholds; GDACS alert tiers take precedence when higher.'
              : 'Severity uses GDACS alerts where available. NASA does not supply a comparable severity.'}
          </p>
        </div>
        {chosenEvent.countryCode && (
          <button
            className="country-link"
            onClick={() => {
              const c = COUNTRIES.find((c) => c.code === chosenEvent.countryCode);
              if (c) selectCountry(c);
            }}
          >
            <Globe2 size={16} />
            Explore {chosenEvent.countryName}
            <ArrowRight size={15} />
          </button>
        )}
        <p className="detail-footnote">
          An observation is not an emergency instruction. Consult local authorities for official
          guidance.
        </p>
      </div>
    </>
  );
}
