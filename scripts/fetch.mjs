// Collects cyber news from feeds worldwide, filters, de-duplicates, summarises
// (AI when ANTHROPIC_API_KEY is set, plain fallback otherwise) and writes data/stories.json.
//
// Offline test mode: FIXTURES_DIR=<folder of .xml files> DATA_DIR=<output folder>

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseFeed } from './lib/xml.mjs';
import { isCyberRelevant, classify, guessStatus, guessSeverity, statusRank, extractHow, groupOf, STATUS_TONE } from './lib/classify.mjs';
import { findCountry, regionOf } from './lib/regions.mjs';
import { summarizeAI } from './lib/summarize.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = process.env.DATA_DIR || path.join(ROOT, 'data');
const FIXTURES = process.env.FIXTURES_DIR || '';
const cfg = JSON.parse(await fs.readFile(path.join(ROOT, 'config.json'), 'utf8'));
const sources = JSON.parse(await fs.readFile(path.join(ROOT, 'sources.json'), 'utf8'));
const apiKey = process.env.ANTHROPIC_API_KEY || '';
const model = process.env.CLAUDE_MODEL || cfg.model;
const UA = 'CyberStormBot/1.0 (+' + cfg.siteUrl + '; ' + cfg.contactEmail + ')';

const log = (...a) => console.log(...a);
const sha = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 10);

// ---------- 1. collect ----------
function fillFixtureDates(xml) {
  return xml
    .replace(/\{\{AGO:(\d+)h\}\}/g, (_, h) => new Date(Date.now() - h * 36e5).toUTCString())
    .replace(/\{\{AGOISO:(\d+)h\}\}/g, (_, h) => new Date(Date.now() - h * 36e5).toISOString());
}

async function loadSources() {
  const jobs = [];
  if (FIXTURES) {
    for (const f of (await fs.readdir(FIXTURES)).filter((n) => n.endsWith('.xml'))) {
      jobs.push({ name: f.replace(/\.xml$/, ''), lang: 'en', load: async () => fillFixtureDates(await fs.readFile(path.join(FIXTURES, f), 'utf8')) });
    }
    return jobs;
  }
  const get = (url) => async () => {
    const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' }, signal: AbortSignal.timeout(20000), redirect: 'follow' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.text();
  };
  for (const f of sources.feeds) jobs.push({ name: f.name, lang: 'en', load: get(f.url) });
  if (sources.googleNews?.enabled) {
    for (const e of sources.googleNews.editions) {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(e.query + ' when:2d')}&hl=${e.hl}&gl=${e.gl}&ceid=${e.ceid}`;
      jobs.push({ name: 'Google News ' + e.country, lang: e.lang, country: e.country, google: true, load: get(url) });
    }
  }
  return jobs;
}

const cleanTitle = (t, publisher) => (publisher && t.endsWith(' - ' + publisher) ? t.slice(0, -(publisher.length + 3)) : t);

async function collect() {
  const raw = [];
  const jobs = await loadSources();
  await Promise.all(
    jobs.map(async (job) => {
      try {
        const items = parseFeed(await job.load());
        if (!items.length) throw new Error('no items found');
        for (const it of items) {
          const d = new Date(it.date);
          const publishedAt = Number.isNaN(d.getTime()) ? new Date() : d;
          if (!it.title || !it.link) continue;
          if (!FIXTURES && Date.now() - publishedAt.getTime() > cfg.maxAgeDays * 864e5) continue;
          raw.push({
            title: cleanTitle(it.title, it.publisher),
            link: it.link,
            excerpt: it.excerpt,
            publishedAt: publishedAt.toISOString(),
            source: job.google ? it.publisher || job.name : job.name,
            lang: job.lang,
            trusted: !!job.google,
            countryHint: job.country || null
          });
        }
        log(`ok    ${job.name}: ${items.length} items`);
      } catch (e) {
        log(`SKIP  ${job.name}: ${e.message}`);
      }
    })
  );
  return raw.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

// ---------- 2. de-duplicate (same incident from several outlets) ----------
const STOP = new Set('with from that this have after into over their they about were been will what when which while amid says said more than also could would after attack attacks cyber'.split(' '));
const tokens = (t) => new Set(t.toLowerCase().replace(/[^a-z0-9À-ɏ぀-ヿ一-鿿 ]/g, ' ').split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w)));
function similarity(a, b) {
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return { inter, jac: inter / (a.size + b.size - inter || 1) };
}

// ---------- 3. summarise ----------
function fallbackSummary(item) {
  const text = item.title + ' ' + item.excerpt;
  const sentences = item.excerpt.split(/(?<=[.!?])\s+/).filter((s) => s.length > 25 && s.toLowerCase() !== item.title.toLowerCase());
  const status = guessStatus(text);
  return {
    relevant: true,
    headline: item.title.slice(0, 110),
    category: classify(text),
    country: findCountry(text) || 'Unknown', // the news edition is not proof of where an attack happened
    what: (sentences.slice(0, 2).join(' ') || 'See the original report for details.').slice(0, 280),
    how: 'Not yet reported.',
    status,
    statusText: status === 'Unconfirmed' ? 'Not yet reported.' : 'Reported as: ' + status.toLowerCase() + '.',
    severity: guessSeverity(text),
    advice: []
  };
}

// ---------- main ----------
const OUT = path.join(DATA, 'stories.json');
let doc = { updatedAt: null, sample: false, stories: [], seen: [] };
try { doc = { ...doc, ...JSON.parse(await fs.readFile(OUT, 'utf8')) }; } catch {}
const seen = new Set(doc.seen);
const stories = doc.stories;

const raw = await collect();
log(`collected ${raw.length} recent items from ${new Set(raw.map((r) => r.source)).size} sources`);

let created = 0, merged = 0, skipped = 0, aiCalls = 0, aiFailed = 0;
for (const item of raw) {
  const id = sha(item.link);
  if (seen.has(id)) continue;
  seen.add(id);
  if (!apiKey && item.lang !== 'en') { skipped++; continue; } // translation needs AI
  if (!isCyberRelevant(item.title + ' ' + item.excerpt)) { skipped++; continue; }

  const tk = tokens(item.title);
  const twin = stories.find((s) => {
    if (Math.abs(new Date(s.publishedAt) - new Date(item.publishedAt)) > 72 * 36e5) return false;
    const { inter, jac } = similarity(tk, s._tokens ? new Set(s._tokens) : tokens(s.title));
    return inter >= 3 && jac >= 0.45;
  });
  if (twin) {
    if (!twin.sources.some((x) => x.name === item.source)) twin.sources.push({ name: item.source, url: item.link });
    twin.updates.push({ at: item.publishedAt, text: item.title, source: item.source });
    if (new Date(item.publishedAt) > new Date(twin.updatedAt)) twin.updatedAt = item.publishedAt;
    // a later article may add the cause or a better status: update the card, say where it came from
    const later = item.title + ' ' + item.excerpt;
    const st = guessStatus(later);
    if (statusRank(st) > statusRank(twin.status) && (st === 'Arrests made' || st === 'Contained' || statusRank(twin.status) === 0)) {
      twin.status = st;
      twin.tone = STATUS_TONE[st];
      twin.statusText = `Update (${item.source}): ${item.title}`.slice(0, 280);
    }
    if (!twin.how || twin.how === 'Not yet reported.') {
      const how = extractHow(item.excerpt);
      if (how) twin.how = `${how} (reported by ${item.source})`.slice(0, 340);
    }
    merged++;
    continue;
  }
  if (created >= cfg.maxNewPerRun) { seen.delete(id); continue; } // handle next run

  let sum;
  let ai = false;
  if (apiKey) {
    try { sum = await summarizeAI(item, { apiKey, model }); ai = true; aiCalls++; }
    catch (e) { aiFailed++; log('AI failed, using fallback for one item:', e.message); sum = fallbackSummary(item); }
  } else {
    sum = fallbackSummary(item);
  }
  if (!sum.relevant) { skipped++; continue; }

  stories.push({
    id,
    title: item.title,
    headline: sum.headline,
    category: sum.category,
    country: sum.country,
    region: regionOf(sum.country),
    what: sum.what,
    how: sum.how,
    status: sum.status,
    tone: STATUS_TONE[sum.status],
    statusText: sum.statusText,
    severity: sum.severity,
    advice: sum.advice,
    publishedAt: item.publishedAt,
    updatedAt: item.publishedAt,
    sourceName: item.source,
    sourceUrl: item.link,
    sources: [{ name: item.source, url: item.link }],
    updates: [{ at: item.publishedAt, text: item.title, source: item.source }],
    breaking: false,
    ai
  });
  created++;
}

// breaking = high severity AND reported by several outlets, recently
for (const s of stories) {
  s.breaking = s.severity >= cfg.breakingMinSeverity && s.sources.length >= cfg.breakingMinSources && Date.now() - new Date(s.publishedAt) < 48 * 36e5;
  s.updates.sort((a, b) => new Date(a.at) - new Date(b.at));
  delete s._tokens;
  // still open? then the system keeps checking: stamp the time of this check
  if (groupOf(s) !== 'solved' && Date.now() - new Date(s.publishedAt) < 14 * 864e5) s.checkedAt = new Date().toISOString();
}
stories.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

doc = {
  updatedAt: new Date().toISOString(),
  sample: !!FIXTURES,
  stories: stories.slice(0, cfg.maxStories),
  seen: [...seen].slice(-3000)
};
await fs.mkdir(DATA, { recursive: true });
await fs.writeFile(OUT, JSON.stringify(doc, null, 1));

log(`new ${created}, merged ${merged}, skipped ${skipped}, total ${doc.stories.length}${apiKey ? `, AI calls ${aiCalls}, AI failures ${aiFailed}` : ' (no ANTHROPIC_API_KEY: plain summaries, English feeds only)'}`);
for (const s of doc.stories.filter((x) => x.breaking)) log(`BREAKING ${s.id}: ${s.headline}`);
