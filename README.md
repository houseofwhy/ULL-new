# Upcoming Levels List (ULL)

**Upcoming Levels List (ULL)** is a community-maintained catalogue of upcoming
Top 1–135 Extreme Demons in Geometry Dash projected to place on the Demonlist.
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
| Developer | **Niko** | — |

> This table is a copy. The roster the site shows comes from `GET /api/editors`, which
> is what to trust if the two disagree — a name added in the admin panel appears on the
> site immediately and here only when someone remembers.
>
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
| `GET /api/editors` | The staff/editor list (`{name, role, link, sort_order}`) |
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

### Refreshing the pre-rendered HTML

There is no CI — this repository has no `.github/` directory and nothing runs on a
schedule. Keeping the pre-rendered HTML in step with the live list is three commands,
run by hand and committed:

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

The level container on All Levels, Main List, Future List and Upcoming Levels is
one component, `js/components/List/LevelPanel.js`. It ends with **Open level
page** — a `router-link` to `/level/<slug>` — beside **Share level**, an ordinary
`<a href="/level/…">` that copies the URL on click instead of navigating, so it
can still be middle-clicked, right-click-copied and crawled. On mobile the
expanded row carries the same Open level page button.

`node js/seo.test.mjs` pins the share control's markup and behaviour: a real
link, the words "Share level", a click that copies an absolute URL and does not
navigate away.

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

## Design system

Every page is built from one set of components rather than its own styling.

| File | What it is |
|------|------------|
| `css/ull-v2.css` | The shared layer. Eyebrow headings, cards, the status pill, chips, rank chips, meters, stat cards, definition lists, buttons, the page hero, the thumbnail hero, rows and empty states. Scoped to `.ull2`, which every page carries on its `<main>`. |
| `css/pages/mobile-v2.css` | Only what differs at 390px: one column, a detail that expands under its row, the tab bar, the bottom sheet, and a type scale one step down. Everything else on mobile comes from `ull-v2.css` unchanged. |
| `js/components/List/LevelPanel.js` | The level container, rendered by All Levels, Main List, Future List and Upcoming Levels. |
| `css/pages/mobile-info.css` | The phone's Information page. It carries `.info-page` as well as `.mob-info`, so the prose, legends, tables and people rows come from `css/pages/information.css` unchanged and this file holds only the 390px differences. |
| `js/util.js` | The shared readings a level page and a list row both need: `levelStatus`, `decorationPercent`, `verificationEvidence`, `verificationPercent`, `verificationLabel`, `bestRecord`, `bestRun`, `recordLink`, `levelLength`, `levelId`, `hasVerifier`, `isOpenVerification`, `verifierLabel`, `verifierLine`, `levelRanks`. Derive nothing twice. |
| `js/info-windows.js` | The Information page's seven windows, their counts and the one search index over the guidelines, the FAQ, the endpoints, the level fields and both legends. Read by the desktop page and the phone. |
| `js/components/MarksLegend.js` | The two legends — the colour scale and the Pending icons — without a window around them. Used by the Information page's reader, the phone's sheet and `MarksWindow`, so the three cannot drift. |
| `js/components/MarksWindow.js` | The same legends raised over whatever page you are on, above the settings popup. The `?` beside Level Coloring in Settings sets `store.showMarks` rather than linking away. Registered globally in `js/main.js`. |
| `js/home-stats.js` | The three things the home page says about the list, their icons and their copy. The desktop shows all three, the phone the first two. |
| `js/leaderboard.js` | Scoring, plus `recordProgress` and `recordTypeLabel` — how far a record got and what kind of record it is, on both surfaces. |

### The admin panel remembers everything

Three things the panel does that are worth knowing before editing the Worker:

- **The audit log has no ceiling.** `GET /api/audit-log` is paged — `?limit`,
  `?before=<id>`, `?editor=`, `?action=` — and returns `{ entries, total, hasMore }`.
  It used to be a bare `LIMIT 100`, so anything older than the last hundred
  operations could not be read at all. **A call with no query string still answers
  the plain array it always did**, because one Worker serves this repo and the live
  site: dropping that fallback breaks the other site's Audit Log tab the moment this
  Worker deploys. Beside it, `GET /api/admin/activity` groups
  the same table by editor over a window (30 days by default): how much each of them
  did, and how much of that was deletions.
- **Deletions are reversible.** Every `DELETE` handler stores the row it removed on
  its own audit line, and `POST /api/admin/audit-log/:id/undo` puts it back — a
  level lands at the `sort_order` it had, and undoing an editor deletion restores
  their API key, which the panel warns about before it asks. The row itself never
  crosses the wire.
- **The list can be put back to a past midnight.** A snapshot is taken lazily on the
  first write of each UTC day, so no cron is needed: at that moment the state *is*
  the midnight state. Restoring snapshots what is live first, which is what makes
  going back a month and then forward again lossless. Retention thins to one a week
  after a week and one a month after a month. See
  [database.md](database.md#snapshots) for the whole design — including why
  `editor_keys` is never captured.

Three readings are written once and shared, so a level says the same thing
wherever it appears — the list panel, its own page, the phone's rows, Events:

- **The verifier line** (`verifierLine`). Nobody has claimed an open
  verification, so it reads **on open verification**, not "to be verified by
  Open Verification" — matched case-insensitively, since the field is typed by
  hand. A finished level is "verified by X"; one in progress, "to be verified by
  X"; an undecided verifier has no line at all.
- **The verifier row** in a facts list (`verifierLabel`) says **unknown**,
  lowercase, when there is nobody yet — `none` and `unknown` both mean that.
- **The rank chips** (`levelRanks`). Always all three tiers, always in the same
  order — All Levels, Main List, Future List — so they do not reshuffle as you
  move between lists. A tier the level is not on reads **N/A** rather than
  disappearing, and only the list you are reading is highlighted.
- **A list's "levels total"** is what the list holds, not what is on screen. A
  row's rank is its index in the list, so the last row reads `#N` where `N` is that
  total — and the heading used to print the *visible* count instead, which is
  smaller by however many levels are hidden. Levels flagged **Pending Removal**
  (untouched for a year) are hidden from the table but keep their placement, so
  Main List read 398 under a list whose last row said #411. When a search or a
  filter narrows the view the heading says `"398 of 411"`; the always-hidden ones
  are the page's normal state, not a narrowing, so they do not trigger that.
- **How far anyone has got** is measured once and written twice.
  `verificationEvidence` picks the winning reading — the highest record from 0%,
  or the longest span of a run, whichever reaches further — and says which kind
  it is. `verificationPercent` is the number it is worth: it sets every meter's
  width, the status tones, and the order of Upcoming Levels. `verificationLabel`
  is how it reads, and the two disagree on purpose. **A run from 72% to the end
  of a level is worth 28 points and is written `72-100%`**, the way the Best run
  card has always written it, because "28%" beside a level somebody has played
  from 72% to the finish is not what happened. A record reads as the single
  figure it reached. Empty when nobody has got anywhere, so each caller says
  `None` in its own voice.

**Search fields are one component.** The box is a `<label class="search-field">`,
the input inside it is borderless, and the glyph is `.info-mag` — a ring and a
handle drawn in CSS in `css/pages/information.css`, not an asset. All Levels,
Main List, Future List, Upcoming Levels, the Leaderboard and the admin toolbar
share it; `/information` and `/pending` carry the same mark on their own boxes,
and the phone draws it on `.m2-search` itself so every field in the mobile tree
has one without asking for it. The input keeps `.search-new` — `js/list-ui.test.mjs`
types into that selector.

Two rules worth knowing before editing:

- **Scope components one level deeper.** Every rule in `ull-v2.css` is written
  `.ull2 .u-thing`, not `.u-thing`. The link reset `.ull2 a { color: inherit }`
  scores 0,1,1 and silently beats an unscoped `.u-btn` at 0,1,0, which leaves a
  filled button drawing body-text colour on its own primary fill.
- **`.root.dark` is the *light* theme.** The class names are inverted throughout
  the app. Kept that way deliberately; don't "fix" it in one file.

### Design decks

`design/` holds the static templates the pages were built from, plus the review
decks that render them. There are five:

```bash
node design/build-preview.mjs                     # the desktop pages
node design/mobile/build-preview.mjs              # the /mobile/* tree
node design/information/build-preview.mjs         # /information
node design/mobile-information/build-preview.mjs  # /mobile/info — three templates, A shipped
node design/home/build-preview.mjs                # home, both surfaces — four templates, A and C shipped
```

**Every deck reads the shipped stylesheets directly** — `css/ull-v2.css`, and
`css/pages/mobile-v2.css` where a phone is drawn — so a mockup cannot claim a
component the site does not have. None of them keeps a copy: `design/mobile/`
did, as `mob-v2.css`, and it drifted. Each deck has its own README with the
argument behind it.

### The mobile shell

`js/components/MobileShell.js` is the chrome every phone screen wears: a top bar
with Settings and Discord, a four-tab bar along the bottom (Home, Levels,
Information, Other), one bottom sheet used for Other pages, Filters and
Settings, and the footer. Whatever the route draws goes in its slot.

Two components use it. `js/pages/Mobile.js` loads the data for the whole
`/mobile/*` tree and passes its `<router-view>` through the shell.
`js/pages/LevelPage.js` wears the same shell on a phone and a passthrough
wrapper on the desktop, decided by `store.mobile` — `/level/<slug>` is the one
route that renders on both surfaces, because it never redirects: every shared
link and search result points at it, so its URL must not change. On a phone it
gets the shell rather than the desktop sidebar and footer; the page's own layout
is untouched.

Watch the specificity when a desktop page is rendered inside the shell:
`.m2 h1, .m2 h2, .m2 h3, .m2 p { margin: 0 }` scores (0,1,1) and flattens every
(0,1,0) spacing class the page brings with it. `css/pages/mobile-v2.css` names
the ones the level page needs and puts them back.

Some class names in the mobile markup are test hooks rather than styling:
`.mob-level-row`, `.mob-rank`, `.mob-pending-card`, `.mob-pending-row`,
`.mob-settings-list`, `.mob-setting-row`, `.mob-toggle`, `.mob-topbar-btn` and
`.mob-popup-overlay` are asserted on by `js/list-ui.test.mjs` and
`js/pending-ui.test.mjs`. Keep them on the elements they name.

---

## Deploying

The Worker and its D1 database are managed in the Cloudflare dashboard, not from this
repo. In order:

1. **D1 Console** → paste `scripts/schema-migrations.sql`. `ALTER TABLE` steps report
   "duplicate column name" on a database that already has the column — harmless, but the
   console can stop at the first error, so on an already-migrated database paste only the
   block you are adding rather than the whole file. The live database is migrated through
   the 2026-09-02 block (`snapshots`, `audit_log.undo_data`, `audit_log.undone_at`).
2. **Workers & Pages → the worker → Edit code** → paste `worker/worker.js` → **Deploy**.
   **One Worker serves this repo and the live site**, so a response shape may only be
   added to, never changed: `GET /api/audit-log` still answers a plain array when called
   with no query string, because the live admin panel reads it that way. Run
   `node worker/worker.test.mjs` before pasting — it pins both shapes.
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

`node worker/worker.test.mjs` is the one to run after any Worker change: it covers
the audit log's paging and its bare-call shape, per-editor activity, snapshot
retention, the restore round trip, and undoing each of the four deletions. The admin
panel's side of all of that is in `scripts/e2e-test.mjs`.

`js/list-ui.test.mjs` and `js/pending-ui.test.mjs` drive the mobile tree as well
as the desktop one, so run both after touching either.

## Security

Found a vulnerability? Please see [SECURITY.md](./SECURITY.md) for how to report it.

## Using this template

You're welcome to build on this project — just credit it somewhere and make clear
that you are not affiliated with the Upcoming Levels List.
