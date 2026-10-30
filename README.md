# CyberStorm

Worldwide cybercrime and AI-threat news as short swipe-up cards: **what happened, how it happened, current status.**
No accounts, no login. Static website, no dependencies (Node 20+ only).

## How it works

```
news feeds (10 security sites + Google News in 12 countries)
        │  scripts/fetch.mjs   every 30 min (GitHub Actions)
        ▼
 filter → merge duplicates → AI summary → data/stories.json
        │  scripts/build.mjs   (Cloudflare Pages build)
        ▼
 dist/  home (swipe + list, search, filters, map, Top 5), story pages, timeline, about, privacy, sitemap, PWA
```

- **Duplicates:** the same incident from several outlets becomes one story with several sources and a "how it developed" timeline.
- **Breaking:** severity ≥ 4 and reported by ≥ 3 outlets (`config.json`). Flagged as `breaking` and shown in the top strip. Push/email alerts are the next phase (see below).
- **Honesty rule:** the AI is told to write "Not yet reported." instead of guessing.
- **Without an AI key** it still works: English feeds only, plain summaries taken from the feed text.

## Run it locally

```bash
node scripts/test.mjs      # offline checks (no network needed)
node scripts/build.mjs     # builds dist/ (sample stories if data/stories.json is missing)
node scripts/fetch.mjs     # collects real news (needs internet; set ANTHROPIC_API_KEY for AI summaries)
cd dist && python3 -m http.server 8000
```

## Go live (all free tiers)

1. Create a GitHub repository and push this folder.
2. GitHub → Settings → Secrets → Actions → add `ANTHROPIC_API_KEY`.
3. Run the **Update news** workflow once (Actions tab → Run workflow) and check its log. Feeds that fail are reported as `SKIP`; fix or remove them in `sources.json`.
4. Cloudflare Pages → Connect to Git → build command `node scripts/build.mjs`, output folder `dist`.
5. Edit `config.json`: set `siteUrl` to your real domain.
6. Cloudflare → Web Analytics → add your site, copy the token into `cloudflareAnalyticsToken` in `config.json`.
7. Replace the draft text on the Privacy page (`scripts/build.mjs`, `privacyPage`) with a reviewed policy.

## Current / Solved / Unresolved (V3)

The home page sorts every story into three columns (tabs on phones): **Solved** (status "Arrests made" or "Contained"), **Current** (updated in the last 48 hours), **Unresolved** (older, no fix reported). When a later article about the same incident arrives, the card is updated: a better status replaces "Not yet reported", a stated cause fills "How it happened" (credited to the outlet), and open cards show "Last checked". Groups are recalculated on every build. Off-topic news is dropped by a stricter relevance filter, and the country is no longer guessed from the news edition.

## Archive

`data/archive.json` holds the landmark attacks shown at `/archive/` (swipe + list, filters, search). It is a fixed, hand-checked list, not fetched automatically. To add one, copy an entry, fill every field, give it at least one https source, and rebuild. Keep wording factual: say "attributed to X" for blame and "Not publicly reported" for unknowns.

## Things to know

- `sources.json` feed addresses were written without being able to test them from the build workspace. Check the first run's log.
- Google News feeds are convenient for many countries but have their own terms of use; review them before relying on them commercially.
- Cost: AI summaries run once per new story (default model `claude-haiku-5-5`, change in `config.json`). `maxNewPerRun` caps each run.
- Summaries are AI-generated and can be wrong. Every card links to the original publisher.

## Next phase

- Push / email alerts for `breaking` stories (needs a small backend, e.g. a Cloudflare Worker + a push or email service).
- Optional Android/iOS wrapper once the site has regular readers.


## Globe and clock (home page)

- `site/globe.js` draws the Attack map as a 3D globe (no libraries). Dots come from the stories already on the page (country, group). Tapping a dot filters the stories below to that country (`cs-pick` / `cs-country` events handled in `site/app.js`). The old flat map is kept behind the 3D / 2D switch; the choice is remembered (`cs-map`). Phones that ask for reduced motion, or have 2 CPU cores or less, start on 2D.
- `site/clock.js` draws the hero clock: green hour ring, blue minute ring, red seconds line, date, MY TIME / UTC switch (`cs-clock-utc`).
- To add a country to the globe, add its `[longitude, latitude]` to the table at the top of `site/globe.js`.
