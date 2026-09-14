# /mobile/info — three templates

The desktop `/information` was [rebuilt as a hub](../information/): a hero that
says what the list is, one search field over everything on the page, and six
faces that open a reader — the FAQ, the site map, the guidelines, the two
legends, the staff and contact routing, and the API. The phone still shows the
page it showed before that, and the [mobile deck](../mobile/) says so in its
own "not covered" note: `/mobile/info` is the one route left on the old
styling.

These are **three ways to put the same content on a 390px screen**. All three
carry everything the desktop page has and nothing it does not.

**A was chosen and has been built into the site.** All three templates stay here
— A as the reference the page was made from, B and C as the alternatives it was
picked over. What shipped is at the bottom of this file.

Open `preview.html` in a browser, or the standalone pages on an actual phone.
Rebuild after editing anything:

```sh
node design/mobile-information/build-preview.mjs
```

```
design/mobile-information/
  templates/_blocks.html   the content, once: the reading kit and twelve blocks
  templates/a-doors.html   the three mockups, each with a meta block saying what
  templates/b-shelf.html   the idea is, how it settles the weighting, what it
  templates/c-index.html   costs and what to watch for
  preview.shell.html       the review deck's chrome
  page.shell.html          chrome-free wrapper: the page as the route renders it
  build-preview.mjs        builds both outputs
  preview.html             GENERATED — the three mockups with the argument beside them
  pages/*.html             GENERATED — each one on its own, openable on a phone
```

Every output reads `css/ull-v2.css` and `css/pages/mobile-v2.css` **as they
ship** rather than a copy, so a mockup cannot claim a component the site does
not have, and every output inlines the site's icons, so each file is
self-contained. The `theme` button on a standalone page is a preview control,
not part of the design.

## What is wrong with the page today

`js/pages/mobile/MobileInfo.js` and `css/pages/mobile-info.css`, as they stand:

1. **Four of the six blocks do not exist.** There is no FAQ, no site map, no
   staff and contact routing and no API reference — and no way in to any of it.
   What is there is the editor list, the two legends and the guidelines.
2. **The legends redraw a scale the site already owns.** Ten swatches are
   written as inline `style="background:#5599ff"`, the same ten values as
   `.u-pill--blue` … `.u-pill--done` in `css/ull-v2.css`. They can drift from
   the thing they explain, and on the desktop they no longer can.
3. **The guidelines scroll inside a page that scrolls**, under a chip index of
   all fourteen sections that pushes the text most of a screen down.
4. **The hero is a purple that appears nowhere else** (`#c084fc`, and `#7c3aed`
   on the light theme), under type set in its own scale.
5. **The search covers the guidelines only.** On the desktop it runs over the
   guidelines, the FAQ, the endpoints, the level fields and both legends.

## Feature parity

Everything the desktop page has, and where each template puts it. No template
adds anything the desktop does not have.

| On the desktop | A. Doors | B. Shelf | C. Index |
| --- | --- | --- | --- |
| Hero, and "what this list is, in full" | Hero → reader | Hero → Start segment | Hero → first part |
| Search over everything on the page | Under the hero | Under the hero | Under the hero |
| FAQ — 15 questions in 4 groups | Face → reader | Segment | 15 folded rows |
| Navigation — 9 pages | Face → reader | Segment | Printed |
| Guidelines — 14 sections in 5 groups | Face → index → section | Segment + group row | 14 folded rows |
| Reference — 19 marks, both legends | Face → reader | Segment | Printed |
| Staff & contact, and the routing table | Face → reader | Segment | Printed |
| API — 9 endpoints, 9 fields, fair use | Face → reader | Segment | Printed |
| A URL per window (`?open=`), Back closes it | Per reader | Per segment | Per anchor |

Two notes on the edges of "and nothing else":

- **The footer.** The desktop page renders `js/components/Footer.js`. The mobile
  shell already draws a footer under every page
  (`js/components/MobileShell.js`), so none of the three repeats it.
- **The `Ctrl K` hint** on the search field is dropped in all three. There is no
  Ctrl key on a phone. It is the only thing on the desktop page that none of
  these carries.

Every count in the deck is the count the shipped page computes from its data —
14 sections in 5 groups, 15 questions in 4 groups, 9 pages, 19 marks, 9
endpoints, 9 level fields — so a template cannot claim a size the content does
not have.

## The three

### A. Doors — the desktop hub, stacked · **shipped**

The hero, the search, then the six faces in one column in the desktop's own
order. A face is still a face: a label, a name, one sentence and the size of
what is behind it. Tapping one raises a reader over the whole screen, tab bar
included. The guidelines reader opens on its fourteen sections and pushes one
section over the index — what the desktop's index-beside-body split becomes when
there is no beside.

Cheapest to build: `MobileInfo.js` becomes the same component as
`Information.js` with one column and a sheet instead of a centred window. Same
`?open=` keys, same seven bodies, same search index. The cost is depth — the
guidelines are two taps away where the desktop is one, and Back has to unwind
section → index → page.

### B. Shelf — one sticky segment bar, no overlays

Seven segments — Start, FAQ, Pages, Rules, Marks, Staff, API — and you are
always standing in one of them. Nothing opens over anything: no scrim, no scroll
lock, no focus trap. The Rules segment carries a second row for the five
guideline groups, and a whole group reads as one scroll, in order.

No modal component at all, which is the largest thing the other two need. The
cost is that no screen shows all six blocks together any more, and on the Rules
segment two sticky rows sit above the text.

### C. Index — one document, nothing hidden behind a tap

Everything printed in order. The two long parts — fifteen questions, fourteen
sections — are rows that unfold where they stand; everything short is simply on
the page. A Contents bar sticks under the top bar with the part you are in
written on it, and opens a sheet listing the seven parts and all fourteen
sections.

The most linkable of the three, and the longest: twenty-nine folded rows before
the reference legends start, so the Contents bar is not a convenience here — it
is the only practical way to reach the API.

## How the deck is built

The content lives **once**, in `templates/_blocks.html`: a reading kit (the
prose, legend, endpoint, field and index styles the phone needs on top of
`.ull2`) and twelve blocks the build stamps into whichever templates ask for
them, `<!--__B:faq__-->` and so on. Two of them — the top bar and the tab bar —
are the mobile deck's own chrome, so the mockups sit in the shell the built page
would sit in.

One exception, and it is deliberate: **C typesets the FAQ and the guidelines as
folds**, so it carries its own copy of those two lists rather than the shared
block. If a question changes, C's copy changes with it.

The mockups are live — every door opens, every segment switches, every row
unfolds, and tapping a search field shows what it found — using radios,
checkboxes and `<details>` rather than script. In the built page these are a
route, a query key and component state.

As in the desktop deck, only the first guideline section is typeset in full.
The rest are their real titles under their real groups; B's four other groups
and C's thirteen other rows say in one line what stands behind them.

## What shipped

A, as `/mobile/info`:

- `js/info-windows.js` — the seven windows, the counts behind each and the one
  search index over the guidelines, the FAQ, the endpoints, the level fields and
  both legends. **Both** surfaces read it now: `js/pages/Information.js` lost its
  own copy of all of that, so the desktop and the phone cannot disagree about
  what a window is called or what the search finds.
- `js/pages/mobile/MobileInfo.js` — the hero, the search, the six faces and the
  reader, on the same `?open=` keys as the desktop, so a rule can be linked to
  and Back closes what it opened. The guidelines open on their index and push a
  section over it, with its own back control.
- `css/pages/mobile-info.css`, rewritten. The page carries **both**
  `.info-page` and `.mob-info`, and the reader is the desktop's own `.info-win`:
  the prose, FAQ rows, legends, people, site map, tables and code chips come
  from `css/pages/information.css` unchanged, and this file holds only what
  differs at 390px — a type scale one step down, controls at tap size, one
  column instead of two, and a reader that fills the screen.

Three things worth knowing about the build:

- **Two things differ from the desktop deliberately, both since shipping.** The
  search field says *Search the page* rather than naming everything it covers —
  the long placeholder is cut off at 390px anyway — and the guidelines face is
  the same grey as the other five. On the desktop that face carries a wash of
  the brand colour, which is how it holds the eye in a twelve-column grid; in
  one phone column there is nothing to hold it against, so the wash only makes
  one of six cards look like a different kind of thing.

- **The endpoints and the level object are lists, not tables.** Both desktop
  tables are wider than the screen; each row is a line of its own instead. Same
  fields, same order, same source. The FAQ's points table stays a table — it is
  authored as markup in `js/_info.js`, so it can only be made to fit, and it
  does, at 361px of the 390.
- **The `Ctrl K` hint is gone**, as the parity table above says. It is the only
  thing on the desktop page the built phone page does not carry.
- **The old page's "Return to top" button went with it.** The desktop
  `/information` has no such control, and the doors are one and a half screens.
