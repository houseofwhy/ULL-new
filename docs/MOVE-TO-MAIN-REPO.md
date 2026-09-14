# Moving the site to the main repo (`houseofwhy/ULL-new`)

This repo (`Upcoming-Levels-List/ULL-designtest`) is the test build. This guide moves
its finished code into **`houseofwhy/ULL-new`**, which becomes the live site, while
**keeping ULL-new's existing git history** and **keeping the same D1 API backend**.

Both sites talk to the same Cloudflare Worker at `https://d1-wrkr.ullteam.workers.dev`,
so the **frontend move needs no Worker deploy** — the admin panel and API keep working
the moment the new frontend lands.

> **The design is not the only thing that changed.** Since the 2026-08-31 resync
> (`8eec3e5`), `worker/worker.js` has also gained the admin activity and snapshots
> endpoints and lost two dead ones, and `scripts/schema-migrations.sql` has gained the
> `snapshots` table and the `audit_log` undo columns. Whether that matters depends on
> what is **deployed**, not on what is committed — Step 0b checks. The repo copy of the
> Worker is version control, not the running code.

> Do this from a normal terminal on your machine, not from a Claude session (a session
> is usually scoped to one repo and can't push to both).

---

## Before you start

- You can push to both repos.
- `git` is installed (`git --version`).
- Decide the live domain. If it is **not** `https://ull.pages.dev`, you'll edit five
  places in Step 3.

---

## Step 0 — safety net (one tag)

Every command below runs **inside your ULL-new clone** unless it says otherwise. Start
from a clean, current checkout, and tag it so any mistake is one command to undo.

```bash
cd /path/to/ULL-new
git checkout main
git pull origin main
git status --short          # must be empty before you go on

git tag pre-designtest-migration
git push origin pre-designtest-migration
```

If anything goes wrong later: `git reset --hard pre-designtest-migration && git push --force`.

> If ULL-new's default branch is `master` rather than `main`, substitute it in every
> command from here on.

---

## Step 0b — check what you would overwrite, and what is deployed

Step 1 replaces ULL-new's tree **wholesale**. Anything committed to ULL-new since
designtest last resynced from it — **2026-08-31** — would be reverted by it. Usually
there is nothing, because the site's content lives in D1 rather than the repo, but check
rather than assume:

```bash
git remote add designtest https://github.com/Upcoming-Levels-List/ULL-designtest.git
git fetch designtest main

# What ULL-new has committed since the resync. Empty output = nothing to lose.
git log --oneline --since=2026-08-31 origin/main
```

The two histories share no commits — designtest copied ULL-new's *files* on that date, not
its commits — so compare them by content, not with a `A..B` range, which would list
everything:

```bash
# The data the generated pages are built from. Empty = the two agree.
git diff --stat designtest/main origin/main -- data/
```

If both print nothing, go to Step 1: the wholesale replace loses nothing.

If either prints something, look at what changed (`git show --stat <sha>`) and decide per
file. The one that would actually hurt is `data/`, and the generated pages built from it
(`level/*/index.html`, `sitemap.xml`, `llms.txt`, `js/seo-meta.js`) — those all come from
`data/_seo-snapshot.json`, so if ULL-new's data is newer, refresh designtest's snapshot
from the live API before Step 1 rather than carrying an older one across:

```bash
# In the designtest clone, not ULL-new:
node scripts/fetch-data.mjs && node scripts/build-seo.mjs
git commit -am "Refresh the SEO snapshot and regenerate before the move"
git push
```

Then check what the live Worker actually serves, since both sites share it:

```bash
# These two routes were removed because they queried tables no migration creates.
#   404 = the current Worker is deployed (the route is gone).
#   500 = an older Worker is live, still routing them into a missing table.
curl -s -o /dev/null -w "leaderboard %{http_code}\n" https://d1-wrkr.ullteam.workers.dev/api/leaderboard
curl -s -o /dev/null -w "upcoming    %{http_code}\n" https://d1-wrkr.ullteam.workers.dev/api/upcoming

# The admin routes the newer Worker added.
#   401 = deployed and asking for a key, which is correct.
#   404 = the deployed Worker predates them; the admin panel's Snapshots and
#         Activity tabs will not work until you deploy worker/worker.js.
curl -s -o /dev/null -w "snapshots   %{http_code}\n" https://d1-wrkr.ullteam.workers.dev/api/admin/snapshots
```

So `404 / 404 / 401` means the Worker is current and Step 7 is a no-op.
`500 / 500 / 404` means it is the older build and Step 7 applies.

Neither result blocks the move — the public site only reads `/api/list` and friends. It
tells you whether you also owe a Worker deploy and a schema migration afterwards
(Step 7).

---

## Step 1 — bring in the designtest tree as one commit

From inside the `ULL-new` clone:

```bash
# The remote and fetch are from Step 0b; re-fetch in case you pushed since.
git fetch designtest main

# Replace the working tree wholesale with designtest's, keeping ULL-new's history.
git rm -rq .
git checkout designtest/main -- .
git commit -m "Replace site with the ULL-designtest build (API-backed)"
```

**Why `git rm -rq .` first:** it guarantees files that exist in ULL-new but *not* in
designtest are actually deleted, instead of lingering as stale leftovers. `git checkout`
then lays down the exact designtest tree. History is preserved; this is one revertible
commit (`git revert HEAD` undoes it cleanly).

Do **not** push yet — do Step 2 first.

---

## Step 2 — trim what shouldn't ship, then check

Cloudflare Pages serves **every file in the repo** at the URL root. That is exactly how a
database dump once leaked. So before pushing:

```bash
# Stale copies of the /data directory — not used by the site, and nothing to do
# with the `snapshots` D1 table, which lives in the database rather than the repo.
git rm -r data.backup data.old 2>/dev/null

# Never commit a DB dump: a full editor_keys export contains every key hash.
git rm backup-before-migrate.sql 2>/dev/null   # already gone from designtest; harmless if absent

# design/ is the drafts and preview area — four home-page templates, the
# information-page mockups and their copy decks. Nothing serves it and nothing
# links to it, but Cloudflare Pages would publish all 57 files at the URL root.
# Drop it from the live site; it stays in designtest, which is where it belongs.
git rm -rq design 2>/dev/null

git commit -m "Drop stale snapshots, drafts and any DB dumps before going live" 2>/dev/null || true
```

Keep:

- **`_redirects`** at the repo root — **required.** Without it, refreshing or deep-linking
  any route (`/list`, `/events`) returns a server 404, because routing is history-mode.
- **`data/`** — the migration and test scripts read it.
- **`worker/`** — the version-controlled copy of the Worker (not served in any harmful way;
  it's just JS).

Quick sanity check that nothing sensitive is about to ship:

```bash
git grep -nI "key_hash" -- '*.sql' '*.json'    # should print nothing
test -f _redirects && echo "_redirects present" || echo "MISSING _redirects"
```

---

## Step 3 — fix the domain if it isn't `ull.pages.dev`

Skip this if the live domain is `https://ull.pages.dev`. Otherwise:

| File | What to change |
|------|----------------|
| `scripts/seo/content.mjs` | `SITE.origin` — **the source**; every generated page derives from it |
| `js/main.js` | the `SITE_ORIGIN` constant |
| `robots.txt` | the `Sitemap:` line |
| generated pages | `index.html`, `sitemap.xml`, `llms.txt`, `js/seo-meta.js` and every `*/index.html` — do **not** hand-edit, regenerate them |

The domain is baked into 488 generated files, so edit the two sources and rebuild rather
than sed-ing the output:

```bash
sed -i "s#https://ull.pages.dev#https://YOUR-DOMAIN#g" scripts/seo/content.mjs js/main.js robots.txt
node scripts/build-seo.mjs      # rewrites index.html, every page, sitemap, llms.txt, seo-meta
git diff --stat
grep -rl "ull.pages.dev" . --exclude-dir=.git | head    # should print nothing
git commit -am "Point canonical/SEO URLs at the live domain"
```

---

## Step 4 — run the checks, then push

Everything runs locally; there is no CI. The UI suites need Chromium and the two CDN
libraries, which they map to `node_modules` by exact filename:

```bash
npm i playwright vue@3.2.31 vue-router@4.0.14
npx playwright install chromium

node worker/worker.test.mjs            # 87 passed
node worker/worker.throttle.test.mjs   # 14 passed
node worker/worker.unmigrated.test.mjs # 20 passed
node js/util.test.mjs
node js/upcoming.test.mjs
node js/leaderboard.test.mjs
node js/registry.test.mjs
node js/list-ui.test.mjs               # 27 passed — drives the real list pages
node js/pending-ui.test.mjs            # 16 passed
node js/seo.test.mjs                   # slow (~5 min): checks all 488 generated pages
```

Also confirm the generated files match their sources — if either build prints a diff,
someone edited generated output by hand:

```bash
node scripts/build-css.mjs && node scripts/build-seo.mjs
git status --short          # expect nothing, or only the sitemap's lastmod dates
```

Then:

```bash
git push origin main
```

History is intact; the new commits sit on top. `node_modules/` is gitignored, so the
install above will not follow you into the commit.

---

## Step 5 — point Cloudflare Pages at ULL-new

In the Cloudflare dashboard → **Workers & Pages** → the Pages project → **Settings**:

- **Build & deployments → Source:** connect `houseofwhy/ULL-new`, production branch `main`.
- **Build command:** *empty* (there is no build step).
- **Build output directory:** `/` (the repo root is the site).

Trigger a deploy (pushing in Step 4 usually does this automatically).

---

## Step 6 — verify on the deploy preview *before* going live

Open the preview URL Cloudflare gives you and check:

1. **Home** — Recent Changes and List Editors both populate.
2. **`/list`** — levels load.
3. **`/admin`** — log in, open a level, change a field, **Save** → no error.
4. **Hard-refresh `/events`** (not via a link) — it loads, doesn't 404. This proves
   `_redirects` is live.
5. **Deep-link a level** — open `/level/<slug>` directly rather than by clicking. That
   page is a real generated file, so it is the one that catches a stale `build-seo` run.
6. **Settings → the `?` beside Level Coloring** — the marks window opens *over* the page.
   If it opens `/information` in a new tab instead, the generated pages are stale:
   re-run `node scripts/build-seo.mjs`, commit, redeploy.
7. **Toggle Benchmark Mode on, reload** — it is still on. Confirms settings persist.
8. **On a phone or a 390px window** — the tab bar sits at the bottom and stays there
   while the page scrolls.

If all eight pass, promote the deployment / point the custom domain at it.

---

## Step 7 — the Worker and the schema, only if Step 0b said so

Skip entirely if Step 0b showed 404/404/401. Otherwise the deployed Worker predates the
admin activity and snapshots endpoints, and the public site is fine but the admin panel's
Snapshots and Activity tabs will not be. Run the migration **before** deploying the
Worker that reads those columns:

```bash
wrangler d1 execute d1-template-database --remote --file=scripts/schema-migrations.sql
```

Then deploy `worker/worker.js` per the deploy box in `database.md` §2. The migration is
written with `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`, so re-running it
is safe; the two `ALTER TABLE audit_log ADD COLUMN` lines are not, and error harmlessly if
the columns already exist.

Nothing here affects the public site — it reads none of these routes.

---

## Troubleshooting

**Refreshing `/list` or `/events` gives a 404 (but clicking links works).**
`_redirects` is missing or not at the repo root. Confirm `test -f _redirects`, that its
one rule is `/*  /index.html  200`, and redeploy. This only takes effect on a Cloudflare
Pages deploy, never when opening files locally.

**The whole site is blank / "Failed to load list."**
The frontend can't reach the Worker. Open
`https://d1-wrkr.ullteam.workers.dev/api/list` directly — if that itself errors, the
problem is the Worker or D1, not this move (see `database.md`). If it returns JSON, check
the browser console on the site for a CORS or mixed-content error.

**Editors or Recent Changes are empty, but levels load.**
The D1 migration hasn't been run, or the Worker is an old build. This is a backend state,
unrelated to the move — run `scripts/schema-migrations.sql` and redeploy `worker/worker.js`
per the deploy box in `database.md` §2. (The current Worker degrades instead of erroring,
so an empty list here means "migration not run," not "broken.")

**The admin panel's Snapshots tab says the table does not exist.**
Also a backend state, and also unrelated to the move: the `snapshots` table and the two
`audit_log` undo columns come from the same `scripts/schema-migrations.sql`. Until it is
run, the Worker keeps writing audit lines without undo data and takes no snapshots — it
does not error.

**Admin save says "Network error."**
Almost always the Worker threw before it could send CORS headers — check the Worker logs
in the Cloudflare dashboard. See `database.md` §4b; it is not caused by this move.

**A file I deleted in Step 2 is still live on the site.**
Cloudflare Pages caches. Confirm the file is gone from `main` on GitHub, then redeploy; a
fresh deployment replaces the whole asset set. If a secret was among them, treat it as
exposed and rotate it (deleting a file does not un-publish what was already served) — for
API keys, see `SECURITY.md`.

**`git checkout designtest/main -- .` left files from ULL-new I didn't want.**
You skipped the `git rm -rq .` in Step 1, so only overlapping paths were overwritten and
ULL-new's extras survived. Reset and redo Step 1: `git reset --hard pre-designtest-migration`.

**I need to undo the whole move after pushing.**
`git revert` the migration commit (keeps history), or, if nothing else has landed since,
`git reset --hard pre-designtest-migration && git push --force origin main`. Force-pushing
rewrites history — only do it if no one else has pulled in the meantime.

**The site works, but the `?` in Settings opens a new tab, or a deep-linked page looks
like the old design.**
The generated pages are stale. Every `*/index.html` is a real file carrying a copy of the
app shell from `index.html`, so a shell change that is not followed by
`node scripts/build-seo.mjs` reaches visitors who arrive by link but not visitors who
click through from the home page. Re-run it, commit the result, redeploy.

**A stylesheet change did not take effect.**
Only `css/bundle.css` is served — `index.html` has every other `<link>` commented out, and
`scripts/build-css.mjs` reads the hrefs out of those comments. Edit the file under `css/`,
then run `node scripts/build-css.mjs`. Editing `bundle.css` directly is overwritten by the
next build.

**`js/list-ui.test.mjs` times out waiting for `.list tr`.**
The test harness maps the two CDN `<script>` URLs to `node_modules` by exact filename. If
`index.html` moves to a different Vue build or version, that map stops matching, Vue never
loads and the page renders nothing. Update the map at the top of the three UI tests to the
URL `index.html` now uses.

**Old bookmarks with `/#/list` (hash URLs) — do they still work?**
Yes. `js/main.js` rewrites any `#/…` URL to its clean path on load, so old links keep
working after the move.
