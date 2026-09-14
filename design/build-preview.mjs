#!/usr/bin/env node
// Assembles design/preview.html from the shipped component layer (css/ull-v2.css)
// and the fragments in design/templates/. The deck reads the real stylesheet
// rather than a copy, so it cannot drift from what the site actually renders.
//
//   node design/build-preview.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ORDER = ['home', 'level-panel', 'upcoming', 'leaderboard', 'pending', 'events'];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const pages = ORDER.map((name) => {
    const raw = fs.readFileSync(path.join(DIR, 'templates', `${name}.html`), 'utf8');
    const meta = {};
    const block = raw.match(/<!--meta\n([\s\S]*?)\n-->/);
    if (!block) throw new Error(`${name}.html has no meta block`);
    for (const line of block[1].split('\n')) {
        const at = line.indexOf(':');
        if (at > 0) meta[line.slice(0, at).trim()] = line.slice(at + 1).trim();
    }
    return { name, meta, body: raw.slice(block[0].length).trim() };
});

const component = fs.readFileSync(path.join(DIR, '..', 'css', 'ull-v2.css'), 'utf8');
const shell = fs.readFileSync(path.join(DIR, 'preview.shell.html'), 'utf8');

const nav = pages
    .map((p, i) => `<a class="rail__item${i === 0 ? ' is-on' : ''}" href="#${p.name}"><b>${esc(p.meta.title)}</b><code>${esc(p.meta.route)}</code></a>`)
    .join('\n        ');

const sections = pages
    .map((p) => `
    <section class="pg" id="${p.name}">
        <div class="pg__head">
            <div class="pg__label">
                <h2>${esc(p.meta.title)}</h2>
                <code class="pg__route">${esc(p.meta.route)}</code>
            </div>
            <code class="pg__files">${esc(p.meta.files)}</code>
        </div>
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
        <div class="frame">
            <div class="frame__bar"><span></span><span></span><span></span><code>ull.pages.dev${esc(p.meta.route.split(' · ')[0])}</code></div>
            <div class="frame__view root" data-mock>
${p.body}
            </div>
        </div>
    </section>`)
    .join('\n');

const out = shell
    .replace('/*__COMPONENT_CSS__*/', component)
    .replace('<!--__NAV__-->', nav)
    .replace('<!--__SECTIONS__-->', sections);

fs.writeFileSync(path.join(DIR, 'preview.html'), out);
console.log(`built design/preview.html from ${pages.length} templates (${(out.length / 1024).toFixed(1)} KB)`);
