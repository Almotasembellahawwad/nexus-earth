import type { Metadata } from 'next';
import '@fontsource-variable/dm-sans/index.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import './globals.css';
import './observatory.css';
export const metadata: Metadata = {
  title: 'NEXUS — Live Earth Intelligence',
  description:
    'An independent live Earth intelligence workspace. Explore earthquakes, natural events and public disaster alerts from USGS, NASA and GDACS.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
