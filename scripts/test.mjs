// Offline checks: feed parsing, relevance filter, de-duplication, AI-reply validation, site build.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseFeed } from './lib/xml.mjs';
import { parseModelJson, sanitize } from './lib/summarize.mjs';
import { findCountry, regionOf } from './lib/regions.mjs';
import { isCyberRelevant, groupOf, extractHow, statusRank } from './lib/classify.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0;
const ok = (name, fn) => { fn(); passed++; console.log('  ✓ ' + name); };

// --- parsers
const rss = await fs.readFile(path.join(ROOT, 'test/fixtures/feed-a.xml'), 'utf8');
const atom = await fs.readFile(path.join(ROOT, 'test/fixtures/feed-b.xml'), 'utf8');
ok('RSS items parsed (CDATA, entities)', () => {
  const items = parseFeed(rss);
  assert.equal(items.length, 3);
  assert.match(items[2].title, /phone numbers & addresses/);
  assert.match(items[0].excerpt, /^A regional hospital network/);
});
ok('Atom links: alternate chosen over self, href-only links handled', () => {
  const items = parseFeed(atom);
  assert.equal(items[0].link, 'https://example.com/b/hospital');
  assert.equal(items[1].link, 'https://example.com/b/brazil');
});
ok('country and region lookup', () => {
  assert.equal(findCountry('Hospitals in Germany lost access'), 'Germany');
  assert.equal(findCountry('Indiana storm'), null);
  assert.equal(findCountry('The U.K. regulator'), 'United Kingdom');
  assert.equal(regionOf('Brazil'), 'South America');
});
ok('AI reply validation trims, fixes enums, rejects junk', () => {
  const good = sanitize(parseModelJson('```json\n{"relevant":true,"headline":"Bank hit","category":"Nope","country":"India","what":"x","how":"","status":"Ongoing","statusText":"y","severity":9,"advice":["a","b","c","d"]}\n```'));
  assert.equal(good.category, 'Fraud');
  assert.equal(good.severity, 5);
  assert.equal(good.how, 'Not yet reported.');
  assert.equal(good.advice.length, 3);
  assert.equal(sanitize({ relevant: false }).relevant, false);
  assert.throws(() => sanitize({ relevant: true }));
  assert.throws(() => parseModelJson('no json here'));
});

ok('V3 groups: solved, current (last 2 days), unresolved', () => {
  const now = Date.now();
  const h = (n) => new Date(now - n * 36e5).toISOString();
  assert.equal(groupOf({ status: 'Arrests made', updatedAt: h(300) }, now), 'solved');
  assert.equal(groupOf({ status: 'Contained', updatedAt: h(1) }, now), 'solved');
  assert.equal(groupOf({ status: 'Ongoing', updatedAt: h(10) }, now), 'current');
  assert.equal(groupOf({ status: 'Unconfirmed', updatedAt: h(60) }, now), 'unresolved');
  assert.ok(statusRank('Arrests made') > statusRank('Ongoing'));
});
ok('V3 relevance: off-topic fraud/policy news is dropped, cyber news kept', () => {
  assert.equal(isCyberRelevant('Trump administration unveils whistleblower program offering cash rewards to fight fraud'), false);
  assert.equal(isCyberRelevant('Breach of contract lawsuit filed against supplier'), false);
  assert.equal(isCyberRelevant('Ransomware hits hospital network'), true);
  assert.equal(isCyberRelevant('Online banking scam steals OTP from customers'), true);
});
ok('V3 cause extraction only when an article states one', () => {
  assert.match(extractHow('The company said little. Attackers got in through a stolen contractor password.'), /stolen|through/);
  assert.equal(extractHow('The company declined to comment on the incident.'), null);
});

// --- pipeline + build in a temp folder
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'cs-test-'));
const env = { ...process.env, DATA_DIR: path.join(tmp, 'data'), DIST_DIR: path.join(tmp, 'dist'), FIXTURES_DIR: path.join(ROOT, 'test/fixtures'), ANTHROPIC_API_KEY: '' };
execFileSync('node', [path.join(ROOT, 'scripts/fetch.mjs')], { env, stdio: 'pipe' });
const doc = JSON.parse(await fs.readFile(path.join(tmp, 'data/stories.json'), 'utf8'));
ok('pipeline: irrelevant item dropped, duplicate incident merged', () => {
  assert.equal(doc.stories.length, 3, 'hospital (merged), India retailer, Brazil arrests');
  assert.ok(!doc.stories.some((s) => /smartphone/i.test(s.title)));
  const hosp = doc.stories.find((s) => /hospital/i.test(s.title));
  assert.equal(hosp.sources.length, 2);
  assert.equal(hosp.updates.length, 2);
  assert.equal(hosp.category, 'Ransomware');
  assert.equal(hosp.country, 'Germany');
  assert.equal(hosp.region, 'Europe');
});
ok('pipeline: categories and statuses', () => {
  const br = doc.stories.find((s) => /Brazil/.test(s.title));
  assert.equal(br.status, 'Arrests made');
  assert.equal(br.tone, 'green');
  assert.equal(doc.stories.find((s) => /India/.test(s.title)).category, 'Data Breach');
});
ok('pipeline: second run adds nothing (already seen)', () => {
  const log = execFileSync('node', [path.join(ROOT, 'scripts/fetch.mjs')], { env, encoding: 'utf8' });
  assert.match(log, /new 0, merged 0/);
});
execFileSync('node', [path.join(ROOT, 'scripts/build.mjs')], { env, stdio: 'pipe' });
const dist = path.join(tmp, 'dist');
const read = (f) => fs.readFile(path.join(dist, f), 'utf8');
const home = await read('index.html');
for (const f of ['index.html', 'timeline/index.html', 'archive/index.html', 'about/index.html', 'privacy/index.html', '404.html', 'sitemap.xml', 'robots.txt', 'manifest.webmanifest', 'sw.js', 'assets/style.css', 'assets/app.js']) {
  await fs.access(path.join(dist, f));
}
passed++; console.log('  ✓ build: all pages and assets exist');
ok('build: home has brand, footer email, copyright, no "undefined"', () => {
  assert.match(home, /Cyber<em>Storm<\/em>/);
  assert.match(home, /mscybk@gmail\.com/);
  assert.match(home, /All rights reserved/);
  assert.ok(!/undefined|\[object/.test(home));
});
for (const s of doc.stories) {
  const page = await read(`story/${s.id}/index.html`);
  assert.match(page, /WHAT HAPPENED/);
  if (/^not yet reported\.?$/i.test(s.how.trim())) assert.ok(!/HOW IT HAPPENED/.test(page), 'empty "how" must be hidden: ' + s.id);
  assert.ok(home.includes(`/story/${s.id}/`));
  assert.ok(!/undefined|\[object/.test(page));
}
passed++; console.log('  ✓ build: story pages render and are linked');
ok('build: stories JSON is safe to embed (no raw "</")', () => {
  const m = /<script type="application\/json" id="stories-data">([\s\S]*?)<\/script>/.exec(home);
  assert.ok(m && !m[1].includes('</'));
  assert.equal(JSON.parse(m[1]).length, 3);
});
const arch = JSON.parse(await fs.readFile(path.join(ROOT, 'data/archive.json'), 'utf8'));
const archPage = await read('archive/index.html');
ok('archive: every entry complete, sourced and rendered', () => {
  assert.equal(arch.entries.length, 21);
  for (const e of arch.entries) {
    for (const k of ['id', 'headline', 'when', 'country', 'region', 'era', 'kind', 'what', 'how', 'fixed', 'protect', 'status', 'tone']) assert.ok(e[k], e.id + ' missing ' + k);
    assert.ok(e.sources.length >= 1 && e.sources.every(([n, u]) => n && /^https:\/\//.test(u)), e.id + ' sources');
    assert.ok(['Worldwide', 'India', 'AI scams'].includes(e.region), e.id + ' region');
    assert.ok(archPage.includes(`data-id="${e.id}"`), e.id + ' not rendered');
  }
  assert.ok(!/undefined|\[object/.test(archPage));
  assert.match(home, /href="\/archive\/"/);
});
for (const id of ['id="globe"', 'data-mapview="3d"', 'data-mapbtn="2d"', 'id="gtop"', 'id="glegend"', 'id="clk"', 'id="clk-utc"', 'id="cfilter"', 'class="map"', '/assets/globe.js', '/assets/clock.js']) {
  ok('home contains ' + id, () => assert.ok(home.includes(id), id + ' missing'));
}
for (const f of ['globe.js', 'clock.js', 'app.js']) {
  const code = await fs.readFile(path.join(tmp, 'dist/assets', f), 'utf8');
  ok('assets/' + f + ' ships and parses', () => { assert.ok(code.length > 500); execFileSync('node', ['--check', path.join(tmp, 'dist/assets', f)], { stdio: 'pipe' }); });
}
ok('archive page has no globe or clock', () => assert.ok(!archPage.includes('id="globe"') && !archPage.includes('id="clk"')));
const privacy = await read('privacy/index.html');
ok('privacy: final text, no draft wording, contact present', () => {
  assert.ok(!/Draft outline|\[Confirm|\[Update/.test(privacy));
  assert.match(privacy, /No account, no login/);
  assert.match(privacy, /mscybk@gmail\.com/);
});
await fs.rm(tmp, { recursive: true, force: true });
console.log(`\n${passed} checks passed`);
