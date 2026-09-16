// Drives the Information page and the verification meter in Chromium:
//   - a guidelines module shows every one of its sections at once, so reading
//     one does not mean clicking through its subsections one at a time,
//   - clicking a module in the index switches modules,
//   - Esc closes the window outright, however many modules were looked at
//     before pressing it,
//   - the verification meter is drawn where the evidence sits, so a 72-100 run
//     fills the last 28% of the bar rather than the first,
//   - the phone's guidelines sheet works the same way: modules in the index,
//     every section of one when it is opened, and Close closing outright.
//
// Requires playwright in the directory you run from:  npm i playwright vue@3.2.31 vue-router@4.0.14
// Run:  node js/info-ui.test.mjs

import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { guidelinesData } from './_guidelines.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = {
    '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
    '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
    '.png': 'image/png', '.ico': 'image/x-icon', '.txt': 'text/plain', '.xml': 'application/xml',
};

const server = createServer((req, res) => {
    const [rawPath, qs] = req.url.split('?');
    const url = decodeURIComponent(rawPath);
    if (!url.endsWith('/') && existsSync(path.join(ROOT, url, 'index.html'))) {
        // Cloudflare keeps the query across this redirect, and these tests open
        // the window with ?open=, so dropping it here would test nothing.
        res.writeHead(308, { location: url + '/' + (qs ? '?' + qs : '') });
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
let failed = 0;
const check = (cond, name, detail = '') => {
    console.log(`  ${cond ? 'ok  ' : 'FAIL'}   ${name}${detail ? ' — ' + detail : ''}`);
    if (!cond) failed++;
};

// The CDNs are unreachable offline; serve Vue from node_modules as the other
// suites do, and keep the API quiet.
async function newPage() {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    for (const h of ['https://fonts.googleapis.com/**', 'https://fonts.gstatic.com/**'])
        await page.route(h, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await page.route('https://d1-wrkr.ullteam.workers.dev/**', (r) =>
        r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    return page;
}

const first = guidelinesData[0];
const second = guidelinesData[1];

console.log('\n── a module shows all of its sections at once ──');
{
    const page = await newPage();
    await page.goto(`${base}/information?open=guidelines`, { waitUntil: 'load' });
    await page.waitForSelector('.info-win__body section', { timeout: 15000 });

    const headings = await page.$$eval('.info-win__body section h3', (els) => els.map((e) => e.textContent.trim()));
    check(headings.length === first.sections.length,
        `every section of "${first.group}" is rendered`, `${headings.length} of ${first.sections.length}`);
    check(first.sections.every((s) => headings.includes(s.title)), 'and they are the right ones');

    // Stacked, not tabbed: each section sits below the one before it.
    const tops = await page.$$eval('.info-win__body section', (els) => els.map((e) => e.getBoundingClientRect().top));
    check(tops.every((t, i) => i === 0 || t > tops[i - 1]), 'sections are stacked one below the other');

    const modules = await page.$$eval('.info-toc__g', (els) => els.map((e) => e.textContent.trim()));
    check(modules.length === guidelinesData.length, 'the index lists modules', modules.join(', '));
    await page.close();
}

console.log('\n── clicking a module switches to it ──');
{
    const page = await newPage();
    await page.goto(`${base}/information?open=guidelines`, { waitUntil: 'load' });
    await page.waitForSelector('.info-win__body section', { timeout: 15000 });
    await page.locator('.info-toc__g').nth(1).click();
    await page.waitForTimeout(400);
    const crumb = await page.$eval('.info-crumb', (e) => e.textContent.trim());
    const headings = await page.$$eval('.info-win__body section h3', (els) => els.map((e) => e.textContent.trim()));
    check(crumb === second.group, 'the crumb names the module now open', crumb);
    check(headings.length === second.sections.length,
        `every section of "${second.group}" is rendered`, `${headings.length} of ${second.sections.length}`);
    await page.close();
}

console.log('\n── Esc closes the window, not the last module ──');
{
    const page = await newPage();
    await page.goto(`${base}/information?open=guidelines`, { waitUntil: 'load' });
    await page.waitForSelector('.info-win__body section', { timeout: 15000 });

    // Flip through several modules first: this is what used to leave Esc
    // walking back through them one entry at a time.
    for (let i = 1; i < Math.min(4, guidelinesData.length); i++) {
        await page.locator('.info-toc__g').nth(i).click();
        await page.waitForTimeout(200);
    }
    check(await page.$('.info-win') !== null, 'the window is open after flipping modules');

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    check(await page.$('.info-win') === null, 'one Esc closed it');
    check(!page.url().includes('open='), 'and the ?open= query is gone', page.url().replace(base, ''));
    await page.close();
}

console.log('\n── opened by clicking, Esc unwinds it properly ──');
{
    // The other branch of close(): the window was pushed by this page rather
    // than arrived at, so Esc goes back rather than dropping the query.
    const page = await newPage();
    await page.goto(`${base}/information`, { waitUntil: 'load' });
    await page.waitForSelector('.info-block--gl', { timeout: 15000 });
    await page.click('.info-block--gl');
    await page.waitForSelector('.info-win__body section', { timeout: 15000 });
    for (let i = 1; i < Math.min(3, guidelinesData.length); i++) {
        await page.locator('.info-toc__g').nth(i).click();
        await page.waitForTimeout(200);
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    check(await page.$('.info-win') === null, 'one Esc closed it');
    check(!page.url().includes('open='), 'and left no window in the URL', page.url().replace(base, ''));

    // Back should return to the page as it was, not reopen what we just closed.
    await page.goBack();
    await page.waitForTimeout(500);
    check(await page.$('.info-win') === null, 'Back does not reopen the closed window');
    await page.close();
}

console.log('\n── the meter is drawn where the run actually sits ──');
{
    const page = await newPage();
    // The bar in isolation, against the real bundle, so this measures the CSS
    // rather than a guess about it: the container clips with overflow:hidden, so
    // the offset has to survive that.
    await page.setContent(`<link rel="stylesheet" href="${base}/css/bundle.css">
        <div class="ull2" style="width:400px">
          <div class="u-bar u-bar--alt" id="bar"><i id="fill" style="margin-left:72%;width:28%"></i></div>
        </div>`, { waitUntil: 'load' });
    const box = await page.evaluate(() => {
        const bar = document.getElementById('bar').getBoundingClientRect();
        const fill = document.getElementById('fill').getBoundingClientRect();
        return { startPct: ((fill.left - bar.left) / bar.width) * 100, widthPct: (fill.width / bar.width) * 100 };
    });
    check(Math.abs(box.startPct - 72) < 1, 'the fill starts at 72%', box.startPct.toFixed(1) + '%');
    check(Math.abs(box.widthPct - 28) < 1, 'and is 28% wide', box.widthPct.toFixed(1) + '%');
    check(box.startPct > 50, 'so it highlights the END of the level, not the start');
    await page.close();
}

console.log('\n── the phone shows modules too ──');
{
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    for (const h of ['https://fonts.googleapis.com/**', 'https://fonts.gstatic.com/**'])
        await page.route(h, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await page.route('https://d1-wrkr.ullteam.workers.dev/**', (r) =>
        r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));

    await page.goto(`${base}/mobile/info?open=guidelines`, { waitUntil: 'load' });
    await page.waitForSelector('.mob-info-toc__mod', { timeout: 15000 });

    const mods = await page.$$eval('.mob-info-toc__mod', (els) => els.map((e) => e.textContent.trim()));
    check(mods.length === guidelinesData.length, 'the index lists modules, not sections', `${mods.length} rows`);

    // Open the second module: its whole contents should arrive at once.
    await page.locator('.mob-info-toc__mod').nth(1).click();
    await page.waitForTimeout(400);
    const headings = await page.$$eval('.mob-info-sheet__body section h3', (els) => els.map((e) => e.textContent.trim()));
    check(headings.length === second.sections.length,
        `every section of "${second.group}" is on screen`, `${headings.length} of ${second.sections.length}`);
    check(second.sections.every((sec) => headings.includes(sec.title)), 'and they are the right ones');

    // The chevron steps back out to the index, as it did before.
    await page.click('.mob-info-back');
    await page.waitForTimeout(400);
    check(await page.$('.mob-info-toc__mod') !== null, 'the back chevron returns to the index');

    // Close from inside a module closes the sheet rather than surfacing the index.
    await page.locator('.mob-info-toc__mod').nth(2).click();
    await page.waitForTimeout(300);
    await page.click('.mob-info-x');
    await page.waitForTimeout(500);
    check(await page.$('.mob-info-sheet') === null, 'Close from inside a module closes the sheet');
    check(!page.url().includes('open='), 'and the ?open= query is gone', page.url().replace(base, ''));
    await page.close();
}

await browser.close();
server.close();
console.log(failed ? `\n${failed} failed\n` : '\nall passed\n');
process.exit(failed ? 1 : 0);
