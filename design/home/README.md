# Home — four templates, two per surface

Home was rebuilt once already, and that pass fixed the biggest thing wrong with
it: [the landing page of a level list now shows levels](../README.md). What it
did not fix is **the geometry those levels sit on and the weight the page gives
each block**, on either surface.

These were **two ways to answer that on the desktop and two on the phone**. A and
C are one idea on two surfaces; B and D are the other.

**A and C were chosen and have been built into the site**, with three changes
asked for on top of them — see [What shipped](#what-shipped) at the end. All four
templates stay here: A and C as the reference the pages were made from, B and D
as the alternatives they were picked over.

Open `preview.html` in a browser, or the standalone pages on a real screen.
Rebuild after editing anything:

```sh
node design/home/build-preview.mjs
```

```
design/home/
  templates/_blocks.html      the shared kit (CSS only) and the chrome blocks
  templates/a-spotlight.html  desktop — the page it is, on one measure
  templates/b-board.html      desktop — three lanes of the list's live state
  templates/c-deck.html       phone — A at 390px
  templates/d-segments.html   phone — B at 390px
  preview.shell.html          the review deck's chrome
  page.shell.html             chrome-free wrapper: the page as a route renders it
  build-preview.mjs           builds both outputs
  preview.html                GENERATED — the four templates with the argument beside them
  pages/*.html                GENERATED — each one on its own, openable anywhere
```

Every output reads `css/ull-v2.css` and `css/pages/mobile-v2.css` **as they
ship** rather than a copy, so a mockup cannot claim a component the site does not
have, and every output inlines the site's own icons, so each file is
self-contained. The `theme` button on a standalone page is a preview control, not
part of the design.

## What was wrong with the page

Measured on the page as it stood, in Chromium against the live list — 479 levels, 12
editors, 42 changes over 3 days — at 1440×900, 1920×1080 and 390×844.

| Reading | What it is |
| --- | --- |
| **72px / 312px** | The gap between the hero's left edge and the body's left edge, at 1440 and at 1920. `.home-hero` pads 2.5rem off the main region; `.home-content` is a 1100px column centred in whatever is left. The page has two left margins and two right ones, and the wider the window the worse it gets. |
| **736px of 1740px** | What the hero uses of the band it sits on at 1920. The lead is capped at 40rem and nothing is placed beside it, so 58% of the first screen is a tinted empty rectangle. |
| **907px** | The distance from a level's name to its status pill in a home row at 1440 (1007px at 1920). `.u-row` pushes its last child right with `margin-left: auto`, which is correct in a 360px phone row and an eye-journey in a 1036px desktop one. |
| **2162px in 387px** | The Recent Changes feed and the window it scrolls inside — 5.6 screens of nested scroll on the desktop, and **2513px in 286px**, 8.8 screens, on the phone. Both sit inside a page that is itself scrolling; on a touch screen a swipe that lands inside the box scrolls the wrong thing. |
| **465px / 499px** | The editors card, desktop and phone. On the phone that is a quarter of the whole page, for twelve names that are also on `/information`. |
| **321px of 792px** | What comes before the first level on the phone: 41% of the window is hero and credentials. |
| **0** | Progress meters on home. Decoration and verification percentage are the two numbers the list sorts by, colours names by and draws as meters on `/level/<slug>` and `/upcoming`. Home writes one of them into a pill and never draws either. |

Two smaller things the templates also settle:

- **The three hero buttons are the sidebar.** *View All Levels*, *Explore Future
  List* and *Learn More* point at three entries that are permanently on screen
  180px to the left. That is dead weight on the desktop, though not on the phone,
  where there is no sidebar.
- **The feed has nowhere to go.** There is no changelog route, so the nested
  window is not an index into a longer page — it is the only place those 42
  entries exist. Every template here keeps them on the page and folds the older
  ones open in place instead.

## The four

### A. Spotlight — the page it is, on one measure · desktop · **shipped**

Keeps every block and fixes what carries them. One column runs the hero, the
credentials, the rows and the feed, so there is a single left edge. The half of
the hero that is empty at every width goes to the level the page is about: **#1
drawn the way `/level/<slug>` draws it** — blurred thumbnail, status pill, both
meters, one button. The rows carry their pill beside the name and a meter under
it, and the editors card becomes a line of names.

Cheapest of the four. Page height at 1440×900 goes from **1665px to 1252px**.

### B. Board — three lanes of the list's live state · desktop

Asks what a visitor comes to a tracker for and answers all of it above the fold.
The hero shrinks to a band; the body becomes three lanes: **the top of the list**,
**the levels closest to being verified**, and **what the staff changed this
week**. The middle lane is the top of `/upcoming` in that page's own order
(`upcomingRanking()` in `js/formulas.js`), so it is a reading the site already
computes. The editors become a credit line above the footer.

The whole page fits **one screen at 1440×900**, and uses the width a 1920 window
gives it.

### C. Deck — A at 390px · phone · **shipped**

The hero keeps its eyebrow and title and loses two of its four lines of lead. The
screen a visitor lands on opens on a level: the credentials bar, then the
spotlight, then rows with their status beside the name and their decoration as a
bar. The feed comes out of its scroll box.

The first level is shown **in full** where 321px of the 792px window used to go
by before a level appeared at all.

### D. Segments — B at 390px · phone

Three lanes cannot sit side by side at 390px, so they become a segment bar that
sticks to the top of the scroll — Top, Closest, Changed — with one lane on screen
at a time. Nothing is two screens down: each of the three answers is one tap from
the landing screen. The editors are a credit row at the foot of every lane.

Each lane is **one screen** — 815px, 771px and 814px against a 741px window.

## What each pair costs, and what it risks

|  | A + C · **shipped** | B + D |
| --- | --- | --- |
| **Idea** | Same page, right geometry | Home is the state of the list |
| **New readings of the data** | None | One — `upcomingRanking()`, already called by `/upcoming` |
| **Blocks kept** | All four, re-weighted | Top of the list and the feed; the roster becomes a credit |
| **What a first-time visitor meets** | Three lines about the project and a level in full | One line about the project and three lanes of levels |
| **Biggest risk** | The spotlight is always #1, which can sit unchanged for months | It reopens a decision this repo already made: [home is not a dashboard](../README.md) |

Both pairs dropped the same two things, and both were judgement calls:

1. **The editors card.** Twelve names in a bordered card become a line of chips
   (desktop) or one row (phone), linking to `/information`, which carries the
   same twelve with their roles and contact routes. **Half of this was reversed
   on the way in**: the desktop shipped the chip line, the phone kept its full
   card.
2. **Two of the three hero buttons**, on the desktop only. Shipped as drawn. The
   phone keeps everything it has, because it has no sidebar.

## Constraints held

- **No new fields.** Every value in every template already exists in
  `data/<level>.json` or is derived the way the app already derives it:
  `decorationPercent`, `verificationPercent`, `levelStatus`, `bestRecord` and
  `bestRun` from `js/util.js`, and `upcomingRanking` from `js/formulas.js`.
- **No new routes and no new components.** The kit in `templates/_blocks.html`
  is layout only — a column measure, a row modifier, a spotlight wrapper, a feed
  in flow, a segment bar. Every card, pill, chip, meter, eyebrow, button and hero
  is a shipped one.
- **No per-level prose.** No template writes a description of a level.
- **The footer, the sidebar and the mobile shell are untouched.**
- **Every figure in the mockups is the real one**, read out of `data/` — the top
  of the list, the six levels closest to verification, the 42 changes over three
  days and the twelve editors. A mockup cannot claim a number the data does not
  have.

## One thing the desktop mockups do that the older decks do not

They draw the **sidebar**. `design/templates/*.html` render the main region
alone, which is right when the sidebar is not part of the argument. Here it is:
half of what these templates change follows from the fact that 180px of
navigation is permanently on screen — the three hero buttons that repeat it, and
the measure the body should be centred on. The sidebar in the mockups is a mock
(`mk-side` in the kit), not the shipped component.


## What shipped

A and C, with three changes asked for on top of the templates. The templates
above have been kept in step with all three, so what the deck renders is what the
site renders.

### 1. The lane is Upcoming Top 1, not the next five rows

`Next on the list` — rows #2 to #6 — became **Upcoming Top 1 levels**: the five
levels **placed above the hardest level on the list that is already verified**,
ordered by how far anyone has got through them.

A level projected to place above the hardest verified level is projected to be
harder than it, so finishing it makes it the new Top 1. Which of them gets there
first is a different question from where they sit in the list, and it is the one
this lane answers — so it is sorted by progress, and its rank column does not
count down. A note under the heading names the level the boundary is drawn at.

The boundary is `levels.findIndex(l => l.isVerified)` over the list the page
already holds; when nothing on the list is verified, every level is a candidate.
No new field, and no second fetch.

**Both surfaces carry it.** The phone shows the same five levels in the same
order under the same heading, with the same note under it — the desktop's
trailing figure column becomes the reading beside the bar, which is how the
phone's rows already carry a percentage.

### 2. The phone keeps its credentials at the top and its editors card whole

Template C moved `479 levels · 3+ years` below the fold and compressed the twelve
editors into a single tappable row. Both were reversed: the credentials bar sits
under the hero where it always has, above the spotlight, and the editors are the
full card again — grouped by role, with the role icon and the role tag on every
line — at the foot of the page. The phone page is longer than the template for
it (**3083px** rather than 1149px), which is the cost of keeping both.

### 3. Furthest progress is written as the run it was, everywhere

The furthest anyone has got is the highest record from 0% **or the longest span
of a run**, whichever reaches further. When a run wins, the figure used to be
written as the points that run is worth — a run from 72% to the end of the level
read as **28%**, which is not what happened and not what anyone would say. It is
now written as the span it covers: **72-100%**, the same way the level page's
Best run card has always written it. A record still reads as the single figure it
reached.

The reading is computed once, in `js/util.js`:

- `verificationEvidence(level)` — `{ kind, value, label, entry }`, the winning
  reading and which kind it is.
- `verificationPercent(level)` — the number, unchanged in behaviour. It drives
  every meter, every status tone and the order of Upcoming Levels; checked
  against the old implementation across all 479 levels, with no differences.
- `verificationLabel(level)` — how that number is written. Empty when nobody has
  got anywhere, so each caller can say `None` in its own voice.

**57 of the 479 levels** on the list read differently now. Every surface that
prints the figure was changed: home and `/mobile/home`, `/level/<slug>`, the
level container on All Levels, Main List and Future List (`LevelPanel`), the
phone's list pages, and both Upcoming Levels pages, where it is the column the
page is sorted by. The bar's width is still the number — only the words changed.

### Where the code is

| | |
| --- | --- |
| `js/util.js` | `verificationEvidence`, `verificationLabel`, and `verificationPercent` refactored onto them |
| `js/util.test.mjs` | 11 assertions covering the two readings and the tie |
| `js/pages/Home.js` + `css/pages/home.css` | template A, with the Upcoming Top 1 lane |
| `js/pages/mobile/MobileHome.js` | template C, with the credentials at the top and the editors card whole |
| `css/pages/mobile-v2.css` | the spotlight, the re-measured row, and `.m2-changes` losing its `max-height`/`overflow` |
| `js/pages/LevelPage.js`, `js/components/List/LevelPanel.js`, `js/pages/mobile/MobileList.js`, `js/pages/UpcomingLevels.js`, `js/pages/mobile/MobileUpcoming.js` | the run label |


## Changes since that pass

Four, and one bug they turned up. The templates and this deck have been kept in
step with all of them, so what the deck renders is what the site renders.

- **The hero's paragraph fills its column.** It was capped at 32rem with nothing
  beside it, which left a ragged band of whitespace between the text and the
  card. The copy stays on the left and the level on the right — source order and
  column order agree — and both edges are the page's: the copy starts where
  every row below it starts, the card ends where they end. (The two were briefly
  swapped and swapped back; what actually fixed the spacing was the bug below.)
- **`padding` was resetting the column's gutter.** `.home-hero { padding: 2.75rem
  0 2.25rem }` is a shorthand, so it set `padding-inline: 0` and beat the
  `padding-inline: 2.5rem` on `.home-col`. **The hero was drawn 40px to the left
  of every other row on the page**, which is what "their spacing looks ugly" was
  pointing at. Every such block is `padding-block` now, on the site and in the
  three templates here that had copied the same shape. Measured after: the
  spotlight, the credentials bar, the section heading and every row share one
  left edge (242px at 1440, 482px at 1920) and one right edge.
- **Recent Changes is a framed scroll window again**, on both surfaces, and the
  "18 on the latest day" count beside its heading is gone. The fold that replaced
  the window kept every entry in the page's flow, which made a page that is
  already three screens on a phone most of a fourth for a log nobody reads to the
  end. All three days are still in the DOM — the window scrolls, nothing is
  hidden behind a control.
- **The third credential is a figure.** "Used by the best players" became
  **1k+ users**. It was the only one of the three a reader could not weigh, sitting
  between "479 levels total" and "3+ years".

## What the deck cannot show

Two things about the home page live outside these templates, and are worth knowing
before reading them as the whole picture:

- **The version in the phone's top bar** is chrome, not home: it comes from
  `js/components/MobileShell.js`, and the copy in these mockups is kept in step by
  hand. It reads v2.1.0.
- **The spotlight is #1 and the lane is derived**, so both change as the list does.
  The figures in these templates are the ones the repo's `/data` snapshot gives —
  Aeternus at #1, GRIEF at 97% — and the live page will show whatever the list
  holds today. The shapes are what the deck is for.
