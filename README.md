# Upcoming Levels List (ULL)

**Upcoming Levels List (ULL)** is a community-maintained catalogue of upcoming
Top 1–100 Extreme Demons in Geometry Dash projected to place on the Demonlist.
It aims to forecast future rankings, including worthy unrated levels.

🌐 **Website:** https://ull.pages.dev  ·  💬 **Discord:** https://discord.gg/9wVWSgJSe8  ·  𝕏 **X:** [@ull_gd](https://x.com/ull_gd)

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

npm i playwright vue@3.2.31 vue-router@4.0.14
node css/mobile-footer.test.mjs         # mobile footer layout
node js/list-ui.test.mjs                # benchmark recounting + Return to top
node scripts/e2e-test.mjs               # home page + admin panel in Chromium
```

## Security

Found a vulnerability? Please see [SECURITY.md](./SECURITY.md) for how to report it.

## Using this template

You're welcome to build on this project — just credit it somewhere and make clear
that you are not affiliated with the Upcoming Levels List.
