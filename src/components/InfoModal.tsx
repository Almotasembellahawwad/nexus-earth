'use client';
import { ExternalLink } from 'lucide-react';
import type { FeedResponse } from '@/lib/types';
import { utc } from '@/lib/format';
import Modal from './Modal';
export default function InfoModal({
  info,
  data,
  onClose,
}: {
  info: 'sources' | 'pulse' | null;
  data: FeedResponse | null;
  onClose: () => void;
}) {
  return (
    <Modal
      open={info !== null}
      close={() => onClose()}
      title={info === 'sources' ? 'THE OBSERVATION NETWORK' : 'UNDERSTANDING NEXUS'}
    >
      <div className="info-content">
        {info === 'sources' ? (
          <>
            <h2>Open data. Full provenance.</h2>
            <p>
              Independent public sources, brought into one view. Each observation links back to its
              originating agency.
            </p>
            {(data?.sources ?? []).map((s) => (
              <div className="source-health-card" key={s.name}>
                <div>
                  <strong>{s.name === 'EONET' ? 'NASA EONET' : s.name}</strong>
                  <span className={`health-tag ${s.status}`}>{s.status}</span>
                </div>
                <p>{s.coverage}</p>
                <small>
                  {s.count.toLocaleString()} accepted · {s.rejected} skipped
                  {s.fetchedAt ? ` · fetched ${utc(s.fetchedAt)}` : ' · not yet fetched'}
                </small>
                {s.message && <p className="source-error">{s.message}</p>}
              </div>
            ))}
            {!data && (
              <p>
                Connections are being established. Source health appears after the first response.
              </p>
            )}
            <div className="source-health-card">
              <div>
                <strong>World Bank</strong>
                <span className="health-tag">ON DEMAND</span>
              </div>
              <p>
                Latest available population, GDP, and GDP per capita. Every indicator shows its
                reporting year; these are not real-time values.
              </p>
            </div>
            <p className="info-note">
              Basemap imagery: NASA Earth Observatory Black Marble, 2016 composite. City lights are
              historical imagery, not live event markers. Colored observation markers come from the
              current source catalog.
            </p>
            <p className="info-note">
              USGS is limited to M2.5+ events. NASA polygon-only events are excluded. GDACS history
              is limited to its current feed. Country attribution is incomplete. Cached observations
              are marked stale if a refresh fails.
            </p>
            <div className="official-links">
              <a
                href="https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php"
                target="_blank"
                rel="noreferrer"
              >
                USGS <ExternalLink size={12} />
              </a>
              <a href="https://eonet.gsfc.nasa.gov/docs/v3" target="_blank" rel="noreferrer">
                NASA EONET <ExternalLink size={12} />
              </a>
              <a href="https://www.gdacs.org" target="_blank" rel="noreferrer">
                GDACS <ExternalLink size={12} />
              </a>
            </div>
          </>
        ) : (
          <>
            <span className="eyebrow">NEXUS GLOBAL PULSE / V1</span>
            <h2>
              A measure of activity.
              <br />A different view of Earth.
            </h2>
            <p>
              The Pulse is a calculated 0–100 index of natural-event activity. It does not measure
              danger, forecast disasters, or replace official emergency guidance.
            </p>
            <div className="pulse-breakdown">
              {data?.pulse.components.map((c) => (
                <div key={c.name}>
                  <div>
                    <span>{c.name}</span>
                    <strong>
                      {Math.round(c.value)}
                      <small> / 100 · {Math.round(c.weight * 100)}% weight</small>
                    </strong>
                  </div>
                  <span className="component-track">
                    <i style={{ width: `${c.value}%` }} />
                  </span>
                </div>
              ))}
            </div>
            <p>
              Seismic activity uses squared magnitude offsets over 24 hours. Agency alerts and
              active NASA events are logarithmically scaled with fixed caps. Geographical spread
              measures occupied 30° cells.
            </p>
            <p>
              Coverage: <strong>{data?.pulse.coverage ?? 0}% of event sources available.</strong>{' '}
              Missing sources retain their weights. A partial score should not be compared directly
              with a complete score. The Pulse always describes the full current catalog,
              independently of your filters and replay.
            </p>
            <div className="info-note">
              <strong>Correlation is conservative.</strong> Independent earthquake reports must be
              within 80 km, 3 minutes, and 0.5 magnitude units, then pass a weighted score of at
              least 75%. The score describes a match, not statistical confidence. Nearby fires,
              storms, and floods are not automatically merged.
            </div>
            <p className="info-note">
              Time exploration replays occurrence and observation timestamps using latest known
              positions and catalog status. It is not a historical reconstruction of what agencies
              knew at that moment.
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}
