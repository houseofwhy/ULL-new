// Records today's Level of the Day in data/_daily-levels.json, the archive the
// Events pages read. Run by the hourly content job right after fetch-data.mjs:
//
//   node scripts/record-daily-level.mjs
//
// "Today" is the UTC date. The first run after midnight UTC records it from the
// list as it stands then; every later run that day finds it recorded and leaves
// it alone — that is what pins the pick for the day (js/daily-level.js).
//
// It only ever reads a snapshot fetched today: if fetch-data.mjs failed and the
// snapshot is from yesterday, today waits for the next run rather than being
// recorded from a list that is a day old.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dateKey, pickDailyLevel, archiveEntry } from '../js/daily-level.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT = path.join(ROOT, 'data', '_seo-snapshot.json');
export const ARCHIVE = path.join(ROOT, 'data', '_daily-levels.json');

export function readArchive(file = ARCHIVE) {
    if (!fs.existsSync(file)) return { version: 1, days: [] };
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { version: 1, days: Array.isArray(parsed.days) ? parsed.days : [] };
}

export function writeArchive(archive, file = ARCHIVE) {
    const days = [...archive.days].sort((a, b) => a.date.localeCompare(b.date));
    fs.writeFileSync(file, JSON.stringify({ version: 1, days }, null, 2) + '\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const today = dateKey(new Date(), true);
    const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'));
    const archive = readArchive();
    if (archive.days.some((d) => d.date === today)) {
        console.log(`daily level: ${today} already recorded`);
    } else if (!snapshot.fetchedAt || dateKey(new Date(snapshot.fetchedAt), true) !== today) {
        console.log(`daily level: snapshot is from ${snapshot.fetchedAt}, not ${today} — waiting for a fresh one`);
    } else {
        const pick = pickDailyLevel(snapshot.levels, today);
        if (!pick) {
            console.log('daily level: no unverified levels to pick from');
        } else {
            archive.days.push(archiveEntry(today, pick));
            writeArchive(archive);
            console.log(`daily level: ${today} → ${pick.level.name} (#${pick.rank})`);
        }
    }
}
