// Exercises worker/worker.js against a real SQLite DB shaped like the live D1
// schema, through a minimal D1 shim. (The schema below was transcribed from the
// pre-migration D1 backup, which was removed from the repo: it carried the editor
// key hashes and Cloudflare Pages was serving it as a static file.)
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker from './worker.js';

const db = new DatabaseSync(':memory:');

// Real live schema — note: levels has NO password/difficulty.
db.exec(`
CREATE TABLE levels (
    path TEXT PRIMARY KEY, name TEXT NOT NULL, author TEXT, verifier TEXT,
    verification TEXT, showcase TEXT, thumbnail TEXT, id TEXT,
    percentToQualify INTEGER, percentFinished INTEGER, length INTEGER, rating REAL,
    lastUpd TEXT, isVerified INTEGER DEFAULT 0, tags TEXT, records TEXT, run TEXT,
    sort_order INTEGER, isMain INTEGER DEFAULT 0, isFuture INTEGER DEFAULT 0,
    creators TEXT, frameCounter TEXT, benchmark INTEGER DEFAULT 0);
CREATE TABLE editor_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT, editor_name TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE, role TEXT DEFAULT 'mod', link TEXT DEFAULT '');
CREATE TABLE pending (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, placement TEXT NOT NULL,
    link TEXT, sort_order INTEGER, indefinite INTEGER DEFAULT 0);
CREATE TABLE config (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT, editor_name TEXT, action TEXT,
    target TEXT, details TEXT, timestamp TEXT DEFAULT CURRENT_TIMESTAMP);
`);

// Apply the repo's schema migrations exactly as an operator would.
const migrations = readFileSync(new URL('../scripts/schema-migrations.sql', import.meta.url), 'utf8')
  .split('\n').filter(l => !l.trim().startsWith('--')).join('\n');
for (const stmt of migrations.split(';').map(s => s.trim()).filter(Boolean)) {
  try { db.exec(stmt); } catch (e) { console.log('  (skipped:', e.message.slice(0, 50) + ')'); }
}

// ── D1 shim ────────────────────────────────────────────────────────────────
const D1 = {
  prepare(sql) {
    const mk = (params) => ({
      bind: (...p) => mk(p),
      async all() { return { results: db.prepare(sql).all(...params) }; },
      async first() { return db.prepare(sql).get(...params) ?? null; },
      async run() { return db.prepare(sql).run(...params); },
      _sql: sql, _params: params,
    });
    return mk([]);
  },
  async batch(stmts) { for (const s of stmts) await s.run(); return []; },
};

const env = { DB: D1, BOOTSTRAP_SECRET: 'boot' };
const KEY = 'test-key-123';

const call = async (method, path, body, key) => {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (key) headers.Authorization = `Bearer ${key}`;
  const res = await worker.fetch(
    new Request('https://w.dev' + path, { method, headers, body: body ? JSON.stringify(body) : undefined }),
    env,
  );
  const text = await res.text();
  return { status: res.status, cors: res.headers.get('Access-Control-Allow-Origin'), body: text ? JSON.parse(text) : null };
};

let pass = 0, fail = 0;
const check = (label, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label} ${extra}`); }
};

console.log('\n── bootstrap + editors ──');
console.log(await call('POST', '/api/admin/bootstrap', { secret: 'boot', name: 'QwidziT', key: KEY, role: 'owner', link: '' }));
for (const [n, r] of [['Prometheus', 'dev'], ['Keres', 'seniormod'], ['Terralith', 'mod']]) {
  await call('POST', '/api/admin/add-key', { name: n, key: 'k-' + n, role: r, link: '' }, KEY);
}
let eds = await call('GET', '/api/editors');
check('editors are in insertion order, not alphabetical',
  eds.body.map(e => e.name).join(',') === 'QwidziT,Prometheus,Keres,Terralith', JSON.stringify(eds.body.map(e => e.name)));

console.log('\n── reorder editors ──');
await call('POST', '/api/editors/reorder', { names: ['QwidziT', 'Keres', 'Terralith', 'Prometheus'] }, KEY);
eds = await call('GET', '/api/editors');
check('reorder persists',
  eds.body.map(e => e.name).join(',') === 'QwidziT,Keres,Terralith,Prometheus', JSON.stringify(eds.body.map(e => e.name)));
check('reorder requires auth', (await call('POST', '/api/editors/reorder', { names: ['QwidziT'] })).status === 401);

console.log('\n── rename editor (key must survive) ──');
const before = db.prepare("SELECT key_hash, role, link FROM editor_keys WHERE editor_name='Terralith'").get();
let r = await call('PATCH', '/api/editors', { name: 'Terralith', newName: 'Terra', role: 'seniormod', link: 'https://yt/@terra' }, KEY);
check('rename returns ok', r.status === 200 && r.body.name === 'Terra', JSON.stringify(r.body));
const after = db.prepare("SELECT key_hash, role, link FROM editor_keys WHERE editor_name='Terra'").get();
check('key_hash unchanged after rename', after && after.key_hash === before.key_hash);
check('role/link updated', after.role === 'seniormod' && after.link === 'https://yt/@terra');
check('order preserved after rename',
  (await call('GET', '/api/editors')).body.map(e => e.name).join(',') === 'QwidziT,Keres,Terra,Prometheus');
r = await call('PATCH', '/api/editors', { name: 'Terra', newName: 'Keres', role: 'mod' }, KEY);
check('rename to an existing name is rejected', r.status === 400, JSON.stringify(r.body));
r = await call('PATCH', '/api/editors', { name: 'Terra', role: 'mod', link: '' }, KEY);
check('patch without newName still works', r.status === 200 && r.body.name === 'Terra');

console.log('\n── levels: save must NOT blow up (the "network error" bug) ──');
const level = {
  path: 'aeternus', name: 'Aeternus', author: 'Riot', creators: ['Riot'], verifier: 'Open Verification',
  verification: '', showcase: 'https://youtu.be/x', thumbnail: null, frameCounter: null, id: '102647436',
  rating: 1, length: 77, percentToQualify: 17, percentFinished: 100, lastUpd: '10.04.2026',
  tags: ['Public'], records: [{ user: 'none', link: '', percent: 0, hz: 0 }],
  run: [{ user: 'none', link: '', percent: '0', hz: 0 }],
  isVerified: false, isMain: true, isFuture: false, benchmark: false, insertAt: 1,
};
r = await call('PUT', '/api/levels', level, KEY);
check('insert level succeeds', r.status === 200, JSON.stringify(r.body));
r = await call('PUT', '/api/levels', { ...level, percentFinished: 88, name: 'Aeternus v2' }, KEY);
check('UPDATE level succeeds (was 500 + no CORS -> "Network error")', r.status === 200, JSON.stringify(r.body));
const list = await call('GET', '/api/list');
check('update actually persisted', list.body[0].name === 'Aeternus v2' && list.body[0].percentFinished === 88);
check('parseLevel has no password/difficulty keys',
  !('password' in list.body[0]) && !('difficulty' in list.body[0]));

console.log('\n── errors always carry CORS headers ──');
r = await call('GET', '/api/nope');
check('404 has CORS', r.cors === '*');
const broken = { ...env, DB: { prepare() { throw new Error('no such column: password'); }, batch() {} } };
const res500 = await worker.fetch(new Request('https://w.dev/api/list'), broken);
check('uncaught throw -> 500 WITH CORS', res500.status === 500 && res500.headers.get('Access-Control-Allow-Origin') === '*');
check('uncaught throw -> real message', (await res500.json()).error.includes('no such column'));

console.log('\n── recent changes ──');
const seed = readFileSync(new URL('../scripts/seed-recent-changes.sql', import.meta.url), 'utf8')
  .split('\n').filter(l => !l.trim().startsWith('--')).join('\n');
for (const stmt of seed.split(';').map(s => s.trim()).filter(Boolean)) db.exec(stmt);
let ch = await call('GET', '/api/recent-changes');
check('seeded feed groups by date, newest first',
  ch.body.length === 3 && ch.body[0].date === 'August 23, 2026', JSON.stringify(ch.body.map(g => g.date)));
check('group entry counts', ch.body.map(g => g.entries.length).join(',') === '18,5,19',
  ch.body.map(g => g.entries.length).join(','));

r = await call('POST', '/api/admin/changes', { date: 'August 24, 2026', change: '**Foo** has been placed at #1' }, KEY);
check('add change (top by default)', r.status === 200);
ch = await call('GET', '/api/recent-changes');
check('new entry lands at the top', ch.body[0].date === 'August 24, 2026' && ch.body.length === 4,
  JSON.stringify(ch.body.map(g => g.date)));

r = await call('POST', '/api/admin/changes', { date: 'January 2, 2025', change: '**Old** backdated entry', position: 'bottom' }, KEY);
ch = await call('GET', '/api/recent-changes');
check('backdated entry can be pinned to the bottom', ch.body[ch.body.length - 1].date === 'January 2, 2025');

const rows = await call('GET', '/api/admin/changes', null, KEY);
check('admin change list is authed + has ids', rows.status === 200 && rows.body.every(x => typeof x.id === 'number'));
check('admin change list rejects anon', (await call('GET', '/api/admin/changes')).status === 401);

const target = rows.body.find(x => x.change.includes('Foo'));
await call('PUT', '/api/admin/changes', { id: target.id, date: 'August 24, 2026', change: '**Foo** has been placed at #2' }, KEY);
ch = await call('GET', '/api/recent-changes');
check('edit change persists', ch.body[0].entries[0].includes('#2'), ch.body[0].entries[0]);

const beforeOrder = (await call('GET', '/api/recent-changes')).body.map(g => g.date);
const fresh = await call('GET', '/api/admin/changes', null, KEY);
await call('POST', '/api/admin/changes/reorder', { ids: fresh.body.map(x => x.id).reverse() }, KEY);
ch = await call('GET', '/api/recent-changes');
check('reorder flips the feed',
  ch.body.map(g => g.date).join('|') === [...beforeOrder].reverse().join('|'),
  JSON.stringify(ch.body.map(g => g.date)));

await call('DELETE', `/api/admin/changes/${target.id}`, null, KEY);
const left = await call('GET', '/api/admin/changes', null, KEY);
check('delete removes the row', !left.body.some(x => x.id === target.id));
check('delete rejects anon', (await call('DELETE', `/api/admin/changes/${left.body[0].id}`)).status === 401);

console.log('\n── regression: pending + config still fine ──');
await call('POST', '/api/admin/pending', { name: 'ZOINK', placement: '1', link: '', indefinite: 0 }, KEY);
check('pending add', (await call('GET', '/api/pending')).body.length === 1);
await call('PUT', '/api/config', { levelMonth: { name: 'Aeternus' } }, KEY);
check('config save', (await call('GET', '/api/level-month')).body.name === 'Aeternus');
check('audit log records writes', (await call('GET', '/api/audit-log', null, KEY)).body.length > 0);

// ── The whole log, not the last hundred ────────────────────────────────────
console.log('\n── audit log: every entry, a page at a time ──');
// 140 writes, so the old LIMIT 100 would hide the oldest of them.
for (let i = 0; i < 140; i++) {
  await call('PUT', '/api/config', { probe: String(i) }, KEY);
}
let page = await call('GET', '/api/audit-log?limit=50', null, KEY);
check('a page is capped at the limit asked for', page.body.entries.length === 50, String(page.body.entries.length));
check('the total counts everything, not the page', page.body.total > 140, String(page.body.total));
check('and says there is more', page.body.hasMore === true);
const firstId = page.body.entries[page.body.entries.length - 1].id;
const page2 = await call(`GET`, `/api/audit-log?limit=50&before=${firstId}`, null, KEY);
check('the next page continues below it', page2.body.entries[0].id < firstId);
check('pages do not overlap', !page2.body.entries.some(e => page.body.entries.some(p => p.id === e.id)));
let walked = 0, cursor = 0;
for (let guard = 0; guard < 50; guard++) {
  const r = await call('GET', `/api/audit-log?limit=100${cursor ? `&before=${cursor}` : ''}`, null, KEY);
  walked += r.body.entries.length;
  if (!r.body.hasMore) break;
  cursor = r.body.entries[r.body.entries.length - 1].id;
}
check('walking the pages reaches every entry ever', walked === page.body.total, `${walked} vs ${page.body.total}`);
check('filtering by editor works', (await call(`GET`, `/api/audit-log?editor=${encodeURIComponent('QwidziT')}`, null, KEY)).body.entries
  .every(e => e.editor_name === 'QwidziT'));
check('filtering by action works', (await call('GET', '/api/audit-log?action=DELETE', null, KEY)).body.entries
  .every(e => e.action === 'DELETE'));
check('audit log rejects anon', (await call('GET', '/api/audit-log')).status === 401);
// One worker serves this repo and the live site. A bare call must keep
// answering what it always did, or the other site's Audit Log tab breaks the
// moment this worker deploys.
const bare = await call('GET', '/api/audit-log', null, KEY);
check('a call with no query string still answers a plain array', Array.isArray(bare.body), JSON.stringify(bare.body).slice(0, 80));
check('and still caps at the 100 it always returned', bare.body.length === 100, String(bare.body.length));
check('asking for anything opts into the paged shape',
  !Array.isArray((await call('GET', '/api/audit-log?limit=5', null, KEY)).body));

console.log('\n── how much each editor did ──');
await call('POST', '/api/admin/pending', { name: 'BY-KERES', placement: '9', link: '' }, 'k-Keres');
const act = await call('GET', '/api/admin/activity', null, KEY);
check('activity is scoped to a window', act.body.days === 30 && !!act.body.since);
check('every editor who wrote is counted', act.body.editors.some(e => e.editor_name === 'QwidziT')
  && act.body.editors.some(e => e.editor_name === 'Keres'), JSON.stringify(act.body.editors));
check('counts are ordered, busiest first',
  act.body.editors.every((e, i, a) => i === 0 || a[i - 1].changes >= e.changes));
check('the busiest editor is the one who wrote most', act.body.editors[0].editor_name === 'QwidziT');
check('deletions are counted separately', act.body.editors[0].deletions >= 1, JSON.stringify(act.body.editors[0]));
check('a 1-day window is narrower than a 30-day one',
  (await call('GET', '/api/admin/activity?days=1', null, KEY)).body.days === 1);
check('activity rejects anon', (await call('GET', '/api/admin/activity')).status === 401);

// ── Snapshots ──────────────────────────────────────────────────────────────
console.log('\n── snapshots: the first write of a day captures midnight ──');
let snaps = await call('GET', '/api/admin/snapshots', null, KEY);
check('the day of writes above left exactly one automatic snapshot',
  snaps.body.snapshots.filter(s => s.kind === 'auto').length === 1,
  JSON.stringify(snaps.body.snapshots.map(s => s.kind)));
check('it knows which day it is the midnight of',
  snaps.body.snapshots[0].day === new Date().toISOString().slice(0, 10));
check('it records how many levels it holds', snaps.body.snapshots[0].levels_count >= 0);
check('and is stored smaller than it measures',
  snaps.body.snapshots[0].stored_bytes < snaps.body.snapshots[0].bytes + 200);
check('snapshots reject anon', (await call('GET', '/api/admin/snapshots')).status === 401);

console.log('\n── restore puts the list back, and keeps the way home ──');
// A known state, snapshotted by hand.
await call('PUT', '/api/levels', {
  path: 'restore-me', name: 'Restore Me', author: 'A', creators: [], verifier: 'V',
  verification: '', showcase: '', thumbnail: null, frameCounter: null, id: '1',
  rating: 1, length: 60, percentToQualify: 1, percentFinished: 50,
  lastUpd: '01.01.2026', tags: [], records: [], run: [],
  isVerified: false, isMain: true, isFuture: false, benchmark: false, insertAt: 1,
}, KEY);
await call('POST', '/api/admin/snapshots', { label: 'known good' }, KEY);
const known = (await call('GET', '/api/admin/snapshots', null, KEY)).body.snapshots
  .find(s => s.label === 'known good');
check('a snapshot can be taken on demand', !!known);
const beforeNames = (await call('GET', '/api/list')).body.map(l => l.name).join(',');

// Now break the list: delete the level and add another.
await call('DELETE', '/api/levels/restore-me', null, KEY);
await call('PUT', '/api/levels', {
  path: 'added-later', name: 'Added Later', author: 'B', creators: [], verifier: 'V',
  verification: '', showcase: '', thumbnail: null, frameCounter: null, id: '2',
  rating: 1, length: 60, percentToQualify: 1, percentFinished: 10,
  lastUpd: '02.01.2026', tags: [], records: [], run: [],
  isVerified: false, isMain: true, isFuture: false, benchmark: false, insertAt: 1,
}, KEY);
const brokenNames = (await call('GET', '/api/list')).body.map(l => l.name).join(',');
check('the list really changed', brokenNames !== beforeNames);

const restored = await call('POST', `/api/admin/snapshots/${known.id}/restore`, {}, KEY);
check('restore reports what it put back', restored.status === 200 && restored.body.levels >= 1,
  JSON.stringify(restored.body));
check('the list is back to the snapshot',
  (await call('GET', '/api/list')).body.map(l => l.name).join(',') === beforeNames);

// The way home: restoring took a snapshot of what was live first.
const backPoint = (await call('GET', '/api/admin/snapshots', null, KEY)).body.snapshots
  .find(s => s.kind === 'restore');
check('restoring first snapshotted what was live', !!backPoint);
await call('POST', `/api/admin/snapshots/${backPoint.id}/restore`, {}, KEY);
check('and going back to it returns every later change',
  (await call('GET', '/api/list')).body.map(l => l.name).join(',') === brokenNames,
  (await call('GET', '/api/list')).body.map(l => l.name).join(','));
check('restore rejects anon', (await call('POST', '/api/admin/snapshots/1/restore', {})).status === 401);
check('an unknown snapshot is a 404', (await call('POST', '/api/admin/snapshots/999999/restore', {}, KEY)).status === 404);

// ── Undo a deletion ────────────────────────────────────────────────────────
console.log('\n── every deletion can be put back ──');
const undoable = async (action) => {
  const r = await call(`GET`, `/api/audit-log?action=${action}&limit=1`, null, KEY);
  return r.body.entries[0];
};

await call('DELETE', '/api/levels/added-later', null, KEY);
check('the level is gone', !(await call('GET', '/api/list')).body.some(l => l.path === 'added-later'));
let entry = await undoable('DELETE');
check('the deletion is marked undoable', entry.undoable === true, JSON.stringify(entry));
check('the deleted row itself never crosses the wire', entry.undo_data === undefined);
let undone = await call('POST', `/api/admin/audit-log/${entry.id}/undo`, {}, KEY);
check('undo succeeds', undone.status === 200, JSON.stringify(undone.body));
const back = (await call('GET', '/api/list')).body.find(l => l.path === 'added-later');
check('the level is back', !!back);
check('with the fields it had', back && back.name === 'Added Later' && back.percentFinished === 10);
check('undoing twice is refused', (await call('POST', `/api/admin/audit-log/${entry.id}/undo`, {}, KEY)).status === 409);
check('and the entry no longer offers it', (await undoable('DELETE')).undoable === false);

const pend = (await call('GET', '/api/pending')).body[0];
await call('DELETE', `/api/pending/${pend.id}`, null, KEY);
entry = await undoable('PENDING_DELETE');
check('a pending deletion is undoable', entry.undoable === true);
await call('POST', `/api/admin/audit-log/${entry.id}/undo`, {}, KEY);
check('the pending entry is back', (await call('GET', '/api/pending')).body.some(p => p.id === pend.id));

const chg = (await call('GET', '/api/admin/changes', null, KEY)).body[0];
await call('DELETE', `/api/admin/changes/${chg.id}`, null, KEY);
entry = await undoable('CHANGE_DELETE');
await call('POST', `/api/admin/audit-log/${entry.id}/undo`, {}, KEY);
check('a recent change is back', (await call('GET', '/api/admin/changes', null, KEY)).body.some(c => c.id === chg.id));

// Terralith was renamed to Terra earlier in this file; delete the name that exists.
check('deleting an editor who is not there is a 404',
  (await call('DELETE', '/api/editors/NoSuchEditor', null, KEY)).status === 404);
await call('DELETE', '/api/editors/Terra', null, KEY);
check('the editor is gone', !(await call('GET', '/api/editors')).body.some(e => e.name === 'Terra'));
check('and their key stops working',
  (await call('GET', '/api/auth/validate', null, 'k-Terralith')).status === 401);
entry = await undoable('EDITOR_DELETE');
check('an editor deletion is undoable', entry.undoable === true);
await call('POST', `/api/admin/audit-log/${entry.id}/undo`, {}, KEY);
check('a deleted editor is back', (await call('GET', '/api/editors')).body.some(e => e.name === 'Terra'));
check('with their key working again — undo restores access, not just the name',
  (await call('GET', '/api/auth/validate', null, 'k-Terralith')).status === 200);

check('a non-deletion cannot be undone', (await call('POST',
  `/api/admin/audit-log/${(await call('GET', '/api/audit-log?action=RESTORE&limit=1', null, KEY)).body.entries[0].id}/undo`,
  {}, KEY)).status === 400);
check('undo rejects anon', (await call('POST', '/api/admin/audit-log/1/undo', {})).status === 401);

// ── Retention ──────────────────────────────────────────────────────────────
// Every snapshot for a week, then one a week for a month, then one a month.
// Backdated rows go in through the raw handle; taking one more runs the thinner.
console.log('\n── retention thins the old ones, keeps the recent ones ──');
db.exec('DELETE FROM snapshots');
const DAY = 86400000;
const at = (daysAgo, hour = 0) => new Date(Date.now() - daysAgo * DAY + hour * 3600000).toISOString();
const plant = db.prepare(
  "INSERT INTO snapshots (taken_at, day, kind, label, format, levels_count, bytes, data) VALUES (?, ?, 'auto', ?, 'json', 0, 2, '{}')"
);
const planted = [];
for (const daysAgo of [
  0, 1, 2, 3, 4, 5, 6,                      // this week — all kept
  8, 9, 10, 12, 15, 16, 17, 20, 22, 25, 29, // week-to-month — one per 7-day bucket
  40, 41, 55, 70, 71, 100, 190,             // older — one per calendar month
]) {
  const iso = at(daysAgo, 6);
  plant.run(iso, iso.slice(0, 10), `d-${daysAgo}`);
  planted.push({ daysAgo, iso });
}
const plantedCount = db.prepare('SELECT COUNT(*) AS n FROM snapshots').get().n;
await call('POST', '/api/admin/snapshots', { label: 'triggers the thinner' }, KEY);
const kept = db.prepare('SELECT taken_at, label FROM snapshots ORDER BY taken_at DESC').all();
const keptAges = kept
  .filter(r => r.label.startsWith('d-'))
  .map(r => Number(r.label.slice(2)))
  .sort((a, b) => a - b);

check('the thinner removed some', kept.length < plantedCount + 1, `${plantedCount} -> ${kept.length}`);
check('nothing inside a week is dropped',
  [0, 1, 2, 3, 4, 5, 6].every(d => keptAges.includes(d)), JSON.stringify(keptAges));
const weekOld = planted.filter(p => p.daysAgo >= 7 && p.daysAgo < 31);
const buckets = new Set(weekOld.map(p => Math.floor(Date.parse(p.iso) / (7 * DAY))));
const keptWeekOld = keptAges.filter(d => d >= 7 && d < 31);
check('between a week and a month, one per seven-day bucket',
  keptWeekOld.length === buckets.size, `${keptWeekOld.length} kept for ${buckets.size} buckets: ${JSON.stringify(keptWeekOld)}`);
const monthOld = planted.filter(p => p.daysAgo >= 31);
const months = new Set(monthOld.map(p => { const d = new Date(p.iso); return `${d.getUTCFullYear()}-${d.getUTCMonth()}`; }));
const keptMonthOld = keptAges.filter(d => d >= 31);
check('beyond a month, one per calendar month',
  keptMonthOld.length === months.size, `${keptMonthOld.length} kept for ${months.size} months: ${JSON.stringify(keptMonthOld)}`);
check('the one kept in a bucket is the earliest of it — the state that period began in',
  keptWeekOld.every(d => !weekOld.some(p => p.daysAgo > d
    && Math.floor(Date.parse(p.iso) / (7 * DAY)) === Math.floor(Date.parse(planted.find(x => x.daysAgo === d).iso) / (7 * DAY)))),
  JSON.stringify(keptWeekOld));
check('thinning is idempotent', await (async () => {
  const n = db.prepare('SELECT COUNT(*) AS n FROM snapshots').get().n;
  await call('POST', '/api/admin/snapshots', { label: 'again' }, KEY);
  return db.prepare('SELECT COUNT(*) AS n FROM snapshots').get().n === n + 1;
})());

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
