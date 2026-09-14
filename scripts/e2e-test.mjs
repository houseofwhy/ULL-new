// End-to-end smoke test: serves the real site, proxies /api/* to the real
// worker/worker.js backed by an in-memory SQLite DB carrying the live D1 schema,
// then drives the home page and admin panel in Chromium.
//
// Covers: the Recent Changes feed + its admin CRUD, manual editor ordering,
// renaming an editor without revoking their key, the X (@ull_gd) links, and
// saving a level from the admin panel (the "network error" regression).
//
// Requires Node 22+ (node:sqlite) and, in the directory you run it from:
//   npm i playwright vue@3.2.31 vue-router@4.0.14
// Run:  node scripts/e2e-test.mjs
// Set CHROMIUM_PATH if your Chromium isn't at the Playwright default below.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import worker from '../worker/worker.js';

const ROOT = new URL('..', import.meta.url).pathname;
const db = new DatabaseSync(':memory:');
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
const runSql = (file) => {
  const text = readFileSync(file, 'utf8').split('\n').filter(l => !l.trim().startsWith('--')).join('\n');
  for (const s of text.split(';').map(x => x.trim()).filter(Boolean)) {
    try { db.exec(s); } catch (e) { if (!/duplicate column/.test(e.message)) throw e; }
  }
};
runSql(join(ROOT, 'scripts/schema-migrations.sql'));
runSql(join(ROOT, 'scripts/seed-recent-changes.sql'));

const D1 = {
  prepare(sql) {
    const mk = (params) => ({
      bind: (...p) => mk(p),
      async all() { return { results: db.prepare(sql).all(...params) }; },
      async first() { return db.prepare(sql).get(...params) ?? null; },
      async run() { return db.prepare(sql).run(...params); },
    });
    return mk([]);
  },
  async batch(stmts) { for (const s of stmts) await s.run(); return []; },
};
const env = { DB: D1, BOOTSTRAP_SECRET: 'boot' };
const KEY = 'admin-key';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon' };

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const wres = await worker.fetch(
      new Request('http://localhost' + req.url, { method: req.method, headers: req.headers, body }), env);
    res.writeHead(wres.status, Object.fromEntries(wres.headers));
    res.end(Buffer.from(await wres.arrayBuffer()));
    return;
  }
  let file = join(ROOT, normalize(url.pathname));
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(ROOT, 'index.html'); // SPA fallback
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise(r => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

// Seed editors through the API so hashing matches.
await worker.fetch(new Request(base + '/api/admin/bootstrap', { method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ secret: 'boot', name: 'QwidziT', key: KEY, role: 'owner', link: '' }) }), env);
for (const [n, r] of [['exiled_shade', 'admin'], ['Keres', 'seniormod'], ['Prometheus', 'dev']]) {
  await worker.fetch(new Request(base + '/api/admin/add-key', { method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ name: n, key: 'k-' + n, role: r, link: '' }) }), env);
}

await worker.fetch(new Request(base + '/api/levels', { method: 'PUT',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
  body: JSON.stringify({ path: 'aeternus', name: 'Aeternus', author: 'Riot', creators: ['Riot'],
    verifier: 'Open Verification', verification: '', showcase: '', thumbnail: null, frameCounter: null,
    id: '102647436', rating: 1, length: 77, percentToQualify: 17, percentFinished: 100,
    lastUpd: '10.04.2026', tags: ['Public'], records: [], run: [],
    isVerified: false, isMain: true, isFuture: false, benchmark: false, insertAt: 1 }) }), env);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let pass = 0, fail = 0;
const check = (l, c, x = '') => c ? (pass++, console.log(`  ok   ${l}`)) : (fail++, console.log(`  FAIL ${l} ${x}`));

const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
// Serve the CDN deps (Vue, Vue Router) from node_modules — no outbound network here.
const CDN = {
  'https://cdn.jsdelivr.net/npm/vue@3.2.31/dist/vue.global.js': 'node_modules/vue/dist/vue.global.js',
  'https://cdn.jsdelivr.net/npm/vue-router@4.0.14/dist/vue-router.global.prod.js': 'node_modules/vue-router/dist/vue-router.global.prod.js',
};
for (const [url, file] of Object.entries(CDN)) {
  await ctx.route(url, route => route.fulfill({
    status: 200, contentType: 'text/javascript',
    body: readFileSync(file, 'utf8'),
  }));
}
// Fonts / icon CSS aren't reachable either — stub them so they don't log errors.
await ctx.route('https://cdnjs.cloudflare.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
await ctx.route('https://fonts.gstatic.com/**', r => r.fulfill({ status: 200, body: '' }));

// The frontend hard-codes the production API host; point it at the local worker.
await ctx.route('https://d1-wrkr.ullteam.workers.dev/**', async (route) => {
  const r = route.request();
  const wres = await worker.fetch(
    // Keep the query string: the audit log is paged with ?limit/&before, and
    // dropping it here silently served page one for every request.
    new Request(base + new URL(r.url()).pathname + new URL(r.url()).search, {
      method: r.method(), headers: r.headers(), body: r.postData() ?? undefined,
    }), env);
  await route.fulfill({
    status: wres.status,
    headers: Object.fromEntries(wres.headers),
    body: Buffer.from(await wres.arrayBuffer()),
  });
});
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', e => errors.push(String(e)));
p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
p.on('dialog', d => d.accept());

console.log('\n── home page ──');
await p.goto(base + '/', { waitUntil: 'networkidle' });
await p.waitForSelector('.home-change', { timeout: 5000 });
const dates = await p.$$eval('.home-changes-date', els => els.map(e => e.textContent.trim()));
check('recent changes render, newest first',
  dates[0] === 'August 23, 2026' && dates.length === 3, JSON.stringify(dates));
check('change text is bolded', (await p.$$eval('.home-change strong', e => e.length)) > 0);
// The home page draws each editor as one .home-editor chip (an <a> when they
// have a link, a <span> when they do not). This used to look for .info-editor,
// a class the Information page dropped when it became a hub — so the list came
// back empty and the check had been silently failing.
const homeEditors = await p.$$eval('.home-editor', els => els.map(e => e.textContent.trim()));
check('editors are in DB order, not alphabetical',
  homeEditors.join(',') === 'QwidziT,exiled_shade,Keres,Prometheus', JSON.stringify(homeEditors));
const xLinks = await p.$$eval('a[href="https://x.com/ull_gd"]', els => els.length);
check('X (@ull_gd) links present on home', xLinks >= 2, `found ${xLinks}`);
check('no Telegram text anywhere on home', !(await p.content()).includes('Telegram'));

console.log('\n── admin: log in ──');
await p.goto(base + '/admin', { waitUntil: 'networkidle' });
await p.waitForSelector('.admin-login-input');
await p.fill('.admin-login-input', KEY);
await p.click('.admin-login-btn');
await p.waitForSelector('.admin-tabs', { timeout: 5000 });
check('logged in', await p.$('.admin-tabs') !== null);

console.log('\n── admin: editors tab ──');
await p.click('.admin-tab:has-text("Editors")');
await p.waitForSelector('.admin-table tbody tr');
const names = () => p.$$eval('.admin-table tbody tr td:nth-child(3)', els => els.map(e => e.textContent.trim()));
check('editors listed in order', (await names()).join(',') === 'QwidziT,exiled_shade,Keres,Prometheus');

// Move "Keres" up one.
await p.click('.admin-table tbody tr:nth-child(3) button[title="Move up"]');
await p.waitForFunction(() =>
  [...document.querySelectorAll('.admin-table tbody tr td:nth-child(3)')][1].textContent.trim() === 'Keres');
check('move up reorders the table', (await names()).join(',') === 'QwidziT,Keres,exiled_shade,Prometheus');
const persisted = await (await fetch(base + '/api/editors')).json();
check('order persisted to the API',
  persisted.map(e => e.name).join(',') === 'QwidziT,Keres,exiled_shade,Prometheus', JSON.stringify(persisted.map(e => e.name)));

console.log('\n── admin: rename an editor ──');
const hashBefore = db.prepare("SELECT key_hash FROM editor_keys WHERE editor_name='Keres'").get().key_hash;
await p.click('.admin-table tbody tr:nth-child(2) button:has-text("Edit")');
await p.waitForSelector('.admin-edit-modal');
await p.fill('.admin-edit-modal input[type="text"]', 'KeresGD');
await p.click('.admin-edit-modal .admin-edit-footer button:has-text("Save")');
await p.waitForFunction(() => !document.querySelector('.admin-edit-modal'));
check('rename shows in the table', (await names()).join(',') === 'QwidziT,KeresGD,exiled_shade,Prometheus', JSON.stringify(await names()));
const after = db.prepare("SELECT key_hash FROM editor_keys WHERE editor_name='KeresGD'").get();
check('renamed editor keeps their API key', after && after.key_hash === hashBefore);
check('renamed editor keeps their position',
  (await (await fetch(base + '/api/editors')).json())[1].name === 'KeresGD');

console.log('\n── admin: recent changes tab ──');
await p.click('.admin-tab:has-text("Recent Changes")');
await p.waitForSelector('.admin-table tbody tr');
const SEEDED = JSON.parse(readFileSync(join(ROOT, 'data/_recentChanges.json'), 'utf8'))
  .reduce((n, g) => n + g.entries.length, 0);
const rowCount = await p.$$eval('.admin-table tbody tr', e => e.length);
check(`all ${SEEDED} seeded change lines listed`, rowCount === SEEDED, `got ${rowCount}`);

// Add a backdated entry at the bottom.
const card = '.admin-card:has-text("Add Change")';
await p.fill(`${card} input[type="date"]`, '2025-12-25');
await p.waitForFunction(() =>
  document.querySelector('.admin-card input[placeholder^="e.g. April"]').value === 'December 25, 2025');
check('date picker fills the free-text date field as a past date', true);
await p.fill(`${card} input[placeholder^="**Level**"]`, '**Test Level** has been placed at #1');
await p.selectOption(`${card} select`, 'bottom');
await p.click(`${card} button:has-text("Add Change")`);
await p.waitForFunction((n) => document.querySelectorAll('.admin-table tbody tr').length === n, SEEDED + 1);
const lastRow = await p.$$eval('.admin-table tbody tr td:nth-child(3)', e => e.map(x => x.textContent.trim()));
check('backdated entry added at the bottom', lastRow[SEEDED] === 'December 25, 2025', JSON.stringify(lastRow.slice(-2)));

// Edit it.
await p.click(`.admin-table tbody tr:nth-child(${SEEDED + 1}) button:has-text("Edit")`);
await p.waitForSelector('.admin-edit-modal');
await p.fill('.admin-edit-modal input[type="text"]:not([placeholder^="e.g."])', '**Test Level** has been placed at #7');
await p.click('.admin-edit-modal .admin-edit-footer button:has-text("Save")');
await p.waitForFunction(() => !document.querySelector('.admin-edit-modal'));
const feed = await (await fetch(base + '/api/recent-changes')).json();
check('edit persisted to the feed', feed[feed.length - 1].entries[0].includes('#7'), JSON.stringify(feed[feed.length - 1]));
check('feed still groups by date', feed.length === 4 && feed[0].date === 'August 23, 2026',
  JSON.stringify(feed.map(g => g.date)));

// Move it up, then delete it.
await p.click(`.admin-table tbody tr:nth-child(${SEEDED + 1}) button[title="Move up"]`);
await p.waitForFunction((n) =>
  [...document.querySelectorAll('.admin-table tbody tr td:nth-child(3)')][n - 1].textContent.trim() === 'December 25, 2025', SEEDED);
check('move up reorders changes', true);
await p.click(`.admin-table tbody tr:nth-child(${SEEDED}) button:has-text("Delete")`);
await p.waitForFunction((n) => document.querySelectorAll('.admin-table tbody tr').length === n, SEEDED);
check('delete removes the change', (await (await fetch(base + '/api/admin/changes', {
  headers: { Authorization: `Bearer ${KEY}` } })).json()).length === SEEDED);

console.log('\n── admin: saving a level (the reported bug) ──');
await p.click('.admin-tab:has-text("Levels")');
await p.waitForSelector('.admin-row--clickable', { timeout: 10000 });
await p.click('.admin-row--clickable');
await p.waitForSelector('.admin-edit-modal');
await p.fill('.admin-edit-modal input[type="number"][max="100"]', '42');
const dialogs = [];
p.on('dialog', d => dialogs.push(d.message()));
await p.click('.admin-edit-footer button:has-text("Save Changes")');
await p.waitForFunction(() => !document.querySelector('.admin-edit-modal'), { timeout: 5000 });
check('level save produced no error dialog', dialogs.length === 0, JSON.stringify(dialogs));
const saved = db.prepare("SELECT percentToQualify FROM levels WHERE path='aeternus'").get();
check('level save persisted', saved.percentToQualify === 42, JSON.stringify(saved));

console.log('\n── admin: add a new level ──');
await p.click('.admin-tab:has-text("Levels")');
await p.waitForSelector('.admin-btn--new');
const levelsBefore = (await (await fetch(base + '/api/list')).json()).length;
await p.click('.admin-btn--new');
await p.waitForSelector('.admin-edit-modal');
check('modal opens in create mode', (await p.textContent('.admin-edit-title')).trim() === 'Add Level');

// Everything blank except a name: the form must accept it.
await p.fill('.admin-edit-modal input[type="text"] >> nth=1', 'Brand New Level');
await p.waitForFunction(() =>
  document.querySelector('.admin-edit-modal input[placeholder="auto-filled from the name"]').value === 'brand new level');
check('path auto-fills from the name (matching the existing slug style)', true);
// Tags come from the checkbox list, not free text.
const tagBoxes = await p.$$('.admin-edit-tags input[type="checkbox"]');
check('tags are selectable from a list', tagBoxes.length === 13, `found ${tagBoxes.length}`);
await p.check('.admin-edit-tags input[value="Public"]');
await p.check('.admin-edit-tags input[value="XL"]');
await p.fill('.admin-edit-modal input[type="number"] >> nth=0', '2');   // position
await p.click('.admin-edit-footer button:has-text("Create Level")');
await p.waitForFunction(() => !document.querySelector('.admin-edit-modal'), { timeout: 8000 });

const levelsAfter = await (await fetch(base + '/api/list')).json();
check('level count went up by one', levelsAfter.length === levelsBefore + 1, `${levelsBefore} -> ${levelsAfter.length}`);
const made = levelsAfter.find(l => l.path === 'brand new level');
check('new level exists at the chosen position', !!made && levelsAfter.indexOf(made) === 1,
  made ? `index ${levelsAfter.indexOf(made)}` : 'not found');
check('blank fields got usable defaults', made &&
  made.name === 'Brand New Level' && made.id === 'private' && /^\d{2}\.\d{2}\.\d{4}$/.test(made.lastUpd) &&
  made.rating === 1 && made.percentToQualify === 1, JSON.stringify(made && {
    name: made.name, id: made.id, lastUpd: made.lastUpd, rating: made.rating, ptq: made.percentToQualify }));
check('tags saved from the checkbox list', made && made.tags.join(',') === 'Public,XL', JSON.stringify(made && made.tags));
check('empty records/runs use the sentinel', made &&
  made.records.length === 1 && made.records[0].user === 'none' &&
  made.run.length === 1 && made.run[0].user === 'none');
check('success notice shown', (await p.textContent('.admin-notice')).includes('Brand New Level'));

console.log('\n── add-level guards ──');
await p.click('.admin-btn--new');
await p.waitForSelector('.admin-edit-modal');
await p.fill('.admin-edit-modal input[type="text"] >> nth=1', 'Brand New Level');
await p.waitForFunction(() => {
  const b = [...document.querySelectorAll('.admin-edit-footer button')].find(x => x.textContent.includes('Create Level'));
  return b && b.disabled;
});
check('duplicate path blocks Create (would overwrite otherwise)', true);
await p.click('.admin-edit-footer button:has-text("Cancel")');
check('cancel closes the modal', await p.$('.admin-edit-modal') === null);
// Editing an existing level must still say "Edit Level".
await p.click('.admin-row--clickable');
await p.waitForSelector('.admin-edit-modal');
check('clicking a row still opens edit mode', (await p.textContent('.admin-edit-title')).trim() === 'Edit Level');
await p.click('.admin-edit-footer button:has-text("Cancel")');

console.log('\n── add forms sit at the top ──');
for (const [tab, title] of [['Pending', 'Add Pending Entry'], ['Recent Changes', 'Add Change']]) {
  await p.click(`.admin-tab:has-text("${tab}")`);
  await p.waitForSelector('.admin-card');
  // The list renders as a table, or as an empty-state div when there is nothing
  // in it yet — the Add card must come before whichever one is showing.
  const order = await p.evaluate(() => {
    const card = document.querySelector('.admin-card');
    const list = document.querySelector('.admin-table, .admin-empty');
    if (!card || !list) return 'missing';
    return card.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING ? 'card-first' : 'list-first';
  });
  check(`${tab}: "${title}" is above the list`, order === 'card-first', String(order));
  check(`${tab}: the Add card is really "${title}"`,
    (await p.textContent('.admin-card-title')).trim() === title);
}

console.log('\n── admin: the whole audit log, not the last hundred ──');
// 120 writes, so a page of 100 cannot hold them and the old cap would hide the rest.
for (let i = 0; i < 120; i++) {
  await worker.fetch(new Request(base + '/api/config', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ e2eProbe: String(i) }),
  }), env);
}
await p.click('.admin-tab:has-text("Audit Log")');
await p.waitForSelector('.admin-table tbody tr');
const auditRows = () => p.$$eval('.admin-table tbody tr', e => e.length);
check('a page is 100 rows', await auditRows() === 100, String(await auditRows()));
const shown = await p.textContent('.admin-count');
check('the panel says how many there are in total', /of\s[\d,]+/.test(shown), shown);
check('and offers the rest', await p.$('.admin-more button') !== null);
await p.click('.admin-more button');
await p.waitForFunction(() => document.querySelectorAll('.admin-table tbody tr').length > 100);
check('loading more appends older entries', await auditRows() > 100, String(await auditRows()));

console.log('\n── admin: who did how much ──');
check('the activity panel is there', await p.$('.admin-activity') !== null);
const cells = await p.$$eval('.admin-activity__cell .admin-activity__who', e => e.map(x => x.textContent.trim()));
check('it names the editors who wrote', cells.includes('QwidziT'), JSON.stringify(cells));
const topCount = await p.textContent('.admin-activity__cell .admin-activity__n');
check('with a count each', Number(topCount.replace(/\D/g, '')) > 100, topCount);
await p.click('.admin-activity__cell');
await p.waitForFunction(() => document.querySelectorAll('.admin-table tbody tr').length <= 100);
check('clicking one filters the log to that editor',
  (await p.$$eval('.admin-table tbody tr td:nth-child(2)', e => [...new Set(e.map(x => x.textContent.trim()))])).length === 1);
await p.click('.admin-activity__cell.is-on');
await p.waitForTimeout(400);

console.log('\n── admin: a deletion can be put back ──');
// Delete a change line through the panel, then undo it from the log.
await p.click('.admin-tab:has-text("Recent Changes")');
await p.waitForSelector('.admin-table tbody tr');
const changesBefore = await p.$$eval('.admin-table tbody tr', e => e.length);
await p.click('.admin-table tbody tr:nth-child(1) button:has-text("Delete")');
await p.waitForFunction((n) => document.querySelectorAll('.admin-table tbody tr').length === n, changesBefore - 1);
check('the change is gone', await p.$$eval('.admin-table tbody tr', e => e.length) === changesBefore - 1);

await p.click('.admin-tab:has-text("Audit Log")');
await p.waitForSelector('.admin-table tbody tr');
check('the deletion offers a Put back button',
  await p.$('.admin-table tbody tr:nth-child(1) button:has-text("Put back")') !== null);
await p.click('.admin-table tbody tr:nth-child(1) button:has-text("Put back")');
await p.waitForFunction(() =>
  document.querySelector('.admin-table tbody tr:nth-child(2)')?.textContent.includes('undone')
  || [...document.querySelectorAll('.admin-table tbody tr')].some(r => r.textContent.includes('undone')));
check('the log marks it undone', (await p.textContent('.admin-table')).includes('undone'));
await p.click('.admin-tab:has-text("Recent Changes")');
await p.waitForSelector('.admin-table tbody tr');
check('and the change is back',
  await p.$$eval('.admin-table tbody tr', e => e.length) === changesBefore,
  String(await p.$$eval('.admin-table tbody tr', e => e.length)));

console.log('\n── admin: restoring the list to an earlier state ──');
await p.click('.admin-tab:has-text("Snapshots")');
await p.waitForSelector('.admin-table tbody tr, .admin-empty');
check('the day of writes left a snapshot to restore to',
  await p.$$eval('.admin-table tbody tr', e => e.length) >= 1);
check('it is labelled with the day it stands for',
  /\d{4}-\d{2}-\d{2}/.test(await p.textContent('.admin-table tbody tr:nth-child(1)')));
const levelCount = async () => (await (await fetch(base + '/api/list')).json()).length;
const liveNow = await levelCount();
check('there are levels to lose', liveNow > 0, String(liveNow));

// The oldest snapshot is the automatic one, taken before the very first write
// of the day — when the list was still empty. Restoring it should empty it.
const oldestRow = await p.$$eval('.admin-table tbody tr', rows => rows.length);
await p.click(`.admin-table tbody tr:nth-child(${oldestRow}) button:has-text("Restore")`);
await p.waitForFunction((n) => document.querySelectorAll('.admin-table tbody tr').length > n, oldestRow);
check('restoring really puts the list back to that state', await levelCount() === 0, String(await levelCount()));
check('and leaves a way back', (await p.textContent('.admin-table')).includes('Before restoring to'));

// The way back: the point the restore left behind carries everything that was
// live a moment ago, including today's edits.
const backRow = await p.evaluate(() => {
  const rows = [...document.querySelectorAll('.admin-table tbody tr')];
  return rows.findIndex(r => r.textContent.includes('Before restoring to')) + 1;
});
await p.click(`.admin-table tbody tr:nth-child(${backRow}) button:has-text("Restore")`);
await p.waitForFunction((n) => document.querySelectorAll('.admin-table tbody tr').length > n, oldestRow + 1);
check('going back returns every level that was live', await levelCount() === liveNow,
  `${await levelCount()} vs ${liveNow}`);

if (process.env.E2E_SHOTS) {
  const dir = process.env.E2E_SHOTS;
  await p.click('.admin-tab:has-text("Audit Log")');
  await p.waitForSelector('.admin-activity');
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${dir}/admin-audit.png` });
  await p.click('.admin-tab:has-text("Snapshots")');
  await p.waitForSelector('.admin-table tbody tr, .admin-empty');
  await p.waitForTimeout(400);   // let the tab underline finish its transition
  await p.screenshot({ path: `${dir}/admin-snapshots.png` });
}

console.log('\n── console health ──');
const real = errors.filter(e => !/favicon|404 \(Not Found\)/i.test(e));
check('no page errors', real.length === 0, real.slice(0, 3).join(' | '));

await browser.close();
server.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
