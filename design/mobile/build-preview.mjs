#!/usr/bin/env node
// Assembles design/mobile/preview.html from the shipped stylesheets
// (css/ull-v2.css and css/pages/mobile-v2.css) and the fragments in
// design/mobile/templates/. It reads the real files rather than copies, the
// way design/ and design/home/ do, so the deck cannot drift from the site —
// the copy that used to sit here as mob-v2.css had.
//
//   node design/mobile/build-preview.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(DIR, '..', '..');
const ORDER = ['home', 'list', 'upcoming', 'leaderboard', 'pending', 'events', 'sheets', 'levelpage'];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const pages = ORDER.map((name) => {
    const raw = fs.readFileSync(path.join(DIR, 'templates', `${name}.html`), 'utf8');
    const block = raw.match(/<!--meta\n([\s\S]*?)\n-->/);
    if (!block) throw new Error(`${name}.html has no meta block`);
    const meta = {};
    for (const line of block[1].split('\n')) {
        const at = line.indexOf(':');
        if (at > 0) meta[line.slice(0, at).trim()] = line.slice(at + 1).trim();
    }
    return { name, meta, body: raw.slice(block[0].length).trim() };
});

const shell = fs.readFileSync(path.join(DIR, 'preview.shell.html'), 'utf8');
const out = shell
    .replace('/*__SHARED_CSS__*/', fs.readFileSync(path.join(ROOT, 'css', 'ull-v2.css'), 'utf8'))
    .replace('/*__MOBILE_CSS__*/', fs.readFileSync(path.join(ROOT, 'css', 'pages', 'mobile-v2.css'), 'utf8'))
    .replace('<!--__NAV__-->', pages
        .map((p, i) => `<a class="rail__item${i === 0 ? ' is-on' : ''}" href="#${p.name}"><b>${esc(p.meta.title)}</b><code>${esc(p.meta.route)}</code></a>`)
        .join('\n        '))
    .replace('<!--__SECTIONS__-->', pages.map((p) => `
    <section class="pg" id="${p.name}">
        <div class="pg__head">
            <div class="pg__label">
                <h2>${esc(p.meta.title)}</h2>
                <code class="pg__route">${esc(p.meta.route)}</code>
            </div>
            <code class="pg__files">${esc(p.meta.files)}</code>
        </div>
        <div class="pg__cols">
            <div class="pg__notes">
                <div class="note note--problem">
                    <div class="note__k">What is wrong now</div>
                    <p>${esc(p.meta.problem)}</p>
                </div>
                <div class="note note--change">
                    <div class="note__k">What the template changes</div>
                    <p>${esc(p.meta.change)}</p>
                </div>
            </div>
            <div class="phone">
                <div class="phone__screen root" data-mock>
${p.body}
                </div>
            </div>
        </div>
    </section>`).join('\n'));

fs.writeFileSync(path.join(DIR, 'preview.html'), out);
console.log(`built design/mobile/preview.html from ${pages.length} templates (${(out.length / 1024).toFixed(1)} KB)`);
