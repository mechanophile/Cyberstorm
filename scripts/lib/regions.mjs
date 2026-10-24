export const REGIONS = ['Asia', 'Europe', 'North America', 'South America', 'Africa', 'Oceania'];

const BY_REGION = {
  Asia: ['India', 'China', 'Japan', 'South Korea', 'North Korea', 'Singapore', 'Indonesia', 'Malaysia', 'Thailand', 'Vietnam', 'Philippines', 'Pakistan', 'Bangladesh', 'Sri Lanka', 'Nepal', 'Taiwan', 'Hong Kong', 'Israel', 'Iran', 'Iraq', 'Turkey', 'Saudi Arabia', 'United Arab Emirates', 'Qatar', 'Kuwait', 'Kazakhstan'],
  Europe: ['United Kingdom', 'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Poland', 'Ukraine', 'Russia', 'Sweden', 'Norway', 'Finland', 'Denmark', 'Ireland', 'Switzerland', 'Austria', 'Portugal', 'Greece', 'Czech Republic', 'Romania', 'Hungary', 'Estonia', 'Lithuania', 'Latvia'],
  'North America': ['United States', 'Canada', 'Mexico', 'Costa Rica'],
  'South America': ['Brazil', 'Argentina', 'Chile', 'Colombia', 'Peru', 'Ecuador', 'Uruguay'],
  Africa: ['Nigeria', 'South Africa', 'Kenya', 'Egypt', 'Ghana', 'Morocco', 'Ethiopia', 'Tanzania', 'Uganda'],
  Oceania: ['Australia', 'New Zealand']
};

export const COUNTRY_REGION = {};
for (const [region, list] of Object.entries(BY_REGION)) for (const c of list) COUNTRY_REGION[c] = region;

const ALIASES = {
  UK: 'United Kingdom', 'U.K.': 'United Kingdom', Britain: 'United Kingdom', England: 'United Kingdom',
  US: 'United States', 'U.S.': 'United States', USA: 'United States',
  UAE: 'United Arab Emirates'
};

export const regionOf = (country) => COUNTRY_REGION[country] || 'Other';

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const patterns = [
  ...Object.keys(COUNTRY_REGION).map((n) => [n, new RegExp('(?<![A-Za-z])' + esc(n) + '(?![A-Za-z])')]),
  ...Object.entries(ALIASES).map(([a, c]) => [c, new RegExp('(?<![A-Za-z])' + esc(a) + '(?![A-Za-z])')])
];

// Finds the first country named in a piece of text (case-sensitive on purpose).
export function findCountry(text) {
  let best = null;
  for (const [country, re] of patterns) {
    const m = re.exec(text || '');
    if (m && (best === null || m.index < best.index)) best = { country, index: m.index };
  }
  return best ? best.country : null;
}
