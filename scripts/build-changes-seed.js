#!/usr/bin/env node
// Generates scripts/seed-recent-changes.sql from data/_recentChanges.json.
//
// The Recent Changes feed is stored one row per change line in the `recent_changes`
// table (id, date, change, sort_order). The Worker groups rows back into
// {date, entries[]} for GET /api/recent-changes, keeping the first appearance of
// each date as that group's position.
//
// `date` is free text, so backdated entries (older changelogs inserted after the
// fact) work exactly like new ones — position is decided by sort_order alone.
//
// Run:  node scripts/build-changes-seed.js
// Then: wrangler d1 execute d1-template-database --remote --file=scripts/seed-recent-changes.sql

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'data', '_recentChanges.json');
const OUT = path.join(__dirname, 'seed-recent-changes.sql');

const q = (v) => "'" + String(v).replace(/'/g, "''") + "'";

const groups = JSON.parse(fs.readFileSync(SRC, 'utf8'));

// NOTE: no comments in the generated file. The Cloudflare D1 Console strips SQL
// comments before parsing, so a paste that is only comments (a header block, say)
// comes back as "The request is malformed: Requests without any query are not
// supported." Keeping the output pure SQL means the whole file can be pasted at
// once. The docs for this file live in database.md instead.
const out = [
  'CREATE TABLE IF NOT EXISTS recent_changes (',
  '    id INTEGER PRIMARY KEY AUTOINCREMENT,',
  '    date TEXT NOT NULL,',
  '    change TEXT NOT NULL,',
  '    sort_order INTEGER',
  ');',
  '',
  'DELETE FROM recent_changes;',
];

let order = 0;
let lines = 0;
for (const g of groups) {
  for (const entry of g.entries || []) {
    out.push(
      `INSERT INTO recent_changes (date, change, sort_order) VALUES (${q(g.date)}, ${q(entry)}, ${order++});`
    );
    lines++;
  }
}
out.push('');

fs.writeFileSync(OUT, out.join('\n') + '\n');

console.log(`Wrote ${OUT}`);
console.log(`  dates:   ${groups.length}`);
console.log(`  entries: ${lines}`);
