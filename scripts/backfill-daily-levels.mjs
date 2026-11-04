// Rebuilds the Level of the Day archive for the days before it was recorded, from
// the copies of the list the hourly content job has committed since 2026-08-30:
//
//   node scripts/backfill-daily-levels.mjs        (needs full git history)
//
// For each UTC day it takes the list as it stood at the start of that day — the
// last committed snapshot before 00:30 UTC, when the content job's first run of
// the day lands — and applies the same pick the pages use. That is the rule
// record-daily-level.mjs follows going forward, so backfilled and recorded days
// mean the same thing. Days already in the archive are left alone.
//
// Levels of the Day before 2026-08-30 cannot be rebuilt: the list was not being
// copied into git yet.
import { execFileSync } from 'node:child_process';
import { dateKey, pickDailyLevel, archiveEntry } from '../js/daily-level.js';
import { readArchive, writeArchive } from './record-daily-level.mjs';

const FILE = 'data/_seo-snapshot.json';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 28 });

// Oldest first: [{ hash, at: Date }]
const commits = git('log', '--reverse', '--format=%H %cI', 'HEAD', '--', FILE)
    .trim().split('\n').filter(Boolean)
    .map((line) => { const [hash, at] = line.split(' '); return { hash, at: new Date(at) }; });
if (!commits.length) throw new Error(`no history for ${FILE} — is this a shallow clone?`);

const archive = readArchive();
const have = new Set(archive.days.map((d) => d.date));
const cache = new Map();
const listAt = (hash) => {
    if (!cache.has(hash)) cache.set(hash, JSON.parse(git('show', `${hash}:${FILE}`)).levels);
    return cache.get(hash);
};

const DAY = 86400000;
const first = new Date(dateKey(commits[0].at, true) + 'T00:00:00Z');
const today = new Date(dateKey(new Date(), true) + 'T00:00:00Z');
let added = 0;
for (let t = first.getTime(); t <= today.getTime(); t += DAY) {
    const key = dateKey(new Date(t), true);
    if (have.has(key)) continue;
    const cutoff = t + 30 * 60 * 1000;
    // The state at the start of the day; on the very first day, the first copy.
    const before = commits.filter((c) => c.at.getTime() <= cutoff);
    const commit = before.length ? before[before.length - 1] : commits.find((c) => dateKey(c.at, true) === key);
    if (!commit) continue;
    const pick = pickDailyLevel(listAt(commit.hash), key);
    if (!pick) continue;
    archive.days.push(archiveEntry(key, pick));
    added++;
}
writeArchive(archive);
console.log(`backfilled ${added} day${added === 1 ? '' : 's'}; archive holds ${archive.days.length}`);
