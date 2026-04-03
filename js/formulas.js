/**
 * Calculate the score for a player record on a level.
 * Score depends on the level's rank in All Levels and the record percentage.
 * @param {Number} rank - Position on the All Levels list (1-indexed)
 * @param {Number} percent - Percentage of the record (for runs: b - a from "a-b")
 * @returns {Number}
 */
export function recordScore(rank, percent) {
    if (percent <= 0 || rank <= 0) return 0;
    let s = 159 * (0.996773 ** rank) * Math.sqrt(percent);
    s = Math.max(0, s);
    if (percent !== 100) {
        s = s - s / 3;
    }
    return Math.round(s * 1000) / 1000;
}
