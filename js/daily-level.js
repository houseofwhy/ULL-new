// Level of the Day: which level it is, and the record of which ones it was.
//
// The pick is a hash of the date over the unverified levels, in list order —
// the same formula the Events pages have always used, moved here so the pages,
// the hourly content job (scripts/record-daily-level.mjs) and the backfill
// (scripts/backfill-daily-levels.mjs) cannot disagree about it.
//
// Because it is computed from the list, it used to change whenever the list did:
// a level added or verified mid-day shifted every index and featured a different
// level. The archive pins it. The content job records each day's pick the first
// time it runs after midnight UTC, and the pages show the recorded pick when there
// is one — so the Level of the Day is whatever the archive says it was.

import { levelSlug } from './util.js';

export const DAILY_ARCHIVE_URL = '/data/_daily-levels.json';

// 'YYYY-MM-DD' for a date, in the reader's own calendar (the pages) or in UTC
// (the content job, which has no reader).
export function dateKey(d = new Date(), utc = false) {
    const y = utc ? d.getUTCFullYear() : d.getFullYear();
    const m = (utc ? d.getUTCMonth() : d.getMonth()) + 1;
    const day = utc ? d.getUTCDate() : d.getDate();
    return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// { level, rank } for a date, or null. `list` is the level list in order — bare
// levels or the [level, error] pairs fetchList returns. `rank` is the level's
// All Levels position, counting verified levels, the number the list prints.
export function pickDailyLevel(list, key = dateKey()) {
    const levels = (list || []).map((e) => (Array.isArray(e) ? (e[1] ? null : e[0]) : e));
    const valid = [];
    levels.forEach((l, i) => { if (l && !l.isVerified) valid.push({ level: l, rank: i + 1 }); });
    if (!valid.length) return null;
    const [y, m, d] = key.split('-').map(Number);
    const seed = (y * 10000 + m * 100 + d) >>> 0;
    const hash = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b) >>> 0;
    return valid[hash % valid.length];
}

// Today's Level of the Day: the archived pick when there is one and the level is
// still on the list and unverified, otherwise the pick from the list as it is.
// `rank` is always where the level stands now.
export function todaysLevel(list, archive, key = dateKey()) {
    const entry = (archive?.days || []).find((d) => d.date === key);
    if (entry) {
        const levels = (list || []).map((e) => (Array.isArray(e) ? e[0] : e));
        const i = levels.findIndex((l) => l && l.path === entry.path);
        if (i !== -1 && !levels[i].isVerified) return { level: levels[i], rank: i + 1 };
    }
    return pickDailyLevel(list, key);
}

// The archive file, or an empty one. The pages work without it — they fall back
// to computing the pick, and the archive window says it has nothing yet.
export async function fetchDailyArchive() {
    try {
        const res = await fetch(DAILY_ARCHIVE_URL, { cache: 'no-cache' });
        if (!res.ok) return { days: [] };
        const body = await res.json();
        return { days: Array.isArray(body?.days) ? body.days : [] };
    } catch {
        return { days: [] };
    }
}

// The archive entry a pick makes: what it was called and where it stood that day,
// since both change. `path` is what links it back to the level.
export function archiveEntry(key, pick) {
    return { date: key, path: pick.level.path, name: pick.level.name, rank: pick.rank };
}

// The rows the archive window lists, newest first. Today is included even
// before the content job has recorded it, as the level the page is showing.
// A level still on the list links to its page; one that has left it does not.
export function archiveRows(archive, today, key, list) {
    const levels = (list || []).map((e) => (Array.isArray(e) ? e[0] : e)).filter(Boolean);
    const paths = levels.map((l) => l.path);
    const days = [...(archive?.days || [])];
    if (today && !days.some((d) => d.date === key)) days.push(archiveEntry(key, today));
    return days
        .filter((d) => d.date <= key)
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((d) => ({
            date: d.date,
            name: d.name,
            rank: d.rank,
            slug: paths.includes(d.path) ? levelSlug(d.path, paths) : null,
            today: d.date === key,
        }));
}
