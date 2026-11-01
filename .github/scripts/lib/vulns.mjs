// CISA's Known Exploited Vulnerabilities (KEV) catalog: security flaws that attackers are already using.
// Public US-government data. We keep a short list and link every entry back to its official details.
export const KEV_URLS = [
  'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json',
  'https://raw.githubusercontent.com/cisagov/kev-data/develop/known_exploited_vulnerabilities.json'
];
export const KEV_PAGE = 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog';
export const MAX_VULNS = 80;

const clean = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

// Turns the raw catalog into a short, safe list (newest first). Throws if the file is not what we expect.
export function parseKev(json) {
  const list = json && Array.isArray(json.vulnerabilities) ? json.vulnerabilities : null;
  if (!list || !list.length) throw new Error('catalog has no vulnerabilities list');
  const items = [];
  for (const v of list) {
    const id = clean(v.cveID, 40);
    if (!/^CVE-\d{4}-\d{4,}$/.test(id)) continue;
    const added = new Date(clean(v.dateAdded, 20));
    if (Number.isNaN(added.getTime())) continue;
    items.push({
      id,
      vendor: clean(v.vendorProject, 80),
      product: clean(v.product, 80),
      name: clean(v.vulnerabilityName, 160),
      what: clean(v.shortDescription, 420),
      action: clean(v.requiredAction, 320),
      added: added.toISOString().slice(0, 10),
      due: /^\d{4}-\d{2}-\d{2}$/.test(clean(v.dueDate, 12)) ? clean(v.dueDate, 12) : '',
      ransomware: clean(v.knownRansomwareCampaignUse, 20).toLowerCase() === 'known'
    });
  }
  if (!items.length) throw new Error('no valid entries in the catalog');
  items.sort((a, b) => (b.added.localeCompare(a.added)) || b.id.localeCompare(a.id));
  return items.slice(0, MAX_VULNS);
}

// Downloads the catalog (tries the official address, then CISA's own GitHub copy).
export async function fetchKev(get) {
  let last;
  for (const url of KEV_URLS) {
    try { return { items: parseKev(JSON.parse(await get(url))), url }; } catch (e) { last = e; }
  }
  throw last || new Error('could not download the catalog');
}

export const nvdLink = (id) => `https://nvd.nist.gov/vuln/detail/${encodeURIComponent(id)}`;
