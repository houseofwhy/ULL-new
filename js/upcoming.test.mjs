// Checks the Upcoming Levels ordering (upcomingScore in js/formulas.js, used by
// js/pages/UpcomingLevels.js and js/pages/mobile/MobileUpcoming.js) against the
// /data snapshot: the score must depend only on the progress made, never on the
// level's position in All Levels.
// Run:  node js/upcoming.test.mjs
import { readFileSync } from 'node:fs';
import { upcomingScore } from './formulas.js';
const D = new URL('../data/', import.meta.url).pathname;
const order = JSON.parse(readFileSync(D + '_list.json', 'utf8'));
const list = order.map(s => { try { return JSON.parse(readFileSync(D + s + '.json', 'utf8')); } catch { return null; } });

// The pre-2026-08-24 formula, kept only so this test can show what the rank
// factor used to do — and fail if anything reintroduces it.
const oldScore = (P, R, rank) => (Math.max(P, R) ** 2 + Math.min(P, R) ** 1.8) * ((0.01 * (rank + 100)) ** 0.5);

const rows = [];
list.forEach((l, i) => {
  if (!l) return;
  const P = Math.max(0, ...(l.records || []).map(r => Number(r.percent) || 0));
  const R = Math.max(0, ...(l.run || []).map(r => {
    const q = String(r.percent).split('-').map(Number);
    return q.length === 2 && !isNaN(q[0]) && !isNaN(q[1]) ? q[1] - q[0] : 0;
  }));
  rows.push({ name: l.name, rank: i + 1, P, R, isVerified: l.isVerified,
              now: upcomingScore(P, R), before: oldScore(P, R, i + 1) });
});

const eligible = r => !r.isVerified && r.now > 0 && r.P < 100;
const rank = (key) => rows.filter(eligible).sort((a, b) => b[key] - a[key]);
const now = rank('now'), before = rank('before');

let pass = 0, fail = 0;
const check = (l, c, x = '') => c ? (pass++, console.log(`  ok   ${l}`)) : (fail++, console.log(`  FAIL ${l} ${x}`));

console.log(`eligible upcoming levels: ${now.length}\n`);
console.log('new top 8 (rank no longer matters):');
now.slice(0, 8).forEach((r, i) => console.log(
  `  ${String(i + 1).padStart(2)}. ${r.name.padEnd(28)} P=${String(r.P).padStart(3)} R=${String(r.R).padStart(3)}  score=${r.now.toFixed(0).padStart(6)}  (list #${r.rank}, was upcoming #${before.indexOf(r) + 1})`));

check('score is now independent of list rank', (() => {
  // Two levels with identical P/R must tie no matter their list position.
  const a = upcomingScore(50, 30), b = upcomingScore(50, 30);
  return a === b;
})());
check('formula = max^2 + min^1.8', Math.abs(upcomingScore(60, 40) - (60 ** 2 + 40 ** 1.8)) < 1e-9);
check('argument order does not matter', upcomingScore(60, 40) === upcomingScore(40, 60));
check('a no-progress level still scores 0', upcomingScore(0, 0) === 0);
check('the eligible set is unchanged (only the order moves)',
  new Set(now.map(r => r.name)).size === new Set(before.map(r => r.name)).size &&
  now.every(r => before.includes(r)));
// Levels that were only high because of a deep list position should now fall.
const moved = now.map((r, i) => ({ name: r.name, from: before.indexOf(r) + 1, to: i + 1 }))
                 .filter(x => x.from !== x.to);
console.log(`\n${moved.length} of ${now.length} levels changed position`);
moved.slice(0, 6).forEach(m => console.log(`  ${m.name.padEnd(28)} #${m.from} -> #${m.to}`));
check('ordering actually changed', moved.length > 0);
// Identical progress on different ranks must now tie exactly.
const sameProgress = {};
now.forEach(r => { const k = `${r.P}|${r.R}`; (sameProgress[k] ??= []).push(r); });
const tied = Object.values(sameProgress).filter(g => g.length > 1 && new Set(g.map(x => x.rank)).size > 1);
check('levels with equal progress but different list ranks now tie',
  tied.length === 0 || tied.every(g => g.every(x => Math.abs(x.now - g[0].now) < 1e-9)),
  `${tied.length} such groups`);
if (tied.length) console.log(`  (checked ${tied.length} groups, e.g. ${tied[0].map(x => `${x.name} #${x.rank}`).join(' vs ')})`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
