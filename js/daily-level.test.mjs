// Level of the Day and its archive: node js/daily-level.test.mjs
import fs from 'node:fs';
import { dateKey, pickDailyLevel, todaysLevel, archiveRows, archiveEntry } from './daily-level.js';

let failed = 0, passed = 0;
const is = (name, got, want) => {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    ok ? passed++ : failed++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}   ${name}${ok ? '' : `\n           got  ${JSON.stringify(got)}\n           want ${JSON.stringify(want)}`}`);
};

// The formula the Events pages used before it moved here, verbatim, fed the
// date the way it was (a local Date) — the new one must pick the same level.
function oldPick(list, d) {
    const valid = list.filter(([l, e]) => l && !e && !l.isVerified);
    if (!valid.length) return null;
    const seed = (d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()) >>> 0;
    const hash = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b) >>> 0;
    return valid[hash % valid.length][0];
}

const snapshot = JSON.parse(fs.readFileSync(new URL('../data/_seo-snapshot.json', import.meta.url), 'utf8'));
const pairs = snapshot.levels.map((l) => [l, null]);
let same = true;
for (let i = 0; i < 366; i++) {
    const d = new Date(2026, 0, 1 + i);
    if (oldPick(pairs, d)?.path !== pickDailyLevel(pairs, dateKey(d))?.level.path) { same = false; break; }
}
is('picks the same level as the old formula on every day of a year', same, true);

const L = (path, isVerified = false) => ({ path, name: path.toUpperCase(), isVerified });
const list = [L('a'), L('v1', true), L('b'), L('c'), L('v2', true), L('d')];
const p = pickDailyLevel(list, '2026-11-04');
is('never picks a verified level', p.level.isVerified, false);
is('rank is the All Levels position, verified levels counted', p.rank, list.indexOf(p.level) + 1);
is('bare levels and [level, error] pairs pick the same',
    pickDailyLevel(list.map((l) => [l, null]), '2026-11-04').level.path, p.level.path);
is('nothing to pick from', pickDailyLevel([L('x', true)], '2026-11-04'), null);

const archive = { days: [{ date: '2026-11-04', path: 'c', name: 'C (old name)', rank: 9 }] };
is('today\'s recorded pick wins over the computed one', todaysLevel(list, archive, '2026-11-04').level.path, 'c');
is('…with where it stands now', todaysLevel(list, archive, '2026-11-04').rank, 4);
is('a recorded level since verified falls back to the computed pick',
    todaysLevel(list.map((l) => (l.path === 'c' ? { ...l, isVerified: true } : l)), archive, '2026-11-04').level.path,
    pickDailyLevel(list.map((l) => (l.path === 'c' ? { ...l, isVerified: true } : l)), '2026-11-04').level.path);
is('a recorded level since removed falls back too',
    todaysLevel(list.filter((l) => l.path !== 'c'), archive, '2026-11-04').level.path,
    pickDailyLevel(list.filter((l) => l.path !== 'c'), '2026-11-04').level.path);
is('no archive: the computed pick', todaysLevel(list, null, '2026-11-04').level.path, p.level.path);

const days = {
    days: [
        { date: '2026-11-02', path: 'a', name: 'A then', rank: 3 },
        { date: '2026-11-03', path: 'gone', name: 'Gone', rank: 7 },
        { date: '2026-11-09', path: 'b', name: 'Future', rank: 1 },
    ],
};
const today = { level: L('d'), rank: 6 };
const rows = archiveRows(days, today, '2026-11-04', list);
is('newest first, today added when not yet recorded', rows.map((r) => r.date), ['2026-11-04', '2026-11-03', '2026-11-02']);
is('a day ahead of the reader\'s calendar is not shown', rows.some((r) => r.date === '2026-11-09'), false);
is('today is marked', rows.map((r) => r.today), [true, false, false]);
is('the name and position as they were that day', [rows[2].name, rows[2].rank], ['A then', 3]);
is('a level still on the list links to its page', rows[2].slug, 'a');
is('a level that left the list does not', rows[1].slug, null);
is('a recorded today is not doubled', archiveRows({ days: [archiveEntry('2026-11-04', today)] }, today, '2026-11-04', list).length, 1);

is('UTC date key', dateKey(new Date('2026-11-04T23:30:00Z'), true), '2026-11-04');

const file = JSON.parse(fs.readFileSync(new URL('../data/_daily-levels.json', import.meta.url), 'utf8'));
const dates = file.days.map((d) => d.date);
is('the archive file is in date order with no repeats',
    dates.join() === [...new Set(dates)].sort().join(), true);
is('every archive entry has a name and a position',
    file.days.every((d) => d.path && d.name && Number.isInteger(d.rank) && d.rank > 0), true);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
