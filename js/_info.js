// Content for /information that is not the guidelines: the site map, the FAQ,
// the API reference, the two legends and the contact routing.
//
// It lives here for the same reason js/_guidelines.js does — it is prose that
// changes on its own schedule, edited by people who are not editing components.
// Nothing here is fetched; the editor list on the same page comes from the API.
//
// The page descriptions below are the hero paragraph of the page they point at,
// copied word for word, so the menu entry and the page itself say the same
// thing. Home and a level's page have no hero paragraph about themselves, so
// those two are written here.
//
// The legends are DATA, not markup, and the colouring one names the .u-pill
// modifier from css/ull-v2.css rather than repeating a hex value. The pill scale
// and the list's own name colouring are the same scale, so a colour can only be
// changed in one place.

export const navigationData = [
    {
        group: 'Lists',
        pages: [
            {
                name: 'All Levels',
                to: '/list',
                desc: 'The widest of the three tiers, with the lowest bar for entry: every level with a conceivable chance of being verified and published, hardest first. A level’s rank here is what its records are worth on the leaderboard.',
            },
            {
                name: 'Main List',
                to: '/listmain',
                desc: 'Levels that meet the standards required to be considered for an official rating by the developer (a “Rate”). The same order as All Levels, with everything below that bar left out.',
            },
            {
                name: 'Future List',
                to: '/listfuture',
                desc: 'The strictest of the three tiers: only levels with a very high likelihood of being verified and published soon. Read this one for what is coming out next.',
            },
            {
                name: 'A level’s page',
                to: '/list',
                path: '/level/…',
                desc: 'One page per level: its state, how much of its decoration is finished and how far the best run has got, every record and run with the proof behind it, its creators, and its rank in each tier.',
            },
        ],
    },
    {
        group: 'Other',
        pages: [
            {
                name: 'Upcoming Levels',
                to: '/upcoming',
                desc: 'Catalogue of levels on the Upcoming Levels List closest to verification, ranked by highest progress achieved toward completing the level.',
            },
            {
                name: 'Pending List',
                to: '/pending',
                desc: 'Levels awaiting a decision from the staff team — a first placement, a move up or down, a removal, or a hold with no decision expected soon.',
            },
            {
                name: 'Leaderboard',
                to: '/leaderboard',
                desc: 'This page shows the top players ranked according to their records set on upcoming levels as well as according to their verifications of levels on the Demonlist.',
            },
            {
                name: 'Events',
                to: '/events',
                desc: 'Three levels the list is pointing at right now — one picked for the day, one for the month, and the one closest to being verified.',
            },
            {
                name: 'Home',
                to: '/',
                desc: 'The size of each tier, the level at the top of the list, the recent changes feed and the staff team.',
            },
        ],
    },
];

export const faqData = [
    {
        group: 'Getting on the list',
        questions: [
            {
                q: 'How and where do I submit a level to the list?',
                a: `<p>Check the level against the standards in <code>#list-standards</code> on the Discord
                    server, then post it in <code>#level-reporting</code> following the template there.
                    Moderators review submissions within a few days and either reject the level or put it
                    in the queue for quality control.</p>`,
            },
            {
                q: 'How does a level get on the list?',
                a: `<p>Staff select it. Moderators assess levels against the Level Selection criteria in the
                    guidelines — classic gameplay, a public recording, an intended release on the official
                    servers and a credible chance of being rated. A level that meets the criteria joins the
                    quality control queue, where the quality judges vote on accepting or rejecting it.
                    Accepted levels go on the Pending List until an exact position is settled.</p>`,
            },
            {
                q: 'Why is a level on Pending and not on the list?',
                a: `<p>It passed selection but has no exact position yet. The Pending List shows the range it is
                    expected to land in and an arrow for which way it is moving inside that range. Those
                    ranges — Pending #1, Top 10, Top 20 and the rest — are estimated positions on the
                    <strong>Demonlist</strong>, not positions on this list.</p>
                    <p><em>Pending Indefinitely</em> covers two cases: levels no usable estimate could be made
                    for, and levels that are accepted but cannot be placed yet because something is still
                    missing, such as a full video of the level.</p>`,
            },
            {
                q: 'A level’s information is wrong or out of date.',
                a: `<p>Report it in <code>#level-update-reporting</code> with something to back it up: gameplay
                    footage, a statement from the creator, or tester feedback. The same channel takes new
                    decoration previews, verifications and other significant news about a listed level.</p>
                    <p>If the correct information is already widely known, tagging any moderator in any channel
                    is enough to get it fixed.</p>`,
            },
            {
                q: 'Why is a level marked 🚫?',
                a: `<p>The level is close to being removed under the activity standards. The mark is applied
                    automatically once a level has gone a year without progress, and the level comes off the
                    list unless progress resumes.</p>`,
            },
        ],
    },
    {
        group: 'Records',
        questions: [
            {
                q: 'How do I submit a record or a world record?',
                a: `<p>Post the video in <code>#level-update-reporting</code> on the Discord server with the
                    additional information the template there asks for. Read <em>Acceptance of Records</em> in
                    the guidelines first: a record that arrives without the required proof is rejected before
                    anyone assesses it. Moderators review submissions within a few days.</p>`,
            },
            {
                q: 'What proof does a record need?',
                a: `<p>A complete, uncut playthrough of the record; if your video has cuts, attach the raw
                    footage as well. It also needs the level’s audio or the sound of your clicks, and a cheat
                    indicator and an fps/tps display where your mod menu provides them. The record has to be
                    set on the version of the level this site lists. The full requirements, including what may
                    be blurred and what may not, are in <em>Requirements for proof of legitimacy</em>.</p>`,
            },
            {
                q: 'What counts as a world record here?',
                a: `<p>Two records are tracked separately. The world record is the highest completion from 0%.
                    The world record run is the longest single segment on the current version of the level,
                    measured from where it started to where it ended.</p>
                    <p>Insignificant changes to a level do not affect either: an existing record stands, and a
                    new one set on the changed version is still accepted. If the level is buffed or nerfed
                    enough that its difficulty is no longer the same, the old world record is removed.</p>`,
            },
            {
                q: 'My record was rejected. Can it be reviewed?',
                a: `<p>Ask any staff member why it was rejected. You can appeal the decision or send
                    additional information for it to be looked at again. A record rejected because the player
                    changed the level can be reviewed if the creator later made the same change in a new
                    version. A record rejected for missing proof has to be submitted again with the proof.</p>`,
            },
        ],
    },
    {
        group: 'Points and the leaderboard',
        questions: [
            {
                q: 'How are leaderboard points calculated?',
                a: `<p>From two things: the level’s rank in <strong>All Levels</strong>, and the percentage of
                    your record. A verification is worth twice a 100% record on the same level, and a layout
                    completion — beating a level that is not verified yet — is worth 0.8 of a verification.</p>
                    <table class="info-tbl info-tbl--num">
                        <thead><tr><th></th><th>#10</th><th>#50</th><th>#150</th><th>#400</th></tr></thead>
                        <tbody>
                            <tr><td>100% record</td><td>1196</td><td>663</td><td>312</td><td>132</td></tr>
                            <tr><td>50% record</td><td>698</td><td>387</td><td>182</td><td>77</td></tr>
                            <tr><td>Verification</td><td>2392</td><td>1325</td><td>624</td><td>265</td></tr>
                        </tbody>
                    </table>
                    <p>Position counts for much more than percentage: a 50% on #10 is worth more than a 100%
                    on #50.</p>`,
            },
            {
                q: 'Why did my total change when I didn’t submit anything?',
                a: `<p>Points are calculated from a level’s <em>current</em> rank, and ranks on a list of
                    upcoming levels move often. When a level moves, every record on it is worth a different
                    number of points afterwards.</p>`,
            },
            {
                q: 'What is “layout verified”?',
                a: `<p>A 100% completion of a level that has not been verified yet, so the level was beaten in
                    its undecorated state. It is scored separately from an ordinary record, at 0.8 of a
                    verification.</p>`,
            },
        ],
    },
    {
        group: 'The list itself',
        questions: [
            {
                q: 'What do the colours in the list mean?',
                a: `<p>They show the level’s state, from layout through decoration and verification to rated.
                    The full scale is in the Reference block on this page, and it is the same scale as the
                    status pill on a level’s own page. Level colouring is a setting: if names look plain,
                    turn it on in Settings.</p>`,
            },
            {
                q: 'Is the list official?',
                a: `<p>No, and no list of this kind is. ULL is a community project and is not affiliated with
                    RobTop Games. Levels that are already rated are placed in strict accordance with their
                    ranking on <a href="https://pointercrate.com" target="_blank" rel="noopener">Pointercrate</a>,
                    and unrated levels by their ranking on the Global Demonlist. These guidelines are adapted
                    from the Global Demonlist Guidelines with credit to their authors.</p>`,
            },
            {
                q: 'The rules changed and I didn’t know.',
                a: `<p>Changes are announced in the Discord server. The guidelines on this page are always the
                    current version.</p>`,
            },
        ],
    },
];

// Endpoints and fields as the Worker actually serves them (worker/worker.js).
export const apiData = {
    base: 'https://d1-wrkr.ullteam.workers.dev',
    endpoints: [
        { path: '/api/list', returns: 'Every level, in rank order' },
        { path: '/api/list/main', returns: 'The Main List' },
        { path: '/api/list/future', returns: 'The Future List' },
        { path: '/api/levels/{position}', returns: 'One level, by its 1-based rank' },
        { path: '/api/pending', returns: 'Pending List entries' },
        { path: '/api/editors', returns: 'The staff list, in the order staff arranged it' },
        { path: '/api/level-month', returns: 'Level of the Month, or null' },
        { path: '/api/level-verif', returns: 'Closest to verification, or null' },
        { path: '/api/recent-changes', returns: 'The changes feed, grouped {date, entries[]}' },
    ],
    fields: [
        { name: 'path', type: 'string', meaning: 'Slug; the level’s page is /level/{path}' },
        { name: 'name, author', type: 'string', meaning: 'Level name and host' },
        { name: 'creators', type: 'string[]', meaning: 'Everyone credited' },
        { name: 'verifier', type: 'string', meaning: 'Verifier, or "Open Verification"' },
        { name: 'percentFinished', type: 'number', meaning: 'Decoration progress, 0–100' },
        { name: 'records, run', type: 'object[]', meaning: '{user, link, percent, hz} — completions and runs' },
        { name: 'tags', type: 'string[]', meaning: 'Public, Layout, Rated, NONG, …' },
        { name: 'isMain, isFuture, isVerified, benchmark', type: 'boolean', meaning: 'Which tiers it is on, and its state' },
        { name: 'sort_order', type: 'number', meaning: 'Rank in All Levels' },
    ],
    example: `curl https://d1-wrkr.ullteam.workers.dev/api/list

[
  {
    "path": "manray",
    "name": "M A N R A Y",
    "author": "akunakunn",
    "creators": ["akunakunn", "Wobbly"],
    "verifier": "Open Verification",
    "percentFinished": 80,
    "records": [{ "user": "Zoink", "percent": 61, "hz": 240 }],
    "isMain": true, "isFuture": false, "isVerified": false,
    "sort_order": 4
  },
  …
]`,
    fairUse: [
        'Cache what you fetch. The list changes a few times a day.',
        'Identify your bot in the user agent if you are polling on a schedule.',
        'The data is community work, so credit the list and link back to it.',
    ],
};

// The pill modifier is the source of the colour; see css/ull-v2.css.
export const coloringLegend = [
    { pill: 'u-pill--blue', label: 'Layout', meaning: 'No decoration yet' },
    { pill: 'u-pill--cyan', label: 'Early deco', meaning: '1–29% decorated' },
    { pill: 'u-pill--green', label: 'Mid deco', meaning: '30–69% decorated' },
    { pill: 'u-pill--yellow', label: 'Late deco', meaning: '70–99% decorated' },
    { pill: 'u-pill--amber', label: 'Deco done', meaning: 'Decoration finished' },
    { pill: 'u-pill--orange', label: 'Early verify', meaning: 'Best run 30–59%' },
    { pill: 'u-pill--red', label: 'Late verify', meaning: 'Best run 60–99%' },
    { pill: 'u-pill--done', label: 'Verified', meaning: 'Beaten, not yet rated' },
    { pill: '', label: 'Rated', meaning: 'Verified and rated in game' },
    { pill: 'u-pill--done', label: '🚫', meaning: 'Pending removal', glyph: true },
];

export const pendingLegend = [
    { icon: 'move-up', label: 'Moving up' },
    { icon: 'move-down', label: 'Moving down' },
    { icon: '1', label: 'Pending #1' },
    { icon: '10', label: 'Pending Top 10' },
    { icon: '20', label: 'Pending Top 20' },
    { icon: '30', label: 'Pending Top 30' },
    { icon: '50', label: 'Pending Top 50' },
    { icon: '75', label: 'Pending Top 75' },
    { icon: 'question', label: 'Unknown placement' },
];

export const contactRouting = [
    { what: 'A level that should be listed', where: '#level-reporting' },
    { what: 'A record or a world record', where: '#level-update-reporting' },
    { what: 'Information that is out of date', where: '#level-update-reporting' },
    { what: 'A question about the list', where: '#list-discussion' },
    { what: 'Something broken on the site', where: 'The site’s developer' },
    { what: 'A complaint about a staff member', where: 'An Admin, or the List Leader' },
];
