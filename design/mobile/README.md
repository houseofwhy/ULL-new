# ULL mobile redesign — templates

Eight templates that rebuild the `/mobile/*` tree on the vocabulary the desktop
pages use, plus the phone-only layer they need.

These have been built into the site. The templates stay here as the reference
the pages were made from; the shipped layer is `css/pages/mobile-v2.css`, which
the deck now reads directly, so it renders whatever that file currently says.

`/mobile/home` has since had a second pass, beside a matching one for the
desktop, in [`design/home/`](../home/): the spotlight that opens the page on a
level, the row that carries its status beside the name, and Recent Changes out
of its nested scroll box. Template C shipped.

Open `preview.html` in a browser, or rebuild it after editing anything:

```sh
node design/mobile/build-preview.mjs
```

```
design/mobile/
  templates/*.html      one mockup per page, with a meta block saying what was
                        wrong and what the template changed
  preview.shell.html    the review deck's chrome
  build-preview.mjs     stitches the templates + css/ull-v2.css +
                        css/pages/mobile-v2.css, both read as they ship
  preview.html          GENERATED — open this
```

## The argument

The desktop pages speak one language now: an eyebrow for every section heading,
one status pill on the list's own colour scale, meters for the two progress
numbers, stat cards for the records, a definition list for the facts, chips for
tags and creators. The mobile tree speaks none of it — it still writes
`Status: Decoration 80% done` and `WR From 0: None` as sentences, under headings
in a purple that appears nowhere else on the site.

So these templates add very little CSS. Everything a phone shares with the
desktop comes from `css/ull-v2.css` unchanged. `css/pages/mobile-v2.css` holds only
what genuinely differs at 390px: one column, a detail that expands under its row
rather than sitting beside it, controls within thumb reach, and a type scale one
step down.

## Feature parity

What the desktop had and the phone did not. All of it shipped, except the last
row — see below.

| Page | Missing on mobile |
| --- | --- |
| Home | Count strip, top five levels, dated timeline with tone dots, editors grouped by role |
| Level detail | Thumbnail hero, status pill, rank chips, progress meters, record cards, creators chips, Open level page, Share level |
| Upcoming | Progress bar per row, furthest-progress lead, the level container's cards |
| Leaderboard | Podium, total as a display figure, record type pills, aligned score column |
| Pending | Per-lane counts, lane tints, the placement each level waits for spelled out |
| Events | Thumbnail hero, status pill, tags, details, and the desktop's ordering |
| `/level/<slug>` | Any mobile chrome at all — it is the one route that never redirects, so a shared link lands outside the app |

All of it has shipped now, including the last row.

Nothing was added that the desktop does not have. No new data fields, and no
per-level prose.

The `/level/<slug>` row was held back at first, because the obvious way to fix
it — redirecting to `/mobile/level/<slug>` — would move the one URL every shared
link and search result points at. It is done now without touching the URL: the
chrome moved into a component (`js/components/MobileShell.js`) that the route
wears on a phone and not on the desktop, decided by `store.mobile`. So the page
keeps its own layout, which already stacked, and loses the desktop sidebar
toggle floating over its hero, the desktop footer under it, and the sidebar that
opened from that toggle with no way back out. The template here is the sketch
that was drawn for it; what shipped keeps the page's own `lvl-*` markup inside
the same shell rather than rebuilding it in `m2-*`.

## The two structural calls

Everything else was a restyle of what was already there. These two moved things:

1. **The tab bar.** The eight destinations used to live behind a "Pages" button
   in the top bar, two taps from anywhere. They are a bar along the bottom now —
   Home, Levels, Information, and Other, which opens a sheet listing All Levels,
   Main List, Future List, Leaderboard, Upcoming Levels, Pending List,
   Information and Events.
2. **The bottom sheet.** Filters and settings used to open as a centred popup
   whose Apply and Reset buttons landed in the middle of the screen. They are a
   sheet anchored to the bottom edge, and the filters a wrapped chip field
   rather than one check-box per line.

Both re-homed existing controls; neither added a feature.

## Changes since the templates were drawn

The templates are kept in step with what ships, and the deck reads the shipped
stylesheets, so what it renders is what the site renders:

- **Home opens wider than the rest of the tree.** Every other page drops
  straight into rows, so its hero stays compact; home is the page a visitor
  lands on, and there the same block read as cramped — an eyebrow, a title,
  three lines of lead and five count chips wrapping onto two ragged rows, all
  inside 230px. The title and its lead got room around them, and the counts
  came out of the hero.
- **The level page keeps the page's own spacing.** `.m2 h1, .m2 h2, .m2 h3, .m2 p
  { margin: 0 }` scores (0,1,1) — inside the shell it flattened every (0,1,0)
  spacing class the level page brought with it, so the title ran into the byline
  and every card heading sat on the line under it. `css/pages/mobile-v2.css` names
  them and puts them back.
- **Rank chips are all three tiers, in order, always.** A tier the level is not
  on reads N/A instead of vanishing, and only the list being read is
  highlighted, so the chips no longer reshuffle between lists.
- **The Pending List has a search**, over all four lanes at once; the counts in
  the hero follow it.
- **Home reaches its own bottom.** It used to be a scroll container inside the
  shell's scroll container, which cut off its last screen and put the footer out
  of reach. The shell is also measured in `dvh` now, so a mobile browser's own
  bars do not sit over the last rows of any page.
- **Every search field carries a magnifying glass.** It is drawn on `.m2-search`
  itself rather than added to each page's markup, so the levels, upcoming and
  leaderboard fields all have it.
- **The five counts became three credentials, and then two.** Tracked, main,
  future, verified and pending said the same thing five times, and four of them
  repeated the sidebar. In their place is `.u-cred` in `css/ull-v2.css` — an
  icon and a line each for how much the list holds, how long it has been
  running and who uses it — shared with the desktop, which draws all three; a
  phone line holds two, so the phone takes the first two. Both are scoped to
  `.mob-home-page`, so no other page changed.

## The expanded row is a summary

Tapping a level opens four short lines — where it stands, its two progress
numbers and the best two records — then **Open level page**. The video,
creators, tags, ID and length are on the level's own page. Unfolding the whole
record inline pushed the next level most of a screen down.

## Test hooks in the markup

Some class names on these pages exist for the test suites, not for styling:
`.mob-level-row`, `.mob-rank`, `.mob-pending-card`, `.mob-pending-row`,
`.mob-settings-list`, `.mob-setting-row`, `.mob-toggle`, `.mob-topbar-btn` and
`.mob-popup-overlay`. `js/list-ui.test.mjs` and `js/pending-ui.test.mjs` assert
on them.

## Not covered

`/mobile/info`, which mirrors the Information page. It has since been rebuilt
too: the desktop side as a hub (`design/information/`), and the phone side from
the three templates in [`design/mobile-information/`](../mobile-information/),
of which A shipped. Nothing in the mobile tree is on the old styling any more.
