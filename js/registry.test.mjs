// The guard that keeps level URLs working as levels are renamed and removed:
//   node js/registry.test.mjs
//
// Staff rename and drop levels regularly. A URL that 404s throws away whatever
// ranking and inbound links it had earned, so every slug the site has ever
// published must keep resolving to something useful.

import { updateRegistry, planPages, GRACE_DAYS } from '../scripts/seo/registry.mjs';
import { levelSlug, levelForSlug, slugify } from './util.js';

let failed = 0;
const is = (name, got, want) => {
    const pass = JSON.stringify(got) === JSON.stringify(want);
    console.log(`  ${pass ? 'ok  ' : 'FAIL'}   ${name}${pass ? '' : `\n           got  ${JSON.stringify(got)}\n           want ${JSON.stringify(want)}`}`);
    if (!pass) failed++;
};
const L = (path, name) => ({ path, name });
const kinds = (registry, live, day) =>
    Object.fromEntries(planPages(registry, live, day).map((p) => [p.slug, p.to ? `${p.kind}:${p.to}` : p.kind]));

console.log('\n── slugs ──');
is('spaces and punctuation', slugify('top 0 (neiro)'), 'top-0-neiro');
is('underscores', slugify('a_n_i'), 'a-n-i');
is('leading digits kept', slugify('00 genesis'), '00-genesis');
is('accents folded', slugify('Café Noir'), 'cafe-noir');
is('nothing usable', slugify('---'), 'level');

{
    const paths = ['a b', 'a-b'];
    is('colliding paths get distinct slugs', new Set(paths.map((p) => levelSlug(p, paths))).size, 2);
    const levels = paths.map((p) => L(p, p));
    is('and each still resolves back', paths.map((p) => levelForSlug(levels, levelSlug(p, paths)).path), paths);
}

console.log('\n── a level renamed in place keeps its URL ──');
{
    let r = updateRegistry({ version: 1, slugs: {} }, [L('acheron', 'Acheron')], '2026-01-01');
    r = updateRegistry(r, [L('acheron', 'Acheron Reborn')], '2026-01-02');
    is('same slug', Object.keys(r.slugs), ['acheron']);
    is('not retired', r.slugs.acheron.retiredAt, null);
    is('name updated', r.slugs.acheron.name, 'Acheron Reborn');
    is('serves a live page', kinds(r, [L('acheron', 'Acheron Reborn')], '2026-01-02'), { acheron: 'live' });
}

console.log('\n── the path itself changing redirects the old URL ──');
{
    let r = updateRegistry({ version: 1, slugs: {} }, [L('old-path', 'Tartarus')], '2026-01-01');
    r = updateRegistry(r, [L('new-path', 'Tartarus')], '2026-01-02');
    is('old slug retired', r.slugs['old-path'].retiredAt, '2026-01-02');
    is('and points at the new one', r.slugs['old-path'].redirectTo, 'new-path');
    is('plan', kinds(r, [L('new-path', 'Tartarus')], '2026-01-02'),
        { 'new-path': 'live', 'old-path': 'redirect:/level/new-path' });
}

console.log('\n── an unrelated level cannot capture the redirect ──');
{
    let r = updateRegistry({ version: 1, slugs: {} }, [L('gone', 'Zodiac'), L('kept', 'Kept')], '2026-01-01');
    r = updateRegistry(r, [L('kept', 'Kept')], '2026-01-02');
    is('no redirect invented', r.slugs.gone.redirectTo, null);
}

console.log('\n── a removed level keeps a page, then redirects ──');
{
    let r = updateRegistry({ version: 1, slugs: {} }, [L('gone', 'Zodiac'), L('kept', 'Kept')], '2026-01-01');
    r = updateRegistry(r, [L('kept', 'Kept')], '2026-01-02');
    const live = [L('kept', 'Kept')];
    is('retired, not deleted', r.slugs.gone.retiredAt, '2026-01-02');
    is('inside the grace period it still has a page', kinds(r, live, '2026-02-01').gone, 'retired');
    const afterGrace = new Date(Date.parse('2026-01-02') + (GRACE_DAYS + 1) * 86400000).toISOString().slice(0, 10);
    is('after the grace period it redirects to the list', kinds(r, live, afterGrace).gone, 'redirect:/list');
    is('never a 404', planPages(r, live, afterGrace).some((p) => !p.kind), false);
}

console.log('\n── a level that comes back is live again ──');
{
    let r = updateRegistry({ version: 1, slugs: {} }, [L('gone', 'Zodiac')], '2026-01-01');
    r = updateRegistry(r, [], '2026-01-02');
    r = updateRegistry(r, [L('gone', 'Zodiac')], '2026-03-01');
    is('retirement cleared', r.slugs.gone.retiredAt, null);
    is('serves a live page', kinds(r, [L('gone', 'Zodiac')], '2026-03-01').gone, 'live');
}

console.log('\n── history is never dropped ──');
{
    let r = updateRegistry({ version: 1, slugs: {} }, [L('a', 'A'), L('b', 'B')], '2026-01-01');
    r = updateRegistry(r, [L('c', 'C')], '2026-06-01');
    is('all three slugs remembered', Object.keys(r.slugs).sort(), ['a', 'b', 'c']);
    is('firstSeen preserved', r.slugs.a.firstSeen, '2026-01-01');
}

console.log('\n── a level the registry has not seen yet still gets a page ──');
is('unknown slug planned as live', kinds({ version: 1, slugs: {} }, [L('brand-new', 'Brand New')], '2026-01-01'),
    { 'brand-new': 'live' });

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
