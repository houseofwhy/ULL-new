/**
 * Calculate the score for a player record on the Player Leaderboard.
 * @param {number} rank - The level's rank in All Levels (1-based, unverified only)
 * @param {number} runLength - The length of the run as a percentage (e.g. 45 for a 55-100 run)
 * @returns {number}
 */
export function recordScore(rank, runLength) {
    // Base score decays with rank, scales with run length
    const base = 159 * Math.pow(0.996773, rank);
    const score = base * Math.sqrt(runLength / 100) * (runLength === 100 ? 1 : 2 / 3);
    return Math.max(0, Math.round(score * 1000) / 1000);
}

export function round(num, decimals = 3) {
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}
