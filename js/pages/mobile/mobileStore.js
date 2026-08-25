import { filtersList as baseFiltersList, passesBenchmark } from '../../util.js';

export const mobileStore = Vue.reactive({
    loading: true,
    rawList: [],
    editors: [],
    pendingPlacements: [],
    pendingMovements: [],
    pendingIndefinite: [],
    pending: [],
    players: [],
    openMenu: null,
    levelMonth: null,
    levelVerif: null,
    showThumbnails: true,
    showColors: true,
    benchmarkMode: false,
    filtersList: [
        ...baseFiltersList.map(f => ({ ...f })),
        { active: false, name: "Pending Removal", key: "Pending Removal" },
    ],
    search: '',
    minDecoration: 0,
    minVerification: 0,
});

export function applyFilters() {
    const active = mobileStore.filtersList.filter(f => f.active && !f.separator);
    const q = mobileStore.search.toLowerCase().trim();
    const minD = mobileStore.minDecoration || 0, minV = mobileStore.minVerification || 0;
    mobileStore.rawList.forEach(item => {
        const l = item[0]; if (!l) return;
        const matchesSearch = !q || l.name.toLowerCase().includes(q);
        let matchesTags = true;
        if (active.length > 0) {
            for (const f of active) {
                if (!l.tags || !l.tags.includes(f.key)) { matchesTags = false; break; }
            }
        }
        const rP = Math.max(0, ...((l.records || []).map(r => Number(r.percent) || 0)));
        const runP = Math.max(0, ...((l.run || []).map(r => {
            const p = String(r.percent).split('-').map(Number);
            return p.length === 2 ? Math.abs(p[1] - p[0]) : 0;
        })));
        const vP = Math.max(rP, runP);
        const matchesDec = l.isVerified || (l.percentFinished ?? 0) >= minD;
        const matchesVer = l.isVerified || vP >= minV;
        const matchesBenchmark = passesBenchmark(l, mobileStore.benchmarkMode);
        l.isHidden = !(matchesSearch && matchesTags && matchesDec && matchesVer && matchesBenchmark);
    });
}

export function resetFilters() {
    mobileStore.filtersList.forEach(f => { if (!f.separator) f.active = false; });
    mobileStore.minDecoration = 0;
    mobileStore.minVerification = 0;
    mobileStore.search = '';
    applyFilters();
}
