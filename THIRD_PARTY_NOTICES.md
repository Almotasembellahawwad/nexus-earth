# Third-party notices

## Earth imagery

- `public/imagery/earth-night-2016.jpg`: NASA Earth Observatory, Black Marble 2016 color composite, 3600×1800. Source: https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/ — original: https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/144000/144898/BlackMarble_2016_01deg.jpg
- `public/imagery/orbital-sunrise.jpg`: NASA / Matthew Dominick, August 15, 2024, ISS photograph iss071e487194. Source: https://www.nasa.gov/image-article/sunrise-begins/ — NASA-provided 2000px image rendition.

These are historical illustrative assets, not current satellite observations. Night lights are separate from NEXUS event markers. Imagery is used with attribution under NASA's media guidelines: https://www.nasa.gov/nasa-brand-center/images-and-media/ . No NASA insignia is used and no endorsement is implied. The original images are bundled without generative modifications; globe projection, lighting and CSS framing are presentation treatments.

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
