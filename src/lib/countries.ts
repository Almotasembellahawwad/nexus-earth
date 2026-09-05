import data from '@/data/countries.json';
import type { Country, GlobalEvent } from './types';
export const COUNTRIES: Country[] = data;
const aliases: Record<string, string> = {
  'united states': 'US',
  'united states of america': 'US',
  'russian federation': 'RU',
  russia: 'RU',
  türkiye: 'TR',
  turkiye: 'TR',
  turkey: 'TR',
  'iran (islamic republic of)': 'IR',
  'korea, rep.': 'KR',
  'congo, dem. rep.': 'CD',
  'congo, rep.': 'CG',
};
export function findCountry(name: string): Country | undefined {
  const n = name.trim().toLowerCase();
  return COUNTRIES.find(
    (c) =>
      c.name.toLowerCase() === n ||
      c.code.toLowerCase() === n ||
      c.iso3.toLowerCase() === n ||
      c.code === aliases[n],
  );
}
export function enrichCountry(event: GlobalEvent): GlobalEvent {
  // Source-provided region names only. Do not attach offshore events to the
  // nearest country, or treat proximity as a political/geographic assertion.
  let country = event.countryName ? findCountry(event.countryName) : undefined;
  const suffix = event.title.split(',').at(-1)?.trim() ?? '';
  // Place suffixes such as CA (California) and IN (Indiana) are not ISO codes.
  // Accept full country names here; ISO lookup is only for structured inputs.
  if (!country && suffix.length > 3) country = findCountry(suffix);
  if (
    !country &&
    event.sources.some((s) => s.name === 'USGS') &&
    /^(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)$/.test(
      suffix,
    )
  )
    country = findCountry('US');
  // USGS/NASA frequently use US state names, rather than the country.
  if (
    !country &&
    /\b(Alaska|Hawaii|California|Nevada|Montana|Oregon|Washington|Idaho|Utah|Wyoming|Arizona|New Mexico|Texas|Oklahoma)\b/i.test(
      event.title,
    )
  )
    country = findCountry('US');
  return country
    ? { ...event, countryCode: country.code, countryName: country.name, region: country.region }
    : event;
}
