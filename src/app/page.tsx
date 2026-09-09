import Link from 'next/link';
import { Activity, ArrowDown, ArrowUpRight, Earth, Orbit, Mountain, Check } from 'lucide-react';
import Image from 'next/image';
import LandingObservatory from '@/components/LandingObservatory';
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
            <p className="landing-label">01 / A MORE INFORMED TOMORROW</p>
            <div className="hero-wordmark" aria-hidden="true">
              <span>N</span> NEXUS.
            </div>
            <h1 id="landing-title">
              What if Earth had
              <br />
              <span>an interface?</span>
            </h1>
            <p className="landing-deck">
              Live data. Real context. A clearer view.
              <br />
              An independent digital observatory for a world in motion.
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
        <section
          className="landing-section landing-experience"
          id="observatory"
          aria-labelledby="experience-title"
        >
          <div className="experience-heading">
            <div>
              <p className="landing-label">02 / A LIVING PERSPECTIVE</p>
              <h2 id="experience-title">
                One planet.
                <br />
                <span>Always in motion.</span>
              </h2>
            </div>
            <p>
              Move beyond the headlines.
              <br />
              Explore the signals, the places,
              <br />
              and the context that connects them.
            </p>
          </div>
          <LandingObservatory />
        </section>
        <section className="landing-section landing-now" id="earth-now" aria-labelledby="now-title">
          <div className="landing-section-head">
            <p className="landing-label">03 / OBSERVATION</p>
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
            <p className="landing-label">04 / PERSPECTIVE</p>
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
                <Activity size={30} />
                <span>
                  USGS<small>Earthquake observations</small>
                </span>
                <ArrowUpRight size={12} />
              </a>
              <a href="https://eonet.gsfc.nasa.gov/">
                <Orbit size={30} />
                <span>
                  NASA EONET<small>Natural events</small>
                </span>
                <ArrowUpRight size={12} />
              </a>
              <a href="https://www.gdacs.org/">
                <Mountain size={30} />
                <span>
                  GDACS<small>Disaster alerts</small>
                </span>
                <ArrowUpRight size={12} />
              </a>
              <a href="https://data.worldbank.org/">
                <Earth size={30} />
                <span>
                  World Bank<small>Country indicators</small>
                </span>
                <ArrowUpRight size={12} />
              </a>
            </div>
            <p>
              No affiliation or endorsement implied. Coverage and update frequency vary by source.
            </p>
          </div>
        </section>
        <section className="landing-section landing-independence">
          <div>
            <p className="landing-label">05 / BUILT WITH INTENTION</p>
            <h2>
              Open by design.
              <br />
              <span>Independent by choice.</span>
            </h2>
          </div>
          <div>
            <p>
              Public observations, visible sources and methods you can inspect. A considered view of
              the planet, with room to form your own perspective.
            </p>
            <ul>
              <li>
                <Check size={19} /> Source records behind every observation
              </li>
              <li>
                <Check size={19} /> Transparent calculations and coverage
              </li>
              <li>
                <Check size={19} /> Open-source code, available to explore
              </li>
            </ul>
            <a
              className="landing-text-link"
              href="https://github.com/Almotasembellahawwad/nexus-earth"
            >
              Explore the project <ArrowUpRight size={15} />
            </a>
          </div>
        </section>
        <section className="landing-closing">
          <Image
            className="closing-horizon"
            src="/imagery/orbital-sunrise.jpg"
            alt=""
            fill
            sizes="100vw"
          />
          <p className="landing-label">06 / SAME PLANET. INFINITE STORIES.</p>
          <div className="closing-wordmark">
            NEXUS<span>.</span>
          </div>
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
        <a href="https://github.com/Almotasembellahawwad">
          Built by Almotasembellah Awwad <ArrowUpRight size={12} />
        </a>
      </footer>
      <div className="landing-credits">
        Earth imagery:{' '}
        <a href="https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/">
          NASA Earth Observatory / Black Marble (2016)
        </a>{' '}
        ·{' '}
        <a href="https://www.nasa.gov/image-article/sunrise-begins/">
          Orbital sunrise: NASA / Matthew Dominick (2024)
        </a>
        . Historical imagery, not a live satellite view.
      </div>
    </div>
  );
}
