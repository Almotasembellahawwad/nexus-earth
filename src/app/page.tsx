import Link from 'next/link';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import LandingEarth from '@/components/LandingEarth';
import LandingSnapshot from '@/components/LandingSnapshot';
import './landing.css';
export default function Home() {
  return (
    <div className="landing">
      <a className="skip-link" href="#earth-now">
        Skip to observations
      </a>
      <header className="landing-nav">
        <Link href="/" className="brand" aria-label="NEXUS home">
          <span className="brand-mark">
            <span />
            <span />
            <span />
          </span>
          NEXUS<span className="brand-period">.</span>
        </Link>
        <span className="landing-label nav-descriptor">AN INDEPENDENT DIGITAL OBSERVATORY</span>
        <Link href="/live" className="landing-nav-link">
          Open observatory <ArrowUpRight size={15} />
        </Link>
      </header>
      <main>
        <section className="landing-hero" aria-labelledby="landing-title">
          <LandingEarth />
          <div className="landing-hero-copy">
            <p className="landing-label">EARTH INTELLIGENCE / NEXUS</p>
            <h1 id="landing-title">
              One planet.
              <br />
              <span>Always in motion.</span>
            </h1>
            <p className="landing-deck">
              A living perspective on our changing Earth.
              <br />
              Observe natural events. Explore their context.
              <br />
              Follow the evidence.
            </p>
            <Link href="/live" className="landing-cta">
              Enter the observatory <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="landing-hero-foot">
            <a href="#earth-now">
              <ArrowDown size={14} /> Explore the observations
            </a>
            <span className="landing-label">A WORLD IN CONTINUOUS CHANGE</span>
          </div>
        </section>
        <section className="landing-section landing-now" id="earth-now" aria-labelledby="now-title">
          <div className="landing-section-head">
            <p className="landing-label">01 / OBSERVATION</p>
            <h2 id="now-title">
              The Earth, <span>right now.</span>
            </h2>
            <p>
              Individual signals. A global perspective.
              <br />A selection from the public observation feeds.
            </p>
          </div>
          <LandingSnapshot />
          <Link className="landing-text-link" href="/live">
            Explore the full event stream <ArrowUpRight size={16} />
          </Link>
        </section>
        <section
          className="landing-section landing-method"
          id="method"
          aria-labelledby="method-title"
        >
          <div className="landing-section-head">
            <p className="landing-label">02 / PERSPECTIVE</p>
            <h2 id="method-title">
              A clearer view.
              <br />
              <span>Grounded in evidence.</span>
            </h2>
          </div>
          <div className="landing-method-copy">
            <p className="landing-body">
              NEXUS brings public observations into one shared view of the planet. Every signal has
              a source. Every calculation has a method.
            </p>
            <div className="landing-principle">
              <span>01</span>
              <div>
                <h3>Observe across boundaries.</h3>
                <p>
                  Earthquakes, wildfires, storms and other natural events, placed in their
                  geographic context.
                </p>
              </div>
            </div>
            <div className="landing-principle">
              <span>02</span>
              <div>
                <h3>Move from signal to context.</h3>
                <p>
                  Explore time, inspect source records and connect a place with country indicators.
                </p>
              </div>
            </div>
            <div className="landing-principle">
              <span>03</span>
              <div>
                <h3>Know what the data can tell you.</h3>
                <p>
                  Source status, timestamps and coverage stay visible. NEXUS is an observation tool,
                  not an early-warning service.
                </p>
              </div>
            </div>
          </div>
          <div className="landing-sources">
            <p className="landing-label">PUBLIC DATA / INDEPENDENT PRESENTATION</p>
            <div>
              <a href="https://earthquake.usgs.gov/">
                USGS <ArrowUpRight size={12} />
              </a>
              <a href="https://eonet.gsfc.nasa.gov/">
                NASA EONET <ArrowUpRight size={12} />
              </a>
              <a href="https://www.gdacs.org/">
                GDACS <ArrowUpRight size={12} />
              </a>
              <a href="https://data.worldbank.org/">
                World Bank <ArrowUpRight size={12} />
              </a>
            </div>
            <p>
              No affiliation or endorsement implied. Coverage and update frequency vary by source.
            </p>
          </div>
        </section>
        <section className="landing-closing">
          <p className="landing-label">YOUR NEXT PERSPECTIVE</p>
          <h2>
            The world doesn’t stand still.
            <br />
            <span>Take a closer look.</span>
          </h2>
          <Link href="/live" className="landing-cta">
            Enter the observatory <ArrowUpRight size={18} />
          </Link>
        </section>
      </main>
      <footer className="landing-footer">
        <span>NEXUS / EARTH INTELLIGENCE</span>
        <span>Public observations. Open perspective.</span>
        <Link href="/live">
          Live workspace <ArrowUpRight size={12} />
        </Link>
      </footer>
    </div>
  );
}
