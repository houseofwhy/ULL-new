// The level-slug registry: data/_level-registry.json.
//
// Levels get renamed and removed regularly, and a URL that 404s throws away
// whatever ranking and inbound links it had earned. The registry remembers
// every slug the site has ever published so each of those cases resolves to
// something useful instead:
//
//   renamed level      the API `path` is unchanged, so the URL is unchanged —
//                      only the page's title and content update
//   path itself edited detected by matching the old name against a slug that is
//                      new this run; the old URL 301s to the new one
//   level removed      the page stays for a grace period, marked noindex and
//                      saying so, then the URL 301s to /list
//   level comes back   the retirement is cleared and the page returns
//
// Nothing is ever deleted from the registry, so a slug can never be silently
// reused for a different level.

import fs from 'node:fs';
import path from 'node:path';
import { levelSlug } from '../../js/util.js';

export const REGISTRY_FILE = 'data/_level-registry.json';

// How long a removed level keeps its own page before the URL becomes a
// redirect to the list. Long enough for anyone still linking to it to notice.
export const GRACE_DAYS = 180;

const today = () => new Date().toISOString().slice(0, 10);
const normalizeName = (name) => String(name ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

export function readRegistry(root) {
    const file = path.join(root, REGISTRY_FILE);
    if (!fs.existsSync(file)) return { version: 1, slugs: {} };
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { version: 1, slugs: parsed.slugs ?? {} };
}

export function writeRegistry(root, registry) {
    const file = path.join(root, REGISTRY_FILE);
    // Sorted so the file's diff shows real changes, not key reshuffling.
    const slugs = Object.fromEntries(Object.entries(registry.slugs).sort(([a], [b]) => a.localeCompare(b)));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ version: 1, slugs }, null, 2) + '\n');
}

export function updateRegistry(registry, levels, now = today()) {
    const slugs = { ...registry.slugs };
    const paths = levels.map((l) => l.path);

    const live = new Map();
    for (const level of levels) live.set(levelSlug(level.path, paths), level);

    // Slugs seen for the first time in this run — candidates for "the staff
    // edited the path of an existing level" rather than "a brand new level".
    const freshSlugs = [...live.keys()].filter((s) => !slugs[s]);

    for (const [slug, level] of live) {
        const existing = slugs[slug];
        slugs[slug] = {
            path: level.path,
            name: level.name,
            firstSeen: existing?.firstSeen ?? now,
            lastSeen: now,
            // A level that reappears is live again: drop any retirement.
            retiredAt: null,
            redirectTo: null,
        };
    }

    for (const [slug, entry] of Object.entries(slugs)) {
        if (live.has(slug)) continue;

        if (entry.retiredAt) continue; // already handled on an earlier run

        // Did this level simply move to a different path? Match on name, and
        // only against slugs that are new this run, so an unrelated level that
        // happens to share a name cannot capture the redirect.
        const renamed = freshSlugs.find((s) => normalizeName(slugs[s].name) === normalizeName(entry.name));

        slugs[slug] = { ...entry, retiredAt: now, redirectTo: renamed ?? null };
    }

    return { version: 1, slugs };
}

const daysBetween = (from, to) => Math.floor((Date.parse(to) - Date.parse(from)) / 86400000);

// What each known slug should serve right now.
//   { slug, kind: 'live',     level }        a normal level page
//   { slug, kind: 'retired',  entry }        a "no longer listed" page (noindex)
//   { slug, kind: 'redirect', to }           a 301, no page
export function planPages(registry, levels, now = today()) {
    const paths = levels.map((l) => l.path);
    const bySlug = new Map(levels.map((l) => [levelSlug(l.path, paths), l]));
    const plan = [];

    for (const [slug, entry] of Object.entries(registry.slugs)) {
        const level = bySlug.get(slug);
        if (level) { plan.push({ slug, kind: 'live', level, entry }); continue; }
        if (entry.redirectTo) { plan.push({ slug, kind: 'redirect', to: `/level/${entry.redirectTo}`, entry }); continue; }
        if (entry.retiredAt && daysBetween(entry.retiredAt, now) >= GRACE_DAYS) {
            plan.push({ slug, kind: 'redirect', to: '/list', entry });
            continue;
        }
        plan.push({ slug, kind: 'retired', entry });
    }

    // Any level the registry has not caught up with yet (a build run without a
    // fresh fetch) still gets a page rather than being dropped.
    for (const [slug, level] of bySlug) {
        if (!registry.slugs[slug]) plan.push({ slug, kind: 'live', level, entry: null });
    }

    return plan.sort((a, b) => a.slug.localeCompare(b.slug));
}
