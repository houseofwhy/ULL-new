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

/**
 * A verification is worth double a 100% record on the same level.
 */
export const VERIFICATION_MULTIPLIER = 2;

/**
 * "Layout completed" — a 100% record on a level that is NOT verified yet, i.e. the
 * player beat the level in its current, still-undecorated state (Snowblind,
 * Map of Problematique…). The list pages label this "Layout verified by …".
 * It is worth 0.8 of a full verification on the same level.
 */
export const LAYOUT_COMPLETION_MULTIPLIER = 0.8;

/**
 * Score for verifying the level at a given rank.
 * @param {Number} rank - Position on the All Levels list (1-indexed)
 * @returns {Number}
 */
export function verificationScore(rank) {
    return recordScore(rank, 100) * VERIFICATION_MULTIPLIER;
}

/**
 * Score for completing the layout of the level at a given rank.
 * @param {Number} rank - Position on the All Levels list (1-indexed)
 * @returns {Number}
 */
export function layoutCompletionScore(rank) {
    return verificationScore(rank) * LAYOUT_COMPLETION_MULTIPLIER;
}

/**
 * Whether a record counts as a layout completion rather than an ordinary record:
 * 100% on a level that hasn't been verified yet. Mirrors the "Layout verified by"
 * condition on the list pages (`!level.isVerified && records[0].percent == 100`).
 * @param {Object} level
 * @param {Number} percent
 * @returns {Boolean}
 */
export function isLayoutCompletion(level, percent) {
    return !level.isVerified && Number(percent) >= 100;
}

/**
 * Calculate a ranking score for upcoming levels — how close a level is to being
 * verified, based purely on the progress made on it.
 *
 * The level's position in All Levels is deliberately NOT part of this: the score
 * used to be multiplied by `(0.01 * (rank + 100)) ** 0.5`, which made the same
 * progress worth more on a lower-ranked level. That rank factor was removed on
 * 2026-08-24, so two levels with identical records now tie regardless of rank.
 *
 * @param {Number} maxPercent - Highest "from zero" record percent
 * @param {Number} maxRunDiff - Highest run range (b - a from "a-b" format)
 * @returns {Number}
 */
export function upcomingScore(maxPercent, maxRunDiff) {
    return Math.max(maxPercent, maxRunDiff) ** 2 + Math.min(maxPercent, maxRunDiff) ** 1.8;
}
