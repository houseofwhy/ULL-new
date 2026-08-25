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
async function authed(req, db) {
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

async function log(db, editor, action, target, details = '') {
  try {
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

async function handle(req, env) {
    const db = env.DB;
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    if (method === 'OPTIONS') return new Response(null, { headers: CORS });

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
    if (method === 'GET' && path === '/api/audit-log') {
      const editor = await authed(req, db);
      if (!editor) return err('Unauthorized', 401);
      const { results } = await db.prepare(
        'SELECT * FROM audit_log ORDER BY id DESC LIMIT 100'
      ).all();
      return json(results);
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

    // ── GET /api/leaderboard ───────────────────────────────────
    if (method === 'GET' && path === '/api/leaderboard') {
      const { results } = await db.prepare(
        'SELECT * FROM leaderboard ORDER BY score DESC'
      ).all();
      return json(results);
    }

    // ── GET /api/upcoming ──────────────────────────────────────
    if (method === 'GET' && path === '/api/upcoming') {
      const { results } = await db.prepare(
        'SELECT * FROM upcoming ORDER BY sort_order ASC'
      ).all();
      return json(results.map(r => ({ ...r, tags: tryJSON(r.tags, []) })));
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
      const row = await db.prepare('SELECT sort_order, name FROM levels WHERE path = ?').bind(lpath).first();
      if (!row) return err('Not found', 404);
      await db.prepare('DELETE FROM levels WHERE path = ?').bind(lpath).run();
      await db.prepare('UPDATE levels SET sort_order = sort_order - 1 WHERE sort_order > ?').bind(row.sort_order).run();
      await log(db, editor, 'DELETE', lpath, row.name);
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
      await db.prepare('DELETE FROM pending WHERE id = ?').bind(id).run();
      await log(db, editor, 'PENDING_DELETE', id);
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
      await db.prepare('DELETE FROM recent_changes WHERE id = ?').bind(id).run();
      await log(db, editor, 'CHANGE_DELETE', id);
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
      await db.prepare('DELETE FROM editor_keys WHERE editor_name = ?').bind(name).run();
      await log(db, editor, 'EDITOR_DELETE', name);
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
