/**
 * Calculate the score for a player record on a level.
 * Score depends on the level's rank in All Levels and the record percentage.
 * @param {Number} rank - Position on the All Levels list (1-indexed)
 * @param {Number} percent - Percentage of the record (for runs: b - a from "a-b")
 * @returns {Number}
 */
export function recordScore(rank, percent) {
    if (percent <= 0 || rank <= 0) return 0;
    const s_p = 0.7 * percent + 10;
    const s_r = 1.5 * (30000 / (rank + 40) - 2);
    let s = s_p * s_r / 60;
    s = Math.max(0, s);

    return Math.round(s * 1000) / 1000;
}
