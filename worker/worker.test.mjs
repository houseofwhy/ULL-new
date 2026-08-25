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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
