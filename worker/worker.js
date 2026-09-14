const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}
function err(msg, status = 400) {
  return json({ error: msg }, status);
}

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Auth brute-force throttle ─────────────────────────────────────────────────
// The only way to write to the list is a valid API key. There is no signup and no
// password reset, so the one attack is guessing a key against /api/auth/validate
// (or any authed write). This caps wrong-key attempts per IP so an online guesser
// can't run millions of tries — the keys themselves are strong, this just removes
// the "unlimited free guesses" affordance.
//
// State lives in the `auth_throttle` table (see scripts/schema-migrations.sql).
// EVERYTHING here FAILS OPEN: if the table is missing (migration not run) or D1
// errors, auth proceeds unthrottled rather than locking every editor out. Rate
// limiting is defense in depth, never the thing standing between staff and the
// panel.
const THROTTLE_WINDOW_MS = 15 * 60 * 1000;  // count wrong tries over 15 minutes
const THROTTLE_MAX_FAILS = 10;              // then block further tries from that IP
const THROTTLE_BLOCK_MS = 15 * 60 * 1000;   // for 15 minutes

function clientIp(req) {
  return req.headers.get('CF-Connecting-IP')
    || req.headers.get('X-Forwarded-For')
    || 'unknown';
}

// Seconds an IP is blocked for (0 = not blocked). Never throws.
async function throttleRemaining(db, ip, now) {
  try {
    const row = await db.prepare(
      'SELECT blocked_until FROM auth_throttle WHERE ip = ?'
    ).bind(ip).first();
    if (row && row.blocked_until && row.blocked_until > now) {
      return Math.ceil((row.blocked_until - now) / 1000);
    }
  } catch { /* table missing / D1 error → fail open */ }
  return 0;
}

// Record whether a key check passed. Success clears the IP's counter; failure
// increments it within the sliding window and blocks once the cap is hit. Never
// throws.
async function recordAuthResult(db, ip, ok, now) {
  try {
    if (ok) {
      await db.prepare('DELETE FROM auth_throttle WHERE ip = ?').bind(ip).run();
      return;
    }
    const row = await db.prepare(
      'SELECT fails, window_start FROM auth_throttle WHERE ip = ?'
    ).bind(ip).first();
    if (!row || now - row.window_start > THROTTLE_WINDOW_MS) {
      // First failure, or the previous window has expired → start a fresh window.
      await db.prepare(
        `INSERT INTO auth_throttle (ip, fails, window_start, blocked_until) VALUES (?, 1, ?, 0)
         ON CONFLICT(ip) DO UPDATE SET fails = 1, window_start = ?, blocked_until = 0`
      ).bind(ip, now, now).run();
    } else {
      const fails = row.fails + 1;
      const blockedUntil = fails >= THROTTLE_MAX_FAILS ? now + THROTTLE_BLOCK_MS : 0;
      await db.prepare(
        'UPDATE auth_throttle SET fails = ?, blocked_until = ? WHERE ip = ?'
      ).bind(fails, blockedUntil, ip).run();
    }
  } catch { /* table missing / D1 error → fail open */ }
}

// Thrown by authed() when the caller's IP is currently blocked; the top-level
// fetch handler turns it into a 429 with a Retry-After header.
class RateLimited extends Error {
  constructor(retryAfter) { super('Too many attempts'); this.retryAfter = retryAfter; }
}

// Returns editor name (string) if authenticated, null if not.
// NOTE: the real DB column is `editor_name`, not `name`.
// A request with no Bearer token is not throttled (no credential was presented);
// only actual wrong-key attempts count toward the limit.
//
// Memoised per Request. Several handlers ask twice — and the midnight-snapshot
// hook below asks before any of them — and each ask used to be another key
// lookup and another tick of the throttle counter, so a single request could
// charge itself two failures for one wrong key. The promise is cached, not the
// value, so two concurrent asks share one lookup.
const AUTH_CACHE = new WeakMap();
function authed(req, db) {
  if (!AUTH_CACHE.has(req)) AUTH_CACHE.set(req, authenticate(req, db));
  return AUTH_CACHE.get(req);
}

async function authenticate(req, db) {
  const auth = req.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;

  const ip = clientIp(req);
  const now = Date.now();
  const blocked = await throttleRemaining(db, ip, now);
  if (blocked > 0) throw new RateLimited(blocked);

  const hash = await sha256(token);
  const row = await db.prepare('SELECT editor_name FROM editor_keys WHERE key_hash = ?').bind(hash).first();
  await recordAuthResult(db, ip, !!row, now);
  return row ? row.editor_name : null;
}

// `undo` is the deleted row itself, so the panel can put it back. It is stored
// only for the actions UNDOABLE lists; everything else logs as before. A
// database that has not had the migration run has no undo_data column, so the
// insert falls back to the four-column form rather than losing the log line.
async function log(db, editor, action, target, details = '', undo = null) {
  try {
    if (undo) {
      try {
        await db.prepare(
          'INSERT INTO audit_log (editor_name, action, target, details, undo_data) VALUES (?, ?, ?, ?, ?)'
        ).bind(editor, action, target, details, JSON.stringify(undo)).run();
        return;
      } catch { /* no undo_data column → fall through */ }
    }
    await db.prepare(
      'INSERT INTO audit_log (editor_name, action, target, details) VALUES (?, ?, ?, ?)'
    ).bind(editor, action, target, details).run();
  } catch { /* never fail the main request */ }
}

// NOTE: the real `levels` table has NO `password` / `difficulty` columns. Selecting,
// inserting or updating them throws a SQLite error, which used to surface in the
// browser as a bare "Network error" (an uncaught throw returns Cloudflare's own 500
// page, which carries no CORS headers, so fetch() rejects instead of resolving).
function parseLevel(row) {
  return {
    path: row.path,
    name: row.name,
    author: row.author,
    creators: tryJSON(row.creators, []),
    verifier: row.verifier,
    verification: row.verification,
    showcase: row.showcase,
    thumbnail: row.thumbnail,
    frameCounter: row.frameCounter || null,
    id: row.id,
    rating: row.rating,
    length: row.length,
    percentToQualify: row.percentToQualify,
    percentFinished: row.percentFinished,
    lastUpd: row.lastUpd,
    tags: tryJSON(row.tags, []),
    records: tryJSON(row.records, []),
    run: tryJSON(row.run, []),
    isVerified: row.isVerified === 1,
    isMain: row.isMain === 1,
    isFuture: row.isFuture === 1,
    benchmark: row.benchmark === 1,
    sort_order: row.sort_order,
  };
}

function tryJSON(val, fallback) {
  try { return val ? JSON.parse(val) : fallback; } catch { return fallback; }
}

// Inserts an editor, appending them to the end of the manual display order.
// Falls back to a plain insert when `sort_order` doesn't exist yet, so adding an
// editor still works on a database that hasn't had schema-migrations.sql run.
async function insertEditor(db, name, hash, role, link) {
  try {
    const next = await db.prepare('SELECT MAX(sort_order) AS hi FROM editor_keys').first();
    await db.prepare(
      'INSERT INTO editor_keys (editor_name, key_hash, role, link, sort_order) VALUES (?, ?, ?, ?, ?)'
    ).bind(name, hash, role, link, next && next.hi !== null ? next.hi + 1 : 0).run();
  } catch (e) {
    if (!/sort_order/.test(String(e && e.message))) throw e;
    await db.prepare(
      'INSERT INTO editor_keys (editor_name, key_hash, role, link) VALUES (?, ?, ?, ?)'
    ).bind(name, hash, role, link).run();
  }
}

// The Recent Changes table is created by schema-migrations.sql. Turn "no such
// table" into an instruction rather than a raw SQLite error in the admin panel.
function changesTableError(e) {
  return /no such table/i.test(String(e && e.message))
    ? err('The recent_changes table does not exist yet. Run scripts/schema-migrations.sql on the D1 database first.', 500)
    : null;
}

// Recent Changes are stored one row per change line in `recent_changes`
// (id, date, change, sort_order). The public feed groups them by date, keeping
// the first appearance of each date as the group's position.
function groupChanges(rows) {
  const groups = [];
  const byDate = new Map();
  for (const r of rows) {
    let g = byDate.get(r.date);
    if (!g) {
      g = { date: r.date, entries: [] };
      byDate.set(r.date, g);
      groups.push(g);
    }
    g.entries.push(r.change);
  }
  return groups;
}

// ── Snapshots ────────────────────────────────────────────────────────────────
// The panel can put the list back to how it stood at a past midnight. There is
// no cron here, and none is needed: a snapshot is taken lazily, on the first
// write of each UTC day. At that moment the state IS the midnight state, because
// nothing has written since midnight — that is exactly what "no snapshot for
// today yet" means. A day nobody edited gets no snapshot, and needs none: the
// previous one is still the state that day started and ended in.
//
// What is captured is the list and the things that describe it. `editor_keys` is
// deliberately NOT captured: a restore must never resurrect a revoked API key,
// nor drop one issued since.
const SNAPSHOT_TABLES = ['levels', 'pending', 'recent_changes'];
const SNAPSHOT_CONFIG_KEYS = ['levelMonth', 'levelVerif'];

const DAY_MS = 86400000;
// How long each resolution is kept. Inside a week, every snapshot; out to a
// month, one per seven-day bucket; beyond that, one per calendar month.
const KEEP_ALL_MS = 7 * DAY_MS;
const KEEP_WEEKLY_MS = 31 * DAY_MS;

const utcDay = (d = new Date()) => d.toISOString().slice(0, 10);

// gzip, then base64, because D1 stores text. The levels table alone is ~270 KB
// of JSON and D1 caps one value at 1 MB, so the list would grow into that limit
// uncompressed; gzipped the same rows are ~55 KB.
async function deflate(text) {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

async function inflate(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return await new Response(stream).text();
}

// A table that does not exist yet reads as null rather than throwing, and a
// restore then leaves that table alone instead of emptying it.
async function captureState(db) {
  const state = {};
  for (const table of SNAPSHOT_TABLES) {
    try {
      const { results } = await db.prepare(`SELECT * FROM ${table}`).all();
      state[table] = results || [];
    } catch { state[table] = null; }
  }
  try {
    const marks = SNAPSHOT_CONFIG_KEYS.map((k) => `'${k}'`).join(', ');
    const { results } = await db.prepare(
      `SELECT key, value FROM config WHERE key IN (${marks})`
    ).all();
    state.config = results || [];
  } catch { state.config = null; }
  return state;
}

async function takeSnapshot(db, { day, kind, label }) {
  const state = await captureState(db);
  const raw = JSON.stringify(state);
  await db.prepare(
    `INSERT INTO snapshots (taken_at, day, kind, label, format, levels_count, bytes, data)
     VALUES (?, ?, ?, ?, 'gzip', ?, ?, ?)`
  ).bind(
    new Date().toISOString(), day, kind, label,
    (state.levels || []).length, raw.length, await deflate(raw),
  ).run();
  await thinSnapshots(db);
}

// Which snapshots survive the retention policy, by id. Everything inside a week
// is kept; between a week and a month, the EARLIEST of each seven-day bucket,
// which is the one closest to that week's start; beyond a month, the earliest of
// each calendar month. Keeping the earliest rather than the latest is what makes
// "restore to that week" mean the state the week began in.
function snapshotKeepers(rows, now) {
  const keep = new Set();
  const weekly = new Map();
  const monthly = new Map();
  for (const row of rows) {
    const at = Date.parse(row.taken_at);
    if (isNaN(at)) { keep.add(row.id); continue; }
    const age = now - at;
    if (age < KEEP_ALL_MS) { keep.add(row.id); continue; }
    const bucket = age < KEEP_WEEKLY_MS ? weekly : monthly;
    const d = new Date(at);
    const key = age < KEEP_WEEKLY_MS
      ? String(Math.floor(at / (7 * DAY_MS)))
      : `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    const held = bucket.get(key);
    if (!held || at < held.at) bucket.set(key, { id: row.id, at });
  }
  for (const held of weekly.values()) keep.add(held.id);
  for (const held of monthly.values()) keep.add(held.id);
  return keep;
}

async function thinSnapshots(db) {
  try {
    const { results } = await db.prepare('SELECT id, taken_at FROM snapshots').all();
    const rows = results || [];
    const keep = snapshotKeepers(rows, Date.now());
    const drop = rows.filter((r) => !keep.has(r.id)).map((r) => r.id);
    if (!drop.length) return;
    await db.prepare(
      `DELETE FROM snapshots WHERE id IN (${drop.map(() => '?').join(', ')})`
    ).bind(...drop).run();
  } catch { /* snapshots table missing → nothing to thin */ }
}

// Called before the first write of a UTC day, from the one place every authed
// write passes through. Failing here must never block the write: a database
// without the snapshots table simply goes on unsnapshotted.
async function snapshotMidnightOnce(db) {
  try {
    const day = utcDay();
    const row = await db.prepare(
      "SELECT id FROM snapshots WHERE day = ? AND kind = 'auto'"
    ).bind(day).first();
    if (row) return;
    await takeSnapshot(db, { day, kind: 'auto', label: `Midnight, ${day} UTC` });
  } catch { /* never block a write */ }
}

// Column names come from the database itself (SELECT * on a fixed table list),
// never from a request, so building the statement by hand is safe. Doing it from
// the row's own keys also means a snapshot taken before a column existed still
// restores — it just does not set that column.
function insertRow(db, table, row) {
  const cols = Object.keys(row);
  return db.prepare(
    `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`
  ).bind(...cols.map((c) => row[c]));
}

// One batch, so the restore is all-or-nothing: D1 runs a batch as a transaction.
async function applySnapshot(db, snap) {
  const state = JSON.parse(snap.format === 'gzip' ? await inflate(snap.data) : snap.data);
  const stmts = [];
  for (const table of SNAPSHOT_TABLES) {
    const rows = state[table];
    if (!Array.isArray(rows)) continue;   // not captured → leave the table alone
    stmts.push(db.prepare(`DELETE FROM ${table}`));
    for (const row of rows) stmts.push(insertRow(db, table, row));
  }
  if (Array.isArray(state.config)) {
    for (const row of state.config) {
      stmts.push(db.prepare(
        'INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
      ).bind(row.key, row.value));
    }
  }
  await db.batch(stmts);
  return {
    levels: (state.levels || []).length,
    pending: (state.pending || []).length,
    changes: (state.recent_changes || []).length,
  };
}

// What the panel prints beside the restore list, so the policy is stated in one
// place rather than described twice.
const SNAPSHOT_RETENTION = 'Every snapshot for a week, then one a week for a month, then one a month.';

// A row from audit_log as the panel wants it: undo_data is the deleted row and
// can be a quarter of a megabyte, so it never crosses the wire — what the panel
// needs to know is only whether an undo is available.
function auditRow(row) {
  const { undo_data, ...rest } = row;
  return { ...rest, undoable: !!undo_data && !!UNDOABLE[row.action] && !row.undone_at };
}

// The 500 an endpoint returns when the snapshots table has not been created.
async function snapshotsMissing(db) {
  try {
    await db.prepare('SELECT id FROM snapshots LIMIT 1').first();
    return null;
  } catch {
    return err('The snapshots table does not exist yet. Run scripts/schema-migrations.sql on the D1 database first.', 500);
  }
}

// ── Undoing a deletion ───────────────────────────────────────────────────────
// Every DELETE handler stores the row it removed on its audit line. These say
// where each one goes back.
const UNDOABLE = {
  DELETE: 'levels',
  PENDING_DELETE: 'pending',
  CHANGE_DELETE: 'recent_changes',
  EDITOR_DELETE: 'editor_keys',
};

async function handle(req, env) {
    const db = env.DB;
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    if (method === 'OPTIONS') return new Response(null, { headers: CORS });

    // The first write of a UTC day snapshots what the list looked like at
    // midnight, before that write lands. Every authed write goes through here,
    // so no handler has to remember to ask. The snapshot endpoints take their
    // own, and bootstrap runs before there is anybody to attribute it to.
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)
        && !path.startsWith('/api/admin/snapshots')
        && path !== '/api/admin/bootstrap'
        && await authed(req, db)) {
      await snapshotMidnightOnce(db);
    }

    // ── GET /api/list ──────────────────────────────────────────
    if (method === 'GET' && path === '/api/list') {
      const { results } = await db.prepare(
        'SELECT * FROM levels ORDER BY sort_order ASC'
      ).all();
      return json(results.map(parseLevel));
    }

    // ── GET /api/list/main ─────────────────────────────────────
    if (method === 'GET' && path === '/api/list/main') {
      const { results } = await db.prepare(
        'SELECT * FROM levels WHERE isMain = 1 AND isVerified = 0 ORDER BY sort_order ASC'
      ).all();
      return json(results.map(parseLevel));
    }

    // ── GET /api/list/future ───────────────────────────────────
    if (method === 'GET' && path === '/api/list/future') {
      const { results } = await db.prepare(
        'SELECT * FROM levels WHERE isFuture = 1 AND isVerified = 0 ORDER BY sort_order ASC'
      ).all();
      return json(results.map(parseLevel));
    }

    // ── GET /api/levels/:position ──────────────────────────────
    const posMatch = path.match(/^\/api\/levels\/(\d+)$/);
    if (method === 'GET' && posMatch) {
      const pos = parseInt(posMatch[1], 10);
      const { results } = await db.prepare(
        'SELECT * FROM levels ORDER BY sort_order ASC LIMIT 1 OFFSET ?'
      ).bind(pos - 1).all();
      if (!results.length) return err('Not found', 404);
      return json(parseLevel(results[0]));
    }

    // ── GET /api/pending ───────────────────────────────────────
    if (method === 'GET' && path === '/api/pending') {
      const { results } = await db.prepare(
        // No ORDER BY created_at — that column may not exist on the real
        // pending table (it holds name/placement/link rows). The frontend and
        // admin panel sort the results themselves.
        'SELECT * FROM pending'
      ).all();
      return json(results);
    }

    // ── GET /api/editors ───────────────────────────────────────
    // FIX: real column is `editor_name`; alias it back to `name`
    // so the frontend still receives objects shaped like {name, role, link}.
    // Order is manual (`sort_order`, arranged in the admin panel), NOT alphabetical.
    //
    // The fallback matters: if this Worker is deployed before
    // scripts/schema-migrations.sql has been run, `sort_order` does not exist yet and
    // the query throws — which used to blank out the editors list on every page.
    // Degrade to insertion order instead of taking the whole list down.
    if (method === 'GET' && path === '/api/editors') {
      try {
        const { results } = await db.prepare(
          'SELECT editor_name AS name, role, link, sort_order FROM editor_keys ORDER BY sort_order ASC, id ASC'
        ).all();
        return json(results);
      } catch {
        const { results } = await db.prepare(
          'SELECT editor_name AS name, role, link FROM editor_keys ORDER BY id ASC'
        ).all();
        return json(results.map(r => ({ ...r, sort_order: null })));
      }
    }

    // ── GET /api/auth/validate ─────────────────────────────────
    // NEW: the admin login calls this to check a key. 200 = valid, 401 = not.
    if (method === 'GET' && path === '/api/auth/validate') {
      const editor = await authed(req, db);
      if (!editor) return err('Unauthorized', 401);
      return json({ ok: true, name: editor });
    }

    // ── GET /api/audit-log ─────────────────────────────────────
    // The whole log, a page at a time, newest first. It used to be a bare
    // `LIMIT 100` with no way past it, so anything older than the last hundred
    // operations was simply unreachable. `before` is the id to continue from, so
    // paging is stable while new entries land at the top.
    //
    // ONE WORKER SERVES TWO SITES. A bare call with no query string answers
    // exactly what it always did — a plain array of the newest 100 rows — so an
    // admin panel deployed before this change keeps working against it. Asking
    // for anything (`?limit`, `?before`, `?editor`, `?action`) opts into the
    // paged shape `{ entries, total, hasMore }`. Do not remove this: dropping it
    // breaks the other site's Audit Log tab the moment this worker deploys.
    if (method === 'GET' && path === '/api/audit-log') {
      const editor = await authed(req, db);
      if (!editor) return err('Unauthorized', 401);
      const paged = [...url.searchParams.keys()].length > 0;

      const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '100', 10) || 100, 1), 500);
      const before = parseInt(url.searchParams.get('before') || '0', 10) || 0;
      const who = (url.searchParams.get('editor') || '').trim();
      const action = (url.searchParams.get('action') || '').trim();

      const where = [];
      const binds = [];
      if (before) { where.push('id < ?'); binds.push(before); }
      if (who) { where.push('editor_name = ?'); binds.push(who); }
      if (action) { where.push('action = ?'); binds.push(action); }
      const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

      // One extra row tells the panel whether there is another page, without a
      // second count query per scroll.
      const { results } = await db.prepare(
        `SELECT * FROM audit_log ${clause} ORDER BY id DESC LIMIT ?`
      ).bind(...binds, limit + 1).all();
      const rows = results || [];
      const hasMore = rows.length > limit;
      const entries = (hasMore ? rows.slice(0, limit) : rows).map(auditRow);

      // The unfiltered total, so the panel can say "showing 100 of 4,312".
      let total = entries.length;
      try {
        const filter = [];
        const fBinds = [];
        if (who) { filter.push('editor_name = ?'); fBinds.push(who); }
        if (action) { filter.push('action = ?'); fBinds.push(action); }
        const row = await db.prepare(
          `SELECT COUNT(*) AS n FROM audit_log ${filter.length ? `WHERE ${filter.join(' AND ')}` : ''}`
        ).bind(...fBinds).first();
        if (row) total = row.n;
      } catch { /* keep the page count */ }

      return paged ? json({ entries, total, hasMore }) : json(entries);
    }

    // ── GET /api/admin/activity ────────────────────────────────
    // How much each editor did over a window, newest window first. Defaults to
    // the last 30 days, which is the reading the panel shows beside the log.
    if (method === 'GET' && path === '/api/admin/activity') {
      const editor = await authed(req, db);
      if (!editor) return err('Unauthorized', 401);
      const days = Math.min(Math.max(parseInt(url.searchParams.get('days') || '30', 10) || 30, 1), 365);
      const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 19).replace('T', ' ');
      try {
        const { results } = await db.prepare(
          `SELECT editor_name,
                  COUNT(*) AS changes,
                  SUM(CASE WHEN action LIKE '%DELETE%' THEN 1 ELSE 0 END) AS deletions,
                  MAX(timestamp) AS last_at
             FROM audit_log
            WHERE timestamp >= ?
         GROUP BY editor_name
         ORDER BY changes DESC, editor_name ASC`
        ).bind(since).all();
        return json({ days, since, editors: results || [] });
      } catch {
        return json({ days, since, editors: [] });
      }
    }

    // ── GET /api/admin/snapshots ───────────────────────────────
    // The list of restore points, without the blobs.
    if (method === 'GET' && path === '/api/admin/snapshots') {
      const editor = await authed(req, db);
      if (!editor) return err('Unauthorized', 401);
      try {
        const { results } = await db.prepare(
          `SELECT id, taken_at, day, kind, label, levels_count, bytes, LENGTH(data) AS stored_bytes
             FROM snapshots ORDER BY taken_at DESC`
        ).all();
        return json({ snapshots: results || [], retention: SNAPSHOT_RETENTION });
      } catch {
        return json({ snapshots: [], retention: SNAPSHOT_RETENTION, missing: true });
      }
    }

    // ── POST /api/admin/snapshots ──────────────────────────────
    // Take one now, on top of whatever the day already has.
    if (method === 'POST' && path === '/api/admin/snapshots') {
      const editor = await authed(req, db);
      if (!editor) return err('Unauthorized', 401);
      const body = await req.json().catch(() => ({}));
      const missing = await snapshotsMissing(db);
      if (missing) return missing;
      const label = String(body.label || '').slice(0, 120) || `Taken by ${editor}`;
      await takeSnapshot(db, { day: utcDay(), kind: 'manual', label });
      await log(db, editor, 'SNAPSHOT', utcDay(), label);
      return json({ ok: true });
    }

    // ── POST /api/admin/snapshots/:id/restore ──────────────────
    // Put the list back to a snapshot. The live state is snapshotted first, so
    // this is never a one-way door: going back a month and then restoring that
    // new "before restore" point returns everything, including whatever was
    // done today after midnight.
    const restoreMatch = path.match(/^\/api\/admin\/snapshots\/(\d+)\/restore$/);
    if (method === 'POST' && restoreMatch) {
      const editor = await authed(req, db);
      if (!editor) return err('Unauthorized', 401);
      const missing = await snapshotsMissing(db);
      if (missing) return missing;

      const snap = await db.prepare('SELECT * FROM snapshots WHERE id = ?').bind(restoreMatch[1]).first();
      if (!snap) return err('Snapshot not found', 404);

      await takeSnapshot(db, {
        day: utcDay(),
        kind: 'restore',
        label: `Before restoring to ${snap.day}`,
      });

      let counts;
      try {
        counts = await applySnapshot(db, snap);
      } catch (e) {
        return err(`Restore failed, nothing was changed: ${e.message}`, 500);
      }
      await log(db, editor, 'RESTORE', snap.day, `${counts.levels} levels, ${counts.changes} changes`);
      return json({ ok: true, ...counts });
    }

    // ── POST /api/admin/audit-log/:id/undo ─────────────────────
    // Put back a row somebody deleted. The audit line carries the row itself.
    const undoMatch = path.match(/^\/api\/admin\/audit-log\/(\d+)\/undo$/);
    if (method === 'POST' && undoMatch) {
      const editor = await authed(req, db);
      if (!editor) return err('Unauthorized', 401);

      let entry;
      try {
        entry = await db.prepare('SELECT * FROM audit_log WHERE id = ?').bind(undoMatch[1]).first();
      } catch {
        return err('The audit_log table has no undo_data column yet. Run scripts/schema-migrations.sql on the D1 database first.', 500);
      }
      if (!entry) return err('Not found', 404);
      if (entry.undone_at) return err('That deletion has already been undone', 409);

      const table = UNDOABLE[entry.action];
      if (!table) return err(`${entry.action} is not a deletion that can be undone`, 400);
      const row = tryJSON(entry.undo_data, null);
      if (!row || typeof row !== 'object') return err('This entry was recorded before deletions were reversible', 400);

      // Refuse rather than overwrite: the row may have been re-created by hand.
      const key = table === 'levels' ? 'path' : table === 'editor_keys' ? 'editor_name' : 'id';
      const clash = await db.prepare(`SELECT 1 AS x FROM ${table} WHERE ${key} = ?`).bind(row[key]).first();
      if (clash) return err(`A row with that ${key} already exists — nothing was changed`, 409);

      try {
        if (table === 'levels') {
          // Reopen the gap the delete closed, so the level lands where it was.
          await db.prepare('UPDATE levels SET sort_order = sort_order + 1 WHERE sort_order >= ?')
            .bind(row.sort_order).run();
        }
        await insertRow(db, table, row).run();
      } catch (e) {
        return err(`Could not put it back: ${e.message}`, 500);
      }

      await db.prepare('UPDATE audit_log SET undone_at = ? WHERE id = ?')
        .bind(new Date().toISOString(), entry.id).run();
      await log(db, editor, 'UNDO', entry.target, `${entry.action} by ${entry.editor_name}`);
      return json({ ok: true, table });
    }

    // ── GET /api/level-month ───────────────────────────────────
    if (method === 'GET' && path === '/api/level-month') {
      const row = await db.prepare(
        "SELECT value FROM config WHERE key = 'levelMonth'"
      ).first();
      return json(row ? tryJSON(row.value, null) : null);
    }

    // ── GET /api/level-verif ───────────────────────────────────
    if (method === 'GET' && path === '/api/level-verif') {
      const row = await db.prepare(
        "SELECT value FROM config WHERE key = 'levelVerif'"
      ).first();
      return json(row ? tryJSON(row.value, null) : null);
    }

    // ── GET /api/recent-changes ────────────────────────────────
    // FIX: the frontend calls /api/recent-changes (was named /api/changes here),
    // and the real table is `recent_changes` (one row per change line).
    // If the table doesn't exist yet (migration not run), serve an empty feed rather
    // than a 500 — the home page then just shows "No recent changes recorded."
    if (method === 'GET' && path === '/api/recent-changes') {
      try {
        const { results } = await db.prepare(
          'SELECT date, change FROM recent_changes ORDER BY sort_order ASC, id ASC'
        ).all();
        return json(groupChanges(results));
      } catch {
        return json([]);
      }
    }

    // ── GET /api/admin/changes ─────────────────────────────────
    // Flat rows (with ids) for the admin panel's Changes tab.
    if (method === 'GET' && path === '/api/admin/changes') {
      const editor = await authed(req, db);
      if (!editor) return err('Unauthorized', 401);
      try {
        const { results } = await db.prepare(
          'SELECT id, date, change, sort_order FROM recent_changes ORDER BY sort_order ASC, id ASC'
        ).all();
        return json(results);
      } catch (e) {
        return changesTableError(e) || err(`Server error: ${e && e.message}`, 500);
      }
    }

    // ── PUT /api/levels (insert or update) ────────────────────
    if (method === 'PUT' && path === '/api/levels') {
      const editor = await authed(req, db);
      if (!editor) return err('Unauthorized', 401);
      const body = await req.json();
      const {
        path: lpath, name, author, creators, verifier, verification, showcase,
        thumbnail, frameCounter, id, rating, length,
        percentToQualify, percentFinished, lastUpd, tags, records, run,
        isVerified, isMain, isFuture, benchmark, insertAt,
      } = body;

      const existing = await db.prepare('SELECT sort_order FROM levels WHERE path = ?').bind(lpath).first();

      if (existing) {
        // Update existing
        await db.prepare(`
          UPDATE levels SET
            name=?, author=?, creators=?, verifier=?, verification=?, showcase=?,
            thumbnail=?, frameCounter=?, id=?, rating=?,
            length=?, percentToQualify=?, percentFinished=?, lastUpd=?, tags=?,
            records=?, run=?, isVerified=?, isMain=?, isFuture=?, benchmark=?
          WHERE path=?
        `).bind(
          name, author, JSON.stringify(creators), verifier, verification, showcase,
          thumbnail, frameCounter || null, String(id), rating,
          length, percentToQualify, percentFinished, lastUpd, JSON.stringify(tags),
          JSON.stringify(records), JSON.stringify(run),
          isVerified ? 1 : 0, isMain ? 1 : 0, isFuture ? 1 : 0, benchmark ? 1 : 0,
          lpath
        ).run();
        await log(db, editor, 'UPDATE', lpath, `${name} by ${author}`);
      } else {
        // Insert new — shift everything at insertAt and below down by 1
        const target = insertAt || 1;
        await db.prepare(
          'UPDATE levels SET sort_order = sort_order + 1 WHERE sort_order >= ?'
        ).bind(target).run();
        await db.prepare(`
          INSERT INTO levels
            (path, name, author, creators, verifier, verification, showcase,
             thumbnail, frameCounter, id, rating,
             length, percentToQualify, percentFinished, lastUpd, tags,
             records, run, isVerified, isMain, isFuture, benchmark, sort_order)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `).bind(
          lpath, name, author, JSON.stringify(creators), verifier, verification, showcase,
          thumbnail, frameCounter || null, String(id), rating,
          length, percentToQualify, percentFinished, lastUpd, JSON.stringify(tags),
          JSON.stringify(records), JSON.stringify(run),
          isVerified ? 1 : 0, isMain ? 1 : 0, isFuture ? 1 : 0, benchmark ? 1 : 0,
          target
        ).run();
        await log(db, editor, 'INSERT', lpath, `${name} at pos ${target}`);
      }
      return json({ ok: true });
    }

    // ── POST /api/levels/move ──────────────────────────────────
    if (method === 'POST' && path === '/api/levels/move') {
      const editor = await authed(req, db);
      if (!editor) return err('Unauthorized', 401);
      const { path: lpath, newPosition } = await req.json();
      if (!lpath || !newPosition) return err('path and newPosition required');

      // Fetch all sort_orders in order to get current rank without arithmetic
      const { results: all } = await db.prepare(
        'SELECT path, sort_order FROM levels ORDER BY sort_order ASC'
      ).all();
      const currentIndex = all.findIndex(r => r.path === lpath);
      if (currentIndex === -1) return err('Level not found', 404);

      const currentSortOrder = all[currentIndex].sort_order;
      const targetIndex = Math.max(0, Math.min(newPosition - 1, all.length - 1));
      const targetSortOrder = all[targetIndex].sort_order;

      if (currentSortOrder === targetSortOrder) return json({ ok: true });

      if (currentSortOrder < targetSortOrder) {
        // Moving down: shift levels in between up by 1
        await db.prepare(
          'UPDATE levels SET sort_order = sort_order - 1 WHERE sort_order > ? AND sort_order <= ?'
        ).bind(currentSortOrder, targetSortOrder).run();
      } else {
        // Moving up: shift levels in between down by 1
        await db.prepare(
          'UPDATE levels SET sort_order = sort_order + 1 WHERE sort_order >= ? AND sort_order < ?'
        ).bind(targetSortOrder, currentSortOrder).run();
      }
      await db.prepare('UPDATE levels SET sort_order = ? WHERE path = ?')
        .bind(targetSortOrder, lpath).run();

      await log(db, editor, 'MOVE', lpath, `to position ${newPosition}`);
      return json({ ok: true });
    }

    // ── DELETE /api/levels/:path ───────────────────────────────
    const delLevelMatch = path.match(/^\/api\/levels\/(.+)$/);
    if (method === 'DELETE' && delLevelMatch && !path.startsWith('/api/levels/move')) {
      const editor = await authed(req, db);
      if (!editor) return err('Unauthorized', 401);
      const lpath = decodeURIComponent(delLevelMatch[1]);
      // Don't match numeric paths (those are GET /api/levels/:position)
      if (/^\d+$/.test(lpath)) return err('Not found', 404);
      const row = await db.prepare('SELECT * FROM levels WHERE path = ?').bind(lpath).first();
      if (!row) return err('Not found', 404);
      await db.prepare('DELETE FROM levels WHERE path = ?').bind(lpath).run();
      await db.prepare('UPDATE levels SET sort_order = sort_order - 1 WHERE sort_order > ?').bind(row.sort_order).run();
      await log(db, editor, 'DELETE', lpath, row.name, row);
      return json({ ok: true });
    }

    // ── PUT /api/pending (submit or update) ───────────────────
    if (method === 'PUT' && path === '/api/pending') {
      const body = await req.json();
      const editor = await authed(req, db);

      if (editor) {
        // Editor updating status/notes
        const { id, status, notes } = body;
        if (!id) return err('id required');
        await db.prepare('UPDATE pending SET status=?, notes=? WHERE id=?')
          .bind(status || 'pending', notes || '', id).run();
        await log(db, editor, 'PENDING_UPDATE', String(id), `status=${status}`);
        return json({ ok: true });
      } else {
        // Public submission
        const { name, author, link, reason } = body;
        if (!name || !author) return err('name and author required');
        await db.prepare(
          'INSERT INTO pending (name, author, link, reason, status) VALUES (?, ?, ?, ?, ?)'
        ).bind(name, author, link || '', reason || '', 'pending').run();
        return json({ ok: true });
      }
    }

    // ── DELETE /api/pending/:id ────────────────────────────────
    const delPendMatch = path.match(/^\/api\/pending\/(\d+)$/);
    if (method === 'DELETE' && delPendMatch) {
      const editor = await authed(req, db);
      if (!editor) return err('Unauthorized', 401);
      const id = delPendMatch[1];
      const row = await db.prepare('SELECT * FROM pending WHERE id = ?').bind(id).first();
      await db.prepare('DELETE FROM pending WHERE id = ?').bind(id).run();
      await log(db, editor, 'PENDING_DELETE', id, row ? row.name : '', row);
      return json({ ok: true });
    }

    // ── POST /api/admin/pending (create a Pending List entry) ──
    // placement drives the icon (a tier number, "?", or "up"/"down").
    // indefinite = 1 puts the entry in the "Pending Indefinitely" section.
    if (method === 'POST' && path === '/api/admin/pending') {
      const editor = await authed(req, db);
      if (!editor) return err('Unauthorized', 401);
      const { name, placement, link, indefinite } = await req.json();
      if (!name) return err('name required');
      await db.prepare(
        'INSERT INTO pending (name, placement, link, indefinite) VALUES (?, ?, ?, ?)'
      ).bind(name, placement || '?', link || '', indefinite ? 1 : 0).run();
      await log(db, editor, 'PENDING_ADD', name, `placement=${placement || '?'} indefinite=${indefinite ? 1 : 0}`);
      return json({ ok: true });
    }

    // ── PUT /api/admin/pending (update a Pending List entry) ──
    if (method === 'PUT' && path === '/api/admin/pending') {
      const editor = await authed(req, db);
      if (!editor) return err('Unauthorized', 401);
      const { id, name, placement, link, indefinite } = await req.json();
      if (!id) return err('id required');
      if (!name) return err('name required');
      await db.prepare(
        'UPDATE pending SET name = ?, placement = ?, link = ?, indefinite = ? WHERE id = ?'
      ).bind(name, placement || '?', link || '', indefinite ? 1 : 0, id).run();
      await log(db, editor, 'PENDING_EDIT', String(id), `${name} placement=${placement || '?'} indefinite=${indefinite ? 1 : 0}`);
      return json({ ok: true });
    }

    // ── POST /api/admin/changes (add a Recent Changes line) ────
    // `date` is free text (e.g. "April 18, 2026") so entries can be backdated to
    // any past date; `position` puts the new line at the top (default) or bottom.
    if (method === 'POST' && path === '/api/admin/changes') {
      const editor = await authed(req, db);
      if (!editor) return err('Unauthorized', 401);
      const { date, change, position } = await req.json();
      if (!date || !change) return err('date and change required');
      let order;
      try {
        const bounds = await db.prepare(
          'SELECT MIN(sort_order) AS lo, MAX(sort_order) AS hi FROM recent_changes'
        ).first();
        const lo = bounds && bounds.lo !== null ? bounds.lo : 0;
        const hi = bounds && bounds.hi !== null ? bounds.hi : 0;
        order = position === 'bottom' ? hi + 1 : lo - 1;
        await db.prepare(
          'INSERT INTO recent_changes (date, change, sort_order) VALUES (?, ?, ?)'
        ).bind(date, change, order).run();
      } catch (e) {
        return changesTableError(e) || err(`Server error: ${e && e.message}`, 500);
      }
      await log(db, editor, 'CHANGE_ADD', date, change.slice(0, 120));
      return json({ ok: true });
    }

    // ── PUT /api/admin/changes (edit a Recent Changes line) ────
    if (method === 'PUT' && path === '/api/admin/changes') {
      const editor = await authed(req, db);
      if (!editor) return err('Unauthorized', 401);
      const { id, date, change } = await req.json();
      if (!id) return err('id required');
      if (!date || !change) return err('date and change required');
      await db.prepare('UPDATE recent_changes SET date = ?, change = ? WHERE id = ?')
        .bind(date, change, id).run();
      await log(db, editor, 'CHANGE_EDIT', String(id), `${date} — ${change.slice(0, 100)}`);
      return json({ ok: true });
    }

    // ── POST /api/admin/changes/reorder ────────────────────────
    // body {ids: [...]} — sort_order becomes the array index.
    if (method === 'POST' && path === '/api/admin/changes/reorder') {
      const editor = await authed(req, db);
      if (!editor) return err('Unauthorized', 401);
      const { ids } = await req.json();
      if (!Array.isArray(ids) || !ids.length) return err('ids array required');
      const stmt = db.prepare('UPDATE recent_changes SET sort_order = ? WHERE id = ?');
      await db.batch(ids.map((id, i) => stmt.bind(i, id)));
      await log(db, editor, 'CHANGE_REORDER', `${ids.length} entries`);
      return json({ ok: true });
    }

    // ── DELETE /api/admin/changes/:id ──────────────────────────
    const delChangeMatch = path.match(/^\/api\/admin\/changes\/(\d+)$/);
    if (method === 'DELETE' && delChangeMatch) {
      const editor = await authed(req, db);
      if (!editor) return err('Unauthorized', 401);
      const id = delChangeMatch[1];
      const row = await db.prepare('SELECT * FROM recent_changes WHERE id = ?').bind(id).first();
      await db.prepare('DELETE FROM recent_changes WHERE id = ?').bind(id).run();
      await log(db, editor, 'CHANGE_DELETE', id, row ? row.date : '', row);
      return json({ ok: true });
    }

    // ── PUT /api/config ────────────────────────────────────────
    if (method === 'PUT' && path === '/api/config') {
      const editor = await authed(req, db);
      if (!editor) return err('Unauthorized', 401);
      const body = await req.json();
      for (const [key, value] of Object.entries(body)) {
        const existing = await db.prepare('SELECT key FROM config WHERE key = ?').bind(key).first();
        if (existing) {
          await db.prepare('UPDATE config SET value = ? WHERE key = ?')
            .bind(JSON.stringify(value), key).run();
        } else {
          await db.prepare('INSERT INTO config (key, value) VALUES (?, ?)')
            .bind(key, JSON.stringify(value)).run();
        }
        await log(db, editor, 'CONFIG_UPDATE', key);
      }
      return json({ ok: true });
    }

    // ── PATCH /api/editors ─────────────────────────────────────
    // FIX: match on editor_name, not name.
    // `newName` renames the editor in place: the row (and therefore key_hash) is
    // kept, so the editor's existing API key keeps working and nothing they have
    // filled in is reset. Omit `newName` to only change role/link.
    if (method === 'PATCH' && path === '/api/editors') {
      const editor = await authed(req, db);
      if (!editor) return err('Unauthorized', 401);
      const { name, newName, role, link } = await req.json();
      if (!name) return err('name required');
      const current = await db.prepare('SELECT id FROM editor_keys WHERE editor_name = ?').bind(name).first();
      if (!current) return err(`Editor "${name}" not found`, 404);

      const renamed = typeof newName === 'string' && newName.trim() && newName.trim() !== name;
      if (renamed) {
        const clash = await db.prepare('SELECT id FROM editor_keys WHERE editor_name = ?')
          .bind(newName.trim()).first();
        if (clash) return err(`Editor "${newName.trim()}" already exists`);
      }
      const finalName = renamed ? newName.trim() : name;

      await db.prepare('UPDATE editor_keys SET editor_name = ?, role = ?, link = ? WHERE id = ?')
        .bind(finalName, role || 'mod', link || '', current.id).run();
      await log(db, editor, 'EDITOR_UPDATE', name, renamed ? `renamed to ${finalName}, role=${role}` : `role=${role}`);
      return json({ ok: true, name: finalName });
    }

    // ── POST /api/editors/reorder ──────────────────────────────
    // body {names: [...]} in the order they should appear on the site.
    // The List Editors list is manually ordered, never alphabetical.
    if (method === 'POST' && path === '/api/editors/reorder') {
      const editor = await authed(req, db);
      if (!editor) return err('Unauthorized', 401);
      const { names } = await req.json();
      if (!Array.isArray(names) || !names.length) return err('names array required');
      const stmt = db.prepare('UPDATE editor_keys SET sort_order = ? WHERE editor_name = ?');
      try {
        await db.batch(names.map((n, i) => stmt.bind(i, n)));
      } catch (e) {
        // Almost always the migration not having been run — say so plainly instead
        // of surfacing a raw SQLite message in the admin panel.
        if (/sort_order/.test(String(e && e.message))) {
          return err('Editor ordering needs the sort_order column. Run scripts/schema-migrations.sql on the D1 database first.', 500);
        }
        throw e;
      }
      await log(db, editor, 'EDITOR_REORDER', `${names.length} editors`);
      return json({ ok: true });
    }

    // ── DELETE /api/editors/:name ──────────────────────────────
    // FIX: match on editor_name, not name.
    const delEditorMatch = path.match(/^\/api\/editors\/(.+)$/);
    if (method === 'DELETE' && delEditorMatch) {
      const editor = await authed(req, db);
      if (!editor) return err('Unauthorized', 401);
      const name = decodeURIComponent(delEditorMatch[1]);
      // The row carries key_hash, so undoing this restores the editor's API key
      // as well as their name. The panel says so on the button.
      const row = await db.prepare('SELECT * FROM editor_keys WHERE editor_name = ?').bind(name).first();
      // Deleting nobody used to report success and write an audit line with
      // nothing behind it, which then offered an undo that could not run.
      if (!row) return err('Not found', 404);
      await db.prepare('DELETE FROM editor_keys WHERE editor_name = ?').bind(name).run();
      await log(db, editor, 'EDITOR_DELETE', name, `role=${row.role}`, row);
      return json({ ok: true });
    }

    // ── POST /api/admin/bootstrap ──────────────────────────────
    // FIX: insert into editor_name, not name.
    if (method === 'POST' && path === '/api/admin/bootstrap') {
      const body = await req.json();
      const { secret, name, key, role, link } = body;
      if (secret !== env.BOOTSTRAP_SECRET) return err('Forbidden', 403);
      const hash = await sha256(key);
      await insertEditor(db, name || 'admin', hash, role || 'admin', link || '');
      return json({ ok: true });
    }

    // ── POST /api/admin/add-key ────────────────────────────────
    // FIX: select/insert using editor_name, not name.
    if (method === 'POST' && path === '/api/admin/add-key') {
      const editor = await authed(req, db);
      if (!editor) return err('Unauthorized', 401);
      const { name, key, role, link } = await req.json();
      if (!name || !key) return err('name and key required');
      const hash = await sha256(key);
      const existing = await db.prepare('SELECT editor_name FROM editor_keys WHERE editor_name = ?').bind(name).first();
      if (existing) return err(`Editor "${name}" already exists`);
      await insertEditor(db, name, hash, role || 'mod', link || '');
      await log(db, editor, 'EDITOR_ADD', name, `role=${role || 'mod'}`);
      return json({ ok: true });
    }

    return err('Not found', 404);
}

export default {
  async fetch(req, env) {
    // Any uncaught throw (a SQLite error, a bad JSON body, …) would otherwise
    // return Cloudflare's own 500 page, which carries NO CORS headers — the
    // browser then blocks the response and fetch() rejects, so the admin panel
    // showed a misleading "Network error" instead of the real cause. Wrapping the
    // router keeps every failure a proper CORS-enabled JSON error.
    try {
      return await handle(req, env);
    } catch (e) {
      if (e instanceof RateLimited) {
        return new Response(
          JSON.stringify({ error: `Too many attempts. Try again in about ${Math.ceil(e.retryAfter / 60)} minute(s).` }),
          { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(e.retryAfter), ...CORS } }
        );
      }
      return json({ error: `Server error: ${e && e.message ? e.message : String(e)}` }, 500);
    }
  },
};
