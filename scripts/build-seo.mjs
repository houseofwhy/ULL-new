#!/usr/bin/env node
// Generates the static, crawlable HTML shell for every public route, plus
// sitemap.xml and llms.txt.
//
//   node scripts/build-seo.mjs
//
// index.html is both the input shell and one of the outputs: the two marker
// regions (seo:head and seo:content) are emptied before anything is generated,
// so the script is safe to run repeatedly. Everything outside those markers —
// stylesheets, the Vue template, shared meta — is hand-maintained in index.html
// and copied verbatim into every generated page.
//
// Cloudflare Pages serves a real file ahead of the `/* -> /index.html` SPA
// fallback in _redirects, so /list is answered by list/index.html with its own
// title, description, canonical URL and content — while the Vue router still
// takes over for real visitors the moment main.js runs.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE, NAV, PAGES, FAQ } from './seo/content.mjs';
import { guidelinesData } from '../js/_guidelines.js';
import { readRegistry, planPages } from './seo/registry.mjs';
import { levelPage, retiredPage, bakedBlocks, annotate } from './seo/levels.mjs';
import { levelSlug } from '../js/util.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HEAD_START = '<!-- seo:head:start -->';
const HEAD_END = '<!-- seo:head:end -->';
const BODY_START = '<!-- seo:content:start -->';
const BODY_END = '<!-- seo:content:end -->';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// The last successful fetch. Generation never depends on the network: if the
// snapshot is missing the pages still build, just without the live rankings.
const SNAPSHOT_FILE = path.join(ROOT, 'data', '_seo-snapshot.json');
const snapshot = fs.existsSync(SNAPSHOT_FILE) ? JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8')) : null;
const baked = snapshot ? bakedBlocks(snapshot) : {};
const registry = readRegistry(ROOT);
const levelPlan = snapshot ? planPages(registry, snapshot.levels) : [];
// Cross-list positions are only knowable from the full ordering, so annotate
// the whole list up front and look each level up by its path.
const annotated = new Map(snapshot ? annotate(snapshot.levels).map((l) => [l.path, l]) : []);
const annotateOne = (level) => annotated.get(level.path) ?? level;
const stripTags = (s) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const today = new Date().toISOString().slice(0, 10);

function emptyRegion(html, start, end) {
    const a = html.indexOf(start);
    const b = html.indexOf(end);
    if (a === -1 || b === -1) throw new Error(`missing markers ${start} / ${end} in index.html`);
    return html.slice(0, a + start.length) + '\n' + html.slice(b);
}

function fillRegion(html, start, end, content) {
    const a = html.indexOf(start);
    const b = html.indexOf(end);
    return html.slice(0, a + start.length) + '\n' + content + '\n    ' + html.slice(b);
}

// ── head ────────────────────────────────────────────────────────────────────

function jsonLd(page) {
    const url = SITE.origin + page.route;
    // Level pages describe themselves — see scripts/seo/levels.mjs.
    if (page.graph) return indent(JSON.stringify({ '@context': 'https://schema.org', '@graph': page.graph }, null, 2));
    const graph = [];

    graph.push({
        '@type': page.type,
        '@id': url + '#webpage',
        url,
        name: page.socialTitle || page.title,
        description: page.description,
        inLanguage: 'en',
        isPartOf: { '@id': SITE.origin + '/#website' },
        about: { '@id': SITE.origin + '/#organization' },
        primaryImageOfPage: SITE.logo,
    });

    if (page.route === '/') {
        graph.push({
            '@type': 'WebSite',
            '@id': SITE.origin + '/#website',
            url: SITE.origin + '/',
            name: SITE.name,
            alternateName: [SITE.shortName, 'ULL Geometry Dash', 'Upcoming Levels List Geometry Dash'],
            description: page.description,
            inLanguage: 'en',
            publisher: { '@id': SITE.origin + '/#organization' },
        });
        graph.push({
            '@type': 'Organization',
            '@id': SITE.origin + '/#organization',
            name: SITE.name,
            alternateName: SITE.shortName,
            url: SITE.origin + '/',
            logo: SITE.logo,
            description:
                'Community-run project cataloguing upcoming Top 1–100 Extreme Demons in Geometry Dash and forecasting their placement on the Demonlist. Not affiliated with RobTop Games.',
            sameAs: [SITE.x, SITE.discord],
        });
    } else {
        graph.push({
            '@type': 'BreadcrumbList',
            '@id': url + '#breadcrumb',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: SITE.name, item: SITE.origin + '/' },
                { '@type': 'ListItem', position: 2, name: page.h1, item: url },
            ],
        });
    }

    if (page.faq) {
        graph.push({
            '@type': 'FAQPage',
            '@id': url + '#faq',
            isPartOf: { '@id': url + '#webpage' },
            mainEntity: FAQ.map((f) => ({
                '@type': 'Question',
                name: f.q,
                acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
        });
    }

    return indent(JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2));
}

const indent = (text) => text.split('\n').map((l) => '        ' + l).join('\n');

function buildHead(page) {
    const url = SITE.origin + page.route;
    // <title> is the browser tab and stays short; link previews get the longer,
    // more descriptive wording.
    const social = page.socialTitle || page.title;
    return `    <title>${esc(page.title)}</title>
    <meta name="description" content="${esc(page.description)}" />
    <meta name="robots" content="${page.noindex ? 'noindex, follow' : 'index, follow'}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:title" content="${esc(social)}" />
    <meta property="og:description" content="${esc(page.description)}" />
    <meta property="og:url" content="${url}" />
    <meta name="twitter:title" content="${esc(social)}" />
    <meta name="twitter:description" content="${esc(page.description)}" />
    <script type="application/ld+json">
${jsonLd(page)}
    </script>`;
}

// ── body ────────────────────────────────────────────────────────────────────

function faqHtml() {
    return `
<h2>Frequently asked questions</h2>
<dl class="seo-faq">
${FAQ.map((f) => `  <dt>${esc(f.q)}</dt>\n  <dd>${esc(f.a)}</dd>`).join('\n')}
</dl>`;
}

function guidelinesHtml() {
    const parts = ['\n<h2>Guidelines</h2>'];
    for (const group of guidelinesData) {
        parts.push(`<h3>${esc(group.group)}</h3>`);
        if (group.intro) parts.push(group.intro.trim());
        for (const section of group.sections) {
            parts.push(`<h4>${esc(section.title)}</h4>`);
            parts.push(section.content.trim());
        }
    }
    return parts.join('\n');
}

function buildBody(page) {
    const nav = NAV.filter(([href]) => href !== page.route)
        .map(([href, label]) => `<a href="${href}">${label}</a>`)
        .join('\n      ');

    let inner = page.body.trim();
    if (page.faq) inner += '\n' + faqHtml().trim();
    if (page.guidelines) inner += '\n' + guidelinesHtml();
    // The live ranking, as of the last successful fetch. Visitors never read
    // this — the Vue app replaces it with current API data on mount.
    if (baked[page.route]) inner += '\n' + baked[page.route].trim();

    return `<div id="seo-fallback">
  <div class="seo-fallback__inner">
    <h1>${esc(page.h1)}</h1>
${inner}
    <nav class="seo-fallback__nav" aria-label="Sections">
      ${page.route === '/' ? '' : `<a href="/">${SITE.name}</a>\n      `}${nav}
    </nav>
    <p class="seo-fallback__note">
      This page needs JavaScript for the live, continuously updated list.
      Join the <a href="${SITE.discord}" rel="noopener">ULL Discord</a> or follow
      <a href="${SITE.x}" rel="noopener">@ull_gd</a> for updates. The list data is also
      available as a free public JSON API at <code>${SITE.api}/api/list</code>.
    </p>
  </div>
</div>`;
}

// ── write ───────────────────────────────────────────────────────────────────

const raw = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
let shell = emptyRegion(raw, HEAD_START, HEAD_END);
shell = emptyRegion(shell, BODY_START, BODY_END);

for (const page of PAGES) {
    let out = fillRegion(shell, HEAD_START, HEAD_END, buildHead(page));
    out = fillRegion(out, BODY_START, BODY_END, buildBody(page));

    const dest = page.dir ? path.join(ROOT, page.dir, 'index.html') : path.join(ROOT, 'index.html');
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, out);
    console.log('wrote', path.relative(ROOT, dest), `(${(out.length / 1024).toFixed(1)} KB)`);
}

// ── level pages ─────────────────────────────────────────────────────────────
// planPages() decides what each known slug serves: a live page, a "no longer
// listed" page during the grace period, or a redirect once that runs out.
const livePaths = (snapshot?.levels ?? []).map((l) => l.path);
const levelPages = [];
const levelRedirects = [];
let liveCount = 0, retiredCount = 0;

for (const item of levelPlan) {
    if (item.kind === "redirect") {
        levelRedirects.push(["/level/" + item.slug, item.to]);
        continue;
    }
    const page = item.kind === "live"
        ? levelPage(annotateOne(item.level), livePaths)
        : retiredPage(item.entry, item.slug);
    item.kind === "live" ? liveCount++ : retiredCount++;
    levelPages.push(page);

    let out = fillRegion(shell, HEAD_START, HEAD_END, buildHead(page));
    out = fillRegion(out, BODY_START, BODY_END, buildBody(page));
    const dest = path.join(ROOT, page.dir, "index.html");
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, out);
}
console.log("wrote " + liveCount + " level page(s), " + retiredCount + " retired, " + levelRedirects.length + " redirect(s)");

// A slug that has moved on to a redirect must not leave its old page behind.
const keepDirs = new Set(levelPages.map((p) => p.dir.replace(/^level\//, "")));
const levelRoot = path.join(ROOT, "level");
if (fs.existsSync(levelRoot)) {
    for (const entry of fs.readdirSync(levelRoot)) {
        if (!keepDirs.has(entry)) fs.rmSync(path.join(levelRoot, entry), { recursive: true, force: true });
    }
}

// _redirects: hand-written rules stay, the level block is regenerated.
{
    const file = path.join(ROOT, "_redirects");
    const START = "# seo:redirects:start";
    const END = "# seo:redirects:end";
    let text = fs.readFileSync(file, "utf8");
    const rules = levelRedirects.map(([from, to]) => from.padEnd(52) + " " + to.padEnd(32) + " 301");
    const block = [START, ...rules, END].join("\n");
    if (text.includes(START) && text.includes(END)) {
        text = text.slice(0, text.indexOf(START)) + block + text.slice(text.indexOf(END) + END.length);
    } else {
        // Must sit above the SPA catch-all, which has to stay last.
        text = text.replace("/*    /index.html    200", block + "\n\n/*    /index.html    200");
    }
    fs.writeFileSync(file, text);
    console.log("wrote _redirects (" + levelRedirects.length + " level redirect(s))");
}

// sitemap.xml
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGES.map(
    (p) => `  <url>
    <loc>${SITE.origin}${p.route}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
).join('\n')}
${levelPages.filter((p) => !p.noindex).map((p) => `  <url>
    <loc>${SITE.origin}${p.route}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap);
console.log('wrote sitemap.xml');

// js/seo-meta.js — the same titles and descriptions, for client-side
// navigations inside the SPA. Generated so there is one source of truth.
const metaEntries = PAGES.map((p) => [p.route, { title: p.title, socialTitle: p.socialTitle || p.title, description: p.description }]);
metaEntries.push([
    '/generator',
    { title: 'ULL — Level Generator', description: 'Internal tool for building Upcoming Levels List entries.', noindex: true },
]);
metaEntries.push([
    '/admin',
    { title: 'ULL — Admin', description: 'Staff-only administration panel.', noindex: true },
]);
const seoMeta = `// GENERATED by scripts/build-seo.mjs — do not edit by hand.
// Titles and descriptions for client-side navigations; the first paint of each
// URL already carries them from the matching static file.
export const PAGE_META = ${JSON.stringify(Object.fromEntries(metaEntries), null, 4)};
`;
fs.writeFileSync(path.join(ROOT, 'js', 'seo-meta.js'), seoMeta);
console.log('wrote js/seo-meta.js');

// llms.txt — a plain-text brief for LLM crawlers and answer engines.
const llms = `# ${SITE.name} (${SITE.shortName})

> ${stripTags(PAGES[0].description)}

${SITE.shortName} is a community-run catalogue of upcoming Top 1-100 Extreme Demons in
Geometry Dash: levels still in development, decoration or verification, ranked by the
position the staff team projects they will take on the Demonlist once released. It also
catalogues worthy unrated Extreme Demons. Not affiliated with RobTop Games.

Content is maintained by the ULL staff team (List Leader, Admins, Elder List Moderators
and List Moderators) and updated continuously.

## Pages

${PAGES.map((p) => `- [${p.h1}](${SITE.origin}${p.route}): ${stripTags(p.description)}`).join('\n')}

## Public API

All endpoints are free, public and need no authentication. Base URL: ${SITE.api}

- GET /api/list — every level, in rank order
- GET /api/list/main — Main List levels
- GET /api/list/future — Future List levels
- GET /api/levels/{position} — the level at a given 1-based rank
- GET /api/pending — Pending List entries
- GET /api/editors — the staff team
- GET /api/level-month — current Level of the Month
- GET /api/level-verif — current Closest to Verification
- GET /api/recent-changes — recent changes feed, grouped by date

Each level carries: name, author, creators, verifier, verification and showcase video
URLs, thumbnail, in-game level ID, difficulty rating, length, percent to qualify,
decoration progress, last update date, tags, best records and runs.

## Frequently asked questions

${FAQ.map((f) => `### ${f.q}\n\n${f.a}`).join('\n\n')}

## Contact

- Discord: ${SITE.discord}
- X: ${SITE.x}
`;
fs.writeFileSync(path.join(ROOT, 'llms.txt'), llms);
console.log('wrote llms.txt');
