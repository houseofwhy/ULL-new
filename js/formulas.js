/**
 * Calculate the score for a player record on a level.
 * Score depends on the level's rank in All Levels and the record percentage.
 * @param {Number} rank - Position on the All Levels list (1-indexed)
 * @param {Number} percent - Percentage of the record (for runs: b - a from "a-b")
 * @returns {Number}
 */
export function recordScore(rank, percent) {
    if (percent <= 0 || rank <= 0) return 0;
    let s_p;
    if (percent <= 35) {
        s_p = 0.05 * Math.pow(percent + 10, 2);
    } else {
        s_p = -0.008 * Math.pow(percent - 200, 2) + 320;
    }
    const s_r = 1.5 * (30000 / (rank + 40) - 2);

    const s_p_base = 0.05 * Math.pow(50 + 10, 2);
    let s = s_p * s_r / s_p_base;
    s = Math.max(0, s);

    return Math.round(s * 1000) / 1000;
}
