/**
 * Calculate the score for a player record on a level.
 * Score depends on the level's rank in All Levels and the record percentage.
 * @param {Number} rank - Position on the All Levels list (1-indexed)
 * @param {Number} percent - Percentage of the record (for runs: b - a from "a-b")
 * @returns {Number}
 */
export function recordScore(rank, percent) {
    if (percent <= 0 || rank <= 0) return 0;
    let s;
    if (rank < 150) {
        s = 0.7 * percent + 10 + 915.81789 - 200.10236 * Math.log(0.5 * rank + 3) + 0.8 * rank;
    } else {
        s = 0.7 * percent + 10 + 30000 / (rank + 90) + 39;
    }
    s = Math.max(0, s);

    return Math.round(s * 1000) / 1000;
}
