# Moving the site to the main repo (`houseofwhy/ULL-new`)

This repo (`Upcoming-Levels-List/ULL-designtest`) is the test build. This guide moves
its finished code into **`houseofwhy/ULL-new`**, which becomes the live site, while
**keeping ULL-new's existing git history** and **keeping the same D1 API backend**.

The frontend talks to the Cloudflare Worker at `https://d1-wrkr.ullteam.workers.dev`, so
the Worker and D1 database are **not touched** by this move — the admin panel and API
keep working the moment the new frontend deploys.

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

A tag on ULL-new's current state, so any mistake is one command to undo.

```bash
git clone https://github.com/houseofwhy/ULL-new.git
cd ULL-new
git tag pre-designtest-migration
git push origin pre-designtest-migration
```

If anything goes wrong later: `git reset --hard pre-designtest-migration && git push --force`.

---

## Step 1 — bring in the designtest tree as one commit

From inside the `ULL-new` clone:

```bash
git remote add designtest https://github.com/Upcoming-Levels-List/ULL-designtest.git
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
# Stale data snapshots — not used by the site.
git rm -r data.backup data.old 2>/dev/null

# Never commit a DB dump: a full editor_keys export contains every key hash.
git rm backup-before-migrate.sql 2>/dev/null   # already gone from designtest; harmless if absent

git commit -m "Drop stale snapshots and any DB dumps before going live" 2>/dev/null || true
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

Skip this if the live domain is `https://ull.pages.dev`. Otherwise update all five:

| File | What to change |
|------|----------------|
| `js/main.js` | `SITE_ORIGIN` constant |
| `index.html` | canonical `<link>`, Open Graph and Twitter `url`/`image` tags |
| `robots.txt` | the `Sitemap:` line |
| `sitemap.xml` | every `<loc>` URL |

```bash
# Example — replace the domain everywhere at once, then eyeball the diff:
grep -rl "ull.pages.dev" js index.html robots.txt sitemap.xml \
  | xargs sed -i 's#https://ull.pages.dev#https://YOUR-DOMAIN#g'
git diff
git commit -am "Point canonical/SEO URLs at the live domain"
```

---

## Step 4 — push

```bash
git push origin main
```

History is intact; the new commits sit on top.

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

If all four pass, promote the deployment / point the custom domain at it.

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

**Old bookmarks with `/#/list` (hash URLs) — do they still work?**
Yes. `js/main.js` rewrites any `#/…` URL to its clean path on load, so old links keep
working after the move.
