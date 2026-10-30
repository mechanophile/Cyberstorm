// Builds the static website into dist/ from data/stories.json (or sample stories).
// No dependencies. Usage: node scripts/build.mjs

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeSample } from './sample.mjs';
import { REGIONS } from './lib/regions.mjs';
import { groupOf } from './lib/classify.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = process.env.DATA_DIR || path.join(ROOT, 'data');
const DIST = process.env.DIST_DIR || path.join(ROOT, 'dist');
const cfg = JSON.parse(await fs.readFile(path.join(ROOT, 'config.json'), 'utf8'));
const BASE = cfg.siteUrl.replace(/\/$/, '');
const NAME = cfg.siteName;

let doc;
try { doc = JSON.parse(await fs.readFile(path.join(DATA, 'stories.json'), 'utf8')); } catch { doc = makeSample(); }
let archive = [];
for (const dir of [DATA, path.join(ROOT, 'data')]) {
  try { archive = JSON.parse(await fs.readFile(path.join(dir, 'archive.json'), 'utf8')); break; } catch {}
}
const archEntries = [...(archive.entries || [])].sort((a, b) => String(b.ym).localeCompare(String(a.ym)));
const stories = [...doc.stories].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
const now = Date.now();
const hoursAgo = (iso) => (now - new Date(iso)) / 36e5;

/* ---------- helpers ---------- */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const fmtDay = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const fmtDateTime = (iso) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC';
const monthLabel = (iso) => new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
function ago(iso) {
  const h = hoursAgo(iso);
  if (h < 1) return Math.max(1, Math.round(h * 60)) + 'm ago';
  if (h < 24) return Math.round(h) + 'h ago';
  const d = Math.round(h / 24);
  return d < 30 ? d + 'd ago' : fmtDate(iso);
}
const known = (t) => !!t && !/^not yet reported\.?$/i.test(String(t).trim());
const place = (s) => (s.country && s.country !== 'Unknown' ? s.country : 'Worldwide');
const badge = (s) => `<span class="badge ${esc(s.tone)}"><i></i>${esc(s.status)}</span>`;
const tag = (c) => `<span class="tag">${esc(c)}</span>`;
const timeEl = (iso) => `<time datetime="${esc(iso)}">${esc(ago(iso))}</time>`;
const out = async (rel, content) => {
  const f = path.join(DIST, rel);
  await fs.mkdir(path.dirname(f), { recursive: true });
  await fs.writeFile(f, content);
};

/* ---------- shared layout ---------- */
const SHIELD = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/></svg>';
const NAV = [['/#latest', 'Latest'], ['/#top5', 'Top 5 today'], ['/#map', 'Attack map'], ['/timeline/', 'Timeline'], ['/archive/', 'Archive'], ['/about/', 'About']];

function layout({ title, desc, url, body, active = '', jsonld = '', bodyScripts = '' }) {
  const full = title === NAME ? NAME + ' · Worldwide cybercrime & AI-threat news' : title + ' · ' + NAME;
  const analytics = cfg.cloudflareAnalyticsToken
    ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${esc(cfg.cloudflareAnalyticsToken)}"}'></script>` : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(BASE + url)}">
<meta property="og:title" content="${esc(full)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${esc(BASE + url)}">
<meta name="theme-color" content="#070b14">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/assets/icon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/style.css">
${jsonld ? `<script type="application/ld+json">${jsonld.replace(/</g, '\\u003c')}</script>` : ''}
${analytics}
</head>
<body>
<div class="topbar"><header class="wrap bar">
  <a class="brand" href="/">${SHIELD}<span>Cyber<em>Storm</em></span></a>
  <nav aria-label="Main">${NAV.map(([h, t]) => `<a href="${h}"${active === t ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</nav>
  <div class="live"><span class="dot"></span><span id="live" data-updated="${esc(doc.updatedAt)}">Live · updated ${esc(ago(doc.updatedAt))}</span></div>
</header></div>
${body}
<footer>
  <div class="wrap fcols">
    <div><strong>${esc(NAME)}</strong>News summaries are generated by AI from public sources. Each story links to the original publisher. Where a status is unknown, we say so.</div>
    ${doc.sample ? '<div><span class="mono">SAMPLE DATA</span>Every story on this site right now is made-up sample content, shown until the live news feed is connected.</div>' : ''}
  </div>
  <div class="fbar"><div class="wrap">
    <span>© ${new Date().getFullYear()} ${esc(NAME)}. All rights reserved.</span>
    <nav aria-label="Footer"><a href="/archive/">Archive</a><a href="/privacy/">Privacy Policy</a><a href="/about/">About</a><a href="mailto:${esc(cfg.contactEmail)}">${esc(cfg.contactEmail)}</a></nav>
  </div></div>
</footer>
${bodyScripts}
<script src="/assets/app.js" defer></script>
</body>
</html>`;
}

/* ---------- home ---------- */
const MAP_POLYS = ['42,69 111,56 222,50 278,56 328,89 347,117 306,133 289,156 275,181 250,169 231,178 236,206 267,222 283,228 258,214 222,200 194,183 175,161 156,139 153,111 125,89 83,83 42,83', '333,39 389,19 444,28 431,56 375,83 347,67', '278,228 333,222 361,250 403,267 389,311 347,347 319,403 297,389 300,333 278,264 283,244', '472,150 475,133 494,117 514,100 528,89 514,78 542,56 583,53 778,36 889,50 1000,61 958,83 889,111 861,133 839,167 806,194 792,222 778,242 772,208 756,189 722,222 703,194 689,183 656,181 639,167 597,167 583,139 578,119 569,144 542,144 522,131 500,144', '597,167 619,214 644,206 661,189 656,181 639,167', '453,192 472,153 486,150 528,147 589,164 619,217 642,219 611,264 611,292 592,325 556,347 542,328 533,278 525,239 478,236 453,211', '817,311 861,283 894,281 925,322 908,356 875,347 819,344', '486,111 506,106 494,89 483,94', '861,161 892,139 897,128 875,153', '764,236 800,258 830,275 800,270 770,250'];
const SPOTS = [['North America', 28.6, 28.8], ['South America', 36.9, 58.4], ['Europe', 52.8, 22.2], ['Africa', 52.2, 45], ['Asia', 71.6, 38.8], ['Asia', 82.2, 30.6], ['Oceania', 91.9, 68.4]];

function listCard(s) {
  return `<article class="card" data-id="${esc(s.id)}">
    <div class="r">${tag(s.category)}${badge(s)}</div>
    <h3><a href="/story/${esc(s.id)}/">${esc(s.headline)}</a></h3>
    <p>${esc(s.what)}</p>
    <p class="st"><b>STATUS</b>${esc(s.statusText)}</p>
    ${s.advice?.length ? `<div class="protect"><b>PROTECT YOURSELF</b><p>${esc(s.advice[0])}</p></div>` : ''}
    <div class="foot"><span>${esc(place(s))} · ${timeEl(s.publishedAt)}${groupOf(s) !== 'solved' && s.checkedAt ? ` · checked ${timeEl(s.checkedAt)}` : ''}</span><a href="/story/${esc(s.id)}/">Full story →</a></div>
  </article>`;
}

const GROUPS = [
  { key: 'current', title: 'Current', desc: 'Last 2 days, still unfolding' },
  { key: 'solved', title: 'Solved', desc: 'Arrests, fixes or recovery reported' },
  { key: 'unresolved', title: 'Unresolved', desc: 'No fix or cause reported yet' }
];

function homePage() {
  const byGroup = { current: [], solved: [], unresolved: [] };
  for (const s of stories) { const g = groupOf(s, now); if (byGroup[g].length < 40) byGroup[g].push(s); }
  const latest = GROUPS.flatMap((g) => byGroup[g.key]).sort((a, c) => new Date(c.publishedAt) - new Date(a.publishedAt));
  const day = stories.filter((s) => hoursAgo(s.publishedAt) < 24);
  const week = stories.filter((s) => hoursAgo(s.publishedAt) < 24 * 7);
  const countries = new Set(week.map((s) => s.country).filter((c) => c && c !== 'Unknown'));
  const ongoing = week.filter((s) => s.status === 'Ongoing' || s.status === 'Investigating');
  const breaking = stories.find((s) => s.breaking && hoursAgo(s.publishedAt) < 48);
  const pool = day.length >= 5 ? day : stories.slice(0, 12);
  const top5 = [...pool].sort((a, b) => (b.severity - a.severity) || ((b.sources?.length || 1) - (a.sources?.length || 1)) || (new Date(b.publishedAt) - new Date(a.publishedAt))).slice(0, 5);
  const regionsWith = new Set(latest.map((s) => s.region));
  const catCount = {};
  for (const s of latest) catCount[s.category] = (catCount[s.category] || 0) + 1;
  const cats = Object.keys(catCount).sort((a, b) => catCount[b] - catCount[a]);
  const chips = (group, values) => ['All', ...values].map((v) => `<button type="button" class="chip" data-group="${group}" data-value="${esc(v)}" aria-pressed="${v === 'All'}">${esc(v)}</button>`).join('');
  const clientData = latest.map((s) => ({ group: groupOf(s, now), checkedAt: s.checkedAt || null, advice: (s.advice || []).slice(0, 1), id: s.id, headline: s.headline, what: s.what, how: s.how, status: s.status, tone: s.tone, statusText: s.statusText, category: s.category, country: s.country, region: s.region, publishedAt: s.publishedAt, sourceName: s.sourceName, sourceUrl: s.sourceUrl }));
  const arrow = (d) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;

  const body = `
${doc.sample ? '<div class="notice"><div class="wrap">Showing sample stories until the live news feed is connected.</div></div>' : ''}
${breaking ? `<div class="breaking"><div class="wrap"><b>BREAKING</b><span>${esc(breaking.headline)}</span><a href="/story/${esc(breaking.id)}/" style="font-size:14px;font-weight:600">Read the short version →</a></div></div>` : ''}
<main>
<section class="wrap hero">
  <div class="hero-copy">
    <div class="eyebrow">CYBERCRIME · AI THREATS · WORLDWIDE</div>
    <h1>Every cyber attack. Every country. <em>In short.</em></h1>
    <p class="lead">Cybercrime, data breaches and AI scams from sources around the world, collected automatically and summed up in plain language: what happened, how it happened, and where things stand now.</p>
    <div class="btns"><a class="btn primary" href="#latest">Swipe the latest news</a><a class="btn" href="#map">Open attack map</a></div>
    <div class="hero-live">
      <div class="clockcard" role="timer" aria-label="Current date and time">
        <canvas id="clk" aria-hidden="true"></canvas>
        <div class="secrow"><span class="seclab">SEC</span><div class="sectrack"><i id="clk-bar"></i><u id="clk-head"></u></div><span class="secnum" id="clk-sec">00</span></div>
        <div class="clk-date" id="clk-date"></div>
        <div class="clk-zone"><div class="seg sm" role="group" aria-label="Time zone"><button type="button" id="clk-local" aria-pressed="true">MY TIME</button><button type="button" id="clk-utc" aria-pressed="false">UTC</button></div><small id="clk-zone"></small></div>
      </div>
      <div class="stats">
        <div class="stat"><b>${day.length}</b><span>incidents today</span></div>
        <div class="stat"><b>${countries.size}</b><span>countries this week</span></div>
        <div class="stat"><b>${ongoing.length}</b><span>still ongoing</span></div>
      </div>
    </div>
  </div>
  <div class="mapcard" id="map" data-mapview="3d">
    <noscript><style>.mapcard .map{display:block!important}.mapcard .globebox,.mapcard .mapseg{display:none!important}</style></noscript>
    <div class="maphead"><strong>Attack map</strong><div class="seg sm mapseg" role="group" aria-label="Map view"><button type="button" data-mapbtn="3d" aria-pressed="true">3D</button><button type="button" data-mapbtn="2d" aria-pressed="false">2D</button></div><span id="mapsub">Drag to turn the globe. Tap a glowing dot to see that country’s stories.</span></div>
    <div class="globebox">
      <canvas id="globe" tabindex="0" aria-label="Globe with glowing dots for countries that have recent attack stories. Drag or use the arrow keys to turn it. Tap a dot to filter the stories below to that country."></canvas>
      <div class="gtop" id="gtop" aria-label="Countries with the most stories"></div>
      <div class="glegend" id="glegend" role="group" aria-label="Show or hide story groups on the globe"></div>
    </div>
    <div class="map">
      <svg viewBox="0 0 1000 500" role="img" aria-label="Dot map of the world with regions that have recent incidents highlighted">
        <defs><pattern id="dots" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.5" fill="#2f7be0"/></pattern>
        <mask id="land"><rect width="1000" height="500" fill="#000"/><g fill="#fff">${MAP_POLYS.map((p) => `<polygon points="${p}"/>`).join('')}</g></mask></defs>
        <rect width="1000" height="500" fill="url(#dots)" mask="url(#land)"/>
      </svg>
      ${SPOTS.filter(([r]) => regionsWith.has(r)).map(([r, x, y]) => `<button type="button" class="hot" data-region="${esc(r)}" aria-label="Show stories from ${esc(r)}" style="left:${x}%;top:${y}%"><i></i><b></b></button>`).join('')}
    </div>
    <div class="legend legend2d"><span><i style="background:var(--accent)"></i>Region with recent incidents</span><span><i style="background:#2f7be0"></i>Countries covered</span></div>
  </div>
</section>

<section class="wrap block" id="top5">
  <div class="top5">
    <div class="head"><h2>Top 5 today</h2><span>The biggest incidents of the last 24 hours</span></div>
    ${top5.map((s, i) => `<a class="row" href="/story/${esc(s.id)}/"><span class="n">0${i + 1}</span><span class="t">${esc(s.headline)}</span>${tag(s.category)}${badge(s)}${timeEl(s.publishedAt)}</a>`).join('')}
  </div>
</section>

<section class="wrap block" id="latest">
  <div class="sechead">
    <div><h2>Latest incidents</h2><small><span id="count">${latest.length} stories</span> · sorted by what we know so far</small></div>
    <div class="seg" role="group" aria-label="View mode"><button type="button" data-view="swipe" aria-pressed="true">Swipe</button><button type="button" data-view="list" aria-pressed="false">List</button></div>
  </div>
  <div class="tools">
    <div class="search"><label class="sr" for="search">Search stories</label>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9fb0cc" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
      <input id="search" type="search" autocomplete="off" placeholder="Search by country, company or attack type"></div>
    <div class="cfilter" id="cfilter" hidden><span>Country: <b id="cfname"></b></span><button type="button" id="cfclear">Clear ✕</button></div>
    <div class="chips"><span>REGION</span>${chips('region', REGIONS)}</div>
    <div class="chips"><span>TYPE</span>${chips('cat', cats)}</div>
  </div>

  <div class="tabs" role="tablist" aria-label="Story groups">${GROUPS.map((g, i) => `<button type="button" role="tab" class="tab" data-tab="${g.key}" aria-selected="${i === 0}">${g.title}<span data-tabcount="${g.key}">${byGroup[g.key].length}</span></button>`).join('')}</div>
  <div class="cols">
  ${GROUPS.map((g, i) => `<div class="col ${g.key}${i === 0 ? ' on' : ''}" data-group="${g.key}">
    <div class="colhead"><i></i><h3>${g.title}</h3><b data-colcount>${byGroup[g.key].length}</b><span>${g.desc}</span></div>
    <div class="swipe" hidden>
      <div class="stage" tabindex="0" role="region" aria-label="${g.title} stories. Swipe up for the next story. Arrow keys also work.">
        <div class="track"></div>
        <div class="progress"><i></i></div>
        <div class="hint">${arrow('M6 14l6-6 6 6').replace('width="22" height="22"', 'width="18" height="18"')}SWIPE UP FOR NEXT</div>
      </div>
      <div class="ctl">
        <button type="button" class="prev" aria-label="Previous story">${arrow('M6 14l6-6 6 6')}</button>
        <span class="pos" aria-live="polite">1 / ${byGroup[g.key].length}</span>
        <button type="button" class="next" aria-label="Next story">${arrow('M6 10l6 6 6-6')}</button>
      </div>
    </div>
    <div class="grid list">${byGroup[g.key].map(listCard).join('')}</div>
    <div class="empty" hidden>Nothing in ${g.title} matches right now.</div>
  </div>`).join('')}
  </div>
  <div class="empty" id="empty" hidden>No stories match this search yet. Try another word, region or type.</div>
</section>
</main>
<script type="application/json" id="stories-data">${JSON.stringify(clientData).replace(/</g, '\\u003c')}</script>`;

  return layout({ title: NAME, desc: 'Cybercrime, data breaches and AI scams from around the world, in short cards: what happened, how it happened and the current status.', url: '/', body, active: 'Latest', bodyScripts: '<script src="/assets/globe.js" defer></script><script src="/assets/clock.js" defer></script>' });
}

/* ---------- story page ---------- */
function storyPage(s) {
  const related = stories.filter((x) => x.id !== s.id && (x.category === s.category || x.region === s.region)).slice(0, 3);
  const srcs = s.sources?.length ? s.sources : [{ name: s.sourceName, url: s.sourceUrl }];
  const ld = JSON.stringify({ '@context': 'https://schema.org', '@type': 'NewsArticle', headline: s.headline, datePublished: s.publishedAt, dateModified: s.updatedAt || s.publishedAt, description: s.what, publisher: { '@type': 'Organization', name: NAME } });
  const body = `<main class="wrap story">
  <article class="story-main">
    <a class="back" href="/#latest">← All incidents</a>
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="tags">${tag(s.category)}${badge(s)}<small>${esc(place(s))}${s.region && s.region !== 'Other' ? ' · ' + esc(s.region) : ''}</small></div>
      <h1>${esc(s.headline)}</h1>
      <div class="byline">First reported ${esc(fmtDateTime(s.publishedAt))} · Summarised by AI from ${srcs.length} source${srcs.length === 1 ? '' : 's'}</div>
    </div>
    <div class="answers">
      <div><b>WHAT HAPPENED</b><p>${esc(s.what)}</p></div>
      ${known(s.how) ? `<div><b>HOW IT HAPPENED</b><p>${esc(s.how)}</p></div>` : ''}
      <div><b>CURRENT STATUS</b><p>${esc(s.statusText)}</p></div>
    </div>
    <div class="devs"><h2>How the story has developed</h2>
      ${(s.updates || []).map((u) => `<div class="dev"><div class="rail"><i class="${esc(s.tone)}"></i></div><div class="body"><small>${esc(fmtDateTime(u.at))}${u.source ? ' · ' + esc(u.source) : ''}</small>${esc(u.text)}</div></div>`).join('')}
    </div>
    ${s.advice?.length ? `<div class="advice"><h2>What should I do?</h2><ul>${s.advice.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></div>` : ''}
    <div class="srcs"><h2>Sources</h2><ul>${srcs.map((x) => `<li><a href="${esc(x.url)}" target="_blank" rel="noopener nofollow">${esc(x.name)}: read the original ↗</a></li>`).join('')}</ul>
      <small>This is an AI summary and can contain mistakes. Read the original reports for full details.</small></div>
  </article>
  <aside class="story-side">
    <div class="side"><h2>AT A GLANCE</h2>
      <div class="kv"><span>Type</span><span>${esc(s.category)}</span></div>
      <div class="kv"><span>Country</span><span>${esc(place(s))}</span></div>
      <div class="kv"><span>Status</span><span>${esc(s.status)}</span></div>
      <div class="kv"><span>Reported by</span><span>${srcs.length} outlet${srcs.length === 1 ? '' : 's'}</span></div>
    </div>
    ${related.length ? `<div class="side"><h2>RELATED STORIES</h2>${related.map((r) => `<a class="rel" href="/story/${esc(r.id)}/"><b>${esc(r.headline)}</b><small>${esc(r.category)} · ${esc(place(r))} · ${esc(ago(r.publishedAt))}</small></a>`).join('')}</div>` : ''}
  </aside>
</main>`;
  return layout({ title: s.headline, desc: s.what, url: '/story/' + s.id + '/', body, jsonld: ld });
}

/* ---------- timeline ---------- */
function timelinePage() {
  const cats = [...new Set(stories.map((s) => s.category))];
  const groups = [];
  for (const s of stories) {
    const m = monthLabel(s.publishedAt);
    if (!groups.length || groups[groups.length - 1].m !== m) groups.push({ m, items: [] });
    groups[groups.length - 1].items.push(s);
  }
  const body = `<main class="wrap tl-wrap">
  <div class="pagehead narrow"><div class="eyebrow">INCIDENT TIMELINE</div><h1>The big incidents, <em>in order.</em></h1>
  <p class="lead">A running record of cyber attacks, breaches and scams around the world, newest first. Tap any entry for the full story.</p></div>
  <div class="chips" style="margin:28px 0 8px"><span>TYPE</span>${['All', ...cats].map((c) => `<button type="button" class="chip" data-value="${esc(c)}" aria-pressed="${c === 'All'}">${esc(c)}</button>`).join('')}</div>
  <div class="tl" data-timeline>
    ${groups.map((g) => `<div class="mgroup"><div class="month">${esc(g.m)}</div>${g.items.map((s) => `<div class="ev" data-cat="${esc(s.category)}"><div class="rail"><i class="${esc(s.tone)}"></i></div><a class="box" href="/story/${esc(s.id)}/"><div class="meta"><time datetime="${esc(s.publishedAt)}">${esc(fmtDay(s.publishedAt))}</time>${tag(s.category)}${badge(s)}</div><h3>${esc(s.headline)}</h3><p>${esc(place(s))} · ${esc(s.statusText)}</p></a></div>`).join('')}</div>`).join('')}
  </div>
</main>`;
  return layout({ title: 'Incident timeline', desc: 'A running timeline of cyber attacks, data breaches and scams around the world.', url: '/timeline/', body, active: 'Timeline' });
}


/* ---------- archive ---------- */
const srcLinks = (e) => e.sources.map(([n, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener nofollow">${esc(n)} ↗</a>`).join(' · ');
function archListCard(e) {
  return `<article class="card" data-id="${esc(e.id)}">
    <div class="r">${tag(e.kind)}<span class="badge ${esc(e.tone)}"><i></i>${esc(e.status)}</span></div>
    <h3>${esc(e.headline)}</h3>
    <p class="st"><b>WHEN</b>${esc(e.when)} · ${esc(e.country)}</p>
    <p>${esc(e.what)}</p>
    <p class="st"><b>HOW IT HAPPENED</b>${esc(e.how)}</p>
    <p class="st"><b>HOW IT WAS FIXED</b>${esc(e.fixed)}</p>
    <div class="protect"><b>PROTECT YOURSELF</b><p>${esc(e.protect)}</p></div>
    <div class="foot"><span>Sources: ${srcLinks(e)}</span></div>
  </article>`;
}
function archivePage() {
  const asOf = fmtDate(archive.asOf || new Date().toISOString());
  const regions = ['Worldwide', 'India', 'AI scams'];
  const eras = [...new Set(archEntries.map((e) => e.era))].sort().reverse();
  const chips = (group, values) => ['All', ...values].map((v) => `<button type="button" class="chip" data-group="${group}" data-value="${esc(v)}" aria-pressed="${v === 'All'}">${esc(v)}</button>`).join('');
  const clientData = archEntries.map((e) => ({ archive: true, id: e.id, headline: e.headline, what: e.what, how: e.how, fixed: e.fixed, protect: e.protect, status: e.status, tone: e.tone, kind: e.kind, when: e.when, country: e.country, region: e.region, category: e.era, sourceName: e.sources[0][0], sourceUrl: e.sources[0][1] }));
  const arrow = (d) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  const body = `<div class="notice"><div class="wrap">Past attacks, not today's news. Statuses are as of ${esc(asOf)} and can change, for example while court cases continue.</div></div>
<main>
<section class="wrap pagehead narrow" style="padding-top:48px">
  <div class="eyebrow">ARCHIVE</div>
  <h1>Big attacks of the past, <em>and what we learned.</em></h1>
  <p class="lead">${archEntries.length} landmark cyber incidents from around the world and India: when each happened, how it was fixed, and how you can stay safe. Learn from them to stay safe online.</p>
</section>
<section class="wrap block" id="latest">
  <div class="sechead">
    <div><h2>Archive</h2><small><span id="count">${archEntries.length} stories</span> · newest first</small></div>
    <div class="seg" role="group" aria-label="View mode"><button type="button" data-view="swipe" aria-pressed="true">Swipe</button><button type="button" data-view="list" aria-pressed="false">List</button></div>
  </div>
  <div class="tools">
    <div class="search"><label class="sr" for="search">Search the archive</label>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9fb0cc" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
      <input id="search" type="search" autocomplete="off" placeholder="Search by country, company or attack type"></div>
    <div class="chips"><span>FOCUS</span>${chips('region', regions)}</div>
    <div class="chips"><span>ERA</span>${chips('cat', eras)}</div>
  </div>
  <div class="cols single"><div class="col on" data-group="all">
    <div class="swipe" hidden>
      <div class="stage arch-stage" tabindex="0" role="region" aria-label="Archive cards. Swipe up for the next one. Arrow keys also work.">
        <div class="track"></div>
        <div class="progress"><i></i></div>
        <div class="hint">${arrow('M6 14l6-6 6 6').replace('width="22" height="22"', 'width="18" height="18"')}SWIPE UP FOR NEXT</div>
      </div>
      <div class="ctl">
        <button type="button" class="prev" aria-label="Previous">${arrow('M6 14l6-6 6 6')}</button>
        <span class="pos" aria-live="polite">1 / ${archEntries.length}</span>
        <button type="button" class="next" aria-label="Next">${arrow('M6 10l6 6 6-6')}</button>
      </div>
    </div>
    <div class="grid list">${archEntries.map(archListCard).join('')}</div>
    <div class="empty" hidden>Nothing matches this search. Try another word, focus or era.</div>
  </div></div>
  <p class="archfoot">Summaries are AI-assisted and checked against the linked sources. Where something is not public, we say "Not publicly reported". Blame for an attack is shown as "attributed to", not as proven fact, unless a court has decided.</p>
</section>
</main>
<script type="application/json" id="stories-data">${JSON.stringify(clientData).replace(/</g, '\\u003c')}</script>`;
  return layout({ title: 'Archive of landmark cyber attacks', desc: 'Landmark cyber attacks from around the world and India: when they happened, how they were fixed, and how to protect yourself.', url: '/archive/', body, active: 'Archive' });
}

/* ---------- about / privacy ---------- */
const section = (h, p) => `<div><h2>${h}</h2><p>${p}</p></div>`;
function aboutPage() {
  const body = `<main class="wrap narrow">
  <div class="pagehead"><div class="eyebrow">ABOUT</div><h1>Cyber news, <em>short and global.</em></h1>
  <p class="lead">${esc(NAME)} follows cybercrime, data breaches and AI-powered scams from every part of the world and turns each incident into a short card you can read in seconds.</p></div>
  <div class="prose">
    ${section('How it works', 'Our system collects stories from public news sources in many countries, keeps the ones about cyber attacks, breaches and scams, and uses AI to write a short summary: what happened, how it happened and the current status.')}
    ${section('Where the news comes from', 'Every card links to the original publisher. We summarise, we do not copy, and we encourage you to read the full report at the source.')}
    ${section('A note on accuracy', 'Summaries are generated by AI and can contain mistakes. When a detail is not reported, such as the current status of an attack, we say so instead of guessing.')}
    ${section('Contact', `Found an error or want to share a tip? Write to <a href="mailto:${esc(cfg.contactEmail)}">${esc(cfg.contactEmail)}</a>.`)}
  </div></main>`;
  return layout({ title: 'About', desc: `About ${NAME}: worldwide cybercrime and AI-threat news in short cards.`, url: '/about/', body, active: 'About' });
}
function privacyPage() {
  const counts = !!cfg.cloudflareAnalyticsToken;
  const body = `<main class="wrap narrow">
  <div class="pagehead"><div class="eyebrow">PRIVACY POLICY</div><h1>Your privacy, <em>simply put.</em></h1>
  <p class="lead">Last updated: October 2026. This page explains in plain words what ${esc(NAME)} does and does not collect.</p></div>
  <div class="prose">
    ${section('No account, no login', 'You can read ' + esc(NAME) + ' without signing up or logging in. We do not ask for your name, email address or any other personal details to read the site.')}
    ${section('Counting visits', counts
      ? 'We use Cloudflare Web Analytics to count how many people visit and which pages are read. Cloudflare describes it as a privacy-first tool that does not use cookies and does not track visitors across other sites. We do not use it to build advertising profiles. Cloudflare handles this data under its own privacy policy.'
      : 'We do not currently run any tool that tracks visitors. If we add a visit counter later, we will say so here.')}
    ${section('Hosting', esc(NAME) + ' is hosted on Cloudflare. To deliver the site, Cloudflare handles technical details such as your IP address and browser type, under its own privacy policy. We do not use this to identify you.')}
    ${section('Saved on your device', 'The site remembers your choice between Swipe and List view in your browser, and saves pages so the site loads faster. This stays on your device. You can clear it any time in your browser settings.')}
    ${section('News and AI summaries', 'Stories come from public news sources and may be summarised by software. We do not send any information about visitors to those services. Summaries can contain mistakes, so every story links to the original publisher.')}
    ${section('Alerts', 'We do not currently offer alerts or notifications. If we add them later, they will be optional, and this policy will be updated first.')}
    ${section('Children', esc(NAME) + ' is written to be suitable for all ages. We do not collect personal information from anyone, including children.')}
    ${section('Links to other sites', 'Each story links to the original publisher. Those sites have their own privacy policies and we are not responsible for them.')}
    ${section('Changes to this policy', 'If we change how the site works, we will update this page and its date.')}
    ${section('Contact', `Questions about privacy? Write to <a href="mailto:${esc(cfg.contactEmail)}">${esc(cfg.contactEmail)}</a>.`)}
  </div></main>`;
  return layout({ title: 'Privacy Policy', desc: `${NAME} privacy policy.`, url: '/privacy/', body });
}
function notFound() {
  const body = `<main class="wrap narrow"><div class="pagehead"><div class="eyebrow">404</div><h1>That page <em>isn't here.</em></h1><p class="lead">The story may have moved or never existed. <a href="/">Back to the latest news</a>.</p></div></main>`;
  return layout({ title: 'Page not found', desc: 'Page not found.', url: '/404.html', body });
}

/* ---------- write everything ---------- */
await fs.rm(DIST, { recursive: true, force: true });
await fs.mkdir(path.join(DIST, 'assets'), { recursive: true });
for (const f of ['style.css', 'app.js', 'globe.js', 'clock.js', 'icon.svg']) await fs.copyFile(path.join(ROOT, 'site', f), path.join(DIST, 'assets', f));
await fs.copyFile(path.join(ROOT, 'site', 'sw.js'), path.join(DIST, 'sw.js'));
let hasPng = true;
for (const f of ['icon-192.png', 'icon-512.png']) {
  try { await fs.copyFile(path.join(ROOT, 'site', f), path.join(DIST, 'assets', f)); } catch { hasPng = false; }
}
await out('manifest.webmanifest', JSON.stringify({
  name: NAME, short_name: NAME, description: cfg.tagline, start_url: '/', scope: '/', display: 'standalone',
  background_color: '#070b14', theme_color: '#070b14',
  icons: [{ src: '/assets/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }, ...(hasPng ? [{ src: '/assets/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/assets/icon-512.png', sizes: '512x512', type: 'image/png' }] : [])]
}, null, 1));
await out('index.html', homePage());
await out('timeline/index.html', timelinePage());
await out('archive/index.html', archivePage());
await out('about/index.html', aboutPage());
await out('privacy/index.html', privacyPage());
await out('404.html', notFound());
for (const s of stories) await out(`story/${s.id}/index.html`, storyPage(s));
await out('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${BASE}/sitemap.xml\n`);
const urls = ['/', '/timeline/', '/archive/', '/about/', '/privacy/', ...stories.map((s) => `/story/${s.id}/`)];
await out('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${esc(BASE + u)}</loc></url>`).join('\n')}\n</urlset>\n`);
await out('stories.json', JSON.stringify({ updatedAt: doc.updatedAt, stories }));

console.log(`built ${urls.length + 1} pages into ${DIST} (${stories.length} stories${doc.sample ? ', SAMPLE data' : ''})`);
