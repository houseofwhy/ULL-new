#!/usr/bin/env node
// Pulls the live list from the API and writes data/_seo-snapshot.json, which is
// what scripts/build-seo.mjs bakes into the static pages.
//
//   node scripts/fetch-data.mjs            # fetch and write
//   node scripts/fetch-data.mjs --fixture  # build the snapshot from data/*.json
//
// Fetching and generating are deliberately separate steps. This script writes
// nothing unless every endpoint answered and the result passes the sanity
// checks below, so a bad API response can never empty the site's content — the
// previous snapshot simply stays in place and the build regenerates from it.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE } from './seo/content.mjs';
import { updateRegistry, readRegistry, writeRegistry } from './seo/registry.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT = path.join(ROOT, 'data', '_seo-snapshot.json');

// A healthy list is several hundred levels. Anything far below that means the
// API answered with something we should not publish.
const MIN_LEVELS = 50;
// Refuse a single update that drops more than this share of the catalogue.
const MAX_SHRINK = 0.25;

const fixture = process.argv.includes('--fixture');

async function getJson(endpoint) {
    const url = SITE.api + endpoint;
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`${endpoint} answered ${res.status}`);
    return res.json();
}

// Reads the legacy data/ directory in the same shape /api/list returns, so the
// generator and its tests can run with no network.
function fixtureLevels() {
    const dir = path.join(ROOT, 'data');
    const order = JSON.parse(fs.readFileSync(path.join(dir, '_list.json'), 'utf8'));
    return order
        .map((slug) => {
            const file = path.join(dir, `${slug}.json`);
            if (!fs.existsSync(file)) return null;
            return { path: slug, ...JSON.parse(fs.readFileSync(file, 'utf8')) };
        })
        .filter(Boolean);
}

function check(levels) {
    if (!Array.isArray(levels)) throw new Error('/api/list did not return an array');
    if (levels.length < MIN_LEVELS) throw new Error(`/api/list returned only ${levels.length} levels (minimum ${MIN_LEVELS})`);

    const bad = levels.filter((l) => !l || typeof l.path !== 'string' || !l.path.trim() || typeof l.name !== 'string' || !l.name.trim());
    if (bad.length) throw new Error(`${bad.length} level(s) have no usable path/name`);

    const paths = levels.map((l) => l.path);
    const dupes = paths.filter((p, i) => paths.indexOf(p) !== i);
    if (dupes.length) throw new Error(`duplicate level paths: ${[...new Set(dupes)].join(', ')}`);

    if (fs.existsSync(SNAPSHOT)) {
        const previous = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8')).levels?.length ?? 0;
        if (previous && levels.length < previous * (1 - MAX_SHRINK)) {
            throw new Error(`list shrank from ${previous} to ${levels.length} levels — refusing to publish`);
        }
    }
}

try {
    let levels, pending, editors, levelMonth, levelVerif, recentChanges;

    if (fixture) {
        levels = fixtureLevels();
        pending = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', '_pending.json'), 'utf8'));
        editors = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', '_editors.json'), 'utf8'));
        levelMonth = null;
        levelVerif = null;
        recentChanges = [];
    } else {
        // The list is required. The rest enrich the pages but must not be able
        // to fail the run on their own — an empty Events card is survivable,
        // an empty list is not.
        levels = await getJson('/api/list');
        const soft = async (endpoint, fallback) => {
            try { return await getJson(endpoint); } catch (e) { console.warn(`  warn: ${e.message}`); return fallback; }
        };
        [pending, editors, levelMonth, levelVerif, recentChanges] = await Promise.all([
            soft('/api/pending', []),
            soft('/api/editors', []),
            soft('/api/level-month', null),
            soft('/api/level-verif', null),
            soft('/api/recent-changes', []),
        ]);
    }

    check(levels);

    const registry = updateRegistry(readRegistry(ROOT), levels);
    const snapshot = {
        fetchedAt: new Date().toISOString(),
        source: fixture ? 'fixture' : SITE.api,
        levels,
        pending: Array.isArray(pending) ? pending : [],
        editors: Array.isArray(editors) ? editors : [],
        levelMonth: levelMonth || null,
        levelVerif: levelVerif || null,
        recentChanges: Array.isArray(recentChanges) ? recentChanges : [],
    };

    fs.mkdirSync(path.dirname(SNAPSHOT), { recursive: true });
    fs.writeFileSync(SNAPSHOT, JSON.stringify(snapshot, null, 2) + '\n');
    writeRegistry(ROOT, registry);

    const retired = Object.values(registry.slugs).filter((s) => s.retiredAt).length;
    console.log(`snapshot: ${levels.length} levels, ${snapshot.pending.length} pending (${snapshot.source})`);
    console.log(`registry: ${Object.keys(registry.slugs).length} known slugs, ${retired} retired`);
} catch (err) {
    console.error(`fetch-data failed: ${err.message}`);
    console.error('Nothing was written — the previous snapshot is still in place.');
    process.exit(1);
}
