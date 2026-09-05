# Third-party notices

NEXUS includes data derived from the following projects. Their original licenses continue to apply to that material.

## Country boundaries

`public/countries.geo.json` is derived from `world-atlas` 2.0.2, whose geometry is derived from Natural Earth. Natural Earth data is in the public domain. The conversion utility `topojson-client` is ISC-licensed.

- https://github.com/topojson/world-atlas
- https://www.naturalearthdata.com/about/terms-of-use/
- https://github.com/topojson/topojson-client

## Country metadata

`src/data/countries.json` is a transformed subset of `world-countries` 5.1.0, retaining country names, ISO codes, numeric codes, regions, and representative coordinates. This derived database is made available under the Open Database License (ODbL) 1.0, the license of the source package. This notice applies to the derived data, not a relicense of unrelated application code.

- https://github.com/mledoze/countries
- https://opendatacommons.org/licenses/odbl/1-0/
- Included license: `public/licenses/world-countries-ODbL.txt`

## Fonts

DM Sans Variable and IBM Plex Mono are served from the installed Fontsource packages. The fonts are licensed under the SIL Open Font License 1.1. Fontsource packaging carries its own MIT license where applicable. Original notices and OFL text are included in `public/licenses/dm-sans-OFL.txt` and `public/licenses/ibm-plex-mono-OFL.txt`.

- https://fonts.google.com/specimen/DM+Sans
- https://fonts.google.com/specimen/IBM+Plex+Mono
- https://openfontlicense.org/

## Live data

USGS, NASA EONET, GDACS, and World Bank records retain their source provenance and official links in the application. Review the source organizations' data terms and disclaimers when redistributing or relying on their data. No agency logos are used, and no endorsement is implied.
