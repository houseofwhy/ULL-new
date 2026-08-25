// Checks the leaderboard scoring in js/pages/Leaderboard.js (and its mobile twin in
// js/pages/Mobile.js) against the JSON snapshot in /data: layout completions must be
// worth exactly 0.8 of a verification, and nothing else may shift.
// Run:  node js/leaderboard.test.mjs
import { readFileSync } from 'node:fs';
import { recordScore, verificationScore, layoutCompletionScore, isLayoutCompletion,
         LAYOUT_COMPLETION_MULTIPLIER } from './formulas.js';
const D = new URL('../data/', import.meta.url).pathname;
const order = JSON.parse(readFileSync(D + '_list.json', 'utf8'));
const list = order.map(s => { try { return JSON.parse(readFileSync(D + s + '.json', 'utf8')); } catch { return null; } });

function build(useNew) {
  const pm = {};
  list.forEach((level, i) => {
    if (!level) return;
    const r = i + 1;
    if (level.isVerified && level.verifier) {
      const k = level.verifier.toLowerCase();
      (pm[k] ??= { name: level.verifier, records: [] }).records.push(
        { levelName: level.name, levelRank: r, score: verificationScore(r), type: 'verification' });
      return;
    }
    (level.records || []).forEach(rec => {
      if (!rec.user || rec.percent <= 0) return;
      const k = rec.user.toLowerCase();
      const p = Number(rec.percent);
      const layout = useNew && isLayoutCompletion(level, p);
      (pm[k] ??= { name: rec.user, records: [] }).records.push(
        { levelName: level.name, levelRank: r, percent: p,
          score: layout ? layoutCompletionScore(r) : recordScore(r, p),
          type: layout ? 'layout' : 'record' });
    });
    (level.run || []).forEach(rec => {
      if (!rec.user) return;
      const q = String(rec.percent).split('-').map(Number);
      if (q.length !== 2 || isNaN(q[0]) || isNaN(q[1])) return;
      const p = Math.abs(q[1] - q[0]);
      if (p <= 0) return;
      const k = rec.user.toLowerCase();
      (pm[k] ??= { name: rec.user, records: [] }).records.push(
        { levelName: level.name, levelRank: r, percent: p, score: recordScore(r, p), type: 'run' });
    });
  });
  const players = Object.values(pm).map(p => {
    p.records.sort((a, b) => b.score - a.score);
    p.total = p.records.reduce((s, x) => s + x.score, 0);
    return p;
  }).sort((a, b) => b.total - a.total);
  players.forEach((p, i) => p.globalRank = i + 1);
  return players;
}

const before = build(false), after = build(true);
const idx = (arr) => Object.fromEntries(arr.map(p => [p.name.toLowerCase(), p]));
const B = idx(before), A = idx(after);

let pass = 0, fail = 0;
const check = (l, c, x = '') => c ? (pass++, console.log(`  ok   ${l}`)) : (fail++, console.log(`  FAIL ${l} ${x}`));

console.log('multiplier =', LAYOUT_COMPLETION_MULTIPLIER);
const layouts = after.flatMap(p => p.records.filter(r => r.type === 'layout').map(r => ({ who: p.name, ...r })));
console.log('\nlayout completions detected:');
for (const l of layouts) {
  const v = verificationScore(l.levelRank), old = recordScore(l.levelRank, 100);
  console.log(`  ${l.who} — ${l.levelName} #${l.levelRank}: was ${old.toFixed(3)} (1x record) -> now ${l.score.toFixed(3)}`);
  check(`  ${l.levelName}: exactly 0.8 x verification (${v.toFixed(3)})`, Math.abs(l.score - v * 0.8) < 1e-9);
  check(`  ${l.levelName}: 1.6 x the old record score`, Math.abs(l.score - old * 1.6) < 1e-9);
  check(`  ${l.levelName}: strictly less than a verification`, l.score < v);
  check(`  ${l.levelName}: strictly more than the old 100% record`, l.score > old);
}
check('two layout completions found (Snowblind, Map of Problematique)', layouts.length === 2, String(layouts.length));
check('labelled as type "layout"', layouts.every(l => l.type === 'layout'));

console.log('\nrank movement:');
for (const who of ['fhippo', 'seels']) {
  console.log(`  ${who}: #${B[who].globalRank} (${B[who].total.toFixed(3)}) -> #${A[who].globalRank} (${A[who].total.toFixed(3)})`);
  check(`  ${who} gained points`, A[who].total > B[who].total);
}
// Nobody without a layout completion should shift in total score.
const layoutPeople = new Set(layouts.map(l => l.who.toLowerCase()));
const drifted = after.filter(p => !layoutPeople.has(p.name.toLowerCase()) && Math.abs(p.total - B[p.name.toLowerCase()].total) > 1e-9);
check('no other player total changed', drifted.length === 0, drifted.slice(0,3).map(p=>p.name).join(','));
check('verification scores unchanged by the refactor',
  after.flatMap(p => p.records.filter(r => r.type === 'verification')).every(
    r => Math.abs(r.score - recordScore(r.levelRank, 100) * 2) < 1e-9));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
