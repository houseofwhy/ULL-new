// Pending List links: node js/pending-ui.test.mjs
//
// Requires: npm i playwright vue@3.2.31 vue-router@4.0.14
//
// Every section of the Pending List links its level names. Placements and
// "indefinitely" use the link stored on the pending entry; movements use the
// same field; removals are derived from the level list instead, so they fall
// back to the level's showcase (then verification) video.

import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon' };

const server = createServer((req, res) => {
    const u = new URL(req.url, 'http://l');
    let f = join(ROOT, normalize(u.pathname));
    if (!existsSync(f) || statSync(f).isDirectory()) f = join(ROOT, 'index.html');
    res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
    res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

// Two levels stale enough to become removal candidates: one with a showcase,
// one with only a verification video, plus a fresh level that must not appear.
const stale = '01.01.2020';
const LIST = [
    { path: 'a', name: 'Stale Showcase', author: 'A', creators: ['A'], verifier: 'V', verification: 'https://youtu.be/verAAAAAAAA', showcase: 'https://youtu.be/showAAAAAAA', thumbnail: '', id: '1', rating: 1, length: 60, percentToQualify: 100, percentFinished: 50, lastUpd: stale, tags: [], records: [], run: [], isVerified: false, isMain: false, isFuture: false, benchmark: false },
    { path: 'b', name: 'Stale Verification Only', author: 'B', creators: ['B'], verifier: 'V', verification: 'https://www.youtube.com/watch?v=verBBBBBBBB', showcase: '', thumbnail: '', id: '2', rating: 1, length: 60, percentToQualify: 100, percentFinished: 50, lastUpd: stale, tags: [], records: [], run: [], isVerified: false, isMain: false, isFuture: false, benchmark: false },
    { path: 'c', name: 'Fresh Level', author: 'C', creators: ['C'], verifier: 'V', verification: '', showcase: '', thumbnail: '', id: '3', rating: 1, length: 60, percentToQualify: 100, percentFinished: 50, lastUpd: '01.08.2026', tags: [], records: [], run: [], isVerified: false, isMain: false, isFuture: false, benchmark: false },
];
const PENDING = [
    { name: 'Placed Level', placement: '10', link: 'https://youtu.be/placement1', indefinite: 0 },
    { name: 'Rising Level', placement: 'up', link: 'https://youtu.be/movementUp', indefinite: 0 },
    { name: 'Falling Level', placement: 'down', link: '', indefinite: 0 },
    { name: 'Someday Level', placement: '?', link: 'https://youtu.be/indefinite1', indefinite: 1 },
];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

let pass = 0, fail = 0;
const check = (l, c, x = '') => (c ? (pass++, console.log(`  ok     ${l}`)) : (fail++, console.log(`  FAIL   ${l} ${x}`)));

async function open(path, viewport, userAgent) {
    const ctx = await browser.newContext({ viewport, ...(userAgent ? { userAgent } : {}) });
    for (const [u, f] of Object.entries({
        'https://cdn.jsdelivr.net/npm/vue@3.2.31/dist/vue.global.js': 'node_modules/vue/dist/vue.global.js',
        'https://cdn.jsdelivr.net/npm/vue-router@4.0.14/dist/vue-router.global.prod.js': 'node_modules/vue-router/dist/vue-router.global.prod.js',
    })) await ctx.route(u, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(f, 'utf8') }));
    for (const h of ['https://cdnjs.cloudflare.com/**', 'https://fonts.googleapis.com/**', 'https://fonts.gstatic.com/**'])
        await ctx.route(h, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await ctx.route('https://d1-wrkr.ullteam.workers.dev/**', (r) => {
        const u = new URL(r.request().url()).pathname;
        const body = u === '/api/list' ? LIST : u === '/api/pending' ? PENDING : u.startsWith('/api/level-') ? null : [];
        r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(base + path, { waitUntil: 'networkidle' });
    return { ctx, page, errors };
}

// Read a card as { name -> href|null }.
async function readCard(page, cardSel, titleText, rowSel) {
    return page.evaluate(({ cardSel, titleText, rowSel }) => {
        const card = [...document.querySelectorAll(cardSel)].find((c) => c.textContent.trim().startsWith(titleText));
        if (!card) return null;
        return Object.fromEntries([...card.querySelectorAll(rowSel)].map((row) => {
            const a = row.querySelector('a');
            const label = (a || row.querySelector('span:not([class*="rank"]):not([class*="icon"])'))?.textContent.trim();
            return [label, a ? a.getAttribute('href') : null];
        }));
    }, { cardSel, titleText, rowSel });
}

for (const [label, path, viewport, ua, cardSel, rowSel] of [
    ['desktop', '/pending', { width: 1400, height: 900 }, undefined, '.pending-card', '.pending-row'],
    ['mobile', '/mobile/pending', { width: 390, height: 844 },
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        '.mob-pending-card', '.mob-pending-row'],
]) {
    console.log(`\n── ${label} ──`);
    const { ctx, page, errors } = await open(path, viewport, ua);

    const placements = await readCard(page, cardSel, 'Pending Placements', rowSel);
    check('placement keeps its link', placements?.['Placed Level'] === 'https://youtu.be/placement1', JSON.stringify(placements));

    const movements = await readCard(page, cardSel, 'Pending Movements', rowSel);
    check('movement with a link is clickable', movements?.['Rising Level'] === 'https://youtu.be/movementUp', JSON.stringify(movements));
    check('movement without a link stays plain text', movements?.['Falling Level'] === null, JSON.stringify(movements));

    const indefinite = await readCard(page, cardSel, 'Pending Indefinitely', rowSel);
    check('indefinite keeps its link', indefinite?.['Someday Level'] === 'https://youtu.be/indefinite1', JSON.stringify(indefinite));

    const removals = await readCard(page, cardSel, 'Pending Removals', rowSel);
    check('removal links to the showcase', removals?.['Stale Showcase'] === 'https://youtu.be/showAAAAAAA', JSON.stringify(removals));
    check('removal falls back to the verification', removals?.['Stale Verification Only'] === 'https://www.youtube.com/watch?v=verBBBBBBBB', JSON.stringify(removals));
    check('a recently updated level is not a removal candidate', !('Fresh Level' in (removals || {})), JSON.stringify(removals));

    check('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
}

await browser.close();
server.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
