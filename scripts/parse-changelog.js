#!/usr/bin/env node
// Converts a plain-text changelog (the format the staff team writes by hand) into
// data/_recentChanges.json, ready for scripts/build-changes-seed.js.
//
// Expected input, e.g. data/changelogs/2026-08.txt:
//
//     AUGUST 21
//
//     # Placements
//     * **Level** has been placed at #3, above **A** and below **B**.
//
//     # Verified Levels Movements
//     * **Level** has been moved up from #449 to #416, above **A** and below **B**
//
//     AUGUST 22
//     ...
//
// - A bare `MONTH DAY` line (optionally `MONTH DAY, YYYY`) starts a new date.
// - `#`/`##` section headings are dropped: the feed renders a flat list of lines
//   under each date, so headings have nowhere to go. Line order is preserved, so
//   entries from the same section stay together.
// - `*` / `-` bullets become one change line each.
//
// Dates are emitted newest-first (the order the site shows them in). Within a
// date, lines keep the order they were written in.
//
// Run:  node scripts/parse-changelog.js data/changelogs/2026-08.txt --year 2026
// Then: node scripts/build-changes-seed.js
//
// Pass --append to keep whatever is already in data/_recentChanges.json (matching
// dates are merged); the default replaces the file.

const fs = require('fs');
const path = require('path');

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

const OUT = path.join(__dirname, '..', 'data', '_recentChanges.json');

const argv = process.argv.slice(2);
const append = argv.includes('--append');
const yearFlag = argv.indexOf('--year');
const YEAR = yearFlag !== -1 ? Number(argv[yearFlag + 1]) : new Date().getFullYear();
const input = argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--year');

if (!input) {
    console.error('usage: node scripts/parse-changelog.js <changelog.txt> [--year 2026] [--append]');
    process.exit(1);
}

// `MONTH DAY` / `MONTH DAY, YYYY`, in any case, on a line of its own.
const DATE_RE = new RegExp(`^\\s*(${MONTHS.join('|')})\\s+(\\d{1,2})(?:,\\s*(\\d{4}))?\\s*$`, 'i');
const BULLET_RE = /^\s*[*-]\s+(.*)$/;
const HEADING_RE = /^\s*#{1,6}\s/;

// Punctuation-only repairs for the typos that show up in hand-written changelogs.
// These never touch level names, positions or wording.
const TEXT_FIXES = [
    // "above **X**, and below" -> "above **X** and below"
    [/,\s+and below\b/g, ' and below'],
    // "#246 above" -> "#246, above"
    [/(#\d+)\s+above\b/g, '$1, above'],
];

let warnings = 0;

// Level names are wrapped in **bold**, so split on the markers and treat the
// alternating segments as outside/inside bold. Doing it positionally (rather than
// with regexes over the whole line) is what keeps "above **Remorse**" intact while
// still fixing "**Name **" and "**Name**has".
function normalise(line) {
    // A bold opener that lost an asterisk, often to a smart quote: *"Name** -> **Name**
    // The (?!\*) guard leaves real ** markers alone.
    let out = line.trim().replace(/(^|[\s(])\*(?!\*)["“”'‘’]?(?=\S)/g, '$1**');

    const parts = out.split('**');
    if (parts.length % 2 === 0) {
        console.warn(`  ! unbalanced ** markers: ${line.slice(0, 70)}`);
        warnings++;
    }

    out = parts.map((part, i) => {
        if (i % 2 === 1) return part.trim();          // inside bold: "Name " -> "Name"
        let text = part.replace(/[ \t]{2,}/g, ' ');   // outside bold: collapse runs
        // A closing ** that swallowed its space: "**Name**has been" -> "**Name** has been"
        if (i > 0 && /^[A-Za-z0-9]/.test(text)) text = ' ' + text;
        return text;
    }).join('**');

    for (const [re, to] of TEXT_FIXES) out = out.replace(re, to);
    // The existing feed entries don't end in a period; keep the style consistent.
    return out.replace(/\s*\.\s*$/, '').replace(/[ \t]{2,}/g, ' ').trim();
}

const text = fs.readFileSync(input, 'utf8');
const groups = [];
let current = null;
let dropped = 0;

for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    const d = DATE_RE.exec(line);
    if (d) {
        const month = MONTHS.find(m => m.toLowerCase() === d[1].toLowerCase());
        const date = `${month} ${Number(d[2])}, ${d[3] || YEAR}`;
        current = groups.find(g => g.date === date);
        if (!current) { current = { date, entries: [] }; groups.push(current); }
        continue;
    }

    if (HEADING_RE.test(line)) { dropped++; continue; }

    const b = BULLET_RE.exec(line);
    if (!b) { console.warn(`  ! skipped (not a bullet or date): ${line.slice(0, 70)}`); continue; }
    if (!current) { console.warn(`  ! bullet before any date header, skipped: ${line.slice(0, 70)}`); continue; }

    const entry = normalise(b[1]);
    if (entry) current.entries.push(entry);
}

// Newest first, matching how the site lists them.
const dateKey = (g) => {
    const m = /^([A-Za-z]+) (\d{1,2}), (\d{4})$/.exec(g.date);
    return m ? new Date(Number(m[3]), MONTHS.indexOf(m[1]), Number(m[2])).getTime() : 0;
};
groups.sort((a, b) => dateKey(b) - dateKey(a));

let final = groups;
if (append && fs.existsSync(OUT)) {
    const existing = JSON.parse(fs.readFileSync(OUT, 'utf8'));
    for (const g of existing) {
        const hit = final.find(x => x.date === g.date);
        if (hit) hit.entries.push(...g.entries.filter(e => !hit.entries.includes(e)));
        else final.push(g);
    }
    final.sort((a, b) => dateKey(b) - dateKey(a));
}

fs.writeFileSync(OUT, JSON.stringify(final, null, 2) + '\n');

console.log(`Wrote ${OUT}`);
for (const g of final) console.log(`  ${g.date.padEnd(20)} ${g.entries.length} entries`);
console.log(`  ${final.reduce((n, g) => n + g.entries.length, 0)} entries total, ${dropped} section headings dropped`);
if (warnings) console.log(`  ${warnings} line(s) needed attention — see the warnings above`);
console.log('\nNext: node scripts/build-changes-seed.js');
