import { store } from '../main.js';
import { levelThumbnail, verificationPercent, verificationLabel } from '../util.js';
import { fetchList } from '../content.js';
import { upcomingRanking } from '../formulas.js';

import Spinner from '../components/Spinner.js';
import LevelPanel from '../components/List/LevelPanel.js';

export default {
    components: { Spinner, LevelPanel },
    template: `
    <main v-if="loading" class="surface" style="display:flex;align-items:center;justify-content:center;">
        <Spinner></Spinner>
    </main>
    <main v-else class="page-list-new page-upcoming page-with-hero ull2">
        <div class="u-phero">
            <div class="u-phero__body">
                <h1>Upcoming Levels</h1>
                <p>Catalogue of levels on the Upcoming Levels List closest to verification, ranked by highest progress achieved toward completing the level.</p>
            </div>
            <div class="u-phero__side">
                <div class="u-stat"><div class="u-stat__k">Levels</div><span class="u-stat__v">{{ list.length }}</span></div>
            </div>
        </div>
        <div class="list-container-new surface">
            <div class="search-row">
                <label class="search-field">
                    <span class="info-mag" aria-hidden="true"></span>
                    <input v-model="search" class="search-new" type="text" placeholder="Search levels..." />
                </label>
                <button class="filters-btn" @click="showFilters = true" title="Filters">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/></svg>
                </button>
            </div>
            <table class="list" v-if="list.length && filteredList.length && !noResults">
                <tr v-for="([level, err], i) in filteredList" :key="i" :class="{ 'level-hidden': level?.isHidden }">
                    <td class="rank">
                        <p class="type-label-lg">#{{ i + 1 }}</p>
                    </td>
                    <td class="level" :class="{ 'active': selected === i, 'error': !level }">
                        <button @click="selected = i">
                            <img v-if="store.thumbnails && level" :src="levelThumbnail(level)" class="level-thumbnail" alt="" />
                            <div class="level-info">
                                <span class="type-label-lg" :style="store.levelColoring ? getLevelNameStyle(level, selected === i) : {}">{{ level?.name || \`Error (\${err}.json)\` }}</span>
                                <span v-if="level" class="level-subinfo">WR: {{ getWR(level) }} | Run: {{ getRunString(level) }}</span>
                                <span v-if="level" class="u-bar u-bar--thin up-row__bar"><i :style="{ width: progress(level) + '%' }"></i></span>
                            </div>
                            <span v-if="level" class="up-row__pct">{{ furthest(level) || 'None' }}</span>
                        </button>
                    </td>
                </tr>
            </table>
            <div v-else-if="list.length" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3rem 1rem;opacity:0.25;gap:0.5rem;text-align:center;color:var(--color-on-background);">
                <span style="font-size:2rem;">🔍</span>
                <p style="font-size:0.85rem;font-family:'Lexend Deca',sans-serif;">No levels match your search or filters.</p>
            </div>
            <p v-else style="padding:1rem; opacity:0.5;">No upcoming levels found</p>
            <div class="scroll-top-wrap">
                <button v-if="showScrollTop" class="scroll-top-btn" @click="scrollToTop">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708l6-6z"/></svg>
                    Return to top
                </button>
            </div>
        </div>
        <div class="level-container-new surface">
            <LevelPanel :level="selectedLevel" :all-paths="allPaths" current="all" lead-progress></LevelPanel>
        </div>

        <!-- Filters Popup -->
        <div class="filters-overlay" v-if="showFilters" @click.self="showFilters = false">
            <div class="filters-popup">
                <div class="filters-popup__title">Filters</div>
                <div class="filters-popup__columns">
                    <div>
                        <div class="filters-popup__column-title">Status</div>
                        <div class="filters-popup__item" v-for="(item, index) in statusFilters" :key="'s'+index" :class="{ active: item.active }" @click="item.active = !item.active">
                            <div class="filters-popup__checkbox"><span class="filters-popup__check">✓</span></div>
                            <span>{{ item.name }}</span>
                        </div>
                        <div class="filters-popup__numeric" style="margin-top:0.75rem;">
                            <label>Min Decoration %</label>
                            <input type="number" min="0" max="100" v-model.number="minDecoration" placeholder="0" />
                        </div>
                        <div class="filters-popup__numeric">
                            <label>Min Verification %</label>
                            <input type="number" min="0" max="100" v-model.number="minVerification" placeholder="0" />
                        </div>
                    </div>
                    <div>
                        <div class="filters-popup__column-title">Length</div>
                        <div class="filters-popup__item" v-for="(item, index) in lengthFilters" :key="'l'+index" :class="{ active: item.active }" @click="item.active = !item.active">
                            <div class="filters-popup__checkbox"><span class="filters-popup__check">✓</span></div>
                            <span>{{ item.name }}</span>
                        </div>
                    </div>
                    <div>
                        <div class="filters-popup__column-title">Other</div>
                        <div class="filters-popup__item" v-for="(item, index) in otherFilters" :key="'o'+index" :class="{ active: item.active }" @click="item.active = !item.active">
                            <div class="filters-popup__checkbox"><span class="filters-popup__check">✓</span></div>
                            <span>{{ item.name }}</span>
                        </div>
                    </div>
                </div>
                <div class="filters-popup__actions">
                    <button class="filters-popup__btn filters-popup__btn--reset" @click="resetFilters()">Reset Filters</button>
                    <button class="filters-popup__btn filters-popup__btn--apply" @click="applyFilters(); showFilters = false">Apply Filters</button>
                </div>
            </div>
        </div>
    </main>
    `,
    data: () => ({
        list: [],
        loading: true,
        selected: 0,
        store,
        search: '',
        showFilters: false,
        statusFilters: [
            { active: false, name: "Public", key: "Public" },
            { active: false, name: "Finished", key: "Finished" },
            { active: false, name: "Open Verification", key: "Open Verification" },
            { active: false, name: "Being Verified", key: "Verifying" },
            { active: false, name: "Layout State", key: "Layout" },
            { active: false, name: "Verified", key: "Verified" },
            { active: false, name: "Unrated", key: "Unrated" },
            { active: false, name: "Rated", key: "Rated" },
        ],
        lengthFilters: [
            { active: false, name: "Medium", key: "Medium" },
            { active: false, name: "Long", key: "Long" },
            { active: false, name: "XL", key: "XL" },
            { active: false, name: "XXL", key: "XXL" },
            { active: false, name: "XXXL+", key: "XXXL" },
        ],
        otherFilters: [
            { active: false, name: "NC Level", key: "NC" },
            { active: false, name: "Remake", key: "Remake" },
            { active: false, name: "Uses NoNG", key: "NONG" },
            { active: false, name: "Top Quality", key: "Quality" },
            { active: false, name: "2-Player", key: "2p" },
            { active: false, name: "Pending Removal", key: "Pending Removal" },
        ],
        minDecoration: 0,
        minVerification: 0,
        showScrollTop: false,
    }),
    computed: {
        // Filters hide rows rather than removing them, so a fully filtered list
        // still has length; the page owes the same answer either way.
        noResults() {
            if (!this.filteredList.length) return true;
            return this.filteredList.every(([level]) => !level || level.isHidden);
        },
        filteredList() {
            if (!this.search.trim()) return this.list;
            const q = this.search.toLowerCase().trim();
            return this.list.filter(([level]) => level && level.name.toLowerCase().includes(q));
        },
        selectedLevel() {
            const item = this.filteredList[this.selected];
            return item ? item[0] : null;
        },
        allPaths() {
            return (this.list || []).map(([level]) => level?.path).filter(Boolean);
        },
    },
    watch: { search() { this.selected = 0; } },
    beforeUnmount() {
        if (this._scrollEl) this._scrollEl.removeEventListener('scroll', this._onScroll);
    },
    async mounted() {
        let list = await fetchList();
        if (!list) { this.loading = false; return; }

        // Compute ranks across all three lists before any filtering
        let allRank = 0, mainRank = 0, futureRank = 0;
        list.forEach(([level, err], i) => {
            if (err || !level) return;
            level.allLevelsRank = i + 1;
            if (!level.isVerified) {
                allRank++;
                level.allLevelsNonVerifiedRank = allRank;
            }
            if (level.isMain) { mainRank++; level.mainRank = mainRank; }
            if (level.isFuture) { futureRank++; level.futureRank = futureRank; }
        });

        for (const [level, err] of list) {
            if (err || !level) continue;
            if (this.isOldLevel(level)) {
                if (!level.tags) level.tags = [];
                if (!level.tags.includes('Pending Removal')) level.tags.push('Pending Removal');
            }
        }

        // Ranked by upcomingRanking so this page, the mobile page and the
        // baked static content can never drift apart.
        const ranked = new Set(upcomingRanking(list.map(([level]) => level).filter(Boolean)));
        this.list = list
            .filter(([level]) => ranked.has(level))
            .sort((a, b) => b[0].rankingScore - a[0].rankingScore);

        this.loading = false;
        this.$nextTick(() => this.watchScroll());
    },
    methods: {
        // The left column (.list-container-new) is the scroll container. Show the
        // button once roughly ten rows have scrolled past, measuring one real row
        // instead of hard-coding a pixel height.
        watchScroll() {
            const el = this.$el && this.$el.querySelector && this.$el.querySelector('.list-container-new');
            if (!el || this._scrollEl) return;
            this._scrollEl = el;
            this._onScroll = () => {
                if (!this._rowHeight) {
                    const row = el.querySelector('.list tr');
                    const h = row ? row.getBoundingClientRect().height : 0;
                    if (h) this._rowHeight = h;
                }
                this.showScrollTop = el.scrollTop > (this._rowHeight || 56) * 10;
            };
            el.addEventListener('scroll', this._onScroll, { passive: true });
        },
        scrollToTop() {
            if (this._scrollEl) this._scrollEl.scrollTo({ top: 0, behavior: 'smooth' });
        },

        isOldLevel(level) {
            if (!level.lastUpd) return false;
            const parts = level.lastUpd.split('.');
            if (parts.length !== 3) return false;
            const levelDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            return levelDate < oneYearAgo;
        },
        getWR(level) {
            if (!level.records || !level.records.length) return 'None';
            const best = Math.max(0, ...level.records.map(r => r.percent));
            return best > 0 ? best + '%' : 'None';
        },
        getRunString(level) {
            if (!level.run || !level.run.length) return 'None';
            let bestRun = null;
            let bestDiff = 0;
            for (const r of level.run) {
                const parts = String(r.percent).split('-').map(Number);
                if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                    const diff = Math.abs(parts[1] - parts[0]);
                    if (diff > bestDiff) { bestDiff = diff; bestRun = r; }
                }
            }
            return bestRun ? bestRun.percent : 'None';
        },
        levelThumbnail,
        // The same reading the ordering is built from (js/formulas.js scores it,
        // this shows it), so the column can be scanned as a race.
        progress(level) {
            return verificationPercent(level);
        },
        // The bar's width is the number the ordering is built from; the figure
        // beside it is written the way the evidence reads, so a run from 19% to
        // 91% says so rather than claiming 72% (js/util.js).
        furthest(level) {
            return verificationLabel(level);
        },
        getLevelNameStyle(level, isSelected) {
            if (!level) return {};
            const dark = !this.store.dark;
            const recordPercent = Math.max(0, ...((level.records || []).map(r => Number(r.percent) || 0)));
            const runPercent = Math.max(0, ...((level.run || []).map(r => { const parts = String(r.percent).split('-').map(Number); return (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) ? Math.abs(parts[1] - parts[0]) : 0; })));
            const vP = Math.max(recordPercent, runPercent);
            const pf = level.percentFinished ?? 0;
            let color;
            if (pf === 100 && vP >= 60) color = dark ? (isSelected ? '#ff9999' : '#ff5555') : (isSelected ? '#cc7a7a' : '#cc4444');
            else if (pf === 100 && vP >= 30) color = dark ? (isSelected ? '#ffaa66' : '#ff6622') : (isSelected ? '#cc8851' : '#cc511b');
            else if (pf === 100) color = dark ? (isSelected ? '#ffcc77' : '#ffaa44') : (isSelected ? '#cca35f' : '#cc8836');
            else if (pf >= 70) color = dark ? (isSelected ? '#ffff77' : '#ffee55') : (isSelected ? '#cccc5f' : '#ccbe44');
            else if (pf >= 30) color = dark ? (isSelected ? '#88ff88' : '#55ee55') : (isSelected ? '#6ccc6c' : '#44be44');
            else if (pf >= 1) color = dark ? (isSelected ? '#66ffff' : '#33dddd') : (isSelected ? '#51cccc' : '#28b0b0');
            else color = dark ? (isSelected ? '#88bbff' : '#5599ff') : (isSelected ? '#6c95cc' : '#447acc');
            return { color, fontWeight: 'normal' };
        },
        applyFilters() {
            if (!this.list) return;
            this.list.forEach(item => {
                const level = item[0]; if (!level) return;
                if (this.isOldLevel(level)) {
                    if (!level.tags) level.tags = [];
                    if (!level.tags.includes('Pending Removal')) level.tags.push('Pending Removal');
                }
            });
            const activeFilters = [...this.statusFilters, ...this.lengthFilters, ...this.otherFilters].filter(f => f.active);
            const minDec = this.minDecoration || 0;
            const minVer = this.minVerification || 0;
            this.list.forEach(item => {
                const level = item[0]; if (!level) return;
                let matchesTags = true;
                if (activeFilters.length > 0) { for (const f of activeFilters) { if (!level.tags || !level.tags.includes(f.key)) { matchesTags = false; break; } } }
                const matchesDecoration = (level.percentFinished ?? 0) >= minDec;
                const recordPercent = Math.max(0, ...((level.records || []).map(r => Number(r.percent) || 0)));
                const runPercent = Math.max(0, ...((level.run || []).map(r => { const parts = String(r.percent).split('-').map(Number); return (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) ? Math.abs(parts[1] - parts[0]) : 0; })));
                const matchesVerification = Math.max(recordPercent, runPercent) >= minVer;
                level.isHidden = !(matchesTags && matchesDecoration && matchesVerification);
            });
        },
        resetFilters() {
            this.statusFilters.forEach(f => f.active = false);
            this.lengthFilters.forEach(f => f.active = false);
            this.otherFilters.forEach(f => f.active = false);
            this.minDecoration = 0; this.minVerification = 0;
            this.applyFilters();
        },
    },
};
