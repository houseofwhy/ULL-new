# ULL redesign — templates

Six page templates that rebuild the site out of the vocabulary `/level/<slug>`
already established, plus the shared layer they are built from.

Not covered: `/admin` and `/generator` (staff tools). The `/mobile/*` routes
have their own deck in `design/mobile/`, `/information` — held back from this
pass — now has four competing templates of its own in `design/information/`,
and `/mobile/info` has three in `design/mobile-information/`, of which A
shipped.

These templates have since been built into the site. They stay here as the
reference the pages were made from, and the deck now reads the shipped
stylesheet, so it renders whatever `css/ull-v2.css` currently says.

The home page has since had a **second** pass, about the measure the page sits
on and the weight it gives each block: four templates in
[`design/home/`](home/), two per surface, of which A and C shipped.

```
design/
  templates/*.html      one static mockup per page, with a meta block saying
                        what was wrong and what the template changed
  preview.shell.html    the review deck's chrome
  build-preview.mjs     stitches the templates + css/ull-v2.css into preview.html
  preview.html          GENERATED — open this in a browser
```

The component layer itself lives at `css/ull-v2.css`, alongside the rest of the
site's stylesheets.

Rebuild the deck after editing anything:

```sh
node design/build-preview.mjs
```

## The argument

`/level/<slug>` is the newest page and the only one with a coherent design. It
introduces a level with the level's own blurred thumbnail, states where it
stands with one status pill on the same colour scale the list colours names by,
draws the two progress numbers as meters, and puts the facts in a definition
list — all in one stylesheet, with no inline styles.

Every other page says the same things in prose, at a different size, in a colour
picked for that page alone: `Status: Decoration being made - 80% done` as body
copy, `World Record - From 0: None` as body copy, cross-list ranks as dimmed
grey text, `#c084fc` as a heading colour on the pending page and nowhere else.
Six pages, six vocabularies for one set of facts.

`css/ull-v2.css` lifts the level page's vocabulary into components — `.u-eyebrow`,
`.u-card`, `.u-pill`, `.u-chip`, `.u-rank`, `.u-meter`, `.u-stat`, `.u-dl`,
`.u-btn`, `.u-phero`, `.u-hero`, `.u-row`, `.u-empty` — and each template
rebuilds a page out of them.

## Constraints held

- **No new fields.** Every value in every template already exists in
  `data/<level>.json` or is derived from it the way the app already derives it:
  the verification percentage is the same max over records and run spans that
  `LevelPage.js` computes, the counts are lengths of arrays already in memory,
  the per-record scores come from `js/leaderboard.js`.
- **No per-level prose.** No template adds a written description of a level.
- **List page structure untouched.** All Levels, Main List and Future List keep
  their hero, their 40/60 grid and their list column. Only the level container
  is rebuilt, plus the row rhythm inside the existing markup.

## Two bugs found while building this

1. **Filled buttons lose their colour on the light theme.** In
   `css/pages/level-page.css`, `.level-page a { color: inherit }` (0,1,1) beats
   `.lvl-link` (0,1,0), so the filled *Showcase video* button on every level
   page computes `rgb(0,0,0)` on its `#3e00f9` fill under `.root.dark`.
   Verified against `css/bundle.css`, and fixed: `.lvl-link` is now scoped to
   `.level-page`, and `css/ull-v2.css` scopes every component one level deeper
   (`.ull2 .u-btn`) so the cascade resolves as written.
2. **`.upcoming-hero` duplicates `.page-hero`.** The two blocks in
   `css/pages/list-hero.css` are identical rule for rule; only the class prefix
   differs. `.u-phero` replaces both.

## What shipped

- `css/ull-v2.css` — the component layer.
- `js/components/List/LevelPanel.js` + `css/pages/level-panel.css` — one level
  container, rendered by All Levels, Main List, Future List and Upcoming Levels
  in place of four near-identical copies of the old markup.
- Shared level-state helpers in `js/util.js` (`levelStatus`, `verificationPercent`,
  `bestRecord`, …), which `LevelPage.js` now uses too rather than deriving its own.
- `.u-phero` replacing `.page-hero` and its duplicate `.upcoming-hero`.
- Rebuilt `Home.js`, `Leaderboard.js`, `UpcomingLevels.js`, `ListPending.js` and
  `Events.js`, with `css/pages/events.css` taking the events rules out of
  `home.css`.

## Changes since the templates were drawn

The templates and this deck have been kept in step with these, so what you see
is what ships:

- The level container is **two independent stacks**, not a grid — a short card is
  never stretched to the height of the one beside it. (This reversed an earlier
  equal-height pass, by request.)
- Pending's four hero counts are **buttons that jump to the lane they count**,
  and when Placements runs longer than the other three lanes together, Pending
  Indefinitely moves to the top of the second column. The decision is made on row
  counts, which stand in for height without measuring.
- The Leaderboard lost its "How it was earned" block; the headline figure is
  **Total points**. **Return to top** works here and on Upcoming Levels.
- Recent Changes is a framed scroll window that fills its card, and the hero's
  figure is centred in its own box.
- **Senior moderators are Elder moderators**, matching `js/_guidelines.js`.
- An empty list says so whether a search or a **filter** emptied it.
- A level's **rank chips are all three tiers, in a fixed order** — All Levels,
  Main List, Future List — with only the list being read highlighted, and N/A
  where the level is not on a tier. They used to reorder around the current list
  and drop the tiers a level was missing, which made two levels' chips
  impossible to compare.
- The **verifier line** is written once in `js/util.js`: "on open verification"
  where nobody has claimed the level, "verified by X" once it is done, and a
  lowercase "unknown" in the facts list where there is nobody yet.
- The **Pending List has a search** over all four lanes, and a leaderboard row
  shows how far the player got beside the level name.
- Home's count strip is **three credentials, not five counts**: how much the
  list holds, how long it has been running and how many people use it, as an icon
  and a line each. Five figures in five cells read as a dashboard, and four of them
  repeated what the sidebar already says. The component is `.u-cred`, shared
  with the phone, which shows the first two. The third read "Used by the best
  players" until it became **1k+ users** — a figure beside two figures, and the
  only one of the three a reader could not weigh.
