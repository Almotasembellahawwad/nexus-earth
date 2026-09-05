import fs from 'node:fs';
import { feature } from 'topojson-client';
import countries from 'world-countries';
const atlas = JSON.parse(fs.readFileSync('node_modules/world-atlas/countries-110m.json', 'utf8'));
const geo = feature(atlas, atlas.objects.countries);
fs.mkdirSync('src/data', { recursive: true });
fs.mkdirSync('public', { recursive: true });
fs.writeFileSync('public/countries.geo.json', JSON.stringify(geo));
fs.writeFileSync(
  'src/data/countries.json',
  JSON.stringify(
    countries
      .map((c) => ({
        code: c.cca2,
        iso3: c.cca3,
        numeric: c.ccn3,
        name: c.name.common,
        region: c.region,
        latitude: c.latlng[0],
        longitude: c.latlng[1],
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  ),
);
console.log(`Prepared ${geo.features.length} boundaries and ${countries.length} country entries.`);
