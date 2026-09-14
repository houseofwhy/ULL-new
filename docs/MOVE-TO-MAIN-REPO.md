# Syncing designtest into the main repo (`houseofwhy/ULL-new`)

This repo (`Upcoming-Levels-List/ULL-designtest`) is the test build. This guide moves
its finished code into **`houseofwhy/ULL-new`**, the live site at `https://ull.pages.dev`,
while **keeping ULL-new's git history**, **keeping the same D1 API backend**, and
**keeping the few files that must differ between the test build and the live site**.

> **Status.** The first move was done on **2026-09-14** (ULL-new commits `7c3be1bf` →
> `02a80022`, safety tag `pre-designtest-migration-2026-09-14`). This guide is what was
> actually done then, so it doubles as the procedure for every later sync from
> designtest to live.

Both sites talk to the same Cloudflare Worker at `https://d1-wrkr.ullteam.workers.dev`,
so the **frontend move needs no Worker deploy** — the admin panel and API keep working
the moment the new frontend lands.

> The repo copy of the Worker (`worker/worker.js`) is version control, not the running
> code. Whether a sync also owes a Worker deploy or a schema migration depends on what is
> **deployed** — Step 0b checks.

---

## What is different between designtest and live — keep these

A wholesale copy of designtest over ULL-new is almost right. These four paths are the
exception, and Step 1 restores them from ULL-new after the copy:

| Path | Live (ULL-new) | designtest | Why it matters |
|------|----------------|------------|----------------|
| `robots.txt` | `Allow: /`, per-crawler rules, `Sitemap:` | `Disallow: /` | designtest's copy **de-indexes the live site** |
| `.github/workflows/refresh-content.yml` | present | absent | the hourly job that keeps the crawler-visible pages current |
| `data/_seo-snapshot.json` | refreshed hourly by that job | stale | the generated pages are built from it |
| `data/_level-registry.json` | refreshed hourly | stale | carries slug history — lose it and renamed levels lose their 301 redirects |

**The content bot.** `refresh-content.yml` runs at **:25 past every hour (UTC)**. It fetches
the live API, runs `build-css` and `build-seo`, and commits
`Refresh static list content [skip ci]` straight to `main`. It only ever touches generated
files (`data/_seo-snapshot.json`, `data/_level-registry.json`, `level/`, the page
`index.html` files, `sitemap.xml`, `llms.txt`, `_redirects`, `js/seo-meta.js`,
`css/bundle.css`). Two consequences:

- ULL-new's `main` gains a commit most hours. That is expected, not someone's work.
- Push well away from :25, or the push races the bot (Step 4 covers a rejected push).

---

## Before you start

- You can push to both repos, and have clones of both on one machine.
- `git` and Node 22+ are installed (`git --version`, `node --version`).
- Decide the live domain. If it is **not** `https://ull.pages.dev`, you'll edit the
  places listed in Step 3.

---

## Step 0 — safety net (one tag)

Every command below runs **inside your ULL-new clone** unless it says otherwise. Start
from a clean, current checkout, and tag it so any mistake is one command to undo.

```bash
cd /path/to/ULL-new
git checkout main
git pull origin main
git status --short          # must be empty before you go on

TAG=pre-designtest-sync-$(date +%Y-%m-%d)
git tag "$TAG"
git push origin "$TAG"
```

Use a dated tag name: `pre-designtest-migration` already exists (it points at an August
2026 attempt) and must not be moved. If anything goes wrong later:
`git reset --hard "$TAG" && git push --force origin main`.

---

## Step 0b — check what you would overwrite, and what is deployed

Step 1 replaces ULL-new's tree wholesale, so anything **hand-committed** to ULL-new since
the last sync (**2026-09-14**) would be reverted. Filter out the bot's commits — they are
covered by keeping `data/` and regenerating:

```bash
git remote add designtest https://github.com/Upcoming-Levels-List/ULL-designtest.git   # once
git fetch origin designtest

# Human commits on ULL-new since the last sync. Empty output = nothing to lose.
git log --since=2026-09-14 --format='%h %an %s' origin/main | grep -v "Refresh static list content"
```

If that prints anything, look at it (`git show --stat <sha>`) and port the change into
designtest first, or carry it across by hand after Step 1.

Also check for files that exist only in ULL-new — the replace deletes them:

```bash
git diff --name-status --diff-filter=A designtest/main origin/main
```

Expect the four paths from the table above, plus any level pages the bot generated for
levels added since designtest's snapshot (`level/<slug>/index.html`, which Step 2b
regenerates). Anything else, decide per file.

`git diff --stat designtest/main origin/main -- data/` is **almost never empty** — the bot
refreshes `data/` hourly and designtest's copy is stale. That is expected, and the reason
Step 1 keeps ULL-new's `data/`.

Then check what the live Worker actually serves, since both sites share it:

```bash
# Two routes removed from the repo Worker because they query tables no migration creates.
#   404 = the current repo Worker is deployed (the routes are gone).
#   500 = the deployed Worker still has them; harmless, nothing calls them.
curl -s -o /dev/null -w "leaderboard %{http_code}\n" https://d1-wrkr.ullteam.workers.dev/api/leaderboard
curl -s -o /dev/null -w "upcoming    %{http_code}\n" https://d1-wrkr.ullteam.workers.dev/api/upcoming

# Admin routes added by the newer Worker.
#   401 = deployed and asking for a key, which is correct.
#   404 = the deployed Worker predates them — Step 7 applies.
curl -s -o /dev/null -w "snapshots   %{http_code}\n" https://d1-wrkr.ullteam.workers.dev/api/admin/snapshots
curl -s -o /dev/null -w "activity    %{http_code}\n" https://d1-wrkr.ullteam.workers.dev/api/admin/activity
```

| Result | Meaning |
|--------|---------|
| `404 / 404 / 401 / 401` | Deployed Worker = repo Worker. Step 7 is a no-op. |
| `500 / 500 / 401 / 401` | **The state on 2026-09-14.** Deployed Worker = repo Worker except the two dead routes are still routed. Step 7 is optional (it only removes those two 500s). |
| `500 / 500 / 404 / 404` | Older Worker. Step 7 applies. |

Neither result blocks the sync — the public site only reads `/api/list` and friends.

---

## Step 1 — bring in the designtest tree, then restore the live-only files

```bash
git fetch origin designtest

# Replace the working tree wholesale with designtest's, keeping ULL-new's history.
git rm -rq .
git checkout designtest/main -- .
git commit -m "Replace site with the ULL-designtest build (API-backed)"

# Put back what must differ on the live site (see the table at the top).
git checkout "$TAG" -- robots.txt .github/workflows/refresh-content.yml \
    data/_seo-snapshot.json data/_level-registry.json
git commit -m "Keep the live site's robots.txt, content workflow and newer data"
```

**Why `git rm -rq .` first:** it guarantees files that exist in ULL-new but *not* in
designtest are actually deleted, instead of lingering as stale leftovers. `git checkout`
then lays down the exact designtest tree. Untracked and ignored files (`node_modules/`,
`.idea/`) are not touched.

Do **not** push yet.

---

## Step 2 — trim what shouldn't ship, then check

Cloudflare Pages serves **every file in the repo** at the URL root. That is exactly how a
database dump once leaked. So before pushing:

```bash
# design/ is the drafts and preview area — home-page templates, the information-page
# mockups and their copy decks. Nothing serves or links to it, but Pages would publish
# every file at the URL root. It stays in designtest, which is where it belongs.
git rm -rq design

# Stale copies of /data and DB dumps. Already gone from designtest; harmless if absent.
git rm -rq --ignore-unmatch data.backup data.old backup-before-migrate.sql

git commit -m "Drop the design/ drafts before going live"
```

Keep:

- **`_redirects`** at the repo root — **required.** Without it, refreshing or deep-linking
  any route (`/list`, `/events`) returns a server 404, because routing is history-mode.
- **`data/`** — the build and test scripts read it.
- **`worker/`** — the version-controlled copy of the Worker (just JS, nothing secret).
- **`.github/`** — the content bot.

Sanity check that nothing sensitive ships and the live-only files survived:

```bash
git grep -nI "key_hash" -- '*.sql' '*.json'                 # should print nothing
test -f _redirects && echo "_redirects present" || echo "MISSING _redirects"
test -f .github/workflows/refresh-content.yml && echo "workflow present" || echo "MISSING workflow"
grep -q "^Disallow: /$" robots.txt && echo "ROBOTS BLOCKS THE SITE" || echo "robots.txt ok"
```

---

## Step 2b — refresh the data and regenerate the pages

The generated pages carry a copy of the app shell from `index.html`, so after a design
change every one of them must be rebuilt — from current data, not designtest's snapshot:

```bash
node scripts/fetch-data.mjs     # writes nothing unless the API answered sanely
node scripts/build-css.mjs
node scripts/build-seo.mjs
git add -A
git commit -m "Refresh the snapshot from the live API and regenerate static pages"
```

Quick check against the pre-sync state — the level pages should match one for one,
and the redirects should survive:

```bash
diff <(git ls-tree -d --name-only "$TAG" level/) <(git ls-tree -d --name-only HEAD level/)   # new/removed levels only
grep -A3 "seo:redirects:start" _redirects
```

---

## Step 3 — fix the domain if it isn't `ull.pages.dev`

Skip this if the live domain is `https://ull.pages.dev`. Otherwise:

| File | What to change |
|------|----------------|
| `scripts/seo/content.mjs` | `SITE.origin` — **the source**; every generated page derives from it |
| `js/main.js` | the `SITE_ORIGIN` constant |
| `robots.txt` | the header comment and the `Sitemap:` line |
| generated pages | `index.html`, `sitemap.xml`, `llms.txt`, `js/seo-meta.js` and every `*/index.html` — do **not** hand-edit, regenerate them |

The domain is baked into hundreds of generated files, so edit the sources and rebuild
rather than sed-ing the output:

```bash
sed -i "s#https://ull.pages.dev#https://YOUR-DOMAIN#g" scripts/seo/content.mjs js/main.js robots.txt
node scripts/build-seo.mjs
git diff --stat
grep -rl "ull.pages.dev" . --exclude-dir=.git --exclude-dir=node_modules | head    # should print nothing
git commit -am "Point canonical/SEO URLs at the live domain"
```

---

## Step 4 — run the checks, then push

There is no test CI — the only workflow is the content bot. Run the suites locally.

Install the test dependencies **into the repo, without writing package files**:

```bash
npm i --prefix . --no-save --no-package-lock playwright vue@3.2.31 vue-router@4.0.14
npx playwright install chromium
```

Both flags matter. A plain `npm i` creates `package.json` and `package-lock.json`, which
are not gitignored and Pages would serve. Without `--prefix .`, npm installs into the
nearest *parent* folder that has a `package.json` — the UI tests then can't find
`node_modules/vue/...`, and the parent project's dependencies get reinstalled.

The UI suites launch Chromium from `$CHROMIUM_PATH`, defaulting to a Linux sandbox path.
Point it at a real browser:

```bash
export CHROMIUM_PATH="$(node -e "console.log(require('playwright').chromium.executablePath())")"
# Windows, if Playwright's Chromium won't start: use Edge
# export CHROMIUM_PATH="C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
```

```bash
node worker/worker.test.mjs            # 87 passed
node worker/worker.throttle.test.mjs   # 14 passed
node worker/worker.unmigrated.test.mjs # 20 passed
node js/util.test.mjs                  # all passed
node js/registry.test.mjs              # all passed
node js/upcoming.test.mjs              # 7 passed
node js/leaderboard.test.mjs           # 14 passed
node js/list-ui.test.mjs               # 27 passed — drives the real list pages
node js/pending-ui.test.mjs            # 16 passed
node js/seo.test.mjs                   # slow (~5 min): checks every generated page
```

On Windows, `upcoming`, `leaderboard` and `list-ui` fail with `ENOENT ... C:\C:\...` and
`seo.test` times out on `/list` — see Troubleshooting. Those are test-harness problems,
not site problems; they fail the same way on an untouched designtest checkout.

Confirm the generated files match their sources — if a build prints a diff, someone
edited generated output by hand:

```bash
node scripts/build-css.mjs && node scripts/build-seo.mjs
git status --short          # expect nothing, or only the sitemap's lastmod dates
```

Then push — not between :20 and :30 past the hour UTC, when the bot runs:

```bash
git fetch origin && git log --oneline main..origin/main    # empty = the bot hasn't pushed since
git push origin main
```

**If the push is rejected** because the bot landed a commit first:

```bash
git fetch origin
git rebase origin/main
# Conflicts can only be in generated files. Take the bot's data, regenerate on top:
git checkout --ours -- data/          # during a rebase, "ours" = origin/main
node scripts/fetch-data.mjs && node scripts/build-css.mjs && node scripts/build-seo.mjs
git add -A && git rebase --continue   # repeat for each commit that stops
git push origin main
```

---

## Step 5 — Cloudflare Pages

The Pages project already builds `houseofwhy/ULL-new` `main` into `https://ull.pages.dev`,
with no build command and `/` as the output directory. A push deploys it — on
2026-09-14 the new `index.html` was live about 15 seconds after the push.

If the project ever needs reconnecting: dashboard → **Workers & Pages** → the Pages
project → **Settings** → **Build & deployments**: source `houseofwhy/ULL-new`, production
branch `main`, build command *empty*, output directory `/`.

---

## Step 6 — verify on the live site

From a shell (in Git Bash, prefix with `MSYS_NO_PATHCONV=1` or `/list` is rewritten into a
Windows path):

```bash
B=https://ull.pages.dev
# The deploy is live when this matches your commit's index.html:
[ "$(curl -s $B/ | sha1sum)" = "$(git show origin/main:index.html | sha1sum)" ] && echo live
curl -s $B/robots.txt | head -4                  # must say Allow: /, not Disallow: /
for u in /list /events /pending /information; do
  curl -sL -o /dev/null -w "$u %{http_code} %{url_effective}\n" "$B$u"   # 200 each
done
```

Then in a browser:

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

After the next :25 bot run, check GitHub → Actions → *Refresh static content* succeeded
on the new tree.

---

## Step 7 — the Worker and the schema, only if Step 0b said so

As of 2026-09-14 the D1 schema is fully migrated (`snapshots` table, `audit_log.undo_data`
and `audit_log.undone_at` all present) and the deployed Worker has the admin activity and
snapshots endpoints. Check the schema yourself in the D1 Console:

```sql
SELECT name FROM sqlite_master WHERE type='table';
SELECT name FROM pragma_table_info('audit_log');
```

If the admin routes returned 404 in Step 0b, run the migration **before** deploying the
Worker that reads those columns:

```bash
wrangler d1 execute d1-template-database --remote --file=scripts/schema-migrations.sql
```

Then deploy `worker/worker.js` per the deploy box in `database.md` §2. The migration is
written with `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`, so re-running it
is safe; the two `ALTER TABLE audit_log ADD COLUMN` lines are not, and error harmlessly if
the columns already exist.

If Step 0b showed only the `500 / 500` dead routes, deploying `worker/worker.js` removes
them; no migration needed. Optional.

Nothing here affects the public site — it reads none of these routes.

---

## Troubleshooting

**The live `robots.txt` says `Disallow: /`.**
designtest's copy went live — Step 1's restore was skipped. The site will drop out of
search results. Fix immediately: `git checkout "$TAG" -- robots.txt`, commit, push.

**The content bot stopped committing / the Actions tab has no workflow.**
`.github/workflows/refresh-content.yml` was deleted by the wholesale replace. Restore it
from the tag the same way.

**A renamed level's old URL now 404s instead of redirecting.**
designtest's older `data/_level-registry.json` went live and the slug history is gone.
Restore `data/_level-registry.json` from the tag, re-run `node scripts/build-seo.mjs`,
commit.

**`git tag` says the tag already exists.**
`pre-designtest-migration` is taken. Use a dated name as in Step 0; never move an existing
safety tag.

**Refreshing `/list` or `/events` gives a 404 (but clicking links works).**
`_redirects` is missing or not at the repo root. Confirm `test -f _redirects`, that its
last rule is `/*  /index.html  200`, and redeploy. This only takes effect on a Cloudflare
Pages deploy, never when opening files locally.

**The whole site is blank / "Failed to load list."**
The frontend can't reach the Worker. Open
`https://d1-wrkr.ullteam.workers.dev/api/list` directly — if that itself errors, the
problem is the Worker or D1, not this sync (see `database.md`). If it returns JSON, check
the browser console on the site for a CORS or mixed-content error.

**Editors or Recent Changes are empty, but levels load.**
The D1 migration hasn't been run, or the Worker is an old build. This is a backend state,
unrelated to the sync — run `scripts/schema-migrations.sql` and redeploy `worker/worker.js`
per the deploy box in `database.md` §2. (The current Worker degrades instead of erroring,
so an empty list here means "migration not run," not "broken.")

**The admin panel's Snapshots tab says the table does not exist.**
Also a backend state: the `snapshots` table and the two `audit_log` undo columns come from
`scripts/schema-migrations.sql`. Until it is run, the Worker keeps writing audit lines
without undo data and takes no snapshots — it does not error.

**Admin save says "Network error."**
Almost always the Worker threw before it could send CORS headers — check the Worker logs
in the Cloudflare dashboard. See `database.md` §4b; it is not caused by this sync.

**A file I deleted is still served on the site.**
Cloudflare's edge cache (`CF-Cache-Status: HIT`). After the 2026-09-14 move, `/notes.txt`
kept serving its old (empty) copy for a while. Confirm the file is gone from `main`
(`git ls-files <path>` prints nothing); it clears when the cache expires, or redeploy. If a
secret was among the deleted files, treat it as exposed and rotate it — deleting a file
does not un-publish what was already served. For API keys, see `SECURITY.md`.

**`git checkout designtest/main -- .` left files from ULL-new I didn't want.**
You skipped the `git rm -rq .` in Step 1, so only overlapping paths were overwritten and
ULL-new's extras survived. Reset and redo Step 1: `git reset --hard "$TAG"`.

**I need to undo the whole sync after pushing.**
`git revert` the sync commits (keeps history), or, if nothing else has landed since,
`git reset --hard "$TAG" && git push --force origin main`. Force-pushing rewrites history
and discards any bot commits made since — only do it if no one else has pulled.

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

**A UI test fails with `browserType.launch: Failed to launch chromium because executable
doesn't exist at /opt/pw-browsers/...`.**
`CHROMIUM_PATH` is not set — see Step 4.

**A UI test fails with `spawn UNKNOWN` (Windows).**
The Chromium binary itself won't start — running it directly reports "side-by-side
configuration is incorrect". Point `CHROMIUM_PATH` at Microsoft Edge instead (Step 4);
the suites pass on it.

**`upcoming`, `leaderboard` or `list-ui` test fails with `ENOENT ... 'C:\C:\Users\...'`.**
Those three build their root path with `new URL('..', import.meta.url).pathname`, which
on Windows yields `/C:/...`. Run them on Linux/macOS/WSL, or from a temporary copy that
uses `fileURLToPath(new URL('..', import.meta.url))` (the fix `pending-ui` and `seo`
already use). Delete the copy afterwards.

**`js/seo.test.mjs` times out on `/list` waiting for `networkidle` (Windows).**
Seen on Windows with Edge, on an untouched designtest checkout as well, with no request
left open — a harness/browser issue, not the site. Rely on the `list-ui` suite plus the
Step 6 checks there, or run `seo.test` on Linux.

**`js/list-ui.test.mjs` times out waiting for `.list tr`.**
The test harness maps the two CDN `<script>` URLs to `node_modules` by exact filename. If
`index.html` moves to a different Vue build or version, that map stops matching, Vue never
loads and the page renders nothing. Update the map at the top of the three UI tests to the
URL `index.html` now uses. Also check `node_modules/` is in the repo (Step 4's `--prefix .`).

**Old bookmarks with `/#/list` (hash URLs) — do they still work?**
Yes. `js/main.js` rewrites any `#/…` URL to its clean path on load, so old links keep
working.
