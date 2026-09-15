// Boot failsafe test: a page whose app never boots must still show content.
//
//   npm i playwright vue@3.2.31 vue-router@4.0.14
//   node js/boot-failsafe.test.mjs
//
// The static block in index.html is hidden as soon as the boot shield knows
// scripting is on, and the app tree is [v-cloak]ed until Vue mounts. If the
// module graph never finishes, both are hidden at once and the page renders
// blank — which is exactly what Googlebot recorded for /list. index.html arms a
// failsafe on 'load' (plus a timer for a hung request) that reveals the static
// block again, and main.js marks the root app-ready so a healthy load is
// unaffected. This test pins both halves of that behaviour.

import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = {
    '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
    '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
    '.png': 'image/png', '.ico': 'image/x-icon', '.txt': 'text/plain', '.xml': 'application/xml',
};

const server = createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
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
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(readFileSync(path.join(ROOT, 'index.html')));
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

// The CDNs are not reachable offline, so serve Vue from node_modules exactly as
// js/seo.test.mjs does. Without this every case would "fail to boot" for the
// wrong reason and the healthy-path assertions would be meaningless.
const VUE_CDN = {
    'https://cdn.jsdelivr.net/npm/vue@3.2.31/dist/vue.global.prod.js': 'node_modules/vue/dist/vue.global.prod.js',
    'https://cdn.jsdelivr.net/npm/vue-router@4.0.14/dist/vue-router.global.prod.js': 'node_modules/vue-router/dist/vue-router.global.prod.js',
};
async function stubExternals(ctx, { serveVue = true } = {}) {
    for (const [u, f] of Object.entries(VUE_CDN)) {
        await ctx.route(u, (r) => (serveVue
            ? r.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(f, 'utf8') })
            : r.abort()));
    }
    for (const h of ['https://fonts.googleapis.com/**', 'https://fonts.gstatic.com/**'])
        await ctx.route(h, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await ctx.route('https://d1-wrkr.ullteam.workers.dev/**', (r) =>
        r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
}
let failures = 0;
const ok = (name, detail = '') => console.log(`  ok     ${name}${detail ? ' — ' + detail : ''}`);
const bad = (name, detail = '') => { failures++; console.log(`  FAIL   ${name}${detail ? ' — ' + detail : ''}`); };
const check = (cond, name, detail) => (cond ? ok(name, detail) : bad(name, detail));

// Reads what a visitor (or a crawler's screenshot) would actually see.
async function visibleState(page) {
    return page.evaluate(() => {
        const el = document.getElementById('seo-fallback');
        const shown = el ? getComputedStyle(el).display !== 'none' : false;
        return {
            cls: document.documentElement.className,
            fallbackPresent: !!el,
            fallbackVisible: shown,
            visibleText: (document.body.innerText || '').trim(),
        };
    });
}

console.log('\n── healthy boot ──');
{
    const page = await browser.newPage();
    await stubExternals(page);
    await page.goto(`${base}/list`, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    const s = await visibleState(page);
    check(s.cls.includes('app-ready'), 'root is marked app-ready', s.cls.trim());
    check(!s.cls.includes('boot-failed'), 'failsafe did not fire');
    check(!s.fallbackPresent, 'static block was removed before mount');
    await page.close();
}

console.log('\n── boot fails: the module graph never loads ──');
{
    const page = await browser.newPage();
    await stubExternals(page);
    // main.js never executes, so it never removes the static block and never
    // mounts Vue.
    await page.route('**/js/main.js', (r) => r.abort());
    await page.goto(`${base}/list`, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    const s = await visibleState(page);
    check(s.cls.includes('boot-failed'), 'failsafe fired', s.cls.trim());
    check(!s.cls.includes('app-ready'), 'root is not marked app-ready');
    check(s.fallbackPresent, 'static block is still in the DOM');
    check(s.fallbackVisible, 'static block is VISIBLE (not a blank page)');
    check(s.visibleText.length > 500, 'page has readable text', `${s.visibleText.length} chars`);
    check(s.visibleText.includes('All Levels'), 'page shows its real heading');
    check(s.visibleText.includes('Aeternus'), 'page shows real ranking rows');
    await page.close();
}

console.log('\n── boot fails on a level page ──');
{
    const page = await browser.newPage();
    await stubExternals(page);
    await page.route('**/js/main.js', (r) => r.abort());
    await page.goto(`${base}/level/aeternus`, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    const s = await visibleState(page);
    check(s.fallbackVisible, 'static block is visible');
    check(s.visibleText.includes('Aeternus'), 'level name is readable');
    await page.close();
}

console.log('\n── boot fails: the Vue CDN is unreachable (the fingerprint Googlebot recorded) ──');
{
    const page = await browser.newPage();
    await stubExternals(page, { serveVue: false });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message.split('\n')[0]));
    await page.goto(`${base}/list`, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    const s = await visibleState(page);
    // main.js:5 is `Vue.reactive(...)`, above the line that removes the static
    // block — so a missing Vue global leaves the block in the DOM untouched.
    check(errors.some((e) => /Vue is not defined/.test(e)), 'reproduces "Vue is not defined"', errors[0] || '');
    check(s.fallbackPresent, 'static block was never removed');
    check(s.fallbackVisible, 'static block is VISIBLE (not a blank page)');
    check(s.visibleText.includes('Aeternus'), 'page shows real ranking rows');
    await page.close();
}

await browser.close();
server.close();
console.log(failures ? `\n${failures} failed\n` : '\nall passed\n');
process.exit(failures ? 1 : 0);
