import { store } from "../main.js";
import { fetchEditors, fetchList, fetchPending, fetchLevelMonth, fetchLevelVerif } from "../content.js";
import { recordScore, verificationScore, layoutCompletionScore, isLayoutCompletion } from "../formulas.js";
import { mobileStore } from "./mobile/mobileStore.js";

import Spinner from "../components/Spinner.js";
import MobileShell from "../components/MobileShell.js";

const roleIconMap = {
    owner: 'crown',
    admin: 'user-gear',
    seniormod: 'user-shield',
    mod: 'user-lock',
    dev: 'code',
};

export default {
    components: { Spinner, MobileShell },
    template: `
<MobileShell>
    <div v-if="mobileStore.loading" class="mob-loading"><Spinner /></div>
    <router-view v-else></router-view>
</MobileShell>
    `,
    data: () => ({
        store,
        mobileStore,
    }),
    async mounted() {
        try {
            [mobileStore.levelMonth, mobileStore.levelVerif] = await Promise.all([fetchLevelMonth(), fetchLevelVerif()]);
            mobileStore.rawList = await fetchList() || [];
            // Compute per-list ranks for Upcoming Levels position display
            let allRank = 0, mainRank = 0, futureRank = 0;
            mobileStore.rawList.forEach(([level, err], i) => {
                if (err || !level) return;
                level.allLevelsRank = i + 1;
                if (!level.isVerified) { allRank++; level.allLevelsNonVerifiedRank = allRank; }
                if (level.isMain || level.isVerified) { mainRank++; level.mainRank = mainRank; }
                if (level.isFuture || level.isVerified) { futureRank++; level.futureRank = futureRank; }
            });
            mobileStore.editors = await fetchEditors() || [];
            const pending = await fetchPending();
            mobileStore.pending = pending || [];
            if (pending) {
                const isMove = p => ['up', 'down'].includes((p.placement || '').toLowerCase());
                const byPlacement = (a, b) => {
                    const v = p => p === '?' ? 999999 : (parseInt(p) || 999999);
                    return v(a.placement) - v(b.placement) || a.name.localeCompare(b.name);
                };
                mobileStore.pendingPlacements = pending.filter(p => !isMove(p) && !p.indefinite).sort(byPlacement);
                mobileStore.pendingMovements = pending.filter(isMove);
                mobileStore.pendingIndefinite = pending.filter(p => !isMove(p) && p.indefinite).sort(byPlacement);
            }
            // Auto-assign Open Verification tag
            mobileStore.rawList.forEach(item => {
                const l = item[0]; if (!l) return;
                if (l.verifier?.toLowerCase() === 'open verification') {
                    if (!l.tags) l.tags = [];
                    if (!l.tags.includes('Open Verification')) l.tags.push('Open Verification');
                }
            });
            // Auto-assign Pending Removal tag
            const isOldLevel = (level) => {
                if (!level.lastUpd) return false;
                const p = level.lastUpd.split('.');
                if (p.length !== 3) return false;
                const d = new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
                const ago = new Date(); ago.setFullYear(ago.getFullYear() - 1);
                return d < ago;
            };
            mobileStore.rawList.forEach(item => {
                const l = item[0]; if (!l) return;
                if (!l.isVerified && isOldLevel(l)) {
                    if (!l.tags) l.tags = [];
                    if (!l.tags.includes('Pending Removal')) l.tags.push('Pending Removal');
                }
            });
            // Auto-assign Verifying tag — same trigger as the orange/red name coloring.
            const verifyProgress = (l) => Math.max(
                0,
                ...((l.records || []).map(r => Number(r.percent) || 0)),
                ...((l.run || []).map(r => {
                    const parts = String(r.percent).split('-').map(Number);
                    return (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) ? Math.abs(parts[1] - parts[0]) : 0;
                }))
            );
            mobileStore.rawList.forEach(item => {
                const l = item[0]; if (!l) return;
                if (!l.tags) l.tags = [];
                const beingVerified = !l.isVerified && (l.percentFinished ?? 0) === 100 && verifyProgress(l) >= 30;
                if (beingVerified && !l.tags.includes('Verifying')) l.tags.push('Verifying');
                if (!beingVerified && l.tags.includes('Verifying')) l.tags = l.tags.filter(t => t !== 'Verifying');
            });
            // Build player leaderboard
            const playerMap = {};
            mobileStore.rawList.forEach(([level, err], rank) => {
                if (err || !level) return;
                const levelRank = rank + 1;
                const levelName = level.name;
                if (level.isVerified && level.verifier) {
                    const key = level.verifier.toLowerCase();
                    if (!playerMap[key]) playerMap[key] = { name: level.verifier, records: [] };
                    const sc = verificationScore(levelRank);
                    playerMap[key].records.push({ levelName, levelRank, percent: 100, score: sc, type: 'verification' });
                    return;
                }
                if (level.records) {
                    level.records.forEach(record => {
                        if (!record.user || record.percent <= 0) return;
                        const key = record.user.toLowerCase();
                        if (!playerMap[key]) playerMap[key] = { name: record.user, records: [] };
                        const percent = Number(record.percent);
                        // 100% on a not-yet-verified level is a layout completion (0.8
                        // of a verification), not an ordinary record. Keep in sync with
                        // js/pages/Leaderboard.js.
                        const layout = isLayoutCompletion(level, percent);
                        const sc = layout ? layoutCompletionScore(levelRank) : recordScore(levelRank, percent);
                        playerMap[key].records.push({ levelName, levelRank, percent, score: sc, type: layout ? 'layout' : 'record' });
                    });
                }
                if (level.run) {
                    level.run.forEach(runRecord => {
                        if (!runRecord.user) return;
                        const parts = String(runRecord.percent).split('-').map(Number);
                        if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return;
                        const percent = Math.abs(parts[1] - parts[0]);
                        if (percent <= 0) return;
                        const key = runRecord.user.toLowerCase();
                        if (!playerMap[key]) playerMap[key] = { name: runRecord.user, records: [] };
                        playerMap[key].records.push({ levelName, levelRank, percent, displayPercent: String(runRecord.percent), score: recordScore(levelRank, percent), type: 'run' });
                    });
                }
            });
            mobileStore.players = Object.values(playerMap).map(p => {
                p.records.sort((a, b) => b.score - a.score);
                p.total = p.records.reduce((sum, r) => sum + r.score, 0);
                return p;
            }).sort((a, b) => b.total - a.total);
            mobileStore.players.forEach((p, i) => { p.globalRank = i + 1; });
        } catch (e) {
            console.error('Mobile data load error:', e);
        } finally {
            mobileStore.loading = false;
        }
    },
};
