// Drives the real list pages in Chromium against a seeded 40-level list, checking:
//   - benchmark mode RECOUNTS placements instead of leaving gaps in the numbering,
//   - the benchmark placement ignores the search box (it is a view, not a filter),
//   - Reset Filters leaves benchmark mode alone,
//   - the Return to top button appears past ~10 rows, sits in the list column, and works,
//   - mobile matches, with Main/Future numbering themselves rather than inheriting
//     All Levels' placements.
//
// Requires playwright in the directory you run from:  npm i playwright vue@3.2.31 vue-router@4.0.14
// Run:  node js/list-ui.test.mjs
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import worker from '../worker/worker.js';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = process.env.OUT_DIR || process.cwd();
const db = new DatabaseSync(':memory:');
db.exec(`
CREATE TABLE levels (path TEXT PRIMARY KEY, name TEXT NOT NULL, author TEXT, verifier TEXT,
  verification TEXT, showcase TEXT, thumbnail TEXT, id TEXT, percentToQualify INTEGER,
  percentFinished INTEGER, length INTEGER, rating REAL, lastUpd TEXT, isVerified INTEGER DEFAULT 0,
  tags TEXT, records TEXT, run TEXT, sort_order INTEGER, isMain INTEGER DEFAULT 0,
  isFuture INTEGER DEFAULT 0, creators TEXT, frameCounter TEXT, benchmark INTEGER DEFAULT 0);
CREATE TABLE editor_keys (id INTEGER PRIMARY KEY AUTOINCREMENT, editor_name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE, role TEXT DEFAULT 'mod', link TEXT DEFAULT '', sort_order INTEGER DEFAULT 0);
CREATE TABLE pending (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, placement TEXT NOT NULL,
  link TEXT, sort_order INTEGER, indefinite INTEGER DEFAULT 0);
CREATE TABLE config (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE recent_changes (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, change TEXT NOT NULL, sort_order INTEGER);
CREATE TABLE audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, editor_name TEXT, action TEXT,
  target TEXT, details TEXT, timestamp TEXT DEFAULT CURRENT_TIMESTAMP);
`);

// 40 levels. Every 3rd is verified; half of those are benchmarks. That gives a
// mix where "skip" and "recount" numbering visibly disagree.
const LEVELS = [];
for (let i = 1; i <= 40; i++) {
  const verified = i % 3 === 0;
  const benchmark = verified && i % 6 === 0;
  LEVELS.push({ i, name: `Level ${String(i).padStart(2, '0')}`, verified, benchmark });
}
const ins = db.prepare(`INSERT INTO levels (path,name,author,verifier,verification,showcase,thumbnail,id,
  percentToQualify,percentFinished,length,rating,lastUpd,isVerified,tags,records,run,sort_order,isMain,isFuture,
  creators,frameCounter,benchmark) VALUES (?,?,?,?,'','','','private',1,50,60,1,'01.08.2026',?,'[]',?,?,?,1,1,'[]',NULL,?)`);
const none = JSON.stringify([{ user: 'none', link: '', percent: 0, hz: 0 }]);
const noneRun = JSON.stringify([{ user: 'none', link: '', percent: '0', hz: 0 }]);
LEVELS.forEach(l => ins.run(l.name.toLowerCase(), l.name, 'Author', 'Verifier',
  l.verified ? 1 : 0, none, noneRun, l.i, l.benchmark ? 1 : 0));

const D1 = { prepare(sql) { const mk = (p) => ({ bind: (...a) => mk(a),
    async all() { return { results: db.prepare(sql).all(...p) }; },
    async first() { return db.prepare(sql).get(...p) ?? null; },
    async run() { return db.prepare(sql).run(...p); } }); return mk([]); },
  async batch(st) { for (const s of st) await s.run(); return []; } };
const env = { DB: D1, BOOTSTRAP_SECRET: 'boot' };

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon' };
const server = createServer((req, res) => {
  const u = new URL(req.url, 'http://l');
  let f = join(ROOT, normalize(u.pathname));
  if (!existsSync(f) || statSync(f).isDirectory()) f = join(ROOT, 'index.html');
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise(r => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 800 } });
for (const [u, f] of Object.entries({
  'https://cdn.jsdelivr.net/npm/vue@3.2.31/dist/vue.global.js': 'node_modules/vue/dist/vue.global.js',
  'https://cdn.jsdelivr.net/npm/vue-router@4.0.14/dist/vue-router.global.prod.js': 'node_modules/vue-router/dist/vue-router.global.prod.js',
})) await ctx.route(u, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(f, 'utf8') }));
await ctx.route('https://cdnjs.cloudflare.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
await ctx.route('https://fonts.gstatic.com/**', r => r.fulfill({ status: 200, body: '' }));
await ctx.route('https://d1-wrkr.ullteam.workers.dev/**', async (route) => {
  const rq = route.request();
  const w = await worker.fetch(new Request(base + new URL(rq.url()).pathname,
    { method: rq.method(), headers: rq.headers(), body: rq.postData() ?? undefined }), env);
  await route.fulfill({ status: w.status, headers: Object.fromEntries(w.headers), body: Buffer.from(await w.arrayBuffer()) });
});
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', e => errors.push(String(e)));
p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

let pass = 0, fail = 0;
const check = (l, c, x = '') => c ? (pass++, console.log(`  ok   ${l}`)) : (fail++, console.log(`  FAIL ${l} ${x}`));

// Visible rows as [rank, name]
const visible = () => p.$$eval('.list tr:not(.level-hidden)', rows => rows.map(r => [
  r.querySelector('.rank p')?.textContent.trim(),
  r.querySelector('.level-info .type-label-lg')?.textContent.trim(),
]));

await p.goto(base + '/list', { waitUntil: 'networkidle' });
await p.waitForSelector('.list tr');

console.log('\n── normal mode ──');
let rows = await visible();
check('all 40 levels shown', rows.length === 40, String(rows.length));
check('numbered 1..40 with no gaps',
  rows.every((r, i) => r[0] === `#${i + 1}`), JSON.stringify(rows.slice(0, 5)));

console.log('\n── benchmark mode ──');
await p.click('.sidebar__settings-btn');
await p.waitForSelector('.settings-popup');
await p.click('.settings-popup__item:has-text("Benchmark Mode") .settings-popup__toggle-btn:has-text("ON")');
await p.click('.settings-overlay', { position: { x: 5, y: 5 } });
await p.waitForFunction(() => document.querySelectorAll('.list tr:not(.level-hidden)').length < 40);
rows = await visible();

const expected = LEVELS.filter(l => !l.verified || l.benchmark);
check('hides verified non-benchmark levels', rows.length === expected.length,
  `${rows.length} vs expected ${expected.length}`);
check('shows the right levels',
  rows.map(r => r[1]).join(',') === expected.map(l => l.name).join(','),
  JSON.stringify(rows.map(r => r[1]).slice(0, 6)));
check('placements are RECOUNTED 1..N with no gaps',
  rows.every((r, i) => r[0] === `#${i + 1}`),
  'got ' + JSON.stringify(rows.map(r => r[0]).slice(0, 8)));
// The old behaviour would have shown the original indices, e.g. #1 #2 #4 #5 #6 #7 #8 #10
const oldNumbering = expected.map(l => `#${l.i}`);
check('numbering actually differs from the old skip behaviour',
  rows.map(r => r[0]).join(',') !== oldNumbering.join(','),
  `old would be ${oldNumbering.slice(0, 8).join(',')}`);
console.log(`     recounted: ${rows.map(r => r[0]).slice(0, 8).join(' ')} …`);
console.log(`     was:       ${oldNumbering.slice(0, 8).join(' ')} …`);

console.log('\n── benchmark rank ignores the search box ──');
await p.fill('.search-new', 'Level 12');
await p.waitForFunction(() => document.querySelectorAll('.list tr:not(.level-hidden)').length <= 3);
rows = await visible();
const idx12 = expected.findIndex(l => l.name === 'Level 12');
check('a searched level keeps its benchmark placement',
  rows.some(r => r[1] === 'Level 12' && r[0] === `#${idx12 + 1}`),
  JSON.stringify(rows));
await p.fill('.search-new', '');
await p.waitForFunction(() => document.querySelectorAll('.list tr:not(.level-hidden)').length > 3);

console.log('\n── Reset Filters keeps benchmark mode ──');
await p.click('.filters-btn');
await p.waitForSelector('.filters-popup');
await p.click('.filters-popup button:has-text("Reset")');
await p.waitForTimeout(300);
const stillOn = await p.evaluate(() => JSON.parse(localStorage.getItem('benchmarkMode') || 'false'));
const rowsAfter = await visible();
check('benchmark mode still ON after Reset Filters',
  rowsAfter.length === expected.length, `${rowsAfter.length} rows (expected ${expected.length})`);
check('the saved setting was not flipped to false', stillOn !== false, String(stillOn));

// And turning it off through the settings popup still works.
await p.keyboard.press('Escape');
await p.click('.filters-popup__close, .filters-popup button:has-text("Apply")').catch(() => {});
await p.waitForTimeout(200);
await p.click('.sidebar__settings-btn');
await p.waitForSelector('.settings-popup');
await p.click('.settings-popup__item:has-text("Benchmark Mode") .settings-popup__toggle-btn:has-text("OFF")');
await p.click('.settings-overlay', { position: { x: 5, y: 5 } });
await p.waitForFunction(() => document.querySelectorAll('.list tr:not(.level-hidden)').length === 40);
rows = await visible();
check('turning benchmark mode off restores 1..40',
  rows.length === 40 && rows.every((r, i) => r[0] === `#${i + 1}`));

console.log('\n── Return to top ──');
check('hidden before scrolling', await p.$('.scroll-top-btn') === null);
const rowH = await p.evaluate(() =>
  document.querySelector('.list tr:not(.level-hidden)').getBoundingClientRect().height);
const el = '.list-container-new';
// Just under ten rows: still hidden.
await p.evaluate(([sel, y]) => { document.querySelector(sel).scrollTop = y; }, [el, rowH * 9]);
await p.waitForTimeout(200);
check(`hidden at 9 rows of scroll (~${Math.round(rowH * 9)}px)`, await p.$('.scroll-top-btn') === null);
// Past ten rows: shown.
await p.evaluate(([sel, y]) => { document.querySelector(sel).scrollTop = y; }, [el, rowH * 11]);
await p.waitForSelector('.scroll-top-btn', { timeout: 3000 });
check(`appears past 10 rows (~${Math.round(rowH * 11)}px)`, true);
const box = await p.$eval('.scroll-top-btn', b => {
  const r = b.getBoundingClientRect();
  const col = document.querySelector('.list-container-new').getBoundingClientRect();
  return { bottomGap: innerHeight - r.bottom, insideColumn: r.left >= col.left && r.right <= col.right, w: r.width, h: r.height };
});
check('floats near the bottom of the viewport', box.bottomGap > 0 && box.bottomGap < 80, JSON.stringify(box));
check('stays inside the list column (not over the level pane)', box.insideColumn, JSON.stringify(box));
// Regression guard: the 0-height flex wrapper used to squash the button to a sliver.
check('is a full-height pill, not a sliver (>= 22px tall)', box.h >= 22, JSON.stringify(box));
await p.click('.scroll-top-btn');
await p.waitForFunction((sel) => document.querySelector(sel).scrollTop === 0, el, { timeout: 3000 });
check('clicking it scrolls back to the top', true);
await p.waitForFunction(() => !document.querySelector('.scroll-top-btn'), { timeout: 3000 });
check('and it hides again at the top', true);

console.log('\n── Main and Future list pages ──');
for (const [route, label] of [['/listmain', 'Main List'], ['/listfuture', 'Future List']]) {
  await p.goto(base + route, { waitUntil: 'networkidle' });
  await p.waitForSelector('.list tr');
  const r = await visible();
  check(`${label}: renders and numbers 1..N`, r.length > 0 && r.every((x, i) => x[0] === `#${i + 1}`),
    JSON.stringify(r.slice(0, 4)));
  const h = await p.evaluate(() => document.querySelector('.list tr:not(.level-hidden)').getBoundingClientRect().height);
  await p.evaluate(([sel, y]) => { document.querySelector(sel).scrollTop = y; }, ['.list-container-new', h * 11]);
  await p.waitForSelector('.scroll-top-btn', { timeout: 3000 });
  check(`${label}: Return to top appears`, true);
}

console.log('\n── mobile list keeps the same recounting ──');
{
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148' });
  for (const [u, f] of Object.entries({
    'https://cdn.jsdelivr.net/npm/vue@3.2.31/dist/vue.global.js': 'node_modules/vue/dist/vue.global.js',
    'https://cdn.jsdelivr.net/npm/vue-router@4.0.14/dist/vue-router.global.prod.js': 'node_modules/vue-router/dist/vue-router.global.prod.js',
  })) await mctx.route(u, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(f, 'utf8') }));
  for (const h of ['https://cdnjs.cloudflare.com/**', 'https://fonts.googleapis.com/**', 'https://fonts.gstatic.com/**'])
    await mctx.route(h, r => r.fulfill({ status: 200, body: '' }));
  await mctx.route('https://d1-wrkr.ullteam.workers.dev/**', async (route) => {
    const rq = route.request();
    const w = await worker.fetch(new Request(base + new URL(rq.url()).pathname,
      { method: rq.method(), headers: rq.headers(), body: rq.postData() ?? undefined }), env);
    await route.fulfill({ status: w.status, headers: Object.fromEntries(w.headers), body: Buffer.from(await w.arrayBuffer()) });
  });
  const mp = await mctx.newPage();
  // Mobile hides rows with v-show (inline display:none), not a class.
  const mRanks = () => mp.$$eval('.mob-level-row', rows => rows
    .filter(r => r.offsetParent !== null)
    .map(r => r.querySelector('.mob-rank span')?.textContent.trim()));

  await mp.goto(base + '/mobile/all', { waitUntil: 'networkidle' });
  await mp.waitForSelector('.mob-level-row');
  check('mobile numbers 1..40 normally', (await mRanks()).every((r, i) => r === `#${i + 1}`));

  await mp.click('.mob-topbar-btn[title="Settings"]');
  await mp.waitForSelector('.mob-settings-list');
  await mp.click('.mob-setting-row:has-text("Benchmark Mode") .mob-toggle button:has-text("ON")');
  await mp.click('.mob-popup-overlay', { position: { x: 5, y: 820 } });
  await mp.waitForFunction((n) =>
    [...document.querySelectorAll('.mob-level-row')].filter(r => r.offsetParent !== null).length === n,
    expected.length, { timeout: 8000 });
  const mr = await mRanks();
  check('mobile recounts placements under benchmark mode',
    mr.length === expected.length && mr.every((r, i) => r === `#${i + 1}`), JSON.stringify(mr.slice(0, 8)));

  // Main/Future are subsets of the same shared list — they must number themselves,
  // not inherit All Levels' benchmark placements.
  for (const [route, label] of [['/mobile/main', 'Main'], ['/mobile/future', 'Future']]) {
    await mp.goto(base + route, { waitUntil: 'networkidle' });
    await mp.waitForSelector('.mob-level-row');
    const r = await mRanks();
    check(`mobile ${label} list numbers itself 1..N under benchmark mode`,
      r.length > 0 && r.every((x, i) => x === `#${i + 1}`), JSON.stringify(r.slice(0, 8)));
  }
  await mctx.close();
}

console.log('\n── console health ──');
const real = errors.filter(e => !/favicon|404 \(Not Found\)|ERR_/i.test(e));
check('no page errors', real.length === 0, real.slice(0, 3).join(' | '));

await browser.close();
server.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
