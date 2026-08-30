// Page copy and metadata used by scripts/build-seo.mjs to generate the static,
// crawlable HTML shell for every public route.
//
// Everything here is plain text/HTML on purpose: it is what search engines and
// AI crawlers that do not execute JavaScript will read. The Vue app replaces it
// with the live, API-backed version as soon as it mounts.

export const SITE = {
    origin: 'https://ull.pages.dev',
    name: 'Upcoming Levels List',
    shortName: 'ULL',
    discord: 'https://discord.gg/QRX47v2qyC',
    x: 'https://x.com/ull_gd',
    api: 'https://d1-wrkr.ullteam.workers.dev',
    logo: 'https://ull.pages.dev/ull_icon.png',
};

// Shown at the bottom of every static block so each page links to the rest of
// the site even before the router exists.
export const NAV = [
    ['/list', 'All Levels'],
    ['/listmain', 'Main List'],
    ['/listfuture', 'Future List'],
    ['/upcoming', 'Upcoming Levels'],
    ['/pending', 'Pending List'],
    ['/leaderboard', 'Leaderboard'],
    ['/events', 'Events'],
    ['/information', 'Information'],
];

const TIERS = `
<h2>The three list tiers</h2>
<p>Every level on the Upcoming Levels List is positioned on one consistent scale. The three
tiers differ only in how strict their inclusion threshold is, forming a hierarchy of
probability and quality.</p>
<ul>
  <li><strong><a href="/list">All Levels</a></strong> &mdash; the full catalogue, with the lowest
  inclusion threshold: every Geometry Dash Extreme Demon in development with a conceivable
  chance of being verified and published.</li>
  <li><strong><a href="/listmain">Main List</a></strong> &mdash; levels that already meet the
  fundamental standards required to be considered for an official rating by the developer.</li>
  <li><strong><a href="/listfuture">Future List</a></strong> &mdash; the strictest tier: levels
  with a very high likelihood of imminent verification and publication.</li>
</ul>`;

export const FAQ = [
    {
        q: 'What is the Upcoming Levels List?',
        a: 'The Upcoming Levels List (ULL) is a community-maintained catalogue of upcoming Top 1–100 Extreme Demons in Geometry Dash — levels that are still in development, decoration or verification and are projected to place on the Demonlist once they are released. It also includes worthy unrated Extreme Demons that would have qualified for a rating at the time they were made.',
    },
    {
        q: 'What are upcoming levels in Geometry Dash?',
        a: 'Upcoming levels are Geometry Dash levels that have been announced or are visibly in development but have not been verified and published yet. In the Extreme Demon community the term usually refers to future Top 1–100 Demonlist contenders: levels still being built, decorated, or attempted by a verifier. The Upcoming Levels List tracks these levels with their creators, verifier, decoration progress, best records and projected placement.',
    },
    {
        q: 'How do I find out which Extreme Demon is coming out next?',
        a: 'The Future List and the Upcoming Levels page are the two places to look. The Future List holds the levels judged most likely to be verified and published soon, while Upcoming Levels ranks every unverified level by how far players have actually progressed on it, so the levels at the top are the closest to a verification.',
    },
    {
        q: 'What is the difference between the All Levels, Main List and Future List?',
        a: 'All three use the same positions; only the inclusion threshold changes. All Levels is the complete catalogue of everything with a conceivable chance of release, the Main List keeps only levels that meet the standards required to be considered for an official rate, and the Future List keeps only levels with a very high likelihood of imminent verification.',
    },
    {
        q: 'How are levels placed on the Upcoming Levels List?',
        a: 'Placements are decided by the list staff — List Moderators, Elder List Moderators, Admins and the List Leader — following the published guidelines. Staff assess a level’s difficulty relative to the levels already on the list, its quality and its likelihood of being verified, then vote on a position. Levels awaiting a decision sit on the Pending List.',
    },
    {
        q: 'How is the ULL leaderboard calculated?',
        a: 'Players earn points for progress on listed levels. A verification is worth twice a full record, completing a level while it is still a layout is worth 1.6 times a record, and ordinary records and runs are scored from the percentage reached and the level’s position in All Levels. A player’s total is the sum of every entry they hold.',
    },
    {
        q: 'Is the Upcoming Levels List affiliated with the Demonlist or RobTop Games?',
        a: 'No. ULL is an independent, community-run project and is not affiliated with RobTop Games. Its guidelines are adapted from, and credit, the Global Demonlist Guidelines.',
    },
    {
        q: 'Is the Upcoming Levels List data available as an API?',
        a: 'Yes. The list is served by a free public JSON API at https://d1-wrkr.ullteam.workers.dev with no authentication required — /api/list returns every level in rank order, and there are endpoints for the Main List, Future List, Pending List, staff and recent changes.',
    },
];

export const PAGES = [
    {
        route: '/',
        dir: null, // written to index.html at the repo root
        priority: '1.0',
        changefreq: 'daily',
        title: 'Upcoming Levels List',
        socialTitle: 'Upcoming Levels List — Upcoming Geometry Dash Extreme Demons',
        description:
            'Upcoming Levels List (ULL) tracks every upcoming Top 1–100 Extreme Demon in Geometry Dash — levels in development, their creators, verifiers, decoration progress and best records, ranked by where they are projected to land on the Demonlist.',
        h1: 'Upcoming Levels List',
        type: 'WebPage',
        faq: true,
        body: `
<p><strong>Upcoming Levels List (ULL)</strong> is a community-maintained catalogue of upcoming
Top 1&ndash;100 Extreme Demons in <strong>Geometry Dash</strong>, projected to place on the
Demonlist once they are verified and published. It forecasts the future of the Demonlist and
also catalogues worthy unrated Extreme Demons.</p>
<p>Every entry records the level&rsquo;s creators, its verifier, how far decoration has
progressed, the best records and runs players have set on it, and the position the staff team
projects it will take.</p>
${TIERS}
<h2>Beyond the lists</h2>
<ul>
  <li><strong><a href="/upcoming">Upcoming Levels</a></strong> &mdash; unverified levels ranked by
  how close they actually are to a verification.</li>
  <li><strong><a href="/pending">Pending List</a></strong> &mdash; levels submitted and awaiting a
  placement decision from the staff team.</li>
  <li><strong><a href="/leaderboard">Leaderboard</a></strong> &mdash; players ranked by the
  verifications, records and runs they hold on listed levels.</li>
  <li><strong><a href="/events">Events</a></strong> &mdash; the current Level of the Month and the
  level Closest to Verification.</li>
  <li><strong><a href="/information">Information</a></strong> &mdash; the full guidelines: record
  acceptance, proof requirements, list procedures and staff duties.</li>
</ul>
<p>The list is maintained by the ULL staff team and updated continuously. It is not affiliated
with RobTop Games.</p>`,
    },
    {
        route: '/list',
        dir: 'list',
        priority: '0.9',
        changefreq: 'daily',
        title: 'ULL — All Levels',
        socialTitle: 'All Levels — Every Upcoming Extreme Demon | Upcoming Levels List',
        description:
            'The complete Upcoming Levels List catalogue: every Geometry Dash Extreme Demon in development with a chance of being verified and placed on the Demonlist, ranked with creators, verifiers, decoration progress and records.',
        h1: 'All Levels',
        type: 'CollectionPage',
        body: `
<p><strong>All Levels</strong> is the complete Upcoming Levels List catalogue &mdash; the tier with
the lowest inclusion threshold, holding every upcoming <strong>Geometry Dash Extreme Demon</strong>
with a conceivable chance of being verified and published.</p>
<p>Each level in the ranking shows its projected position, host and credited creators, the verifier
(or <em>Open Verification</em>), decoration progress, in-game level ID once it is public, and the
best records and runs players have set on it. Level names can be colour-coded by decoration and
verification progress, and the list can be filtered and searched.</p>
${TIERS}
<p>Positions in All Levels are also what the <a href="/leaderboard">leaderboard</a> scores records
against: the higher a level ranks, the more each record on it is worth.</p>`,
    },
    {
        route: '/listmain',
        dir: 'listmain',
        priority: '0.9',
        changefreq: 'daily',
        title: 'ULL — Main List',
        socialTitle: 'Main List — Rate-Worthy Upcoming Extreme Demons | Upcoming Levels List',
        description:
            'The Main List holds the upcoming Geometry Dash Extreme Demons that meet the fundamental standards required to be considered for an official rating, ranked by projected Demonlist placement.',
        h1: 'Main List',
        type: 'CollectionPage',
        body: `
<p>The <strong>Main List</strong> is the middle tier of the Upcoming Levels List. It keeps only the
upcoming <strong>Geometry Dash Extreme Demons</strong> that meet the fundamental standards required
to be considered for an official rating (&ldquo;Rate&rdquo;) by the developer &mdash; the levels
realistically on course to join the Demonlist rather than merely existing.</p>
<p>Positions here match the ones used in <a href="/list">All Levels</a>; the Main List simply drops
everything below its threshold, so the ranking reads as the projected Demonlist of rate-worthy
upcoming levels.</p>
${TIERS}`,
    },
    {
        route: '/listfuture',
        dir: 'listfuture',
        priority: '0.9',
        changefreq: 'daily',
        title: 'ULL — Future List',
        socialTitle: 'Future List — Extreme Demons Closest to Release | Upcoming Levels List',
        description:
            'The Future List is the strictest Upcoming Levels List tier: Geometry Dash Extreme Demons with a very high likelihood of imminent verification and publication, ranked by projected Demonlist position.',
        h1: 'Future List',
        type: 'CollectionPage',
        body: `
<p>The <strong>Future List</strong> is the strictest of the three Upcoming Levels List tiers. It
holds only the <strong>Geometry Dash Extreme Demons</strong> with a very high likelihood of being
verified and published soon &mdash; the closest thing the list offers to a preview of the
Demonlist as it will look after the next wave of releases.</p>
<p>If you want to know which Extreme Demon is coming out next, this is the tier to read, alongside
<a href="/upcoming">Upcoming Levels</a>, which ranks levels by the progress players have actually
made on them rather than by projected difficulty.</p>
${TIERS}`,
    },
    {
        route: '/upcoming',
        dir: 'upcoming',
        priority: '0.8',
        changefreq: 'daily',
        title: 'ULL — Upcoming Levels',
        socialTitle: 'Upcoming Levels — Closest to Verification | Upcoming Levels List',
        description:
            'Which upcoming Geometry Dash Extreme Demon is closest to being verified? Unverified levels ranked by the best record and longest run anyone has achieved on them, updated as new progress comes in.',
        h1: 'Upcoming Levels',
        type: 'CollectionPage',
        body: `
<p><strong>Upcoming Levels</strong> ranks unverified <strong>Geometry Dash Extreme Demons</strong>
by how close they actually are to being verified &mdash; not by how hard the staff expect them to
be, but by the progress players have already made.</p>
<h2>How the ranking is calculated</h2>
<p>Each level scores <code>max(P, R)&sup2; + min(P, R)^1.8</code>, where <strong>P</strong> is the
highest record percentage achieved from 0% and <strong>R</strong> is the longest recorded run span.
The stronger of the two attempts dominates the score while the weaker one adds a smaller bonus, so
a level with a high record and a long run outranks one with only a single good attempt.</p>
<p>The score depends only on the progress made, so two levels with identical records tie regardless
of their position in <a href="/list">All Levels</a>. Verified levels, levels with no records or
runs at all, and levels that already have a 100% record are excluded from this page.</p>
<p>For the staff&rsquo;s own projection of which level lands next, see the
<a href="/listfuture">Future List</a>.</p>`,
    },
    {
        route: '/pending',
        dir: 'pending',
        priority: '0.6',
        changefreq: 'daily',
        title: 'ULL — Pending List',
        socialTitle: 'Pending List — Levels Awaiting Placement | Upcoming Levels List',
        description:
            'Levels submitted to the Upcoming Levels List and awaiting a placement decision from the staff team, with their expected placement range and whether they are moving up or down.',
        h1: 'Pending List',
        type: 'CollectionPage',
        body: `
<p>The <strong>Pending List</strong> holds upcoming <strong>Geometry Dash Extreme Demons</strong>
that have been submitted to the Upcoming Levels List but have not yet been given a final position.
Staff assess each one against the levels already listed before it is placed.</p>
<p>Entries are marked with the placement range they are expected to land in &mdash; Pending #1,
Top 10, Top 20, Top 30, Top 50, Top 75, or unknown &mdash; and with whether the staff&rsquo;s
current reading is moving them up or down. Once a decision is made the level moves onto
<a href="/list">All Levels</a> and, if it qualifies, the <a href="/listmain">Main</a> and
<a href="/listfuture">Future</a> lists.</p>
<p>The rules that govern submissions and placement decisions are documented in the
<a href="/information">guidelines</a>.</p>`,
    },
    {
        route: '/leaderboard',
        dir: 'leaderboard',
        priority: '0.7',
        changefreq: 'daily',
        title: 'ULL — Leaderboard',
        socialTitle: 'Leaderboard — Top Players on Upcoming Extreme Demons | Upcoming Levels List',
        description:
            'Players ranked by the verifications, layout completions, records and runs they hold on upcoming Geometry Dash Extreme Demons, scored by each level’s position on the Upcoming Levels List.',
        h1: 'Leaderboard',
        type: 'CollectionPage',
        body: `
<p>The <strong>Upcoming Levels List leaderboard</strong> ranks players by the progress they hold on
upcoming <strong>Geometry Dash Extreme Demons</strong>. A player&rsquo;s total is the sum of every
entry they have earned.</p>
<h2>How points are earned</h2>
<ul>
  <li><strong>Verification</strong> &mdash; worth twice a full record on the same level. The
  level&rsquo;s other records and runs are then ignored.</li>
  <li><strong>Layout completion</strong> &mdash; a 100% record on a level that is not verified yet,
  beaten in its undecorated state. Worth 1.6 times a full record, or 0.8 of a verification.</li>
  <li><strong>Record</strong> &mdash; a from-0% attempt, scored from the percentage reached.</li>
  <li><strong>Run</strong> &mdash; a segment from one percentage to another, scored from its
  length.</li>
</ul>
<p>Every entry is weighted by the level&rsquo;s rank in <a href="/list">All Levels</a>, so progress
on a harder, higher-placed level is worth more. Record submission rules, proof requirements and the
penalty system are set out in the <a href="/information">guidelines</a>.</p>`,
    },
    {
        route: '/events',
        dir: 'events',
        priority: '0.7',
        changefreq: 'weekly',
        title: 'ULL — Events',
        socialTitle: 'Events — Level of the Month & Closest to Verification | Upcoming Levels List',
        description:
            'The current Level of the Month and the upcoming Geometry Dash Extreme Demon closest to verification, picked by the Upcoming Levels List staff team.',
        h1: 'Events',
        type: 'WebPage',
        body: `
<p>The <strong>Events</strong> page highlights two picks from the Upcoming Levels List staff team,
refreshed as the list moves.</p>
<ul>
  <li><strong>Level of the Month</strong> &mdash; the upcoming <strong>Geometry Dash Extreme
  Demon</strong> the staff have singled out this month, whether for its progress, its quality or
  the attention it has drawn.</li>
  <li><strong>Closest to Verification</strong> &mdash; the level the staff consider nearest to being
  finished and verified right now.</li>
</ul>
<p>For the data-driven version of the same question, <a href="/upcoming">Upcoming Levels</a> ranks
every unverified level by the best record and longest run anyone has set on it.</p>`,
    },
    {
        route: '/information',
        dir: 'information',
        priority: '0.6',
        changefreq: 'weekly',
        title: 'ULL — Information',
        socialTitle: 'Guidelines & Information | Upcoming Levels List',
        description:
            'How the Upcoming Levels List works: record acceptance and proof requirements, permitted and prohibited software, level placement procedure, level colouring, staff duties and the full ULL guidelines.',
        h1: 'Information & Guidelines',
        type: 'WebPage',
        faq: true,
        guidelines: true,
        body: `
<p>This page documents how the <strong>Upcoming Levels List</strong> works: how records are
accepted and what proof they need, which software is permitted, how levels are placed and moved,
what the level colours mean, and what each staff role is responsible for.</p>
<p>These guidelines are adapted from, and rely heavily on, the structure and principles of the
Global Demonlist Guidelines, with full credit to their original authors. They are subject to
change; changes are announced in the <a href="${SITE.discord}" rel="noopener">ULL Discord
server</a>.</p>
<h2>Level colouring</h2>
<p>With Level Colouring enabled, level names on the list are colour-coded by decoration and
verification progress:</p>
<ul>
  <li><strong>Blue</strong> &mdash; on layout state, 0% decorated.</li>
  <li><strong>Cyan</strong> &mdash; decoration 1&ndash;29% finished.</li>
  <li><strong>Green</strong> &mdash; decoration 30&ndash;69% finished.</li>
  <li><strong>Yellow</strong> &mdash; decoration 70&ndash;99% finished.</li>
  <li><strong>Orange</strong> &mdash; decoration finished.</li>
  <li><strong>Deep orange</strong> &mdash; verification progress 30&ndash;59%.</li>
  <li><strong>Red</strong> &mdash; verification progress 60&ndash;99%.</li>
  <li><strong>Grey</strong> &mdash; verified but not rated.</li>
  <li><strong>White</strong> &mdash; verified and rated.</li>
</ul>`,
    },
];
