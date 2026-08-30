// Leaderboard aggregation, shared by the Leaderboard page and the static-page
// generator so both rank players by exactly the same rules.

import { recordScore, verificationScore, layoutCompletionScore, isLayoutCompletion } from './formulas.js';

// Takes the [level, error] pairs that fetchList() returns and produces players
// sorted by total score, each with their scoring records sorted best-first.
export function buildLeaderboard(list) {
    const playerMap = {};
    const player = (name) => {
        const key = name.toLowerCase();
        if (!playerMap[key]) playerMap[key] = { name, records: [] };
        return playerMap[key];
    };

    (list || []).forEach(([level, err], rank) => {
        if (err || !level) return;
        const levelRank = rank + 1;
        const levelName = level.name;

        // Verified levels: the verifier gets twice a 100% record, and the
        // level's own records and runs are then ignored.
        if (level.isVerified && level.verifier) {
            player(level.verifier).records.push({
                levelName, levelRank, percent: 100,
                score: verificationScore(levelRank), type: 'verification',
            });
            return;
        }

        for (const record of level.records || []) {
            if (!record.user || record.percent <= 0) continue;
            const percent = Number(record.percent);
            // 100% on a level that is not verified yet is a layout completion:
            // the player beat it in its current, undecorated state.
            const layout = isLayoutCompletion(level, percent);
            player(record.user).records.push({
                levelName, levelRank, percent,
                score: layout ? layoutCompletionScore(levelRank) : recordScore(levelRank, percent),
                type: layout ? 'layout' : 'record',
            });
        }

        for (const runRecord of level.run || []) {
            if (!runRecord.user) continue;
            const parts = String(runRecord.percent).split('-').map(Number);
            if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) continue;
            const percent = Math.abs(parts[1] - parts[0]);
            if (percent <= 0) continue;
            player(runRecord.user).records.push({
                levelName, levelRank, percent,
                displayPercent: String(runRecord.percent),
                score: recordScore(levelRank, percent), type: 'run',
            });
        }
    });

    const players = Object.values(playerMap).map((p) => {
        p.records.sort((a, b) => b.score - a.score);
        p.total = p.records.reduce((sum, r) => sum + r.score, 0);
        return p;
    }).sort((a, b) => b.total - a.total);

    players.forEach((p, i) => { p.globalRank = i + 1; });
    return players;
}
