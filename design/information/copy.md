# /information — draft copy

> **Superseded.** This was the first draft, written when sections 3, 4 and 6 did
> not exist. All of it shipped and has since been rewritten against what the
> staff actually do — the live copy is `js/_info.js` (navigation, FAQ, API,
> legends, contact routing) and `js/_guidelines.js` (the guidelines). Where the
> two disagree, `js/_info.js` is right. This file stays as the record of what was
> drafted, not as a source to copy from.

Sections 3 (what the list is, where is what), 4 (FAQ) and 6 (the API) did not
exist, so this is the first draft of all three, plus the contact block section 5
needs. It is
separate from the templates on purpose: the four templates are four ways of
*arranging* this text, and whichever one wins, this is what goes in it.

Everything here is either taken from `js/_guidelines.js` and `README.md` or
derived from code that ships (`js/formulas.js` for the point figures). Two
answers are marked **[confirm]** — they describe staff procedure that is not
written down anywhere I could read, so a staff member should check the wording
before it goes live.

---

## 3. What this list is

**Lead.** The Upcoming Levels List catalogues upcoming Top 1–135 Extreme Demons
in Geometry Dash that are projected to be verified and placed on the Demonlist,
along with unrated Extreme Demons that would have qualified for a rating when
they were made. It is a forecast of what the Demonlist is about to look like —
not a record of what has already happened.

Nothing here is official. Positions are estimates made by the list staff against
written criteria, and they move as levels progress.

### Navigation — what is on each page

Grouped the way the sidebar groups them, so the block and the menu agree.

**Lists**

- **All Levels** `/list` — Every level with a conceivable chance of being
  verified and published, hardest first. The widest of the three tiers, and the
  one a level's leaderboard points are calculated from — a record is worth what
  it is worth because of the level's rank *here*.
- **Main List** `/listmain` — The same order with a higher bar: levels that
  already meet the standards required to be considered for an official rating.
  Shorter, and every entry is a serious candidate.
- **Future List** `/listfuture` — The strictest tier: levels with a very high
  likelihood of being verified and published soon. Read this one if you only
  want what is about to happen.
- **A level's page** `/level/<name>` — One page per level: its state, how much
  of the decoration is done and how far the best run has got, every record and
  run with proof, its creators, and its rank in each tier at once.

**Other**

- **Upcoming Levels** `/upcoming` — The same unverified levels, reordered by how
  close they actually are to being verified rather than by how hard they are.
  The list of what is about to fall.
- **Pending List** `/pending` — Levels that passed selection but have no exact
  position yet, with the range each is expected to land in and an arrow for
  which way it is moving inside it.
- **Leaderboard** `/leaderboard` — Players ranked by the verifications, records
  and runs they hold on listed levels. Open a player to see every record behind
  their total and what each one is worth.
- **Events** `/events` — Three levels the list is pointing at right now: one
  picked for the day, one for the month, and the one closest to being verified.
- **Home** `/` — The size of each tier at a glance, the top of the list, the
  recent changes feed and the staff team.

### How to read a level

- **The name's colour** is its state, from layout through decoration and
  verification to rated. The full scale is in the colouring legend.
- **Two percentages** follow every level: how much of the decoration is done,
  and how far the best run has got.
- **The badges** are its position in each of the three tiers — a level can be
  #4 in All Levels and #2 in Future List at the same time.
- Level colouring is a setting. If names look plain white, turn it on in
  settings.

---

## 4. FAQ

### Getting on the list

**How does a level get on the list?**
Staff select it. There is no queue a creator joins: moderators assess levels
against the Level Selection criteria in the guidelines — classic gameplay, a
public recording, an intended official-server release, and a credible chance of
being rated — and place the ones that pass on the Pending List until an exact
position is settled.

**My level isn't listed. Can I put it forward?** **[confirm]**
Yes — raise it in `#list-discussion` on the Discord server with a public
recording of the level's current state. It is not a submission form and staff
are not obliged to add it; it goes through the same selection criteria as
anything else.

**What is the difference between All Levels, Main List and Future List?**
The order of levels is the same in all three. What changes is the threshold to
appear at all: All Levels takes anything with a conceivable chance, Main List
takes levels that meet rate-worthy standards, and Future List takes only levels
very likely to be verified and published soon.

**Why is a level on Pending and not on the list?**
It has passed selection, but its exact position hasn't been decided. Pending
shows the range it is expected to land in and an arrow for whether it is moving
up or down inside that range.

**A level's information is wrong or out of date.**
Report it in `#level-update-reporting` with something to back it up — gameplay
footage, a statement from the creator, tester feedback. Positions are adjusted
on that kind of evidence.

**Why is a level marked 🚫?**
It is pending removal: it no longer meets the criteria it was added under, and
will come off the list unless that changes.

### Records

**How do I submit a record?**
Through the list's Discord server. Read *Acceptance of Records* in the
guidelines first — a record that arrives without the required proof is rejected
before anyone assesses it, not sent back for more.

**What proof does a record need?**
A complete, uncut playthrough of the record (if your video has cuts, attach the
raw footage as well), the level's audio or your clicks, and a cheat indicator
and fps/tps display where your mod menu provides them. The record has to be on
the version of the level the site lists. The full requirements, including what
may be blurred and what may not, are in *Requirements for proof of legitimacy*.

**What counts as a world record here?**
Two things are tracked separately: the best completion from 0%, and the world
record run — the longest single segment on the current version of the level,
measured from where it started to where it ended. Both are defined in
*Definition of a World Record*.

**My record was rejected. Can it be reviewed?**
Records rejected because the player changed the level are reviewable if the
creator later made the same change in a new version. Ask the staff.
Anything rejected for missing proof needs to be resubmitted with the proof.

### Points and the leaderboard

**How are points calculated?**
From two things: the level's rank in **All Levels**, and the percentage of your
record.

```
percent factor   p ≤ 35   0.05 · (p + 10)²
                 p > 35   −0.008 · (p − 200)² + 320
rank factor      1.5 · (30000 / (rank + 40) − 2)
points           percent factor × rank factor ÷ 180
```

A verification is worth **twice** a 100% record on the same level. Completing a
level that isn't verified yet — a layout completion — is worth **0.8 of a
verification**, so 1.6× a plain 100%.

| | #1 | #10 | #50 | #100 |
|---|---|---|---|---|
| 100% record | 1459 | 1196 | 663 | 425 |
| 50% record | 851 | 698 | 387 | 248 |
| Verification | 2919 | 2392 | 1325 | 849 |

Two consequences worth knowing: the rank factor falls off steeply near the top
and flattens out lower down, and percentage is worth much less than position —
a 50% on #1 beats a 100% on #100.

**Why did my total change when I didn't submit anything?**
Because points are calculated from a level's *current* rank. When levels move —
and they move constantly on a list of upcoming levels — every record on them is
worth a different number of points.

**What is "layout verified"?**
A 100% completion of a level that hasn't been verified yet, i.e. someone beat it
in its undecorated state. It is scored as its own thing, at 0.8 of a
verification.

### The list itself

**What do the colours in the list mean?**
They are the level's state: blue for a layout, through cyan, green and yellow as
decoration progresses, amber when decoration is finished, orange and red as
verification progresses, grey when verified, white when rated. The full scale is
in the colouring legend on this page, and it is the same scale as the status
pill on a level's own page.

**Is this the Demonlist? Is it official?**
No. ULL is a community project and is not affiliated with RobTop Games. Levels
that are already rated are placed in strict accordance with their ranking on
Pointercrate, and these guidelines are adapted from the Global Demonlist
Guidelines, with credit to their authors — but nothing here is an official
ranking.

**The rules changed and I didn't know.**
Changes are announced in the Discord server. The guidelines on this page are
always the current version.

---

## 5. Contacts (block for the staff section)

| | | |
|---|---|---|
| **Upcoming Levels List** | Announcements, placements, list updates | [discord.gg/QRX47v2qyC](https://discord.gg/QRX47v2qyC) · [@ull_gd](https://x.com/ull_gd) |
| **QwidziT** — List Leader | The list and its staff team | Discord `@qwidzit` · Telegram `@qwidzit` |
| **exiled_shade** — Admin | Server management | Discord `@exiled_shade` |
| **Prometheus** — Website | Bugs and problems with the site itself | Discord `@prometheus.dev` |

Where to take what:
- **A record** → the Discord server.
- **A level that should be listed, or one whose information is wrong** →
  `#list-discussion` / `#level-update-reporting`.
- **Something broken on the website** → the site's developer, not the mods.
- **A complaint about a staff member** → an Admin, or the List Leader directly.

---

## 6. API documentation

**Lead.** Everything this site shows comes from a public JSON API. It needs no
key, no signup and no referrer, and it sends `Access-Control-Allow-Origin: *`,
so a page or a bot can read the list straight from the browser.

**Base URL:** `https://d1-wrkr.ullteam.workers.dev`

### Endpoints

| Method & path | Returns |
|---|---|
| `GET /api/list` | Every level, in rank order |
| `GET /api/list/main` | The Main List |
| `GET /api/list/future` | The Future List |
| `GET /api/levels/{position}` | One level, by its 1-based rank |
| `GET /api/pending` | Pending List entries |
| `GET /api/editors` | The staff list, in the order staff arranged it (not alphabetical) |
| `GET /api/level-month` | Level of the Month, or `null` |
| `GET /api/level-verif` | Closest to verification, or `null` |
| `GET /api/recent-changes` | The changes feed, grouped `{date, entries[]}` |

Writing to the list needs a staff API key and is not part of the public API.

### The level object

The fields most callers want, from `parseLevel()` in `worker/worker.js`:

| Field | Type | Meaning |
|---|---|---|
| `path` | string | Slug; the level's page is `/level/{path}` |
| `name`, `author` | string | Level name and host |
| `creators` | string[] | Everyone credited |
| `verifier` | string | Verifier, or `"Open Verification"` |
| `percentFinished` | number | Decoration progress, 0–100 |
| `records`, `run` | object[] | `{user, link, percent, hz}` |
| `tags` | string[] | `Public`, `Layout`, `Rated`, … |
| `isMain`, `isFuture`, `isVerified`, `benchmark` | boolean | Tiers and state |
| `sort_order` | number | Rank in All Levels |

Twelve further fields — `id`, `rating`, `length`, `percentToQualify`, `lastUpd`,
`thumbnail`, `showcase`, `verification`, `frameCounter` — are already documented
in the repository README, which the page should link to rather than repeat.

### Fair use

- cache what you fetch: the list changes a few times a day, not a few times a second;
- identify your bot in the user agent if you are polling on a schedule;
- the data is community work — credit the list and link back to it;
- positions are estimates and change, so treat a stored rank as a snapshot.

### Two things for the team to decide **[confirm]**

1. ~~`GET /api/leaderboard` and `GET /api/upcoming`~~ — **decided: removed.**
   Neither table was ever created by any migration, so both routes answered 500,
   and nothing called them; the site derives both from `/api/list`
   (`js/leaderboard.js`, `js/pages/UpcomingLevels.js`). They were deleted from
   `worker/worker.js`. The API reader documents nine endpoints and says there is
   no leaderboard endpoint, which is now literally true.
2. There is no rate limit on the public reads (the throttle in
   `worker/worker.js` covers failed *auth* attempts only). The "fair use" list
   above is a request, not a rule. If the team wants a real limit, the wording
   here should change to state it.
