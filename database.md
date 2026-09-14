# ULL Backend / Database Reference

> **Read this first.** This project's backend (Cloudflare Worker + D1 database) lives
> **outside this git repository** — it is hosted on the Cloudflare dashboard and cannot
> be viewed from the repo or from a Claude session. This document is the single source of
> truth a new agent needs to understand and continue the work. If anything here conflicts
> with what you observe by actually calling the live API, trust the live API and update
> this file.

---

## 1. Architecture at a glance

- **Frontend**: static site in this repo. Vue 3 (CDN global build, no bundler), Vue Router
  (history mode — `createWebHistory`, see §Routing), plain ES modules. Entry point:
  `index.html` → `js/main.js`.
- **Backend**: a single **Cloudflare Worker** (plain JavaScript) that exposes a REST-ish JSON
  API. **Its source code is NOT in this repo** — it is edited via the Cloudflare dashboard
  ("Workers & Pages" → the worker → **Quick Edit**).
- **Database**: **Cloudflare D1** (SQLite). Database name: `d1-template-database`. Bound to
  the Worker as `env.DB`. Edited via the Cloudflare dashboard → D1 → the database → **Console**
  tab (run SQL there).
- **API base URL**: `https://d1-wrkr.ullteam.workers.dev`
  (defined as `const api`/`API` in `js/content.js`, `js/pages/Admin.js`,
  `js/components/AdminLogin.js`, `js/pages/LevelGenerator.js`).

### How auth works
- Editors have an **API key** (a secret string). Only its **SHA-256 hash** is stored in the
  DB (`editor_keys.key_hash`). The plaintext key is never stored.
- The frontend sends `Authorization: Bearer <key>` on write requests.
- The Worker hashes the incoming key and looks it up in `editor_keys`. The `authed()` helper
  returns the **editor's name** (string) if valid, or `null` if not — write endpoints log
  who did what to `audit_log`.
- The admin login (`js/components/AdminLogin.js`) validates a key by calling
  **`GET /api/auth/validate`** with the Bearer header and checking for a 200.

---

## 2. IMPORTANT: the repo does not contain the real Worker

> **Update:** a corrected, known-good copy of the Worker now lives in this repo at
> **`worker/worker.js`** (kept for reference/version control — the *live* Worker is still
> edited via the Cloudflare dashboard and is authoritative). It fixes the `editor_keys`
> column bug (`name` → real column `editor_name`), adds the missing
> `GET /api/auth/validate` login endpoint, and renames `GET /api/changes` →
> `GET /api/recent-changes` to match the frontend. If you change the live Worker, update
> this file too so they don't drift.
>
> **Deploying — order matters:**
> 1. Run `scripts/schema-migrations.sql` (adds `editor_keys.sort_order`, creates
>    `recent_changes`, `auth_throttle`, `snapshots`, and the two `audit_log` undo
>    columns).
> 2. Paste `worker/worker.js` into Quick Edit → **Deploy**.
> 3. Optionally seed the feed with `scripts/seed-recent-changes.sql`.
>
> **The 2026-09-02 revision is live.** `snapshots` and `audit_log.undo_data` /
> `undone_at` exist on the D1 database and the Worker that reads them is deployed.
> Whatever you paste next must keep `GET /api/audit-log` answering a plain array
> when it is called with no query string — see §3 `audit_log`.
>
> ⚠️ **Never paste SQL comments into the D1 Console.** It strips `--` comments before
> parsing, so a paste that contains only comments (a header block, say) fails with
> **"The request is malformed: Requests without any query are not supported."** and
> *nothing runs*. `scripts/schema-migrations.sql` and `scripts/seed-recent-changes.sql`
> are therefore kept **comment-free** so each can be pasted whole — do not add a header
> comment to either, and `scripts/build-changes-seed.js` must keep emitting bare SQL.
> Documentation for those files belongs here instead.
>
> Getting the order wrong is survivable since 2026-08-24: the Worker degrades when the
> migration hasn't run (see section 4c) rather than blanking the editors list. Run the
> migration anyway — ordering and the changes feed stay inert until you do.
>
> That revision: removes the phantom `password`/`difficulty` columns that broke every
> level save (section 4b), wraps the router in a CORS-safe `try/catch`, reads Recent
> Changes from the real `recent_changes` table, orders editors by `sort_order`, and adds
> the editor-rename / editor-reorder / recent-changes-CRUD endpoints (section 5).
>
> **`worker/worker.js` has tests.** `node worker/worker.test.mjs` runs it against an
> in-memory SQLite DB built from the live schema (Node 22+, no dependencies). Run it
> before pasting anything into the Cloudflare dashboard.


Last session the Worker source was **reconstructed from memory and pasted into chat** for the
user to deploy. That reconstruction is a best-effort copy, not the canonical file. Two
endpoints the frontend actually depends on were **missing / renamed** in that reconstruction:

| Frontend calls (must exist)      | Reconstructed Worker had        | Status |
|----------------------------------|---------------------------------|--------|
| `GET /api/auth/validate`         | *(absent)*                      | ⚠️ must be present or login breaks |
| `GET /api/recent-changes`        | `GET /api/changes`              | ⚠️ name mismatch → Recent Changes empty |
| `recent_changes` table           | a `changes` table with `entries`| ⚠️ that table doesn't exist → feed empty |
| `levels` without password/difficulty | both columns bound on write | ⚠️ throws → every level save "Network error" |

**Before changing the Worker, always fetch the live endpoints and confirm what actually
exists** rather than trusting the reconstructed copy. The live deployed Worker is
authoritative; the pasted code is not.

If asked to output "the full Worker," reconstruct from BOTH this file's endpoint list
(section 5) AND the exact endpoint names the frontend uses (section 6) — do not drop
`/api/auth/validate` or rename `/api/recent-changes`.

---

## 3. Database schema (D1 / SQLite)

Inferred from Worker queries and frontend payloads. To see the real schema run
`PRAGMA table_info(<table>);` in the D1 console.

### `levels`
The main list. One row per level. Ordering is controlled by `sort_order` (0- or 1-based
integer; the Worker treats position N as the Nth row when ordered `ORDER BY sort_order ASC`).

| Column            | Type    | Notes |
|-------------------|---------|-------|
| `path`            | TEXT    | Unique slug / identifier. Primary key in practice. Used in URLs and as the key for update/delete/move. |
| `name`            | TEXT    | Level name |
| `author`          | TEXT    | |
| `creators`        | TEXT    | JSON array of strings |
| `verifier`        | TEXT    | |
| `verification`    | TEXT    | YouTube URL |
| `showcase`        | TEXT    | YouTube URL |
| `thumbnail`       | TEXT    | image/YouTube URL, nullable |
| `frameCounter`    | TEXT    | **added** — "Frame Windows Counter" YouTube link, nullable/empty for most levels |
| `id`             | TEXT    | in-game level ID (or "private") |
| `rating`          | INTEGER | |
| `length`          | INTEGER | seconds |
| `percentToQualify`| INTEGER | |
| `percentFinished` | INTEGER | |
| `lastUpd`         | TEXT    | date string, format **`DD.MM.YYYY`** |
| `tags`            | TEXT    | JSON array of strings (see tag list below) |
| `records`         | TEXT    | JSON array of `{user, link, percent, hz}` |
| `run`             | TEXT    | JSON array of `{user, link, percent, hz}` |
| `isVerified`      | INTEGER | 0/1 |
| `isMain`          | INTEGER | 0/1 (on the Main list) |
| `isFuture`        | INTEGER | 0/1 (on the Future list) |
| `benchmark`       | INTEGER | **added** — 0/1 |
| `sort_order`      | INTEGER | ranking. Contiguous; shifted on insert/delete/move |

> ⚠️ **There is no `password` and no `difficulty` column** — they never existed on the
> real table (they came from a reconstructed Worker) and this doc used to list them by
> mistake. Any statement that names them throws; see the outage in section 4b.

Empty `records`/`run` are stored as a single sentinel row `{user:'none',...}` so the frontend
can distinguish "no records" from "not loaded". The admin panel filters `user === 'none'` out
on edit and re-adds the sentinel on save.

Available **manual tags** (from `js/pages/Admin.js` `AVAILABLE_TAGS`):
`Public, Finished, Layout, Unrated, Rated, Medium, Long, XL, XXL, NC, Remake, NONG, Quality`.
The `Layout` tag has special meaning in the frontend age-filtering (see section 7).
Some tags are **auto-assigned by the frontend** and are NOT manually editable: `Open Verification`
(verifier == "open verification"), `Pending Removal` (stale & unverified), and `Verifying`
(see section 7). Auto tags are computed on load and override any stored value.

### `editor_keys`
**Confirmed live schema** (via `PRAGMA table_info(editor_keys)` on 2026-07-08):

| Column        | Type    | Notes |
|---------------|---------|-------|
| `id`          | INTEGER | PRIMARY KEY (autoincrement) |
| `editor_name` | TEXT    | display name, shown in "List Editors" and audit log. **The column is `editor_name`, NOT `name`.** |
| `key_hash`    | TEXT    | SHA-256 hex of the editor's API key |
| `role`        | TEXT    | one of `owner, admin, seniormod, mod, dev` (DEFAULT `'mod'`) |
|               |         | `seniormod` displays as **Elder Mod** (`roleLabelMap`, `js/info-windows.js`); the stored key is unchanged |
| `link`        | TEXT    | profile URL (YouTube etc.), DEFAULT `''` |
| `sort_order`  | INTEGER | **added 2026-08-24** — manual display order, DEFAULT `0`. `GET /api/editors` sorts by `sort_order ASC, id ASC`; the list is **never alphabetical**. |

> **Editors are manually ordered.** The admin panel's Editors tab has ▲ / ▼ buttons
> that rewrite the whole order via `POST /api/editors/reorder`. Add the column with
> `scripts/schema-migrations.sql` (it also seeds a starting order of
> owner → admin → seniormod → mod → dev, then by id) before deploying the Worker,
> or `/api/editors` will throw.

> **Renaming an editor is non-destructive.** `PATCH /api/editors` takes an optional
> `newName` and runs `UPDATE editor_keys SET editor_name = ? WHERE id = ?`, so the
> row — and therefore `key_hash`, `role`, `link` and `sort_order` — survives. The
> editor's existing API key keeps working and nothing they filled in is reset.
> Renaming used to require delete + re-add, which issued a **new key**. Old
> `audit_log` rows keep the old name on purpose (they are a historical record).

> ⚠️ **Critical gotcha (caused the editor-list / login outage):** the real column is
> **`editor_name`**. An earlier Worker reconstruction queried `name` everywhere, which
> throws a SQLite error → Cloudflare **Error 1101** on `/api/editors`, and broke `authed()`
> (so *all* logged-in writes failed). The corrected `worker/worker.js` uses `editor_name`
> in every query and exposes it to the frontend as `name` via
> `SELECT editor_name AS name` (the frontend expects a `name` field). Do not "fix" this by
> renaming the DB column — conform the Worker to the DB, not the other way around.

### `pending`
Backs the **Pending List** page (`js/pages/ListPending.js`, `MobilePending.js`) and the admin
**Pending** tab. Also holds public "suggest a level" submissions (legacy; no live submit UI).
| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK AUTOINCREMENT | |
| `name` | TEXT | level name |
| `placement` | TEXT | drives the row icon. A tier (`1,10,20,30,50,75`), `?` (question.svg), or `up`/`down` (move-*.svg). |
| `link` | TEXT | optional level/video link |
| `indefinite` | INTEGER | **added 2026-07-08** — 0/1. `1` = show in the "Pending Indefinitely" section |
| `author`, `reason` | TEXT | legacy submission fields |
| `status` | TEXT | legacy: `pending` / editor-set |
| `notes` | TEXT | legacy editor notes |
| `created_at` | TEXT/timestamp | legacy; **may not exist** on the real table. ⚠️ `GET /api/pending` must NOT `ORDER BY created_at` — that threw Error 1101 and emptied the Pending List. It now does a plain `SELECT * FROM pending` and the frontend/admin sort client-side. |

**Which Pending List section a row shows in** (same logic in frontend + admin):
- `placement` is `up`/`down` → **Pending Movements**
- else if `indefinite = 1` → **Pending Indefinitely**
- else → **Pending Placements**

(Pending **Removals** is a 4th section but is *computed on the frontend* from stale levels —
`lastUpd` ≥ 1 year old & unverified — it is **not** stored in this table.)

### `config`
Key/value store for singletons (Level of the Month, Closest to Verification).
| Column | Type | Notes |
|--------|------|-------|
| `key`   | TEXT PK | e.g. `levelMonth`, `levelVerif` |
| `value` | TEXT    | JSON blob |

### `audit_log`
Who-did-what log (written by every authenticated write endpoint).
```sql
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    editor_name TEXT,
    action TEXT,       -- INSERT/UPDATE/MOVE/DELETE/CONFIG_UPDATE/EDITOR_ADD/...
    target TEXT,        -- e.g. the level path or editor name
    details TEXT,       -- freeform
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    undo_data TEXT,     -- the deleted row, as JSON, on deletions only
    undone_at TEXT      -- ISO-8601 UTC once somebody put it back
);
```

`GET /api/audit-log` reads it a page at a time — `?limit` (max 500), `?before=<id>`
to continue, `?editor=` and `?action=` to filter — and answers
`{ entries, total, hasMore }`. It used to be a bare `LIMIT 100` with no way past
it, so anything older than the last hundred operations could not be read at all.

**A bare call with no query string still answers a plain array of the newest 100
rows.** One Worker serves this repo and the live site, and the live admin panel
reads that array directly — removing the fallback breaks its Audit Log tab as soon
as this Worker deploys. `worker/worker.test.mjs` pins both shapes.

**`undo_data` never leaves the Worker.** A deleted level row is a quarter of a
megabyte and an `editor_keys` row carries a key hash, so the endpoint strips the
column and sends `undoable: true` in its place. `POST /api/admin/audit-log/:id/undo`
is what reads it.

Four actions carry it, and each knows where its row goes back:

| Action | Table | Note |
|--------|-------|------|
| `DELETE` | `levels` | re-opens the `sort_order` gap the delete closed, so the level lands where it was |
| `PENDING_DELETE` | `pending` | |
| `CHANGE_DELETE` | `recent_changes` | |
| `EDITOR_DELETE` | `editor_keys` | **restores `key_hash` too** — undoing this gives the editor their API key back, not just their name. The panel says so before it asks. |

An undo refuses rather than overwrites if a row with that key exists again, and
refuses a second time on the same entry (`undone_at` is set). Undoing is itself
logged, as `UNDO`.

`GET /api/admin/activity?days=30` groups the same table by editor — how many
operations each made in the window, how many of them were deletions, and when they
last wrote. It counts audit lines, so a level edited twice counts twice.

### `snapshots`
Backs **restoring the list to an earlier state**, from the admin panel's Snapshots
tab.

```sql
CREATE TABLE IF NOT EXISTS snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    taken_at TEXT NOT NULL,               -- ISO-8601 UTC, when it was taken
    day TEXT NOT NULL,                    -- YYYY-MM-DD (UTC) it is the midnight state of
    kind TEXT NOT NULL DEFAULT 'auto',    -- auto | restore | manual
    label TEXT DEFAULT '',
    format TEXT NOT NULL DEFAULT 'gzip',  -- gzip (base64) | json
    levels_count INTEGER DEFAULT 0,
    bytes INTEGER DEFAULT 0,              -- uncompressed size, for the panel
    data TEXT NOT NULL
);
```

**There is no cron, and none is needed.** A snapshot is taken lazily, on the first
write of each UTC day, from the one place in the Worker every authenticated write
passes through. At that moment the state *is* the midnight state — that is exactly
what "no snapshot for today yet" means. A day nobody edited gets no snapshot and
needs none: the previous one is still the state that day began and ended in.

`data` holds `levels`, `pending`, `recent_changes` and the `levelMonth` /
`levelVerif` config rows, serialised to JSON and gzipped. The levels table alone is
~270 KB of JSON today and D1 caps one value at 1 MB, so it is stored compressed
(~55 KB) rather than growing into that limit. A table that does not exist yet is
recorded as `null` and left alone on restore rather than emptied.

**`editor_keys` is never captured.** A restore must not resurrect a revoked API key
nor drop one issued since.

**Retention** — thinned after every snapshot:

| Age | Kept |
|-----|------|
| under 7 days | every snapshot |
| 7–31 days | the earliest of each seven-day bucket |
| over 31 days | the earliest of each calendar month |

The *earliest* rather than the latest, so "restore to that week" means the state
the week began in.

**Restoring is never a one-way door.** `POST /api/admin/snapshots/:id/restore`
snapshots what is live *first*, as `kind = 'restore'`, then applies the chosen one
in a single `db.batch()` — so it is all-or-nothing, and going back a month and then
restoring that new "Before restoring to…" point returns everything, including
whatever was done today after midnight. That is why the guarantee holds without a
separate undo stack.

### `auth_throttle`
Backs the auth brute-force limiter (`authed()` in the Worker). One row per client IP.

| Column | Type | Notes |
|--------|------|-------|
| `ip` | TEXT PK | `CF-Connecting-IP` (falls back to `X-Forwarded-For`, then `"unknown"`) |
| `fails` | INTEGER | wrong-key attempts in the current window |
| `window_start` | INTEGER | epoch ms the window began |
| `blocked_until` | INTEGER | epoch ms the IP is blocked until (0 = not blocked) |

10 wrong keys in 15 minutes → the IP is blocked for 15 minutes (constants at the top
of the Worker). A **correct** key clears the row; a request with **no** Bearer token is
never counted. Everything **fails open**: if this table is missing or D1 errors, auth
proceeds unthrottled rather than locking staff out — so it is safe to deploy the Worker
before running the migration, the limiter just does nothing until the table exists.

### `recent_changes`
Backs the **Recent Changes** card on the home page (`js/pages/Home.js`,
`js/pages/mobile/MobileHome.js`) and the admin **Recent Changes** tab.
**One row per change line** — the Worker groups rows into the
`{ date, entries[] }` shape the frontend expects.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK AUTOINCREMENT | |
| `date` | TEXT | **free text**, e.g. `April 18, 2026`. Free text is what makes backdating work: an entry can carry any date, including one long past. |
| `change` | TEXT | one change line. `**double asterisks**` render bold on the site. |
| `sort_order` | INTEGER | display order, ascending. The **only** thing that decides position — `date` is never parsed or sorted on. |

**Grouping rule** (`groupChanges()` in the Worker): rows are read
`ORDER BY sort_order ASC, id ASC`, then rows sharing a `date` are merged into one
group that sits where that date **first** appears. So several lines for one day
group together even if they were added at different times.

> ⚠️ The reconstructed Worker read from a table called `changes` with an `entries`
> JSON column. **That table does not exist** — the real one is `recent_changes` with
> the shape above. Querying `changes` threw, which is why Recent Changes rendered
> empty (the frontend's `catch` turns the failure into `[]`).

**Seeding the feed** (a fresh site starts empty):
`node scripts/build-changes-seed.js` regenerates `scripts/seed-recent-changes.sql`
from `data/_recentChanges.json`, then
`wrangler d1 execute d1-template-database --remote --file=scripts/seed-recent-changes.sql`.
It is a `DELETE` + `INSERT` replace, so run it **before** staff start editing the feed
in the admin panel, not after.

### `leaderboard` / `upcoming` — **do not exist**
Neither table is created by `scripts/migrate.sql` or `scripts/schema-migrations.sql`, and
neither ever was. The reconstructed Worker carried a `GET /api/leaderboard` and a
`GET /api/upcoming` that selected from them, so both answered 500; nothing called either,
since the site computes both client-side from `/api/list` (`js/leaderboard.js`,
`js/pages/UpcomingLevels.js`). Both routes were removed. If you see them in an older
Worker build, that build predates the removal.

---

## 4. Historical outage (RESOLVED — kept for reference)

> ✅ **All three were fixed.** Root cause: the deployed Worker used `name` for the `editor_keys`
> table whose real column is `editor_name` (→ Error 1101 broke `/api/editors` *and* `authed()`,
> so no logged-in writes worked), and it was missing `GET /api/auth/validate` (→ login 404'd, so
> LotM/CTV could never be saved). The corrected `worker/worker.js` fixes both. The diagnosis
> below is retained as a worked example.

Symptoms at the time:

1. **List Editors** (Home page + mobile + admin Editors tab) — showed blank / empty.
2. **Level of the Month (LotM)** — not showing on the Events page.
3. **Closest to Verification (CTV)** — not showing on the Events page.

### Most likely causes (diagnose in this order)

**List Editors:**
- The `editor_keys.link` column may never have been added. If the live Worker runs
  `SELECT name, role, link FROM editor_keys` and `link` doesn't exist, the query throws →
  `/api/editors` errors → editors are blank everywhere.
  - Fix: `ALTER TABLE editor_keys ADD COLUMN link TEXT DEFAULT '';`
  - Check first: `PRAGMA table_info(editor_keys);`
- OR: no editor rows exist yet (nobody was ever inserted/bootstrapped). Check:
  `SELECT name, role FROM editor_keys;`
- Quick live test: open `https://d1-wrkr.ullteam.workers.dev/api/editors` in a browser.
  Expect a JSON array of `{name, role, link}`. A 500 or `{error:...}` confirms a DB/column
  issue; `[]` confirms an empty table.

**LotM / CTV:**
- They read from the `config` table via `GET /api/level-month` (`key='levelMonth'`) and
  `GET /api/level-verif` (`key='levelVerif'`). If the `config` table was never created, or
  those keys were never saved from the admin Events tab, the endpoints return `null` → the
  Events cards render nothing.
  - Check table exists: `CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT);`
  - Check contents: `SELECT key FROM config;`
  - Live test: open `.../api/level-month` and `.../api/level-verif` — `null` means unset.
- Saving from the admin panel uses `PUT /api/config` (requires a valid API key). If login is
  broken (see below), saves won't work either.

**Cross-cutting suspect — login may be broken:**
- If the live Worker was replaced with the reconstructed copy that lacked
  `GET /api/auth/validate`, the admin login returns non-200 → nobody can log in → LotM/CTV/
  editors can't be edited. Verify `/api/auth/validate` exists (200 with a valid Bearer key).

---

## 4b. Outage: "saving changes on the list doesn't work at all" (RESOLVED 2026-08-24)

**Symptom.** Editing any level in the admin panel popped **"Network error."** every time.
Saving in **Events** and **Pending** worked fine, which made it look like a connectivity
problem. It was not — it reproduced on every network, for every editor.

**Root cause.** `PUT /api/levels` bound `password` and `difficulty` in both its `UPDATE`
and its `INSERT`. **Those columns do not exist on the real `levels` table** (confirmed
against the pre-migration D1 backup; `scripts/build-migration.js` had already dropped
them). SQLite therefore threw `no such column: password`, the Worker did not catch it,
and Cloudflare returned its own 500 page — **with no CORS headers**. A response the
browser refuses to expose makes `fetch()` **reject**, which landed in the frontend's
`catch { alert('Network error.') }`. Events and Pending were unaffected because they
write to `config` / `pending`, whose columns all exist.

**Two-part fix:**

1. **The bug** — `worker/worker.js` no longer references `password`/`difficulty`
   anywhere (`parseLevel`, the `UPDATE`, and the `INSERT` column list + placeholders,
   which went from 25 to 23 columns).
2. **The disguise** — the Worker's router is wrapped in a top-level `try/catch` that
   returns a CORS-enabled JSON 500 carrying the real message, and the admin panel now
   prints the Worker's `error` text (`errorText()`) rather than a generic string. A
   rejected `fetch()` reports what actually happened via `requestFailed()`. If this
   class of bug ever recurs, the panel will say `no such column: …` instead of
   "Network error."

**Lesson.** A "network error" in this admin panel almost always means *the Worker threw*.
Check the Worker logs in the Cloudflare dashboard before suspecting the connection, and
never add a column to a Worker query without confirming it via `PRAGMA table_info(levels)`.

**Regression tests** (`worker/worker.test.mjs`, `scripts/e2e-test.mjs`) both cover this:
they run the Worker against a SQLite DB built from the *real* schema, so a re-introduced
phantom column fails immediately.

---

## 4c. Outage: "editors show up as empty everywhere" (RESOLVED 2026-08-24)

**Symptom.** Right after deploying the 2026-08-24 Worker, the List Editors block was
empty on Home, Mobile Home and the admin Editors tab.

**Root cause — two failures in a row:**

1. `scripts/schema-migrations.sql` opened with a `--` comment block. The D1 Console
   strips comments before parsing, so pasting that header returned
   **"The request is malformed: Requests without any query are not supported."** The
   operator reasonably read this as "that chunk failed" and moved on — but *no*
   statement had run, so `editor_keys.sort_order` was never added.
2. The Worker was then deployed with
   `SELECT … sort_order FROM editor_keys ORDER BY sort_order ASC` — a column that did
   not exist. SQLite threw, `/api/editors` 500'd, and every editors list went blank.
   Exactly the failure class section 4 warns about, re-introduced by a hard dependency
   on a migration.

**Fix — both halves:**

1. Both pasteable `.sql` files are now **comment-free**, so each can be pasted whole.
2. The Worker no longer hard-depends on the migration:
   - `GET /api/editors` falls back to `ORDER BY id ASC` (insertion order) with
     `sort_order: null` when the column is missing. The list renders either way.
   - `GET /api/recent-changes` returns `[]` when `recent_changes` doesn't exist, so the
     home page shows "No recent changes recorded" instead of erroring.
   - `insertEditor()` retries without `sort_order`, so adding/bootstrapping editors works
     on an un-migrated DB.
   - The paths that genuinely need the migration — `POST /api/editors/reorder`, the
     `/api/admin/changes` writes — return a CORS-enabled message naming
     `scripts/schema-migrations.sql` instead of a raw SQLite error.

**Lesson.** A Worker revision must not require a migration to serve read traffic. Ordering
and new features may stay inert until the migration runs; existing pages must not break.
`worker/worker.unmigrated.test.mjs` pins this — it runs the current Worker against the
pre-migration schema and asserts the editors list still renders.

---

## 5. Worker API endpoints (canonical list to maintain)

Every endpoint the system needs. Verify each against the live Worker; add any that are
missing.

**Public GET (no auth):**
- `GET /api/list` — all levels, `ORDER BY sort_order ASC`
- `GET /api/list/main` — `isMain=1 AND isVerified=0`
- `GET /api/list/future` — `isFuture=1 AND isVerified=0`
- `GET /api/levels/:position` — the Nth level (1-based) by sort order
- `GET /api/pending`
- `GET /api/editors` — returns `[{name, role, link, sort_order}]` in manual order.
  Falls back to insertion order (with `sort_order: null`) if the column is missing.
- `GET /api/level-month` — JSON of `config.levelMonth` or `null`
- `GET /api/level-verif` — JSON of `config.levelVerif` or `null`
- `GET /api/recent-changes` — **note the name**; array of `{date, entries[]}`, built by
  grouping `recent_changes` rows (see section 3)

**Auth GET:**
- `GET /api/auth/validate` — 200 if Bearer key valid (used by login), 401 if not, **429
  if the caller's IP is rate-limited** (10 wrong keys in 15 min → 15-min block; see
  `auth_throttle` in section 3). The 429 carries a `Retry-After` header and applies to
  every authed endpoint, not just this one.
- `GET /api/audit-log` — the whole log, newest first, a page at a time:
  `?limit` (default 100, max 500), `?before=<id>`, `?editor=`, `?action=`.
  Returns `{ entries, total, hasMore }`; `undo_data` is stripped and replaced by
  an `undoable` flag. **Called with no query string at all it answers the plain
  array of the newest 100 rows it always did** — the live admin panel reads that
  shape, and one Worker serves both sites
- `GET /api/admin/activity?days=30` — operations per editor over the window,
  `{ days, since, editors: [{ editor_name, changes, deletions, last_at }] }`
- `GET /api/admin/snapshots` — restore points, without the blobs
- `GET /api/admin/changes` — flat `recent_changes` rows **with ids**, for the admin
  Recent Changes tab: `[{id, date, change, sort_order}]`

**Auth writes (Bearer key required; each logs to `audit_log`):**
- `POST /api/admin/snapshots` — take a snapshot now (`{ label }`)
- `POST /api/admin/snapshots/:id/restore` — put the list back to it. Snapshots the
  live state first, so the restore itself can be restored
- `POST /api/admin/audit-log/:id/undo` — put back a row a deletion removed
- `PUT /api/levels` — insert (with `insertAt`) or update (by `path`). 23 columns incl.
  `frameCounter` and `benchmark` (it was 25 before the 2026-08-24 trim; see §4b).
- `POST /api/levels/move` — body `{path, newPosition}`. Uses rank-lookup (fetch all
  sort_orders, shift the range between current and target) to avoid off-by-N bugs.
- `DELETE /api/levels/:path` — delete + close the `sort_order` gap. Must NOT match numeric
  paths (those are the GET-by-position route).
- `PUT /api/pending` — editor update (status/notes) if authed; public submission if not.
- `DELETE /api/pending/:id`
- `PUT /api/config` — upsert arbitrary `{key: value}` pairs (used for `levelMonth`,
  `levelVerif`).
- `PATCH /api/editors` — body `{name, newName?, role, link}`; updates role/link and,
  when `newName` is given and differs, **renames in place** (keeps `key_hash`,
  `sort_order`; returns `{ok, name}`). Rejects a `newName` that already exists.
- `POST /api/editors/reorder` — body `{names: [...]}` in display order; writes each
  name's array index to `editor_keys.sort_order`.
- `DELETE /api/editors/:name` — revokes an editor's key.
- `POST /api/admin/changes` — body `{date, change, position?}`; adds one Recent
  Changes line. `position` is `'top'` (default) or `'bottom'`; `date` is free text so
  backdated entries work.
- `PUT /api/admin/changes` — body `{id, date, change}`; edits one line.
- `POST /api/admin/changes/reorder` — body `{ids: [...]}`; array index → `sort_order`.
- `DELETE /api/admin/changes/:id` — removes one line.
- `POST /api/admin/add-key` — body `{name, key, role, link}`; hashes key, inserts editor.
- `POST /api/admin/pending` — body `{name, placement, link, indefinite}`; inserts a Pending
  List entry (admin Pending tab).
- `PUT /api/admin/pending` — body `{id, name, placement, link, indefinite}`; updates one.
  (Delete reuses `DELETE /api/pending/:id`.)
- `POST /api/admin/bootstrap` — body `{secret, name, key, role, link}`; one-time first-admin
  creation, gated by the `BOOTSTRAP_SECRET` Worker env var. See section 8.

CORS: the Worker returns permissive `Access-Control-Allow-*` headers and handles `OPTIONS`.

**Every response goes through a top-level `try/catch`** (`handle()` wrapped by the
exported `fetch`). This matters: an uncaught throw returns *Cloudflare's own* 500 page,
which carries **no CORS headers** — the browser then blocks it and `fetch()` **rejects**,
so the admin panel reported a bare "Network error" for what was really a SQL bug. The
wrapper turns any throw into a normal CORS-enabled `{error: "Server error: …"}` 500, so
the real message reaches the panel. Never remove it.

---

## 6. Frontend → endpoint map (do not break these names)

| File | Calls |
|------|-------|
| `js/content.js` | `/api/list`, `/api/editors`, `/api/pending`, `/api/recent-changes`, `/api/level-month`, `/api/level-verif` |
| `js/components/AdminLogin.js` | `/api/auth/validate` |
| `js/pages/Admin.js` | `/api/list`, `/api/levels` (PUT/DELETE), `/api/levels/move`, `/api/level-month`, `/api/level-verif`, `/api/config` (PUT), `/api/editors` (GET/PATCH/DELETE), `/api/editors/reorder` (POST), `/api/admin/add-key`, `/api/pending` (GET), `/api/admin/pending` (POST/PUT), `/api/pending/:id` (DELETE), `/api/admin/changes` (GET/POST/PUT), `/api/admin/changes/reorder` (POST), `/api/admin/changes/:id` (DELETE), `/api/audit-log`, `/api/admin/activity`, `/api/admin/snapshots` (GET/POST), `/api/admin/snapshots/:id/restore`, `/api/admin/audit-log/:id/undo` |
| `js/pages/LevelGenerator.js` | `/api/levels` (PUT) |
| `js/pages/Events.js` | via `content.js`: `/api/level-month`, `/api/level-verif`, `/api/list` |

---

## 7. Relevant frontend behaviors tied to the data

- **Age filtering** (`js/pages/List.js`, `ListMain.js`, `ListFuture.js`): a level's `lastUpd`
  (format `DD.MM.YYYY`) drives "stale" indicators.
  - `isOldLevel`: `lastUpd` ≥ **1 year** ago.
  - `isVeryOldLevel`: ≥ **15 months** ago, OR ≥ **12 months** if the level has the `Layout` tag.
  - On Main/Future lists, old unverified levels (`isOldLevel && !isVerified`) are **hidden**.
  - Level names show `🚫` at 1y and `🚫🚫` at the "very old" threshold (gated by
    `store.levelColoring`).
- **Verified levels join Main & Future** (`List.js`/`ListMain.js`/`ListFuture.js`,
  `MobileList.js`): any level with `isVerified == true` is shown on the Main List and Future
  List regardless of its stored `isMain`/`isFuture` flags (membership filter is
  `isMain || isVerified` / `isFuture || isVerified`).
- **Automatic `Verifying` tag** (`List.js`/`ListMain.js`/`ListFuture.js` auto-tag loops,
  `Mobile.js`): applied when `!isVerified && percentFinished === 100 && verifyProgress >= 30`
  — the exact condition that colors a level's name orange (≥30) or red (≥60).
  `verifyProgress` = max of best record % and best run span. Fully automatic (removed from the
  admin/generator tag pickers); the frontend adds/removes it on load.
- **Cross-list position** (`levelRanks` in `js/util.js`, used by
  `js/components/List/LevelPanel.js`, `js/pages/LevelPage.js`, mobile `MobileList.js` and
  `MobileUpcoming.js`): every level shows three rank chips — All Levels, Main List, Future
  List — **always all three and always in that order**, so they do not reshuffle as you
  move between lists. Only the list you are reading is highlighted. A level that is not on
  a tier reads **N/A** there, dimmed and not a link, rather than dropping the chip: "not on
  it" is an answer, an absent chip is a silence. Computed as `allLevelsRank` / `mainRank` /
  `futureRank` on mount (desktop pages) or in `Mobile.js` (mobile), mirroring Upcoming
  Levels.
- **Leaderboard record rows** (`recordProgress` / `recordTypeLabel` in `js/leaderboard.js`,
  used by `js/pages/Leaderboard.js` and `MobileLeaderboard.js`): a row reads *score →
  level name and how far the player got → what kind of record it is* — e.g.
  `+548.8  EXASPERATION 67-100%  Run`. The progress is the record's `percent`, or the
  `run[].percent` span verbatim for a run; the type comes from how the score was earned.
- **Design system** (`css/ull-v2.css`, `css/pages/mobile-v2.css`): every page is built
  from one set of components — eyebrow headings, cards, the status pill, chips, rank chips,
  meters, stat cards, definition lists, buttons, the page hero, the thumbnail hero, rows and
  empty states — scoped to `.ull2`, which each page carries on its `<main>`. The mobile
  layer adds only what differs at 390px. Two rules: components are written `.ull2 .u-thing`
  so the link reset (`.ull2 a { color: inherit }`, 0,1,1) cannot outrank them, and
  **`.root.dark` is the light theme** — the class names are inverted throughout the app.
  The static templates the pages were built from live in `design/`, `design/mobile/`,
  `design/information/` and `design/mobile-information/`, each with its own review deck.
- **Level page** (`js/pages/LevelPage.js`, `css/pages/level-page.css`): the standalone
  `/level/<slug>` page renders from the same `/api/list` payload as the list panels and adds
  **no fields of its own**. Every reading below is computed once, in `js/util.js`
  (`decorationPercent`, `verificationPercent`, `levelStatus`, `bestRecord`, `bestRun`,
  `recordLink`, `levelLength`, `levelId`, `hasVerifier`, `isOpenVerification`,
  `verifierLabel`, `verifierLine`, `levelRanks`), and shared with the level container and
  the mobile pages so nothing is derived twice:
  - **Progress bars.** Decoration is `percentFinished`. Verification is `100` when
    `isVerified`, otherwise the same `verifyProgress` the lists use — `max(best record %,
    widest run span)`, where a run span is `|b − a|` parsed out of a `"a-b"` `run[].percent`.
  - **Status pill.** Wording matches the list panel (`Verified` / `Being verified` /
    `Layout` / `Decoration N% done`); the colour follows the level-name scale from
    `getLevelNameStyle` (red ≥60, orange ≥30, amber at `percentFinished === 100`, yellow ≥70,
    green ≥30, cyan ≥1, blue at 0), so a level reads the same in both places.
  - **Tag row** drops `Verified`, `Verifying`, `Being Verified` and `Layout` — the pill
    already says them.
  - **Byline** (`verifierLine` in `js/util.js`, shared with the list panel, the phone's
    rows and Events) reads `verified by X` when `isVerified`, `to be verified by X` while
    somebody is on it, and **`on open verification`** when the `verifier` field says Open
    Verification in any case — nobody has claimed the level, so it is not a person's name.
    Hidden entirely when `verifier` is empty, `none` or `unknown`.
  - **Verifier row** in the Details card (`verifierLabel`) says **`unknown`**, lowercase,
    when there is nobody yet — the same value the list panel and Events show.
  - **`frameCounter`** renders as a `Frame Windows Counter → Watch here` row in the Details
    card, linking the stored URL. The admin panel stores `null` for a blank field
    (`Admin.js`), so the row is skipped when the value is null, undefined or whitespace.
  - **`id`** shows `leakID` when `id === 'private'` and a leak ID exists, else `Private` —
    same rule as the list panels' ID stat.
- **Level container** (`js/components/List/LevelPanel.js`, `css/pages/level-panel.css`):
  one component, rendered by All Levels, Main List, Future List and Upcoming Levels. It is
  the level page's design at panel size — thumbnail hero, status pill, tags, rank chips,
  the video with its tabs, then Progress, World records, Details and Creators as cards in
  **two independent column stacks**, so a short card is never stretched to the height of
  the one beside it. It ends with **Open level page** (a `router-link` to
  `/level/' + levelSlug(level.path, allPaths)`, rendered only when the level has a `path`)
  beside **Share level** (`.level-share`, a link to the same URL that copies it instead of
  navigating). Upcoming Levels passes `lead-progress`, which swaps the Progress card for
  the furthest-progress figure the page ranks by.
- **Mobile level detail** (`MobileList.js`, `MobileUpcoming.js`): the same information at
  summary length — status pill, tags, rank chips, the two meters, the best record and run,
  then **Open level page**. The video, creators, ID and length live on the level page;
  unfolding the whole record under a row pushed the next level most of a screen down.
- **Pending search fallback** (`List.js`/`ListMain.js`/`ListFuture.js`, `MobileList.js`): when a
  search returns **no matches, or 3 or fewer**, the page checks the pending list (`fetchPending`,
  kept in `this.pending` / `mobileStore.pending`) for an entry whose name contains the query and,
  if found, shows a "Maybe you were searching for this: …?" card below the results, with the
  level's placement icon, an estimated-position line, and a link to the Pending List. Shown when
  `pendingSuggestion && (noResults || visibleCount <= 3)`.
- **Mobile sheets** (`Mobile.js`, `css/pages/mobile-v2.css`): Other pages, Filters and
  Settings all open as one bottom sheet (`.m2-sheet`) anchored to the bottom edge, so Apply
  and Reset sit where the thumb already is. Filters are a wrapped chip field rather than one
  check-box per line. The scrim keeps its old class name, `.mob-popup-overlay` —
  `js/list-ui.test.mjs` taps it to dismiss the sheet, from **above** it, since the sheet
  itself occupies the lower 78vh.
- **Recent Changes window** (`Home.js`, `css/pages/home.css`): the feed is a framed
  scroll box — `.home-feed`, `max-height: 26rem; overflow-y: auto` — sitting in the
  `.home-cols` grid beside the editors card. Unrolled it ran past the editors and made
  a page that is already three screens most of a fourth, for a log nobody reads to the
  end. The mobile equivalent is the same idea one step down: `.m2-changes`,
  `max-height: 18rem` (`css/pages/mobile-v2.css`).

  > Earlier versions tied the feed's height to the editors card beside it, with
  > `.home-changes` absolutely positioned inside a `.home-changes-wrap` and a
  > `.home-card--scroll { min-height: 20rem }` floor. None of those three classes exist
  > any more; a fixed `max-height` replaced the whole mechanism.
- **Mobile footer gap** (`css/pages/mobile.css`): `.mob-footer` carries a **fixed**
  `margin-top: calc(var(--mob-level-h) * 2)` — two level rows' worth of blank space,
  always present, whether the page is one search result or the whole list.
  `--mob-level-h: 4.2rem` is one row: a 3rem thumbnail plus `.mob-level-btn`'s 0.6rem
  padding top and bottom. (An earlier version pinned the footer to the bottom of the
  viewport with `margin-top: auto`; that was replaced by this fixed gap on request.)
- **Adding a level** (admin panel → **Levels** → **+ New Level**): the level edit modal
  does double duty — `editIsNew` switches the title, adds the *Position in list* and
  *Path* fields, and turns the footer button into "Create Level". There is no separate
  add form to keep in sync.
  - **Everything may be left blank.** `buildLevelPayload()` fills in what a level needs to
    render: `id` → `private`, `lastUpd` → today (`DD.MM.YYYY`), `length` → 0,
    `percentToQualify` → 1, `percentFinished` → 0, `rating` → 1, and empty
    `records`/`run` get the `{user:'none'}` sentinel. Half-filled record rows (no user)
    are dropped rather than saved.
  - **`path` is the unique key**, so it cannot be blank — the one thing a new level needs
    is a name (which auto-fills the path via `slugify()`, lowercase words separated by
    spaces, matching the existing rows) or a hand-typed path. Typing in the Path field
    sets `editPathTouched` and stops the auto-fill.
  - **Duplicate paths are blocked** (`pathTaken`): `PUT /api/levels` *updates* when the
    path already exists, so without the guard a new level sharing a name would silently
    overwrite the existing one. Create is disabled and the field turns red.
  - New levels default to the **bottom** of the list, not the top — saving by accident
    then doesn't shift the whole list down.
  - The standalone `/generator` page still exists and still works, but it is unlinked and
    lacks `rating` and `benchmark`. The admin modal is the complete one.
- **Add forms sit above their lists** on the Pending and Recent Changes tabs (the card
  comes before the table in the template), so adding an entry doesn't mean scrolling past
  every existing row.
- **Benchmark mode** (`js/util.js`: `passesBenchmark`, `assignBenchmarkRanks`,
  `displayRank`): a display setting (settings popup / mobile settings sheet, persisted to
  `localStorage.benchmarkMode`) that keeps every unverified level plus the verified ones
  flagged `benchmark = 1`, and hides the rest.
  - **Placements are recounted, not skipped.** The list pages render every row and hide
    the filtered ones, so the printed rank is normally the row's index in the page's list.
    Under benchmark mode that left gaps where hidden levels were (`#1 #2 #4 #5 #6 #7 #8
    #10 …`); the visible levels are now renumbered `#1 #2 #3 …`. Changed 2026-08-24.
  - The recount is **per page**: All Levels, Main and Future each number their own list.
    Desktop pages call `assignBenchmarkRanks(this.list, …)` in `applyFilters()` (each page
    holds its own array from its own `fetchList()`); mobile can't do that — every page
    shares `mobileStore.rawList` — so `MobileList.js` keeps a per-page `benchmarkRanks`
    Map computed from `displayList` instead of stamping the level objects.
  - The recount deliberately **ignores the search box and tag filters**: those narrow the
    view without changing a level's placement, whereas benchmark mode is a different view
    of the list with its own numbering.
  - **Reset Filters does not touch it.** It used to set `store.benchmarkMode = false` and
    persist that, silently undoing a setting that lives in the settings popup, not in the
    filters panel. Fixed 2026-08-24; mobile's `resetFilters()` never did this.
- **Return to top** (`.scroll-top-wrap` / `.scroll-top-btn` in `css/pages/list.css`;
  `.mob-scroll-top-btn` in `css/pages/mobile.css`): on All Levels, Main List, Future List,
  Upcoming Levels and the Leaderboard, desktop and mobile alike. The desktop pages show a
  floating "Return to top" pill once roughly **ten rows** have scrolled past. The scroll container
  is the left column (`.list-container-new`), so the button is its last child and uses
  `position: sticky; bottom; height: 0` to float above the rows without taking space or
  drifting over the level detail pane. The threshold measures one real row
  (`watchScroll()` caches `_rowHeight`) rather than hard-coding pixels.
- **Leaderboard scoring** (`js/formulas.js`, used by `js/pages/Leaderboard.js` and the
  mobile copy in `js/pages/Mobile.js`): every entry is built from
  `recordScore(rank, percent)`, then
  - **Verification** (`level.isVerified` — the verifier) = `recordScore(rank, 100) × 2`.
    A verified level contributes *only* this; its records and runs are skipped.
  - **Layout completion** = a 100% record on a level that is **not** verified yet, i.e. the
    player beat it in its current undecorated state (Snowblind, Map of Problematique). Worth
    `verificationScore(rank) × 0.8` = `recordScore(rank, 100) × 1.6`. Detected by
    `isLayoutCompletion(level, percent)`, which mirrors the "Layout verified by …" line on
    the list pages (`!level.isVerified && records[0].percent == 100`). Shown as
    "Layout Completion", type `'layout'`.
    Before 2026-08-24 these fell through to the ordinary record branch and scored a plain
    `recordScore(rank, 100)` — 1×, not 1.6×.
  - **Record** (from 0%) = `recordScore(rank, percent)`.
  - **Run** = `recordScore(rank, b − a)` for a `"a-b"` span.

  The multipliers live in `js/formulas.js` as `VERIFICATION_MULTIPLIER` (2) and
  `LAYOUT_COMPLETION_MULTIPLIER` (0.8) so the desktop and mobile copies can't drift.
  `node js/leaderboard.test.mjs` checks them against the `/data` snapshot.
- **Upcoming Levels order** (`js/pages/UpcomingLevels.js`,
  `js/pages/mobile/MobileUpcoming.js`, `upcomingScore()` in `js/formulas.js`): levels are
  sorted by `rankingScore` **descending**, where

  ```
  rankingScore = max(P, R)² + min(P, R)^1.8
  ```

  - `P` = the highest **record** percent on the level (a from-0% attempt).
  - `R` = the largest **run** span, `b − a` from a `"a-b"` run.

  The better of the two attempts dominates (squared) and the weaker one adds a smaller
  bonus (^1.8). Excluded entirely: verified levels, anything with `rankingScore <= 0` (no
  records and no runs), and any level that already has a 100% record (a completed layout).

  > **The rank factor was removed on 2026-08-24.** The score used to be multiplied by
  > `(0.01 × (rank + 100)) ** 0.5`, which made identical progress worth more on a
  > lower-ranked level. `upcomingScore()` lost its third argument (`rank`) with it — both
  > call sites now pass two. Ordering depends **only** on progress, so two levels with the
  > same records tie regardless of list position. `node js/upcoming.test.mjs` pins this.
- **Frame Windows Counter**: if `level.frameCounter` is set, a "Frame Windows Counter"
  row with a "Watch Here" link appears in the level panel
  (`js/components/List/LevelPanel.js`) and on the level's own page
  (`js/pages/LevelPage.js`).
- **Social links**: the community links are **Discord** (`https://discord.gg/QRX47v2qyC`)
  and **X** (`https://x.com/ull_gd`). Discord alone sits in the desktop sidebar and the
  mobile top bar; **X is deliberately not in either** — it appears in the desktop settings
  popup, the mobile settings sheet, both footers, the home hero, the mobile home social row
  and the Contacts section.
  The X mark ships as `assets/x.svg` (a white glyph, same convention as `discord.svg`) for
  `<img>` spots and is inlined with `fill="currentColor"` where the surrounding button
  already used an inline SVG. **There is no ULL Telegram any more** — it was replaced by
  the X channel, and with it the `store.comingSoon` flag and the "Coming Soon" overlay in
  `index.html` are gone. (`js/_guidelines.js` still lists QwidziT's *personal* Telegram
  handle under Contacts; that is an individual's contact detail, not the ULL channel.)
- **List Editors order**: rendered exactly in the order `/api/editors` returns
  (`editor_keys.sort_order`) on Home, Mobile Home and the admin panel. No page sorts
  editors client-side — don't add one.
- **Recent Changes rendering**: `formatChange()` (in `js/pages/Home.js`,
  `js/pages/mobile/MobileHome.js` and `js/pages/Admin.js`) turns `**bold**` into
  `<strong>` and dims the rest, via `v-html`. Everything outside the asterisks is
  HTML-escaped first, so stored text can't inject markup. Change lines and dates come
  straight from `recent_changes`; the admin tab previews with the same function.
- **Version**: currently **v2.1.0**, written in two places — the sidebar in
  `index.html` and the phone's top bar in `js/components/MobileShell.js`. The 489
  static pages under `level/`, `list/`, … carry a copy of the `index.html` shell, so
  re-run `node scripts/build-seo.mjs` after bumping it or they keep the old number.
- **A list's "levels total"** is what the list holds, which is what its rank numbers
  count: a row's rank is its index in the list, so the last row reads `#N` where `N`
  is that figure. Levels flagged **Pending Removal** (`lastUpd` over a year old, not
  verified) are hidden from the table but keep their placement, so the heading and
  the last row disagreed until 2026-09-02 — Main List read 398 under a list ending
  at #411. A search or a filter still narrows it, and then it reads `"398 of 411"`.
- **Home's third credential** is `1k+ users` (`js/home-stats.js`). It replaced "Used
  by the best players", which was the only one of the three a reader could not weigh.

### Routing & SEO (added 2026-07-08)
- **History-mode routing**: the router uses `VueRouter.createWebHistory()` (in `js/main.js`),
  so URLs are clean (`/list`, `/events`) with **no `#`**. It used to be
  `createWebHashHistory()` (`/#/list`). This is what makes individual pages indexable by
  Google.
- **`_redirects`** (repo root): Cloudflare Pages SPA fallback — `/*  /index.html  200`.
  **Required.** Without it, refreshing or deep-linking any route (e.g. `/events`) returns a
  server 404. Real files (`/css`, `/js`, `/assets`, `robots.txt`, `sitemap.xml`, images) are
  served before this rule. This only takes effect on a Cloudflare Pages deploy, not locally.
- **Old-hash migration**: on load, `js/main.js` rewrites any `#/…` URL to its clean path via
  `history.replaceState`, so old bookmarks (`/#/list`) still work.
- **404 page**: `js/pages/NotFound.js`, wired as the catch-all route
  `{ path: '/:pathMatch(.*)*', component: NotFound }` (last entry in `js/routes.js`). Note:
  the mobile auto-redirect in `main.js` `beforeEach` sends mobile users hitting unknown URLs
  to `/mobile/home` instead of the 404 page (desktop users see the 404). NotFound uses inline
  styles and must NOT put bare text in a direct child `<div>` of `<main>` — the global rule
  `main > div { overflow-y: auto }` (`css/main.css`) would add a stray scrollbar; content is
  wrapped in a container with `overflow:visible`.
- **Per-route `<title>` + canonical**: an `afterEach` hook in `js/main.js` sets a unique
  `document.title` and updates `<link rel="canonical">` per route (mobile routes canonicalize
  to their desktop equivalent). Needed because all routes serve the same `index.html`; a
  static canonical would otherwise mark every page a duplicate of home.
- **SEO tags / files**: `index.html` `<head>` has `<meta name="description">` (was missing —
  its absence let search engines auto-generate junk snippets from level records), Open
  Graph + Twitter card tags, and a `WebSite` JSON-LD block. `robots.txt` + `sitemap.xml` list
  the indexable pages. All these hard-code the domain **`https://ull.pages.dev`** — if the
  site moves to a custom domain, update: the `<head>` canonical/OG/Twitter URLs, `SITE_ORIGIN`
  in `js/main.js`, `robots.txt`, and `sitemap.xml`.

---

## 8. Operational runbook (things done "behind the scenes", not in the repo)

### D1 setup SQL (run in the D1 Console tab)

> **Prefer `scripts/schema-migrations.sql`** — it is the maintained version of the block
> below and also adds `editor_keys.sort_order` (+ seeds a starting order) and creates
> `recent_changes`. Run it before deploying a Worker that uses them:
> `wrangler d1 execute d1-template-database --remote --file=scripts/schema-migrations.sql`,
> or paste the whole file into the D1 Console (it is deliberately comment-free — see the
> warning in section 2).
>
> The `ALTER TABLE`s error with **"duplicate column name"** on a database that already
> has those columns. That is expected and harmless — but the D1 Console can stop at the
> first error and never reach the statements after it, so on a database that is already
> migrated paste only the block you are adding, not the whole file.
>
> **Applied to the live database:** everything in the file, up to and including the
> 2026-09-02 block (`snapshots`, `audit_log.undo_data`, `audit_log.undone_at` and their
> indexes). Adding to the file? Append at the bottom and paste only the new statements.

Idempotent-ish; check first with `PRAGMA table_info(<table>)` before ALTERs.
```sql
-- editor_keys extras
ALTER TABLE editor_keys ADD COLUMN role TEXT DEFAULT 'mod';   -- may already exist (harmless error)
ALTER TABLE editor_keys ADD COLUMN link TEXT DEFAULT '';

-- levels extras
ALTER TABLE levels ADD COLUMN frameCounter TEXT;
ALTER TABLE levels ADD COLUMN benchmark INTEGER DEFAULT 0;

-- pending extras (Pending List entries + the "Pending Indefinitely" section)
ALTER TABLE pending ADD COLUMN placement  TEXT DEFAULT '?';   -- may already exist
ALTER TABLE pending ADD COLUMN link       TEXT DEFAULT '';    -- may already exist
ALTER TABLE pending ADD COLUMN indefinite INTEGER DEFAULT 0;  -- NEW: powers "Pending Indefinitely"

-- editors: manual display order (the site never sorts editors alphabetically)
ALTER TABLE editor_keys ADD COLUMN sort_order INTEGER DEFAULT 0;

-- Recent Changes feed (one row per change line; `date` is free text so entries
-- can be backdated, `sort_order` alone decides position)
CREATE TABLE IF NOT EXISTS recent_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    change TEXT NOT NULL,
    sort_order INTEGER
);

-- singletons + logging
CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    editor_name TEXT, action TEXT, target TEXT, details TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);
```
> A "duplicate column name" error on an `ALTER TABLE ... ADD COLUMN` just means that column
> already exists — it's safe to ignore and move on.

### Bootstrapping the first admin (one-time)
The D1 Console cannot make HTTP requests. The bootstrap call is an HTTP POST to the **Worker**,
so run it from a **browser DevTools console** (F12 → Console) on any page:
```javascript
fetch('https://d1-wrkr.ullteam.workers.dev/api/admin/bootstrap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    secret: 'THE_BOOTSTRAP_SECRET_ENV_VAR_VALUE',
    name: 'YourName',
    key: 'a-strong-secret-you-choose',   // this becomes the admin login key
    role: 'owner',
    link: ''
  })
}).then(r => r.json()).then(console.log)   // expect {ok:true}
```
- `BOOTSTRAP_SECRET` is a Worker **environment variable** set in the Cloudflare dashboard
  (Worker → Settings → Variables). It must match `secret` above. A 403 means it doesn't match.
- After bootstrapping you can delete the env var.

### Adding more moderators (normal flow)
Once logged into the Admin panel → **Editors** tab → fill name/role → **Generate** an API key
→ copy it and send privately → **Add Editor**. This calls `POST /api/admin/add-key`. Only the
hash is stored; a **lost** key means delete + re-add. The **Audit Log** tab shows who changed what.

- **Reordering**: the ▲ / ▼ buttons in the Editors tab persist the whole order immediately
  (`POST /api/editors/reorder`). The site shows exactly this order.
- **Renaming**: **Edit** → change the Name field → **Save**. This is *not* a delete + re-add:
  the editor keeps their API key, role, link and position. Only rename via this button —
  deleting and re-adding is what forces a new key on them.
- **Deleting by mistake**: the **Audit Log** tab has a **Put back** button on the
  `EDITOR_DELETE` line, and it restores the row whole — including `key_hash`, so the
  editor's original key works again. That is the difference between undoing a deletion
  and re-adding them, and it is why the panel asks before doing it. Use it to reverse a
  slip, not as a way to hand somebody access back after revoking it on purpose.

### Managing the Recent Changes feed
Admin panel → **Recent Changes** tab. Each row is one change line.
- **Add**: type a date (or use the date picker, which formats a picked day — including a past
  one — into the free-text field), write the line, choose Top or Bottom, **Add Change**. The
  date field keeps its value after adding so several lines for one day are quick to enter.
- **Backdating**: nothing parses the date, so any date works. Position is set by ▲ / ▼ (or by
  choosing Bottom on insert), independent of what the date says.
- **Grouping**: lines sharing a date render as one dated block on the site, positioned where
  that date first appears in this list.
- **Bold**: wrap level names in `**double asterisks**`; the tab previews the result live.
- **Seeding a fresh site**: see `recent_changes` in section 3 — run
  `scripts/seed-recent-changes.sql` **before** staff start editing, since it replaces every row.

### Turning a hand-written changelog into the feed
The staff team writes changelogs as plain text (`data/changelogs/<YYYY-MM>.txt`) with
`AUGUST 21` date headers, `# Placements` / `# Movements` section headings and `*` bullets.
`scripts/parse-changelog.js` converts that into `data/_recentChanges.json`:

```bash
node scripts/parse-changelog.js data/changelogs/2026-08.txt --year 2026
node scripts/build-changes-seed.js     # -> scripts/seed-recent-changes.sql
wrangler d1 execute d1-template-database --remote --file=scripts/seed-recent-changes.sql
```

- Dates come out **newest-first**; lines keep their written order within a date.
- **Section headings are dropped** — the feed is a flat list of lines under each date, so
  `# Placements` has nowhere to go. Lines from one section stay adjacent.
- The parser applies **punctuation-only** repairs (a bold opener that lost an asterisk, a
  space swallowed after a closing `**`, a stray space inside the markers, doubled spaces,
  `, and below` → ` and below`, `#246 above` → `#246, above`, trailing periods). It never
  touches level names, positions or wording, and warns about unbalanced `**`.
- `--append` merges into the existing JSON instead of replacing it; the default replaces.
- ⚠️ `seed-recent-changes.sql` is `DELETE` + `INSERT`. Once staff manage the feed from the
  admin panel, add new entries **there**, not by re-running the seed.

### Deploying Worker changes
Cloudflare dashboard → Workers & Pages → the worker → **Quick Edit** → paste → **Deploy**.
There is no CI; deploys are manual through the dashboard.

### Deploying the frontend / replacing the old site
Static site. Intended host is Cloudflare Pages pointed at this repo's root; `index.html` is the
entry point and routing is **history mode** (clean URLs like `/list`) — the repo's `_redirects`
SPA fallback (`/* /index.html 200`) is required so deep links / refreshes don't 404.
To fully replace an old site: back it up, then point the host at this repo's root.

### Migrating the JSON data into D1 (`scripts/`)
The list's canonical data still lives as JSON files in `/data` (per-level `<slug>.json` +
`_list.json` order, `_pending.json`, `_levelMonth.json`, `_levelVerif.json`). To load it into
the live D1 database:

1. **Make sure `/data` is current.** The generator only sees the working tree. If `main` has
   newer data than this checkout, pull it first (`git checkout origin/main -- data/`) — otherwise
   you migrate a stale snapshot (this bit us once: 447 vs 479 levels).
2. `node scripts/build-migration.js` → regenerates `scripts/migrate.sql` (a `DELETE`+`INSERT`
   replace of `levels` and `pending`, plus a `config` upsert for `levelMonth`/`levelVerif`).
   **Editors are never touched** (key hashes aren't in the JSON).
3. Import: `wrangler d1 execute d1-template-database --remote --file=scripts/migrate.sql`.
   `wrangler ... --file` runs the file as one atomic batch, so a failure rolls back.

Gotchas learned the hard way:
- **No `BEGIN TRANSACTION`/`COMMIT`** in the SQL — D1 rejects SQL transaction statements.
- **Only insert columns that exist on the real table.** The reconstructed Worker referenced
  `password`/`difficulty` on `levels`, which don't exist live — the generator omits them.
- Run the Step-0 `ALTER TABLE` migrations (section 8, D1 setup SQL) first so `frameCounter`,
  `benchmark`, and `indefinite` exist before importing.

---

## 9. Suggested first actions for the next agent

1. Hit these live URLs in a browser and record what they return:
   `/api/editors`, `/api/level-month`, `/api/level-verif`, `/api/auth/validate` (needs a key),
   `/api/recent-changes`.
2. In the D1 Console: `PRAGMA table_info(editor_keys);`, `PRAGMA table_info(levels);`,
   `SELECT name,role,link FROM editor_keys;`, `SELECT key FROM config;`.
3. From those results, pinpoint which of section 4's causes is real and apply the matching
   fix (add the `link` column, create/seed `config`, restore `/api/auth/validate`, etc.).
4. Confirm the live Worker still has `/api/auth/validate` and `/api/recent-changes` — restore
   them if the reconstructed copy was deployed over the original.
5. Before pasting a Worker: `node worker/worker.test.mjs`. And before changing what any
   endpoint returns, remember that **one Worker serves this repo and the live site** —
   a shape may be added to, never changed. `GET /api/audit-log` is the standing example.

---

## 10. Key facts cheat-sheet

- API base: `https://d1-wrkr.ullteam.workers.dev`
- D1 database name: `d1-template-database`, bound as `env.DB`
- Worker & DB are edited only in the Cloudflare dashboard; **neither is in this repo**
- Auth: `Authorization: Bearer <key>`; DB stores `sha256(key)` in `editor_keys.key_hash`
- Roles: `owner, admin, seniormod, mod, dev`
- Editors are **manually ordered** (`editor_keys.sort_order`), never alphabetical
- Renaming an editor keeps their key (`PATCH /api/editors` with `newName`)
- Recent Changes = `recent_changes`, one row per line, free-text `date`, `sort_order` wins
- Leaderboard: verification = 2x a 100% record; layout completion (100% on an unverified
  level) = 0.8x a verification = 1.6x a record
- Upcoming Levels order = `max(P,R)^2 + min(P,R)^1.8`, descending — **no rank factor**
- Benchmark mode recounts placements 1..N per page; Reset Filters must never clear it
- `levels` has **no** `password` / `difficulty` column — naming them throws
- A "Network error" in the admin panel means the Worker threw; check its logs
- Auth is rate-limited per IP (10 wrong keys / 15 min → 15-min 429 block); fails open if
  the `auth_throttle` table is missing
- Never paste SQL comments into the D1 Console — it rejects a comment-only paste with
  "Requests without any query are not supported" and runs nothing
- `sort_order` = level ranking (contiguous integer, shifted on insert/delete/move)
- Dates use `DD.MM.YYYY`
- Every page is built from `css/ull-v2.css` (`.ull2`); mobile adds `css/pages/mobile-v2.css`
- `.root.dark` is the **light** theme — the class names are inverted throughout the app
- Component rules are scoped `.ull2 .u-thing`, or the link reset outranks them
- `seniormod` displays as **Elder Mod**; the stored role key is unchanged
- Current site version: **v2.1.0** (`index.html` + `js/components/MobileShell.js`,
  then re-run `scripts/build-seo.mjs`)
- The admin panel can read the **whole** audit log, put any deletion back, and
  restore the list to a past midnight — see `audit_log` and `snapshots` in §3
- `GET /api/audit-log` with **no query string** must keep answering a plain array:
  one Worker serves this repo and the live site, and the live panel reads that shape
- Tests: `node worker/worker.test.mjs` (Worker vs. real schema),
  `node worker/worker.unmigrated.test.mjs` (Worker vs. the PRE-migration schema),
  `node worker/worker.throttle.test.mjs` (the auth rate limiter),
  `node js/leaderboard.test.mjs` and `node js/upcoming.test.mjs` (scoring vs. the /data
  snapshot), `node js/util.test.mjs`, `node js/registry.test.mjs`,
  `node js/list-ui.test.mjs` (benchmark recounting + Return to top, desktop **and**
  mobile), `node js/pending-ui.test.mjs` (Pending links, desktop **and** mobile),
  `node css/mobile-footer.test.mjs`, `node js/seo.test.mjs` and
  `node scripts/e2e-test.mjs` (browser, needs `npm i playwright vue@3.2.31 vue-router@4.0.14`)
- Working branch: `main`
