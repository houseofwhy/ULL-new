// Exercises the auth brute-force throttle in worker/worker.js against a SQLite DB
// with the auth_throttle table (and, in one block, without it — the fail-open case).
//
// Run:  node worker/worker.throttle.test.mjs   (Node 22+, no dependencies)
import { DatabaseSync } from 'node:sqlite';
import worker from './worker.js';

function makeDb(withThrottle = true) {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE editor_keys (id INTEGER PRIMARY KEY AUTOINCREMENT, editor_name TEXT NOT NULL,
      key_hash TEXT NOT NULL UNIQUE, role TEXT DEFAULT 'mod', link TEXT DEFAULT '', sort_order INTEGER DEFAULT 0);
    CREATE TABLE audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, editor_name TEXT, action TEXT,
      target TEXT, details TEXT, timestamp TEXT DEFAULT CURRENT_TIMESTAMP);
  `);
  if (withThrottle) {
    db.exec(`CREATE TABLE auth_throttle (ip TEXT PRIMARY KEY, fails INTEGER DEFAULT 0,
      window_start INTEGER DEFAULT 0, blocked_until INTEGER DEFAULT 0);`);
  }
  return db;
}
function d1(db) {
  return { prepare(sql) { const mk = (p) => ({ bind: (...a) => mk(a),
      async all() { return { results: db.prepare(sql).all(...p) }; },
      async first() { return db.prepare(sql).get(...p) ?? null; },
      async run() { return db.prepare(sql).run(...p); } }); return mk([]); },
    async batch(st) { for (const s of st) await s.run(); return []; } };
}

let pass = 0, fail = 0;
const check = (l, c, x = '') => c ? (pass++, console.log(`  ok   ${l}`)) : (fail++, console.log(`  FAIL ${l} ${x}`));

// One authed request from a given IP with a given key.
async function validate(env, key, ip) {
  const res = await worker.fetch(new Request('https://w.dev/api/auth/validate', {
    headers: { Authorization: `Bearer ${key}`, 'CF-Connecting-IP': ip },
  }), env);
  return { status: res.status, retryAfter: res.headers.get('Retry-After'), cors: res.headers.get('Access-Control-Allow-Origin') };
}

async function seedOwner(env, key) {
  await worker.fetch(new Request('https://w.dev/api/admin/bootstrap', { method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: 'boot', name: 'Owner', key, role: 'owner', link: '' }) }), env);
}

console.log('\n── wrong keys get blocked after the cap ──');
{
  const db = makeDb();
  const env = { DB: d1(db), BOOTSTRAP_SECRET: 'boot' };
  await seedOwner(env, 'real-key');

  const attacker = '9.9.9.9';
  let last;
  for (let i = 1; i <= 10; i++) last = await validate(env, `guess-${i}`, attacker);
  check('first 10 wrong keys return 401 (not blocked yet)', last.status === 401, JSON.stringify(last));

  const blocked = await validate(env, 'guess-11', attacker);
  check('the 11th attempt is blocked with 429', blocked.status === 429, JSON.stringify(blocked));
  check('429 carries a Retry-After header', Number(blocked.retryAfter) > 0, String(blocked.retryAfter));
  check('429 carries CORS headers', blocked.cors === '*');

  // Even the CORRECT key is refused while the IP is blocked — that's the point.
  const correctButBlocked = await validate(env, 'real-key', attacker);
  check('a blocked IP cannot use even the real key', correctButBlocked.status === 429, JSON.stringify(correctButBlocked));
}

console.log('\n── the block is per-IP ──');
{
  const db = makeDb();
  const env = { DB: d1(db), BOOTSTRAP_SECRET: 'boot' };
  await seedOwner(env, 'real-key');
  for (let i = 0; i < 11; i++) await validate(env, `guess-${i}`, '9.9.9.9');
  const other = await validate(env, 'real-key', '1.2.3.4');
  check('a different IP is unaffected and logs in', other.status === 200, JSON.stringify(other));
}

console.log('\n── a success resets the counter ──');
{
  const db = makeDb();
  const env = { DB: d1(db), BOOTSTRAP_SECRET: 'boot' };
  await seedOwner(env, 'real-key');
  const ip = '5.5.5.5';
  for (let i = 0; i < 9; i++) await validate(env, `guess-${i}`, ip);      // 9 fails — one below the cap
  const good = await validate(env, 'real-key', ip);
  check('correct key still works at 9 fails', good.status === 200, JSON.stringify(good));
  const row = db.prepare("SELECT fails FROM auth_throttle WHERE ip = '5.5.5.5'").get();
  check('the counter was cleared on success', !row, JSON.stringify(row));
  // ...so the attacker gets a fresh budget of wrong tries, not an instant block.
  const afterReset = await validate(env, 'wrong-again', ip);
  check('a wrong key after the reset is 401, not 429', afterReset.status === 401, JSON.stringify(afterReset));
}

console.log('\n── no Bearer token is never throttled ──');
{
  const db = makeDb();
  const env = { DB: d1(db), BOOTSTRAP_SECRET: 'boot' };
  await seedOwner(env, 'real-key');
  const ip = '7.7.7.7';
  for (let i = 0; i < 20; i++) {
    await worker.fetch(new Request('https://w.dev/api/auth/validate', { headers: { 'CF-Connecting-IP': ip } }), env);
  }
  const row = db.prepare("SELECT * FROM auth_throttle WHERE ip = '7.7.7.7'").get();
  check('empty-token requests do not accrue fails', !row, JSON.stringify(row));
  check('and a real key from that IP still works', (await validate(env, 'real-key', ip)).status === 200);
}

console.log('\n── FAIL OPEN when the throttle table is missing ──');
{
  const db = makeDb(false);   // no auth_throttle table
  const env = { DB: d1(db), BOOTSTRAP_SECRET: 'boot' };
  await seedOwner(env, 'real-key');
  const ip = '8.8.8.8';
  let last;
  for (let i = 0; i < 25; i++) last = await validate(env, `guess-${i}`, ip);
  check('wrong keys stay 401 (never 429) with no table', last.status === 401, JSON.stringify(last));
  check('the real key still works with no table', (await validate(env, 'real-key', ip)).status === 200);
}

console.log('\n── writes are throttled too, not just /auth/validate ──');
{
  const db = makeDb();
  const env = { DB: d1(db), BOOTSTRAP_SECRET: 'boot' };
  await seedOwner(env, 'real-key');
  const ip = '4.4.4.4';
  const putPending = (key) => worker.fetch(new Request('https://w.dev/api/admin/pending', { method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, 'CF-Connecting-IP': ip },
    body: JSON.stringify({ name: 'x', placement: '?', link: '', indefinite: 0 }) }), env);
  for (let i = 0; i < 10; i++) await putPending(`guess-${i}`);
  const blocked = await putPending('guess-final');
  check('an authed write endpoint blocks the same way', blocked.status === 429, String(blocked.status));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
