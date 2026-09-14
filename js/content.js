const api = 'https://d1-wrkr.ullteam.workers.dev';

export async function fetchList() {
    try {
        const res = await fetch(`${api}/api/list`);
        const levels = await res.json();
        var currentLevelRank = 1;
        const result = levels.map((level) => {
            level.records = (level.records || []).sort((a, b) => b.percent - a.percent);
            return [level, null];
        });
        for (var i = 0; i < result.length; i++) {
            if (result[i][0].isVerified) {
                result[i][0].rankNum = "— ";
            } else {
                result[i][0].rankNum = "#" + currentLevelRank;
                currentLevelRank++;
            }
        }
        return result;
    } catch {
        console.error('Failed to load list.');
        return null;
    }
}

export async function fetchEditors() {
    try {
        const res = await fetch(`${api}/api/editors`);
        return await res.json();
    } catch {
        return null;
    }
}

export async function fetchPending() {
    try {
        const res = await fetch(`${api}/api/pending`);
        return await res.json();
    } catch {
        return null;
    }
}

export async function fetchRecentChanges() {
    try {
        const res = await fetch(`${api}/api/recent-changes`);
        return await res.json();
    } catch {
        return [];
    }
}

export async function fetchLevelMonth() {
    try {
        const res = await fetch(`${api}/api/level-month`);
        return await res.json();
    } catch {
        return null;
    }
}

export async function fetchLevelVerif() {
    try {
        const res = await fetch(`${api}/api/level-verif`);
        return await res.json();
    } catch {
        return null;
    }
}
