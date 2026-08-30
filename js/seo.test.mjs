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
import { levelSlug } from './util.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = {
    '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
    '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
    '.png': 'image/png', '.ico': 'image/x-icon', '.txt': 'text/plain', '.xml': 'application/xml',
};

const server = createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    // Cloudflare Pages redirects a directory URL to its trailing-slash form.
    // Mirroring that here is the point: /listmain arrives as /listmain/.
    if (!url.endsWith('/') && existsSync(path.join(ROOT, url, 'index.html'))) {
        res.writeHead(308, { location: url + '/' });
        return res.end();
    }
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

// The CDNs and the live API are not reachable offline — serve Vue
// from node_modules and stub the rest so the app boots as it does in production.
async function stubExternals(ctx, delayMs = 0) {
    for (const [u, f] of Object.entries({
        'https://cdn.jsdelivr.net/npm/vue@3.2.31/dist/vue.global.js': 'node_modules/vue/dist/vue.global.js',
        'https://cdn.jsdelivr.net/npm/vue-router@4.0.14/dist/vue-router.global.prod.js': 'node_modules/vue-router/dist/vue-router.global.prod.js',
    })) await ctx.route(u, async (r) => {
        if (delayMs) await new Promise((done) => setTimeout(done, delayMs));
        r.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(f, 'utf8') });
    });
    for (const h of ['https://cdnjs.cloudflare.com/**', 'https://fonts.googleapis.com/**', 'https://fonts.gstatic.com/**'])
        await ctx.route(h, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await ctx.route('https://d1-wrkr.ullteam.workers.dev/**', (r) => {
        const url = new URL(r.request().url()).pathname;
        // Serve the committed snapshot so the pages render the same data the
        // static HTML was generated from.
        const body =
            url === '/api/list' ? snapshot?.levels ?? []
            : url === '/api/pending' ? snapshot?.pending ?? []
            : url === '/api/editors' ? snapshot?.editors ?? []
            // level-month / level-verif return an object or null, never an array.
            : /level-(month|verif)/.test(url) ? null
            : [];
        r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
}

const SNAPSHOT_FILE = path.join(ROOT, 'data', '_seo-snapshot.json');
const snapshot = existsSync(SNAPSHOT_FILE) ? JSON.parse(readFileSync(SNAPSHOT_FILE, 'utf8')) : null;

const trimSlash = (p) => (p.length > 1 ? p.replace(/\/+$/, '') : p);

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
    ok('no client-side redirect off the URL', trimSlash(info.path) === route, info.path);
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
    ok('not bounced into the /mobile tree', trimSlash(p) === '/list', p);
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

// ── per-level pages ─────────────────────────────────────────────────────────
{
    console.log('\n── level pages ──');
    if (!snapshot) {
        ok("a snapshot exists to generate level pages from", false, "run: node scripts/fetch-data.mjs --fixture");
    } else {
        const paths = snapshot.levels.map((l) => l.path);
        const sample = [snapshot.levels[0], snapshot.levels[Math.floor(snapshot.levels.length / 2)], snapshot.levels.at(-1)];

        // Without JavaScript: the page must already carry the level facts.
        const noJs = await browser.newContext({ javaScriptEnabled: false });
        const p1 = await noJs.newPage();
        for (const level of sample) {
            const route = "/level/" + levelSlug(level.path, paths);
            await p1.goto(base + route);
            const text = (await p1.locator("#seo-fallback").innerText()).replace(/\s+/g, " ");
            ok(route + ": names the level", text.includes(level.name), text.slice(0, 80));
            ok(route + ": states its position", /#\d+ in All Levels/.test(text));
            ok(route + ": links back to the list", (await p1.locator("#seo-fallback a[href='/list']").count()) > 0);
            const canonical = await p1.evaluate(() => document.querySelector("link[rel=canonical]")?.href);
            ok(route + ": canonical", canonical === SITE.origin + route, canonical);
        }
        await noJs.close();

        // With JavaScript: the SPA route renders and stays on the URL.
        const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
        await stubExternals(ctx);
        const page = await ctx.newPage();
        const errors = [];
        page.on("pageerror", (e) => errors.push(String(e)));
        const level = sample[0];
        const route = "/level/" + levelSlug(level.path, paths);
        await page.goto(base + route, { waitUntil: "networkidle" });
        ok("SPA renders the level page", (await page.locator(".lvl-title").innerText()).trim() === level.name);
        ok("static block was replaced", !(await page.evaluate(() => !!document.getElementById("seo-fallback"))));
        ok("stays on the level URL", trimSlash(await page.evaluate(() => location.pathname)) === route);
        ok("still indexable after mount",
            (await page.evaluate(() => document.querySelector('meta[name="robots"]')?.content)) === "index, follow");
        ok("no page errors", errors.length === 0, errors.join(" | "));

        // An unknown level shows the not-found state rather than breaking.
        await page.goto(base + "/level/definitely-not-a-level", { waitUntil: "networkidle" });
        ok("unknown level handled", (await page.locator(".lvl-missing").count()) === 1);
        await ctx.close();
    }
}

// ── baked live rankings ─────────────────────────────────────────────────────
{
    console.log('\n── baked rankings ──');
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    for (const [route, heading] of [["/list", "Current ranking"], ["/listmain", "Current Main List"], ["/upcoming", "Closest to verification"]]) {
        await page.goto(base + route);
        const text = (await page.locator("#seo-fallback").innerText()).replace(/\s+/g, " ");
        ok(route + ": has the baked section", text.includes(heading), text.slice(0, 90));
        const rows = await page.locator("#seo-fallback table.seo-table tbody tr").count();
        ok(route + ": carries real rows", rows > 20, String(rows));
        const links = await page.locator("#seo-fallback table.seo-table a[href^='/level/']").count();
        ok(route + ": rows link to level pages", links === rows, links + " of " + rows);
    }
    await ctx.close();
}
// ── the static block must never reach a visitor ─────────────────────────────
// It exists for crawlers that do not run JavaScript. A visitor seeing it, even
// for a moment, is the bug this guards against: Vue is held back deliberately
// here so a slow connection is what gets tested, not a fast one.
{
    console.log('\n── no flash of the static block ──');
    for (const route of ['/list', '/', '/level/aeternus']) {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
        await stubExternals(ctx, 800);
        const page = await ctx.newPage();
        let seen = 0, offTheme = 0, samples = 0;
        const poll = setInterval(async () => {
            try {
                const r = await page.evaluate(() => {
                    const el = document.getElementById("seo-fallback");
                    return {
                        visible: el ? !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length) : false,
                        bg: getComputedStyle(document.documentElement).backgroundColor,
                    };
                });
                samples++;
                if (r.visible) seen++;
                if (r.bg !== "rgb(28, 27, 31)" && r.bg !== "rgba(0, 0, 0, 0)") offTheme++;
            } catch { /* navigating */ }
        }, 25);
        await page.goto(base + route, { waitUntil: "networkidle" });
        await page.waitForTimeout(150);
        clearInterval(poll);
        ok(route + ": static block never visible", seen === 0, seen + " of " + samples + " samples");
        ok(route + ": ground held the theme colour", offTheme === 0, offTheme + " of " + samples + " samples");
        ok(route + ": app rendered in the end", (await page.locator(".root").count()) === 1);
        await ctx.close();
    }

    // Someone on the light theme should get their own ground, not black.
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await stubExternals(ctx);
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem("dark", "true"));
    await page.goto(base + "/list", { waitUntil: "domcontentloaded" });
    const bg = await page.evaluate(() => document.documentElement.style.background);
    ok("light-theme visitor gets a white ground", /255, 255, 255|#ffffff/.test(bg), bg);
    await ctx.close();
}

// ── the share control ───────────────────────────────────────────────────────
{
    console.log('\n── share button ──');
    const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 }, permissions: ["clipboard-read", "clipboard-write"] });
    await stubExternals(ctx);
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(base + "/list", { waitUntil: "networkidle" });

    const share = page.locator(".level-share");
    // A real link, so it can be middle-clicked, right-click-copied and crawled.
    ok("is a real link to the level page", (await share.getAttribute("href"))?.startsWith("/level/"), await share.getAttribute("href"));
    ok("reads as a share control", (await share.innerText()).trim() === "Share level");

    await share.scrollIntoViewIfNeeded();
    await share.click();
    await page.waitForTimeout(150);
    ok("confirms the copy", (await share.innerText()).trim() === "Link copied");
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    ok("copied an absolute level URL", /^https?:\/\/[^/]+\/level\/[a-z0-9-]+$/.test(clip), clip);
    ok("did not navigate away", trimSlash(await page.evaluate(() => location.pathname)) === "/list");

    await page.waitForTimeout(2100);
    ok("returns to its resting state", (await share.innerText()).trim() === "Share level");
    ok("no page errors", errors.length === 0, errors.join(" | "));
    await ctx.close();
}

// ── arriving straight at a URL, trailing slash and all ──────────────────────
// Cloudflare Pages serves /listmain as /listmain/, which used to miss every
// lookup keyed without the slash: the tab read "Page Not Found" until you
// clicked something, and the canonical URL grew a slash the static file did
// not have.
{
    console.log('\n── direct hit with a trailing slash ──');
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    await stubExternals(ctx);
    const page = await ctx.newPage();
    for (const route of ["/listmain", "/list", "/leaderboard", "/level/aeternus"]) {
        await page.goto(base + route, { waitUntil: "networkidle" });
        const got = await page.evaluate(() => ({
            path: location.pathname,
            title: document.title,
            canonical: document.querySelector("link[rel=canonical]")?.href,
            robots: document.querySelector('meta[name="robots"]')?.content,
        }));
        ok(route + ": the server did add a trailing slash", got.path === route + "/", got.path);
        ok(route + ": title is not the 404 title", !/Page Not Found/.test(got.title), got.title);
        ok(route + ": canonical has no trailing slash", got.canonical === SITE.origin + route, got.canonical);
        ok(route + ": still indexable", got.robots === "index, follow", got.robots);
    }
    await ctx.close();
}

// ── the browser tab reads as ULL — Page ─────────────────────────────────────
{
    console.log('\n── tab titles ──');
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    await stubExternals(ctx);
    const page = await ctx.newPage();
    await page.goto(base + "/", { waitUntil: "networkidle" });
    ok("home is the site name", (await page.title()) === "Upcoming Levels List", await page.title());
    for (const [route, expected] of [["/list", "ULL — All Levels"], ["/leaderboard", "ULL — Leaderboard"], ["/information", "ULL — Information"]]) {
        await page.click(`.sidebar__nav a[href="${route}"]`);
        await page.waitForFunction((r) => location.pathname.replace(/\/+$/, "") === r, route);
        ok(route + ": tab title", (await page.title()) === expected, await page.title());
        // Link previews keep the longer, descriptive wording.
        const og = await page.evaluate(() => document.querySelector('meta[property="og:title"]')?.content);
        ok(route + ": link preview stays descriptive", og.length > expected.length + 10, og);
    }
    await ctx.close();
}

await browser.close();
server.close();
console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
