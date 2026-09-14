#!/usr/bin/env node
// Builds two things from the templates in design/information/templates/:
//
//   preview.html   the review deck — every approach in one scrollable page,
//                  with its meta notes beside it
//   pages/*.html   each approach as a standalone page, no review chrome, the
//                  way the route would actually render
//
// Both read the shipped component layer (css/ull-v2.css) rather than a copy of
// it, so a mockup cannot claim a component the site does not have, and both
// inline the site's icons so the output is self-contained.
//
//   node design/information/build-preview.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
// Which of the shared reader's windows each surface opens. Shipping the markup
// for a window nothing on the page can reach is how a mockup starts lying, so
// the list is explicit rather than "all of them".
const ALL_MODALS = ['guidelines', 'faq', 'about', 'navigation', 'reference', 'staff', 'api'];
const ORDER = [
    { name: 'hub', letter: 'C', modals: ALL_MODALS },
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// The templates reference the site's own icons as ../../assets/<name>.svg, which
// only resolves when the output sits in this directory. Inlining them makes both
// the deck and each page a single self-contained file that can be sent anywhere.
const inlineAssets = (html) =>
    html.replace(/\.\.\/\.\.\/assets\/([\w-]+\.svg)/g, (whole, file) => {
        const at = path.join(DIR, '..', '..', 'assets', file);
        if (!fs.existsSync(at)) throw new Error(`template references a missing asset: ${file}`);
        return `data:image/svg+xml;base64,${fs.readFileSync(at).toString('base64')}`;
    });

// A, C and E open the same reader; the shared markup lives in _modals.html and
// is stamped into each template with that template's name, so ids and the radio
// group stay unique when all three are rendered onto the deck together.
const modalSrc = fs.readFileSync(path.join(DIR, 'templates', '_modals.html'), 'utf8');
const modalBlocks = new Map(
    [...modalSrc.matchAll(/<!--m:(\w+)-->\n([\s\S]*?)\n<!--\/m-->/g)].map((m) => [m[1], m[2]]),
);
for (const key of ALL_MODALS) {
    if (!modalBlocks.has(key)) throw new Error(`_modals.html has no block for "${key}"`);
}

const withModals = (body, name, keys) => {
    if (!body.includes('<!--__MODALS__-->')) throw new Error(`${name} has no modal slot`);
    const stamped = modalSrc
        .slice(0, modalSrc.indexOf('<!--m:'))
        .replace('/*__OPEN_RULES__*/', keys.map((k) => `.mk-__P__ #__P__-m-${k}:checked ~ .mkm--${k}`).join(',\n') + ' { display: flex; }')
        .replace(
            '<!--__RADIOS__-->',
            ['none', ...keys]
                .map((k) => `<input class="mkm-r" type="radio" name="__P__-m" id="__P__-m-${k}"${k === 'none' ? ' checked' : ''} />`)
                .join('\n'),
        )
        + keys.map((k) => modalBlocks.get(k)).join('\n\n');
    return body.replace('<!--__MODALS__-->', stamped.replaceAll('__P__', name));
};

const pages = ORDER.map(({ name, letter, modals }) => {
    const raw = fs.readFileSync(path.join(DIR, 'templates', `${name}.html`), 'utf8');
    const meta = {};
    const block = raw.match(/<!--meta\n([\s\S]*?)\n-->/);
    if (!block) throw new Error(`${name}.html has no meta block`);
    for (const line of block[1].split('\n')) {
        const at = line.indexOf(':');
        if (at > 0) meta[line.slice(0, at).trim()] = line.slice(at + 1).trim();
    }
    const body = inlineAssets(withModals(raw.slice(block[0].length).trim(), name, modals));
    return { name, letter, meta, body };
});

const component = fs.readFileSync(path.join(DIR, '..', '..', 'css', 'ull-v2.css'), 'utf8');

// ── The deck ──────────────────────────────────────────────────────────────────
const shell = fs.readFileSync(path.join(DIR, 'preview.shell.html'), 'utf8');

const nav = pages
    .map((p, i) => `<a class="rail__item${i === 0 ? ' is-on' : ''}" href="#${p.name}"><b>${p.letter}. ${esc(p.meta.title)}</b><code>${esc(p.meta.tag)}</code></a>`)
    .join('\n        ');

const sections = pages
    .map((p) => `
    <section class="pg" id="${p.name}">
        <div class="pg__head">
            <div class="pg__label">
                <h2>${p.letter}. ${esc(p.meta.title)}</h2>
                <code class="pg__n">${esc(p.meta.tag)}</code>
            </div>
            <code class="pg__files">pages/${p.letter.toLowerCase()}-${p.name}.html &middot; ${esc(p.meta.files)}</code>
        </div>
        <p class="pg__idea">${p.meta.idea}</p>
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
        </div>
        <div class="frame">
            <div class="frame__bar"><span></span><span></span><span></span><code>ull.pages.dev/information</code><em>${esc(p.meta.state)}</em></div>
            <div class="frame__view root" data-mock>
${p.body}
            </div>
        </div>
    </section>`)
    .join('\n');

fs.writeFileSync(
    path.join(DIR, 'preview.html'),
    shell
        .replace('/*__COMPONENT_CSS__*/', component)
        .replace('<!--__NAV__-->', nav)
        .replace('<!--__SECTIONS__-->', sections),
);

// ── The standalone pages ──────────────────────────────────────────────────────
const pageShell = fs.readFileSync(path.join(DIR, 'page.shell.html'), 'utf8');
const outDir = path.join(DIR, 'pages');
fs.mkdirSync(outDir, { recursive: true });

for (const p of pages) {
    const file = `${p.letter.toLowerCase()}-${p.name}.html`;
    fs.writeFileSync(
        path.join(outDir, file),
        pageShell
            .replace('__TITLE__', `${p.letter}. ${p.meta.title}`)
            .replace('/*__COMPONENT_CSS__*/', component)
            .replace('<!--__BODY__-->', p.body),
    );
}

const kb = (f) => (fs.statSync(f).size / 1024).toFixed(1);
console.log(`built preview.html (${kb(path.join(DIR, 'preview.html'))} KB) and ${pages.length} pages:`);
for (const p of pages) {
    const file = `${p.letter.toLowerCase()}-${p.name}.html`;
    console.log(`  pages/${file}  (${kb(path.join(outDir, file))} KB)`);
}
