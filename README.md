# Upcoming Levels List (ULL)

**Upcoming Levels List (ULL)** is a community-maintained catalogue of upcoming
Top 1–100 Extreme Demons in Geometry Dash projected to place on the Demonlist.
It aims to forecast future rankings, including worthy unrated levels.

🌐 **Website:** https://ull.pages.dev  ·  💬 **Discord:** https://discord.gg/QRX47v2qyC  ·  𝕏 **X:** [@ull_gd](https://x.com/ull_gd)

> Not affiliated with RobTop Games. These guidelines are adapted from, and heavily
> rely on, the structure and principles of the Global Demonlist Guidelines — full
> credit to the original authors.

---

## The List

Levels are organized into three tiers. Positioning is consistent across all of
them; each tier simply applies a different inclusion threshold, forming a
hierarchy of probability and quality.

| Tier | What it contains |
|------|------------------|
| **All Levels** | The most comprehensive catalogue, with the lowest inclusion threshold — every level with a conceivable chance of being verified and published. |
| **Main List** | Levels that meet the fundamental standards required to be considered for an official rating ("Rate") by the developer. |
| **Future List** | The highest standard of the three — levels with a very high likelihood of imminent verification and publication. |

The site also features the **Pending List** (levels awaiting placement), **Upcoming
Levels** (ranked by verification progress), a **Leaderboard**, and **Events**
(Level of the Month and the level Closest to Verification).

---

## Staff Team

Moderators and Elder Moderators determine level positions, place levels,
participate in quality control, and keep the site up to date. Admins additionally
manage a sector of the project's operation; the List Leader oversees the list and
its staff team.

| Role | Name | Contact |
|------|------|---------|
| List Leader | **QwidziT** | Discord `@qwidzit` · Telegram `@qwidzit` |
| Admin | **Exiled_shade** | Discord `@exiled_shade` |
| Elder List Moderator | **Niroi** | Discord `@niroi_` |
| Elder List Moderator | **Keres** | Discord `@keresgmd` |
| Elder List Moderator | **ItzDel1ghtfuL** | Discord `@itzdel1ghtful` |
| Elder List Moderator | **LukeLGamer** | Discord `@lukelgamer` |
| List Moderator | **Terra** | Discord `@.terralith` |
| List Moderator | **Vantevia** | Discord `@vantev1a` |
| List Moderator | **TheCatAstronaut** | Discord `@thecatastronaut` |
| List Moderator | **Qponn** | Discord `@q.ponn` · X `@qponnx` |
| List Moderator | **Blaster1337** | Discord `@blastuh` · X `@TheFakeBlaster` |
| Website Coder | **Prometheus** | Discord `@prometheus.dev` |

> The order staff appear in on the site is set by hand in the admin panel
> (Editors tab → ▲ / ▼) and is stored on `editor_keys.sort_order` — the site never
> sorts them alphabetically. Renaming an editor there keeps their API key, role,
> link and position intact.

---

## Scoring

### Leaderboard

Every entry a player earns is based on `recordScore(rank, percent)`
(`js/formulas.js`), where `rank` is the level's position in **All Levels**:

| Entry | Worth | When |
|-------|-------|------|
| **Verification** | `recordScore(rank, 100) × 2` | The level is verified and you are its verifier. The level's records and runs are then ignored. |
| **Layout completion** | `recordScore(rank, 100) × 1.6` (0.8 × a verification) | A 100% record on a level that is **not verified yet** — you beat it in its current, undecorated state (e.g. Snowblind, Map of Problematique). |
| **Record** | `recordScore(rank, percent)` | A from-0% attempt. |
| **Run** | `recordScore(rank, b − a)` | A `a-b` run span. |

A player's total is the sum of all their entries.

### Upcoming Levels order

Upcoming Levels ranks how close a level is to being verified:

```
rankingScore = max(P, R)² + min(P, R)^1.8
```

- **P** — the highest record percent on the level (from 0%).
- **R** — the largest run span (`b − a` from an `a-b` run).

Levels are sorted by this score, highest first. The better of the two attempts
dominates (squared) while the weaker one adds a smaller bonus (^1.8). The score depends
only on the progress made — a level's position in All Levels is not part of it, so two
levels with the same records tie regardless of rank. Verified levels, levels with no
records or runs at all, and levels that already have a 100% record are excluded.

### Benchmark Mode

Benchmark Mode (Settings) hides verified levels except those marked as benchmarks,
leaving the upcoming levels plus a few finished ones as reference points. The
placements are **recounted** for that view — the levels you can see are numbered
`#1, #2, #3 …` with no gaps — and each list (All Levels, Main, Future) numbers its
own. Searching or filtering within Benchmark Mode does not change those numbers.

It is a display setting, not a filter: **Reset Filters leaves it alone**, and it
persists across pages and reloads.

---

## Public API

The list data is served by a JSON API. All endpoints below are public and require
no authentication.

**Base URL:** `https://d1-wrkr.ullteam.workers.dev`

### Endpoints

| Method & path | Returns |
|---------------|---------|
| `GET /api/list` | All levels, ordered by rank |
| `GET /api/list/main` | Levels on the Main List |
| `GET /api/list/future` | Levels on the Future List |
| `GET /api/levels/{position}` | The single level at a given 1-based rank |
| `GET /api/pending` | Pending List entries |
| `GET /api/editors` | The staff/editor list (`{name, role, link}`) |
| `GET /api/level-month` | The current Level of the Month (or `null`) |
| `GET /api/level-verif` | The current Closest to Verification (or `null`) |
| `GET /api/recent-changes` | Recent changes feed, grouped by date |

> Endpoints that add or modify list data require a staff API key and are not part
> of the public API. Staff add and edit levels from the admin panel's **Levels** tab
> (**+ New Level**, or click any row). Staff-only routes cover levels, pending entries, editors
> (including manual ordering and renaming) and the recent-changes feed — see
> [database.md](./database.md) for the full list.

The editor list is returned in the order the staff team arranged it in the admin
panel (`sort_order`), **not** alphabetically. Recent changes come back newest-first
by the same manual ordering, grouped into `{date, entries[]}`.

### Example

```bash
curl https://d1-wrkr.ullteam.workers.dev/api/list
```

### Level object

Each level returned by `/api/list` (and related endpoints) has this shape:

| Field | Type | Description |
|-------|------|-------------|
| `path` | string | Unique slug / identifier for the level |
| `name` | string | Level name |
| `author` | string | Host / main author |
| `creators` | string[] | All credited creators |
| `verifier` | string | Verifier (or `"Open Verification"`) |
| `verification` | string | Verification video URL |
| `showcase` | string | Showcase video URL |
| `thumbnail` | string | Thumbnail image URL |
| `frameCounter` | string \| null | Frame Windows Counter video URL, if any |
| `id` | string | In-game level ID (or `"private"`) |
| `rating` | number | Difficulty rating |
| `length` | number | Length in seconds |
| `percentToQualify` | number | Qualifying percentage |
| `percentFinished` | number | Decoration progress (0–100) |
| `lastUpd` | string | Last update date, `DD.MM.YYYY` |
| `tags` | string[] | Tags (e.g. `Public`, `Finished`, `Layout`, `Rated`) |
| `records` | object[] | Best records — `{user, link, percent, hz}` |
| `run` | object[] | Best runs — `{user, link, percent, hz}` |
| `isVerified` | boolean | Whether the level is verified |
| `isMain` | boolean | On the Main List |
| `isFuture` | boolean | On the Future List |
| `benchmark` | boolean | Marked as a benchmark level |
| `sort_order` | number | Ranking order |

---

## Search & AI visibility

The site is a Vue SPA, so a crawler that does not run JavaScript would otherwise
see an empty page. `scripts/build-seo.mjs` closes that gap: it writes a real
static HTML file for every public URL, each with its own `<title>`, meta
description, canonical link, Open Graph tags, JSON-LD graph and a readable
no-JavaScript version of the page. Cloudflare Pages serves those files ahead of
the `/* -> /index.html` fallback in `_redirects`, and `js/main.js` removes the
static block the moment Vue mounts.

```bash
node scripts/build-seo.mjs
```

Generated — **do not edit by hand**:

| Output | What it is |
|--------|------------|
| `index.html` (marker regions only) | Home page head + static content |
| `list/`, `listmain/`, `listfuture/`, `upcoming/`, `pending/`, `leaderboard/`, `events/`, `information/` | One `index.html` per public route |
| `sitemap.xml` | All public URLs with `lastmod` |
| `llms.txt` | Plain-text brief for AI crawlers and answer engines |
| `js/seo-meta.js` | Titles/descriptions for client-side navigations |

### The hourly refresh

`.github/workflows/refresh-content.yml` keeps the pre-rendered HTML in step with
the live list:

```bash
node scripts/fetch-data.mjs     # API -> data/_seo-snapshot.json
node scripts/build-css.mjs      # css/*.css -> css/bundle.css
node scripts/build-seo.mjs      # snapshot -> static pages
```

Fetching and generating are **separate steps on purpose**. `fetch-data.mjs`
writes nothing unless every required endpoint answered and the result passed its
checks — a minimum level count, no missing paths or names, no duplicate paths,
and no sudden collapse in list size. `build-seo.mjs` always generates from
whatever snapshot is committed. So a failed fetch leaves the site exactly as it
was instead of publishing an empty list, and the build runs offline.

Visitors are never affected by the delay: the Vue app fetches the API on every
page load. Only the copy that crawlers read is up to an hour behind.

Run `node scripts/fetch-data.mjs --fixture` to build a snapshot from the legacy
`data/` directory when you have no network.

### Level pages

Every level gets its own URL at `/level/<slug>`, pre-rendered with its
position, creators, verifier, records, progress and video links, and live in the
SPA through the `/level/:slug` route.

It is the page strangers arrive on from a search result or a shared link, so it
carries its own hero rather than the list's chrome (`js/pages/LevelPage.js`,
`css/pages/level-page.css`):

- a **hero** with the level's own thumbnail blurred behind the title, the byline
  ("by *host* · verified by *verifier*", or **to be verified by** while the level
  is unverified), the status pill and the tags;
- its **placements** in All Levels / Main List / Future List as three cards, each
  linking to that list;
- the **video** (Showcase / Verification tabs when both exist) with the creators
  underneath;
- a sticky rail of **Progress**, **World records**, **Details** and the actions.

**No fields exist only for this page.** Both progress bars are derived from what
the API already returns — decoration from `percentFinished`, verification from
the better of the best from-0 record and the widest run span, which is the same
`verifyProgress` measure the lists colour level names by. The status pill uses
that same colour scale, so a level reads the same here as in the list. `Verified`,
`Verifying`, `Being Verified` and `Layout` are dropped from the tag row because
the status pill already says them.

`frameCounter` shows up as a **Frame Windows Counter → Watch here** row in
Details, and the row is omitted entirely when the field is null or blank.

The list panels on All Levels, Main List and Future List each carry an **Open
Level Page** button on the title row (`.level-open`, in
`css/components/level-share.css`) — a real `router-link` to `/level/<slug>`, so it
can also be middle-clicked or copied. The "Share level" control lower down is
unchanged and still copies the URL rather than navigating.

The slug comes from the level's API `path`, not its name, because **staff rename
levels regularly and a URL that 404s throws away whatever ranking and inbound
links it had earned**. `data/_level-registry.json` remembers every slug the site
has ever published, and `scripts/seo/registry.mjs` decides what each one serves:

| What happened | What the URL does |
|---------------|-------------------|
| Level renamed | Nothing — the `path` is unchanged, so the URL is too; only the content updates |
| The `path` itself edited | The old URL 301s to the new one, matched by name |
| Level removed | Keeps its page for `GRACE_DAYS` (180) marked `noindex` and saying it is no longer listed, then 301s to `/list` |
| Level comes back | The retirement is cleared and the page returns |

Nothing is ever deleted from the registry, so a slug can never be silently
reused for a different level. Redirects are written into the marked block in
`_redirects`. Run `node js/registry.test.mjs` after touching any of this.

### Stylesheets

`css/bundle.css` is generated by `scripts/build-css.mjs` from the list of
stylesheets in `index.html`, in that exact order — the cascade depends on it.
Keep editing the files under `css/`; only the bundle is served. Add or reorder a
stylesheet in the commented `css:start` block in `index.html`, then re-run the
script.

### The static block is for crawlers only

A visitor must never see it. The boot shield at the top of `index.html` runs
before `<body>` is parsed: it marks `<html class="js">`, which an inline rule
uses to hide `#seo-fallback` outright, and paints the visitor's own theme
colour so the screen holds that instead of a white or half-styled page while Vue
loads. `main.js` then removes the block before mounting.

Readers with JavaScript off — which is every AI crawler that matters here — still
get the full block. `node js/seo.test.mjs` holds Vue back deliberately and
samples the page throughout the load to prove nothing flashes.

Page copy lives in `scripts/seo/content.mjs` — edit it there and re-run the
script. Everything in `index.html` **outside** the `seo:head` and `seo:content`
markers (stylesheets, the Vue template, shared meta) is hand-maintained and
copied verbatim into every generated page, so re-run the build after touching it.

> The `google-site-verification` meta tag in `index.html` is what keeps the
> Google Search Console property verified. Do not remove it.

Run `node js/seo.test.mjs` after any change here.

---

## Deploying

The Worker and its D1 database are managed in the Cloudflare dashboard, not from this
repo. In order:

1. **D1 Console** → paste `scripts/schema-migrations.sql` (whole file).
   `ALTER TABLE` steps may report "duplicate column name" — that just means the column
   already exists.
2. **Workers & Pages → the worker → Edit code** → paste `worker/worker.js` → **Deploy**.
3. *(optional)* **D1 Console** → paste `scripts/seed-recent-changes.sql` to seed the
   Recent Changes feed. It replaces every row, so only run it before staff start
   editing the feed in the admin panel.

> The D1 Console strips SQL comments, so a paste containing only comments fails with
> "Requests without any query are not supported". Both `.sql` files above are kept
> comment-free for that reason — don't add header comments to them.

Moving this build to another repo as the live site? See
[docs/MOVE-TO-MAIN-REPO.md](docs/MOVE-TO-MAIN-REPO.md) — step-by-step, with a
troubleshooting section.

### Tests

```bash
node worker/worker.test.mjs             # Worker against the live schema
node worker/worker.unmigrated.test.mjs  # Worker against the pre-migration schema
node worker/worker.throttle.test.mjs    # auth rate limiter
node js/leaderboard.test.mjs            # leaderboard scoring vs the /data snapshot
node js/upcoming.test.mjs               # Upcoming Levels ordering
node js/util.test.mjs                   # thumbnail URL resolution
node js/registry.test.mjs               # level-slug guards: renames, removals, redirects

npm i playwright vue@3.2.31 vue-router@4.0.14
node css/mobile-footer.test.mjs         # mobile footer layout
node js/list-ui.test.mjs                # benchmark recounting + Return to top
node scripts/e2e-test.mjs               # home page + admin panel in Chromium
node js/seo.test.mjs                    # per-URL metadata, crawler + no-JS behaviour
node js/pending-ui.test.mjs             # Pending List links (desktop + mobile)
```

## Security

Found a vulnerability? Please see [SECURITY.md](./SECURITY.md) for how to report it.

## Using this template

You're welcome to build on this project — just credit it somewhere and make clear
that you are not affiliated with the Upcoming Levels List.
