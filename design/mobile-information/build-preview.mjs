#!/usr/bin/env node
// Builds two things from the templates in design/mobile-information/templates/:
//
//   preview.html   the review deck — the three approaches on one scrollable
//                  page, each in a 390×844 phone with its notes beside it
//   pages/*.html   each approach as a standalone page, no review chrome, the
//                  way the route would render it — open these on a phone
//
// Both read the shipped stylesheets (css/ull-v2.css and css/pages/mobile-v2.css)
// rather than copies, so a mockup cannot claim a component the site does not
// have, and both inline the site's icons so each output is one self-contained
// file. The content itself lives once in templates/_blocks.html and is stamped
// into every template that asks for it.
//
//   node design/mobile-information/build-preview.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(DIR, '..', '..');
const ORDER = [
    { name: 'doors', letter: 'A', file: 'a-doors' },
    { name: 'shelf', letter: 'B', file: 'b-shelf' },
    { name: 'index', letter: 'C', file: 'c-index' },
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ── The shared content ────────────────────────────────────────────────────────
const blocksSrc = fs.readFileSync(path.join(DIR, 'templates', '_blocks.html'), 'utf8');
const kit = blocksSrc.match(/<!--kit-->\n<style>\n([\s\S]*?)\n<\/style>\n<!--\/kit-->/);
if (!kit) throw new Error('_blocks.html has no <!--kit--> style block');
const blocks = new Map(
    [...blocksSrc.matchAll(/<!--b:([\w-]+)-->\n([\s\S]*?)\n<!--\/b-->/g)].map((m) => [m[1], m[2]]),
);

// The templates reference the site's own icons as ../../assets/<name>.svg, which
// only resolves from the templates directory. Inlining them makes every output a
// single file that can be opened, or sent, anywhere.
const inlineAssets = (html) =>
    html.replace(/\.\.\/\.\.\/assets\/([\w-]+\.svg)/g, (whole, file) => {
        const at = path.join(ROOT, 'assets', file);
        if (!fs.existsSync(at)) throw new Error(`template references a missing asset: ${file}`);
        return `data:image/svg+xml;base64,${fs.readFileSync(at).toString('base64')}`;
    });

const stampBlocks = (body, name) =>
    body.replace(/<!--__B:([\w-]+)__-->/g, (whole, key) => {
        if (!blocks.has(key)) throw new Error(`${name} asks for block "${key}", which _blocks.html does not have`);
        return blocks.get(key);
    });

const pages = ORDER.map(({ name, letter, file }) => {
    const raw = fs.readFileSync(path.join(DIR, 'templates', `${file}.html`), 'utf8');
    const block = raw.match(/<!--meta\n([\s\S]*?)\n-->/);
    if (!block) throw new Error(`${file}.html has no meta block`);
    const meta = {};
    for (const line of block[1].split('\n')) {
        const at = line.indexOf(':');
        if (at > 0) meta[line.slice(0, at).trim()] = line.slice(at + 1).trim();
    }
    for (const key of ['title', 'tag', 'files', 'state', 'idea', 'weight', 'cost', 'watch']) {
        if (!meta[key]) throw new Error(`${file}.html has no "${key}" in its meta block`);
    }
    return { name, letter, file, meta, body: inlineAssets(stampBlocks(raw.slice(block[0].length).trim(), file)) };
});

const shared = fs.readFileSync(path.join(ROOT, 'css', 'ull-v2.css'), 'utf8');
const mobile = fs.readFileSync(path.join(ROOT, 'css', 'pages', 'mobile-v2.css'), 'utf8');

// ── The deck ──────────────────────────────────────────────────────────────────
const shell = fs.readFileSync(path.join(DIR, 'preview.shell.html'), 'utf8');
const nav = pages
    .map((p, i) => `<a class="rail__item${i === 0 ? ' is-on' : ''}" href="#${p.name}"><b>${p.letter}. ${esc(p.meta.title)}</b><code>${esc(p.meta.tag)}</code></a>`)
    .join('\n        ');

const sections = pages.map((p) => `
    <section class="pg" id="${p.name}">
        <div class="pg__head">
            <div class="pg__label">
                <h2>${p.letter}. ${esc(p.meta.title)}</h2>
                <code class="pg__n">${esc(p.meta.tag)}</code>
            </div>
            <code class="pg__files">pages/${p.file}.html &middot; ${esc(p.meta.files)}</code>
        </div>
        <p class="pg__idea">${p.meta.idea}</p>
        <div class="pg__cols">
            <div class="pg__notes">
                <div class="note note--weight">
                    <div class="note__k">How it settles the weighting</div>
                    <p>${p.meta.weight}</p>
                </div>
                <div class="note note--cost">
                    <div class="note__k">What it costs to build</div>
                    <p>${p.meta.cost}</p>
                </div>
                <div class="note note--watch">
                    <div class="note__k">What to watch for</div>
                    <p>${p.meta.watch}</p>
                </div>
                <div class="note__state">${esc(p.meta.state)}</div>
            </div>
            <div class="phone">
                <div class="phone__screen root" data-mock>
${p.body}
                </div>
            </div>
        </div>
    </section>`).join('\n');

fs.writeFileSync(
    path.join(DIR, 'preview.html'),
    shell
        .replace('/*__SHARED_CSS__*/', shared)
        .replace('/*__MOBILE_CSS__*/', mobile)
        .replace('/*__KIT_CSS__*/', kit[1])
        .replace('<!--__NAV__-->', nav)
        .replace('<!--__SECTIONS__-->', sections),
);

// ── The standalone pages ──────────────────────────────────────────────────────
const pageShell = fs.readFileSync(path.join(DIR, 'page.shell.html'), 'utf8');
const outDir = path.join(DIR, 'pages');
fs.mkdirSync(outDir, { recursive: true });

for (const p of pages) {
    fs.writeFileSync(
        path.join(outDir, `${p.file}.html`),
        pageShell
            .replace('__TITLE__', `${p.letter}. ${p.meta.title}`)
            .replace('/*__SHARED_CSS__*/', shared)
            .replace('/*__MOBILE_CSS__*/', mobile)
            .replace('/*__KIT_CSS__*/', kit[1])
            .replace('<!--__BODY__-->', p.body),
    );
}

const kb = (f) => (fs.statSync(f).size / 1024).toFixed(1);
console.log(`built preview.html (${kb(path.join(DIR, 'preview.html'))} KB) from ${pages.length} templates and ${blocks.size} shared blocks:`);
for (const p of pages) console.log(`  pages/${p.file}.html  (${kb(path.join(outDir, `${p.file}.html`))} KB)`);
