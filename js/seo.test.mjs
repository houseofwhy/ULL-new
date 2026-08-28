// SEO test: every public URL must arrive with its own head and readable content
// before JavaScript runs, and stay correct once the SPA takes over.
//
//   npm i playwright vue@3.2.31 vue-router@4.0.14
//   node js/seo.test.mjs
//
// The local server mirrors Cloudflare Pages: a real file wins, then the
// `/* -> /index.html` fallback from _redirects. Run scripts/build-seo.mjs first
// if you changed anything under scripts/seo/.

import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { PAGES, SITE } from '../scripts/seo/content.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = {
    '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
    '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
    '.png': 'image/png', '.ico': 'image/x-icon', '.txt': 'text/plain', '.xml': 'application/xml',
};

const server = createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    for (const c of [path.join(ROOT, url), path.join(ROOT, url, 'index.html')]) {
        if (existsSync(c) && statSync(c).isFile()) {
            res.writeHead(200, { 'content-type': TYPES[path.extname(c)] || 'application/octet-stream' });
            return res.end(readFileSync(c));
        }
    }
    if (url === '/home') { res.writeHead(301, { location: '/' }); return res.end(); }
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(readFileSync(path.join(ROOT, 'index.html')));
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

// unpkg, the font CDNs and the live API are not reachable offline — serve Vue
// from node_modules and stub the rest so the app boots as it does in production.
async function stubExternals(ctx) {
    for (const [u, f] of Object.entries({
        'https://unpkg.com/vue@3.2.31/dist/vue.global.js': 'node_modules/vue/dist/vue.global.js',
        'https://unpkg.com/vue-router@4.0.14/dist/vue-router.global.prod.js': 'node_modules/vue-router/dist/vue-router.global.prod.js',
    })) await ctx.route(u, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(f, 'utf8') }));
    for (const h of ['https://cdnjs.cloudflare.com/**', 'https://fonts.googleapis.com/**', 'https://fonts.gstatic.com/**'])
        await ctx.route(h, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await ctx.route('https://d1-wrkr.ullteam.workers.dev/**', (r) => {
        // level-month / level-verif return an object or null, never an array.
        r.fulfill({
            status: 200,
            contentType: 'application/json',
            body: /level-(month|verif)/.test(r.request().url()) ? 'null' : '[]',
        });
    });
}

let failed = 0;
const ok = (name, cond, extra = '') => {
    console.log(`  ${cond ? 'ok  ' : 'FAIL'}   ${name}${extra ? ' — ' + extra : ''}`);
    if (!cond) failed++;
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

// ── each public URL, loaded directly ────────────────────────────────────────
for (const page_ of PAGES) {
    const route = page_.route;
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await stubExternals(ctx);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    console.log(`\n── ${route} ──`);
    await page.goto(base + route, { waitUntil: 'networkidle' });

    const info = await page.evaluate(() => ({
        title: document.title,
        desc: document.querySelector('meta[name="description"]')?.content,
        canonical: document.querySelector('link[rel="canonical"]')?.href,
        ogUrl: document.querySelector('meta[property="og:url"]')?.content,
        robots: document.querySelector('meta[name="robots"]')?.content,
        gsc: !!document.querySelector('meta[name="google-site-verification"]'),
        fallback: !!document.getElementById('seo-fallback'),
        mounted: !!document.querySelector('.root') && !document.querySelector('[v-cloak]'),
        ld: [...document.querySelectorAll('script[type="application/ld+json"]')]
            .map((s) => { try { return JSON.parse(s.textContent)['@graph'].map((n) => n['@type']); } catch { return ['INVALID']; } }),
        path: location.pathname,
    }));

    ok('the Vue app mounted', info.mounted);
    ok('static content block removed once mounted', !info.fallback);
    ok('title matches the page config', info.title === page_.title, info.title);
    ok('description matches the page config', info.desc === page_.description);
    ok('canonical points at this URL', info.canonical === SITE.origin + route, info.canonical);
    ok('og:url points at this URL', info.ogUrl === SITE.origin + route);
    ok('indexable', info.robots === 'index, follow', info.robots);
    ok('Search Console verification tag present', info.gsc);
    ok('one valid JSON-LD graph', info.ld.length === 1 && !info.ld[0].includes('INVALID'), JSON.stringify(info.ld[0]));
    ok('no client-side redirect off the URL', info.path === route, info.path);
    ok('no page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
}

// ── the head keeps up with client-side navigation ───────────────────────────
{
    console.log('\n── client-side navigation ──');
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await stubExternals(ctx);
    const page = await ctx.newPage();
    await page.goto(base + '/', { waitUntil: 'networkidle' });

    for (const route of ['/list', '/leaderboard', '/information']) {
        await page.click(`.sidebar__nav a[href="${route}"]`);
        await page.waitForFunction((r) => location.pathname === r, route);
        const expected = PAGES.find((p) => p.route === route);
        const got = await page.evaluate(() => ({
            title: document.title,
            desc: document.querySelector('meta[name="description"]')?.content,
            canonical: document.querySelector('link[rel="canonical"]')?.href,
        }));
        ok(`${route}: title updated`, got.title === expected.title, got.title);
        ok(`${route}: description updated`, got.desc === expected.description);
        ok(`${route}: canonical updated`, got.canonical === SITE.origin + route, got.canonical);
    }

    // Unknown URLs render the 404 page and must not be indexed.
    await page.evaluate(() => history.pushState(null, '', '/no-such-page'));
    await page.goto(base + '/no-such-page', { waitUntil: 'networkidle' });
    const robots = await page.evaluate(() => document.querySelector('meta[name="robots"]')?.content);
    ok('unknown URL is noindex', robots === 'noindex, follow', robots);
    await ctx.close();
}

// ── crawlers ────────────────────────────────────────────────────────────────
{
    console.log('\n── Googlebot smartphone ──');
    const ctx = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/W.X.Y.Z Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        viewport: { width: 412, height: 823 },
    });
    await stubExternals(ctx);
    const page = await ctx.newPage();
    await page.goto(base + '/list', { waitUntil: 'networkidle' });
    const p = await page.evaluate(() => location.pathname);
    ok('not bounced into the /mobile tree', p === '/list', p);
    await ctx.close();
}

{
    console.log('\n── crawler without JavaScript ──');
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    for (const route of ['/', '/upcoming', '/information']) {
        await page.goto(base + route);
        const text = (await page.locator('#seo-fallback').innerText()).replace(/\s+/g, ' ');
        const h1 = await page.locator('#seo-fallback h1').innerText();
        const expected = PAGES.find((pp) => pp.route === route);
        ok(`${route}: h1 present`, h1.trim() === expected.h1, h1.trim());
        ok(`${route}: substantial readable text`, text.length > 700, `${text.length} chars`);
        ok(`${route}: names the subject`, /Geometry Dash/i.test(text));
        ok(`${route}: links on to other pages`, (await page.locator('#seo-fallback a').count()) > 5);
    }
    await ctx.close();
}

// ── real mobile visitors still get the mobile UI ────────────────────────────
{
    console.log('\n── real mobile visitor ──');
    const ctx = await browser.newContext({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        viewport: { width: 390, height: 844 },
    });
    await stubExternals(ctx);
    const page = await ctx.newPage();
    await page.goto(base + '/list', { waitUntil: 'networkidle' });
    const p = await page.evaluate(() => location.pathname);
    ok('deep link kept: /list opens the mobile list, not the mobile home', p === '/mobile/all', p);
    ok('canonical still points at the desktop URL',
        await page.evaluate(() => document.querySelector('link[rel="canonical"]')?.href) === SITE.origin + '/list');
    await ctx.close();
}

await browser.close();
server.close();
console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
