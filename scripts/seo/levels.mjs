// Static content for the per-level pages and for the baked list pages.
//
// Everything here renders from the snapshot in data/_seo-snapshot.json, so it
// is what a crawler reads. Visitors see the same information a moment later,
// live from the API, once the Vue app mounts.

import { SITE } from './content.mjs';
import { levelSlug, getYoutubeIdFromUrl, levelThumbnail } from '../../js/util.js';
import { upcomingRanking } from '../../js/formulas.js';
import { buildLeaderboard } from '../../js/leaderboard.js';

export const esc = (s) => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const list = (items) => items.filter(Boolean).join(', ');

// ── level facts ─────────────────────────────────────────────────────────────

// Adds the three list positions, matching how the pages number themselves:
// verified levels count towards Main and Future regardless of their flags.
export function annotate(levels) {
    let mainRank = 0, futureRank = 0;
    return levels.map((level, i) => {
        const out = { ...level, allLevelsRank: i + 1 };
        if (level.isMain || level.isVerified) out.mainRank = ++mainRank;
        if (level.isFuture || level.isVerified) out.futureRank = ++futureRank;
        return out;
    });
}

export function statusOf(level) {
    if (level.isVerified) return 'Verified';
    if (level.percentFinished === 100) return 'Being verified';
    if (!level.percentFinished) return 'Layout';
    return `Decoration ${level.percentFinished}% finished`;
}

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export function bestRecord(level) {
    const best = (level.records || []).filter((r) => r.user && r.user !== 'none' && num(r.percent) > 0)
        .sort((a, b) => num(b.percent) - num(a.percent))[0];
    return best || null;
}

export function bestRun(level) {
    const best = (level.run || []).filter((r) => r.user && r.user !== 'none' && String(r.percent) !== '0')[0];
    return best || null;
}

export function lengthOf(level) {
    const s = num(level.length);
    if (!s) return '';
    return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export const levelUrl = (level, paths) => `/level/${levelSlug(level.path, paths)}`;

// ── one level's page ────────────────────────────────────────────────────────

export function levelPage(level, paths) {
    const slug = levelSlug(level.path, paths);
    const route = `/level/${slug}`;
    const creators = (level.creators || []).filter(Boolean);
    const record = bestRecord(level);
    const run = bestRun(level);
    const status = statusOf(level);
    const verifier = level.verifier && level.verifier !== 'none' ? level.verifier : '';

    const descBits = [
        `${level.name} is ${level.isVerified ? 'a verified' : 'an upcoming'} Extreme Demon in Geometry Dash`,
        level.author ? `hosted by ${level.author}` : '',
        `ranked #${level.allLevelsRank} on the Upcoming Levels List`,
    ].filter(Boolean);
    const description = `${descBits.join(', ')}. ${status}.` +
        (record ? ` Best record ${record.percent}% by ${record.user}.` : '') +
        ' Creators, verifier, progress and records.';

    const facts = [
        ['Position', `#${level.allLevelsRank} in <a href="/list">All Levels</a>` +
            (level.mainRank ? ` · #${level.mainRank} in <a href="/listmain">Main List</a>` : '') +
            (level.futureRank ? ` · #${level.futureRank} in <a href="/listfuture">Future List</a>` : '')],
        ['Host', esc(level.author)],
        creators.length ? ['Creators', esc(list(creators))] : null,
        verifier ? ['Verifier', esc(verifier)] : null,
        ['Status', esc(status)],
        record ? ['Best record', `${esc(record.percent)}% by ${esc(record.user)}`] : null,
        run ? ['Best run', `${esc(run.percent)}% by ${esc(run.user)}`] : null,
        level.id && level.id !== 'private' ? ['Level ID', esc(level.id)] : null,
        lengthOf(level) ? ['Length', esc(lengthOf(level))] : null,
        level.lastUpd ? ['Last updated', esc(level.lastUpd)] : null,
        (level.tags || []).length ? ['Tags', esc(list(level.tags))] : null,
    ].filter(Boolean);

    const videos = [
        level.showcase ? ['Showcase', level.showcase] : null,
        level.verification ? ['Verification', level.verification] : null,
        level.frameCounter ? ['Frame Windows Counter', level.frameCounter] : null,
    ].filter(Boolean);

    const body = `
<p><strong>${esc(level.name)}</strong> is ${level.isVerified ? 'a verified' : 'an upcoming'}
Top 1&ndash;100 Extreme Demon in <strong>Geometry Dash</strong>${level.author ? `, hosted by ${esc(level.author)}` : ''},
currently ranked <strong>#${level.allLevelsRank}</strong> on the
<a href="/list">Upcoming Levels List</a>.</p>
<dl class="seo-facts">
${facts.map(([k, v]) => `  <dt>${esc(k)}</dt>\n  <dd>${v}</dd>`).join('\n')}
</dl>
${videos.length ? `<h2>Videos</h2>\n<ul>\n${videos.map(([label, url]) => `  <li><a href="${esc(url)}" rel="noopener">${esc(label)}</a></li>`).join('\n')}\n</ul>` : ''}
<h2>About this ranking</h2>
<p>The Upcoming Levels List catalogues Extreme Demons still in development,
decoration or verification, and forecasts where each one will place on the
Demonlist once it is released. ${esc(level.name)}'s position is set by the ULL
staff team according to the <a href="/information">list guidelines</a>, and
moves as the level progresses.</p>`;

    const videoId = getYoutubeIdFromUrl(level.showcase) || getYoutubeIdFromUrl(level.verification);
    const graph = [
        {
            '@type': 'WebPage',
            '@id': `${SITE.origin}${route}#webpage`,
            url: SITE.origin + route,
            name: `${level.name} — Upcoming Levels List`,
            description,
            inLanguage: 'en',
            isPartOf: { '@id': SITE.origin + '/#website' },
            mainEntity: { '@id': `${SITE.origin}${route}#level` },
        },
        {
            '@type': 'CreativeWork',
            '@id': `${SITE.origin}${route}#level`,
            name: level.name,
            url: SITE.origin + route,
            description,
            genre: 'Geometry Dash Extreme Demon',
            ...(creators.length ? { creator: creators.map((n) => ({ '@type': 'Person', name: n })) } : {}),
            ...(levelThumbnail(level) ? { image: levelThumbnail(level) } : {}),
            isPartOf: { '@type': 'VideoGame', name: 'Geometry Dash' },
            ...(level.tags || []).length ? { keywords: level.tags.join(', ') } : {},
        },
        {
            '@type': 'BreadcrumbList',
            '@id': `${SITE.origin}${route}#breadcrumb`,
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: SITE.name, item: SITE.origin + '/' },
                { '@type': 'ListItem', position: 2, name: 'All Levels', item: SITE.origin + '/list' },
                { '@type': 'ListItem', position: 3, name: level.name, item: SITE.origin + route },
            ],
        },
    ];
    if (videoId) {
        graph.push({
            '@type': 'VideoObject',
            '@id': `${SITE.origin}${route}#video`,
            name: `${level.name} — Geometry Dash`,
            description: `Footage of ${level.name}, an Extreme Demon ranked #${level.allLevelsRank} on the Upcoming Levels List.`,
            thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            embedUrl: `https://www.youtube.com/embed/${videoId}`,
            uploadDate: isoDate(level.lastUpd),
        });
    }

    return {
        route,
        dir: `level/${slug}`,
        priority: '0.5',
        changefreq: 'weekly',
        title: `ULL — ${level.name}`,
        socialTitle: `${level.name} — Geometry Dash Extreme Demon | Upcoming Levels List`,
        description,
        h1: level.name,
        body,
        graph,
    };
}

// The pending list stores DD.MM.YYYY.
function isoDate(ddmmyyyy) {
    const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(String(ddmmyyyy ?? ''));
    return m ? `${m[3]}-${m[2]}-${m[1]}` : undefined;
}

// A level that has left the list. The URL keeps working and says what happened
// rather than 404ing, but it must not stay in the index.
export function retiredPage(entry, slug) {
    const route = `/level/${slug}`;
    return {
        route,
        dir: `level/${slug}`,
        noindex: true,
        title: `ULL — ${entry.name}`,
        socialTitle: `${entry.name} — no longer listed | Upcoming Levels List`,
        description: `${entry.name} is no longer on the Upcoming Levels List.`,
        h1: entry.name,
        body: `
<p><strong>${esc(entry.name)}</strong> is no longer catalogued on the Upcoming Levels List.
Levels leave the list when they are published and move to the Demonlist, or when the staff
team removes them.</p>
<p>Browse the current catalogue on <a href="/list">All Levels</a>, or see which levels are
closest to release on the <a href="/listfuture">Future List</a> and
<a href="/upcoming">Upcoming Levels</a>.</p>`,
        graph: [{
            '@type': 'WebPage',
            '@id': `${SITE.origin}${route}#webpage`,
            url: SITE.origin + route,
            name: entry.name,
            inLanguage: 'en',
            isPartOf: { '@id': SITE.origin + '/#website' },
        }],
    };
}

// ── the live data baked into the section pages ──────────────────────────────

const MAX_ROWS = 100;

function levelTable(rows, paths, { rankLabel = 'Position', extra = null, extraLabel = '' } = {}) {
    const body = rows.map(({ rank, level, extraValue }) => `    <tr>
      <td>${rank}</td>
      <td><a href="${levelUrl(level, paths)}">${esc(level.name)}</a></td>
      <td>${esc(level.author || '')}</td>
      <td>${esc(statusOf(level))}</td>${extra ? `\n      <td>${esc(extraValue)}</td>` : ''}
    </tr>`).join('\n');
    return `<div class="seo-table-wrap">
<table class="seo-table">
  <thead><tr><th>${rankLabel}</th><th>Level</th><th>Host</th><th>Status</th>${extra ? `<th>${extraLabel}</th>` : ''}</tr></thead>
  <tbody>
${body}
  </tbody>
</table>
</div>`;
}

function tail(shown, total, where) {
    return total > shown
        ? `<p class="seo-more">Showing the top ${shown} of ${total} ${where}. The full, continuously updated ranking is on this page once it loads.</p>`
        : '';
}

const stamp = (snapshot) => `<p class="seo-stamp">Ranking as of ${new Date(snapshot.fetchedAt).toISOString().slice(0, 10)}. Visitors see live data.</p>`;

export function bakedBlocks(snapshot) {
    const levels = annotate(snapshot.levels || []);
    const paths = levels.map((l) => l.path);
    const blocks = {};

    const section = (heading, rows, total, where, opts) =>
        rows.length ? `\n<h2>${heading}</h2>\n${levelTable(rows, paths, opts)}\n${tail(rows.length, total, where)}${stamp(snapshot)}` : '';

    // All Levels / Main / Future — the same ranking at three thresholds.
    const all = levels.map((l) => ({ rank: `#${l.allLevelsRank}`, level: l }));
    blocks['/list'] = section('Current ranking', all.slice(0, MAX_ROWS), all.length, 'levels');

    const main = levels.filter((l) => l.mainRank).map((l) => ({ rank: `#${l.mainRank}`, level: l }));
    blocks['/listmain'] = section('Current Main List', main.slice(0, MAX_ROWS), main.length, 'levels');

    const future = levels.filter((l) => l.futureRank).map((l) => ({ rank: `#${l.futureRank}`, level: l }));
    blocks['/listfuture'] = section('Current Future List', future.slice(0, MAX_ROWS), future.length, 'levels');

    // Upcoming Levels — ranked by the progress players have actually made.
    const upcoming = upcomingRanking(levels.map((l) => ({ ...l }))).map((level, i) => {
        const record = bestRecord(level);
        const run = bestRun(level);
        return {
            rank: `#${i + 1}`,
            level,
            extraValue: [record ? `${record.percent}% record` : '', run ? `${run.percent}% run` : ''].filter(Boolean).join(' · ') || '—',
        };
    });
    blocks['/upcoming'] = section('Closest to verification', upcoming.slice(0, MAX_ROWS), upcoming.length, 'levels',
        { rankLabel: 'Position', extra: true, extraLabel: 'Best progress' });

    // Pending List.
    const pending = (snapshot.pending || []);
    const groups = [
        ['Pending placements', pending.filter((p) => !isMove(p) && !p.indefinite)],
        ['Pending movements', pending.filter(isMove)],
        ['Pending removals or indefinite', pending.filter((p) => !isMove(p) && p.indefinite)],
    ];
    const pendingHtml = groups.filter(([, rows]) => rows.length).map(([heading, rows]) => `
<h2>${heading}</h2>
<ul>
${rows.map((p) => `  <li>${p.link ? `<a href="${esc(p.link)}" rel="noopener">${esc(p.name)}</a>` : esc(p.name)} — ${esc(placementLabel(p))}</li>`).join('\n')}
</ul>`).join('\n');
    blocks['/pending'] = pendingHtml ? pendingHtml + stamp(snapshot) : '';

    // Leaderboard.
    const players = buildLeaderboard(levels.map((l) => [l, null])).slice(0, 50);
    blocks['/leaderboard'] = players.length ? `
<h2>Current top players</h2>
<div class="seo-table-wrap">
<table class="seo-table">
  <thead><tr><th>Position</th><th>Player</th><th>Score</th><th>Entries</th></tr></thead>
  <tbody>
${players.map((p) => `    <tr><td>#${p.globalRank}</td><td>${esc(p.name)}</td><td>${p.total.toFixed(2)}</td><td>${p.records.length}</td></tr>`).join('\n')}
  </tbody>
</table>
</div>
${stamp(snapshot)}` : '';

    // Events.
    const event = (heading, level) => {
        if (!level) return '';
        const listed = levels.find((l) => l.path === level.path || l.name === level.name);
        const link = listed ? `<a href="${levelUrl(listed, paths)}">${esc(level.name)}</a>` : esc(level.name);
        return `\n<h2>${heading}</h2>\n<p>${link}${level.author ? ` by ${esc(level.author)}` : ''}${level.verifier ? ` · verifier ${esc(level.verifier)}` : ''}.</p>`;
    };
    const events = event('Level of the Month', snapshot.levelMonth) + event('Closest to Verification', snapshot.levelVerif);
    blocks['/events'] = events ? events + stamp(snapshot) : '';

    return blocks;
}

const isMove = (p) => ['up', 'down'].includes(String(p.placement || '').toLowerCase());

function placementLabel(p) {
    const v = String(p.placement || '?');
    if (v === 'up') return 'moving up';
    if (v === 'down') return 'moving down';
    if (v === '?') return 'placement unknown';
    return `expected around #${v}`;
}
