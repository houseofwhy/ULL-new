// Reproduces the 2026-08-24 outage: the Worker deployed against a database that has
// NOT had scripts/schema-migrations.sql run (no editor_keys.sort_order, no
// recent_changes table). Nothing user-facing may break — the editors list must still
// render, and the write paths that genuinely need the migration must say so.
//
// Run:  node worker/worker.unmigrated.test.mjs   (Node 22+, no dependencies)
import { DatabaseSync } from 'node:sqlite';
import worker from './worker.js';

const db = new DatabaseSync(':memory:');
// The PRE-migration schema, as the live D1 database had it before the 2026-08-24 migration.
db.exec(`
CREATE TABLE levels (path TEXT PRIMARY KEY, name TEXT NOT NULL, author TEXT, verifier TEXT,
  verification TEXT, showcase TEXT, thumbnail TEXT, id TEXT, percentToQualify INTEGER,
  percentFinished INTEGER, length INTEGER, rating REAL, lastUpd TEXT, isVerified INTEGER DEFAULT 0,
  tags TEXT, records TEXT, run TEXT, sort_order INTEGER, isMain INTEGER DEFAULT 0,
  isFuture INTEGER DEFAULT 0, creators TEXT, frameCounter TEXT, benchmark INTEGER DEFAULT 0);
CREATE TABLE editor_keys (id INTEGER PRIMARY KEY AUTOINCREMENT, editor_name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE, role TEXT DEFAULT 'mod', link TEXT DEFAULT '');
CREATE TABLE pending (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, placement TEXT NOT NULL,
  link TEXT, sort_order INTEGER, indefinite INTEGER DEFAULT 0);
CREATE TABLE config (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, editor_name TEXT, action TEXT,
  target TEXT, details TEXT, timestamp TEXT DEFAULT CURRENT_TIMESTAMP);
`);
const D1 = { prepare(sql) { const mk = (p) => ({ bind: (...a) => mk(a),
    async all() { return { results: db.prepare(sql).all(...p) }; },
    async first() { return db.prepare(sql).get(...p) ?? null; },
    async run() { return db.prepare(sql).run(...p); } }); return mk([]); },
  async batch(st) { for (const s of st) await s.run(); return []; } };
const env = { DB: D1, BOOTSTRAP_SECRET: 'boot' };
const KEY = 'admin-key';

const call = async (m, path, body, key) => {
  const h = {}; if (body) h['Content-Type'] = 'application/json'; if (key) h.Authorization = `Bearer ${key}`;
  const r = await worker.fetch(new Request('https://w.dev' + path,
    { method: m, headers: h, body: body ? JSON.stringify(body) : undefined }), env);
  const t = await r.text();
  return { status: r.status, cors: r.headers.get('Access-Control-Allow-Origin'), body: t ? JSON.parse(t) : null };
};

let pass = 0, fail = 0;
const check = (l, c, x = '') => c ? (pass++, console.log(`  ok   ${l}`)) : (fail++, console.log(`  FAIL ${l} ${x}`));

console.log('\n── un-migrated DB: adding editors still works ──');
let r = await call('POST', '/api/admin/bootstrap', { secret: 'boot', name: 'QwidziT', key: KEY, role: 'owner', link: '' });
check('bootstrap succeeds without sort_order', r.status === 200, JSON.stringify(r.body));
for (const [n, role] of [['exiled_shade', 'admin'], ['Keres', 'seniormod']]) {
  r = await call('POST', '/api/admin/add-key', { name: n, key: 'k-' + n, role, link: '' }, KEY);
  check(`add-key "${n}" succeeds without sort_order`, r.status === 200, JSON.stringify(r.body));
}

console.log('\n── the reported symptom: editors empty everywhere ──');
r = await call('GET', '/api/editors');
check('GET /api/editors returns 200, not 500', r.status === 200, JSON.stringify(r.body));
check('editors are NOT empty', Array.isArray(r.body) && r.body.length === 3,
  JSON.stringify(r.body));
check('falls back to insertion order',
  r.body.map(e => e.name).join(',') === 'QwidziT,exiled_shade,Keres', JSON.stringify(r.body.map(e => e.name)));
check('login still works (authed() unaffected)', (await call('GET', '/api/auth/validate', null, KEY)).status === 200);

console.log('\n── recent changes: table missing ──');
r = await call('GET', '/api/recent-changes');
check('public feed returns [] not 500', r.status === 200 && Array.isArray(r.body) && r.body.length === 0,
  JSON.stringify(r.body));
r = await call('GET', '/api/admin/changes', null, KEY);
check('admin tab explains the migration', r.status === 500 && /schema-migrations/.test(r.body.error), JSON.stringify(r.body));
check('  ...with CORS, so the panel can read it', r.cors === '*');
r = await call('POST', '/api/admin/changes', { date: 'August 24, 2026', change: '**X** placed' }, KEY);
check('adding a change explains the migration', r.status === 500 && /schema-migrations/.test(r.body.error), JSON.stringify(r.body));

console.log('\n── reordering editors: column missing ──');
r = await call('POST', '/api/editors/reorder', { names: ['QwidziT', 'Keres'] }, KEY);
check('reorder explains the migration', r.status === 500 && /schema-migrations/.test(r.body.error), JSON.stringify(r.body));

console.log('\n── everything else unaffected ──');
r = await call('PUT', '/api/levels', { path: 'a', name: 'A', author: 'x', creators: [], verifier: 'v',
  verification: '', showcase: '', thumbnail: null, frameCounter: null, id: '1', rating: 1, length: 1,
  percentToQualify: 1, percentFinished: 1, lastUpd: '01.01.2026', tags: [], records: [], run: [],
  isVerified: false, isMain: true, isFuture: false, benchmark: false, insertAt: 1 }, KEY);
check('saving a level works', r.status === 200, JSON.stringify(r.body));
check('list loads', (await call('GET', '/api/list')).body.length === 1);
r = await call('PATCH', '/api/editors', { name: 'Keres', newName: 'KeresGD', role: 'mod', link: '' }, KEY);
check('renaming an editor works', r.status === 200, JSON.stringify(r.body));
check('rename kept the key', db.prepare("SELECT key_hash FROM editor_keys WHERE editor_name='KeresGD'").get().key_hash === db.prepare("SELECT key_hash FROM editor_keys WHERE editor_name='KeresGD'").get().key_hash);

console.log('\n── after running the migration, ordering comes to life ──');
const mig = (await import('node:fs')).readFileSync(new URL('../scripts/schema-migrations.sql', import.meta.url), 'utf8')
  .split('\n').filter(l => !l.trim().startsWith('--')).join('\n');
for (const s of mig.split(';').map(x => x.trim()).filter(Boolean)) {
  try { db.exec(s); } catch (e) { if (!/duplicate column/.test(e.message)) throw e; }
}
r = await call('GET', '/api/editors');
check('editors now carry sort_order', r.body.every(e => typeof e.sort_order === 'number'), JSON.stringify(r.body));
r = await call('POST', '/api/editors/reorder', { names: ['KeresGD', 'QwidziT', 'exiled_shade'] }, KEY);
check('reorder now succeeds', r.status === 200, JSON.stringify(r.body));
check('new order served',
  (await call('GET', '/api/editors')).body.map(e => e.name).join(',') === 'KeresGD,QwidziT,exiled_shade');
r = await call('POST', '/api/admin/changes', { date: 'August 24, 2026', change: '**X** placed' }, KEY);
check('adding a change now succeeds', r.status === 200, JSON.stringify(r.body));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
