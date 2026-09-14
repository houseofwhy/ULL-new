# /information — the hub

The one page the [main redesign](../README.md) skipped, rebuilt as a hub: a
front screen of six faces, each opening its content in a reader over the page.

**This has since been built into the site.** The template stays here as the
reference the page was made from, and the deck reads the shipped stylesheet, so
it renders whatever `css/ull-v2.css` currently says.

```
design/information/
  templates/hub.html      the mockup, with a meta block saying what the idea is,
                          how it settles the weighting, what it costs and what
                          to watch for
  templates/_modals.html  the reader the blocks open
  copy.md                 SUPERSEDED — the first draft of the sections that did
                          not exist yet. All of it shipped and was then rewritten;
                          the live copy is js/_info.js
  page.shell.html         chrome-free wrapper: the page as the route renders it
  preview.shell.html      the review deck's chrome
  build-preview.mjs       builds both outputs from the template + css/ull-v2.css
  preview.html            GENERATED — the mockup with the argument beside it
  pages/c-hub.html        GENERATED — the page on its own
```

Rebuild after editing anything:

```sh
node design/information/build-preview.mjs
```

Both outputs are self-contained — the icons are inlined — and both read
`css/ull-v2.css` directly, so nothing in the mockup can claim a component the
site does not have. The mockup is live: every door opens and closes. The small
`theme` button on the standalone page is a preview control, not part of the
design.

## What is wrong with the page today

1. **The legends outweigh the guidelines.** `.info-cards` is a `1fr 1fr` grid
   and the Pending legend is given `grid-column: 1 / -1` by an inline style, so
   nine icon rows take the full page width while the entire rulebook is read
   through a `max-height: 600px` pane underneath it.
2. **The guidelines scroll inside a page that scrolls.**
   `.info-guidelines-content` is its own scroll container inside `.info-page`,
   so the wheel does one thing or the other depending on where the pointer is.
   `Information.js` carries an IntersectionObserver whose only job is to switch
   that inner `overflow-y` on and off — a workaround for a nesting that does not
   need to exist.
3. **The colouring legend redraws a component the site already has.** Ten
   swatches are written as inline `style="background:#5599ff"`, and those ten
   hex values are the same scale as `.u-pill--blue` … `.u-pill--done` in
   `css/ull-v2.css`. The template draws the legend with the pills themselves, so
   it cannot drift from the thing it explains.
4. **Nothing tells a first-time visitor where anything is.** The hero defines
   the list in four lines and the next thing on the page is a list of editors.
5. **The card hover from the pending page is here too.** `.info-guidelines:hover`
   applies `transform: scale(1.006)`, which nudges the layout under the pointer.

## The page

A hero — what the list is, the full version offered at the end of the sentence,
and one search field over everything on the page — then six blocks:

Every one of them is a **face**, not a container: a label, a name, one sentence,
and the size of what is behind it. Nothing on the page is the content itself —
every block opens the same reader over the page.

| Block | On the page | Behind it |
|---|---|---|
| **FAQ** | Five of twelve columns, first: it is what most visitors arrive wanting | 14 questions in four groups, with the points table |
| **Navigation** | Seven columns, the page names as chips. Stretched to the FAQ's height so row one has one height, not two | Every page on the site with a paragraph on what is in it, grouped as the menu groups them |
| **Guidelines** | Seven of twelve columns, three rows tall. Its five groups and their counts — the one thing nobody should have to open to size up | The thirteen sections, with their index |
| **Reference** | A strip of eight colours and five icons, no labels | Both legends in full, side by side |
| **Staff & contact** | One sentence | The team, and where to take a record, a correction or a bug |
| **API documentation** | Two endpoint chips | Nine endpoints, the level object, an example, fair use |

Row 1 is 5 + 7 and the rows under it are 7 + 5, so the page's outer edges hold
while the FAQ sits top-left where reading starts. The internal column edge moves between row 1
and row 2; that is deliberate, and it is the one thing to look at twice.

At 1440 px the whole page is 948 px tall — one screen and a nudge — and the
guidelines block and the right-hand stack balance to within a pixel.

## The six sections

1. Guidelines — exists, rebuilt.
2. The two legends — exist, merged into one Reference block that opens.
3. What the list is — **new**, in the hero and its reader.
4. FAQ — **new**. "How do I submit" and "how are points calculated" are
   questions here, not sections of their own.
5. Staff and contact points — **new** as a block; the editor list exists.
6. **Navigation** and **API documentation** — new. The API block is taken from
   `worker/worker.js` and the repository README, not invented; `copy.md` flagged
   two undocumented routes (`/api/leaderboard`, `/api/upcoming`) that answered but
   that the site never called — both have since been removed from the Worker —
   and that public reads have no rate limit, which still holds.

A glossary belongs inside the guidelines, as a section of *General*.

## What shipped

- `js/pages/Information.js` — the hub and its reader, with the six windows on
  `?open=` so a rule can be linked to, Escape and Back closing one, and the page
  behind it locked while it is open.
- `js/_info.js` — the navigation copy, the FAQ, the API reference, the two
  legends and the contact routing, alongside `js/_guidelines.js` for the same
  reason: it is prose, edited by people who are not editing components.
- A **Glossary** section in `js/_guidelines.js`, under General.
- `css/pages/information.css`, rewritten.
- The editor-list rules moved from `information.css` to `css/pages/home.css`,
  where their only remaining caller lives, under home's own prefix.

Two things worth knowing about the build:

- The search field is real. It runs over the guidelines, the FAQ, the endpoints,
  the level fields and both legends, and a hit opens the window it lives in — a
  guidelines hit opens that section.
- Every count on the page is computed from the data. "14 sections", "15
  questions", "9 pages", "19 marks", "9 endpoints" and the group counts are
  lengths of the arrays behind them, so they cannot drift from what is there.

## Not covered

- Mobile. `/mobile/info` was untouched by this pass; it has three templates of
  its own in [`design/mobile-information/`](../mobile-information/), which put
  this page's content on a 390px screen. A. Doors shipped. Two details differ
  there on purpose: the search field says *Search the page*, and the guidelines
  face is the same grey as the other five — the brand wash only reads as a
  hierarchy in a twelve-column grid.
- The four approaches this was chosen from — A. Shelf, B. Manual, D. Document,
  E. Tiles. All are in git history.
