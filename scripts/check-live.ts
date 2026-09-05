import { getFeed } from '../src/lib/pipeline';
import { getCountryIntelligence } from '../src/lib/worldbank';
const feed = await getFeed();
console.log(
  JSON.stringify(
    {
      sources: feed.sources,
      pulse: feed.pulse,
      events: feed.events.length,
      correlated: feed.events.filter((e) => e.sources.length > 1).length,
      sample: feed.events.slice(0, 2),
      country: await getCountryIntelligence('JPN'),
    },
    null,
    2,
  ),
);
