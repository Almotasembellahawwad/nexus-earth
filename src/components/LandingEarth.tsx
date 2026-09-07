'use client';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
const Globe = dynamic(() => import('./Globe'), { ssr: false });
const ignore = () => {};
export default function LandingEarth() {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div className="landing-earth" ref={host} aria-hidden="true">
      <Globe
        events={[]}
        selected={null}
        focus={null}
        onSelect={ignore}
        onCountry={ignore}
        rotating={visible}
        grid={false}
        command={null}
        cinematic
        paused={!visible}
      />
    </div>
  );
}
