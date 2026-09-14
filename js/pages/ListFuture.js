import { store } from "../main.js";
import { passesBenchmark, assignBenchmarkRanks, displayRank, levelThumbnail } from '../util.js';
import { score } from "../score.js";
import { fetchEditors, fetchList, fetchPending } from "../content.js";

import Spinner from "../components/Spinner.js";
import LevelPanel from "../components/List/LevelPanel.js";

const roleIconMap = {
    owner: "crown",
    admin: "user-gear",
    seniormod: "user-shield",
    mod: "user-lock",
    dev: "code",
};

export default {
    components: { Spinner, LevelPanel },
    template: `
    <main v-if="loading" class="surface" style="display:flex;align-items:center;justify-content:center;">
        <Spinner></Spinner>
    </main>
    <main v-else class="page-list-new page-with-hero ull2">
        <div class="u-phero">
            <div class="u-phero__body">
                <h1>Future List</h1>
                <p>The strictest of the three tiers: only levels with a very high likelihood of being verified and published soon. Read this one for what is coming out next.</p>
            </div>
            <div class="u-phero__side">
                <div class="u-stat"><div class="u-stat__k">levels total</div><span class="u-stat__v">{{ heroCount }}</span></div>
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
            <table class="list" v-if="list && !noResults">
                <tr v-for="([level, err], i) in list" :class="{ 'level-hidden': level?.isHidden }">
                    <td class="rank">
                        <span :class="{ 'rank-verified': level?.isVerified }">
                            <p v-if="displayRank(level, i, store.benchmarkMode) <= 500" class="type-label-lg" :style="store.levelColoring ? getLevelNameStyle(level, selected == i) : {fontWeight: level?.isVerified ? 'bold' : 'normal', color: level?.isVerified ? (selected == i ? (!store.dark ? '#ffffff' : '#000000') : (!store.dark ? '#bbbbbb' : '#bbbbbb')) : ''}">#{{ displayRank(level, i, store.benchmarkMode) }}</p>
                            <p v-else class="type-label-lg" :style="store.levelColoring ? getLevelNameStyle(level, selected == i) : {fontWeight: level?.isVerified ? 'bold' : 'normal', color: level?.isVerified ? (selected == i ? (!store.dark ? '#ffffff' : '#000000') : (!store.dark ? '#bbbbbb' : '#bbbbbb')) : ''}">Londenberg</p>
                        </span>
                    </td>
                    <td class="level" :class="{ 'active': selected == i, 'error': !level }">
                        <button @click="selected = i">
                            <img v-if="level && store.thumbnails" class="level-thumbnail" :src="levelThumbnail(level)" alt="" />
                            <div class="level-info">
                                <span :class="{ 'rank-verified': level?.isVerified }">
                                    <span class="type-label-lg" :style="store.levelColoring ? getLevelNameStyle(level, selected == i) : {fontWeight: level?.isVerified ? 'bold' : 'normal', color: level?.isVerified ? (selected == i ? (!store.dark ? '#ffffff' : '#000000') : (!store.dark ? '#bbbbbb' : '#bbbbbb')) : ''}">{{ level?.name ? (store.levelColoring && isOldLevel(level) && !level.isVerified ? level.name + (isVeryOldLevel(level) ? ' \\u{1F6AB}\\u{1F6AB}' : ' \\u{1F6AB}') : level.name) : \`Error (\${err}.json)\` }}</span>
                                </span>
                                <span v-if="level" class="level-subinfo">by {{ level.author }} | {{ level.verifier }}</span>
                            </div>
                        </button>
                    </td>
                </tr>
            </table>
            <div v-if="noResults" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3rem 1rem 0;gap:0.5rem;opacity:0.25;text-align:center;color:var(--color-on-background);">
                <span style="font-size:2rem;">🔍</span>
                <p style="font-size:0.85rem;font-family:'Lexend Deca',sans-serif;">No levels match your search or filters.</p>
            </div>
            <div v-if="pendingSuggestion && (noResults || visibleCount <= 3)" style="display:flex;flex-direction:column;align-items:center;gap:0.55rem;margin:1.5rem auto 1rem;max-width:26rem;padding:1.25rem 1.5rem;border:1px solid rgba(128,128,128,0.25);border-radius:0.6rem;font-family:'Lexend Deca',sans-serif;text-align:center;color:var(--color-on-background);">
                <p style="font-size:0.82rem;opacity:0.55;margin:0;">Maybe you were searching for this:</p>
                <div style="display:flex;align-items:center;gap:0.5rem;">
                    <img :src="pendingIcon(pendingSuggestion)" alt="" style="width:1.5rem;height:1.5rem;flex-shrink:0;" />
                    <a v-if="pendingSuggestion.link" :href="pendingSuggestion.link" target="_blank" style="font-size:1.1rem;font-weight:700;text-decoration:underline;">{{ pendingSuggestion.name }}?</a>
                    <span v-else style="font-size:1.1rem;font-weight:700;">{{ pendingSuggestion.name }}?</span>
                </div>
                <p style="font-size:0.8rem;opacity:0.6;margin:0;">{{ pendingDesc(pendingSuggestion) }}</p>
                <p style="font-size:0.85rem;opacity:0.8;margin:0;">The level is currently in <router-link to="/pending" style="text-decoration:underline;">Pending List</router-link>.</p>
            </div>
            <div class="scroll-top-wrap">
                <button v-if="showScrollTop" class="scroll-top-btn" @click="scrollToTop">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708l6-6z"/></svg>
                    Return to top
                </button>
            </div>
        </div>
        <div class="level-container-new surface">
            <LevelPanel :level="level" :all-paths="allPaths" current="future"></LevelPanel>
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
        editors: [],
        pending: [],
        loading: true,
        selected: 0,
        errors: [],
        roleIconMap,
        store,
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
        search: "",
        minDecoration: 0,
        minVerification: 0,
        showScrollTop: false,
    }),
    watch: {
        search() {
            this.applyFilters();
        },
        'store.benchmarkMode'() {
            this.applyFilters();
        },
    },
    computed: {
        // Needed to derive a level's URL: two paths can slugify the same, and
        // the tie is broken against the whole set.
        allPaths() {
            return (this.list || []).map(([level]) => level?.path).filter(Boolean);
        },
        noResults() {
            // Filters empty the list the same way a search does, and the page
            // owes the reader the same answer either way.
            if (!this.list || !this.list.length) return false;
            return this.list.every(([level]) => !level || level.isHidden);
        },
        pendingSuggestion() {
            const q = this.search.toLowerCase().trim();
            if (!q) return null;
            return (this.pending || []).find(p => p && p.name && p.name.toLowerCase().includes(q)) || null;
        },
        visibleCount() {
            return (this.list || []).filter(([level]) => level && !level.isHidden).length;
        },
        // What the list holds, which is what its rank numbers count: a row's
        // rank is its index in this list, so the last row reads #N where N is
        // this. The hero used to print visibleCount instead, and the two
        // disagreed by however many levels were hidden — the ones flagged
        // Pending Removal are hidden from the table but keep their placement,
        // so the heading said 398 while the last row read #411.
        listedCount() {
            return (this.list || []).filter(([level]) => level).length;
        },
        // Whether the reader has narrowed the view themselves. Levels hidden
        // because they are pending removal are not a narrowing — they are the
        // page's normal state — so they must not turn the count into "N of M".
        isNarrowed() {
            if (this.search.trim()) return true;
            if (this.minDecoration > 0 || this.minVerification > 0) return true;
            return [...this.statusFilters, ...this.lengthFilters, ...this.otherFilters].some((f) => f.active);
        },
        heroCount() {
            return this.isNarrowed ? `${this.visibleCount} of ${this.listedCount}` : this.listedCount;
        },
        level() {
            return this.list[this.selected]?.[0];
        },
    },
    async mounted() {
        const list1 = await fetchList();
        if (list1) {
            let mainRank = 0, futureRank = 0;
            list1.forEach(([lvl, e], i) => {
                if (e || !lvl) return;
                lvl.allLevelsRank = i + 1;
                if (lvl.isMain || lvl.isVerified) { mainRank++; lvl.mainRank = mainRank; }
                if (lvl.isFuture || lvl.isVerified) { futureRank++; lvl.futureRank = futureRank; }
            });
        }
        this.list = [];
        for (const key in list1) {
            // Verified levels always appear on the Future List, even if isFuture is false.
            if (list1[key][0]?.isFuture || list1[key][0]?.isVerified) this.list.push(list1[key]);
        }
        this.editors = await fetchEditors();
        this.pending = await fetchPending() || [];
        if (!this.list.length) {
            this.errors = ["Failed to load list. Retry in a few minutes or notify list staff."];
        }
        if (this.list) {
            this.list.forEach(item => {
                const level = item[0];
                if (!level) return;
                if (level.verifier && level.verifier.toLowerCase() === 'open verification') {
                    if (!level.tags) level.tags = [];
                    if (!level.tags.includes('Open Verification')) level.tags.push('Open Verification');
                }
                if (!level.isVerified && this.isOldLevel(level)) {
                    if (!level.tags) level.tags = [];
                    if (!level.tags.includes('Pending Removal')) level.tags.push('Pending Removal');
                }
                // Auto "Verifying" tag — same trigger as the orange/red name coloring
                // (decoration finished + meaningful verification progress).
                if (!level.tags) level.tags = [];
                const beingVerified = !level.isVerified && (level.percentFinished ?? 0) === 100 && this.verifyProgress(level) >= 30;
                if (beingVerified && !level.tags.includes('Verifying')) level.tags.push('Verifying');
                if (!beingVerified && level.tags.includes('Verifying')) level.tags = level.tags.filter(t => t !== 'Verifying');
            });
        }
        this.applyFilters();
        this.loading = false;
        this.$nextTick(() => this.watchScroll());
    },

    beforeUnmount() {
        if (this._scrollEl) this._scrollEl.removeEventListener('scroll', this._onScroll);
    },
    methods: {
        displayRank,
        // The left column (.list-container-new) is the scroll container. Show the
        // button once roughly ten level rows have scrolled past, measuring one real
        // row instead of hard-coding a pixel height.
        watchScroll() {
            const el = this.$el && this.$el.querySelector && this.$el.querySelector('.list-container-new');
            if (!el || this._scrollEl) return;
            this._scrollEl = el;
            this._onScroll = () => {
                if (!this._rowHeight) {
                    const row = el.querySelector('.list tr:not(.level-hidden)');
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
        score,
        getLevelNameStyle(level, isSelected) {
            if (!level) return {};
            const dark = !this.store.dark;
            if (level.tags && level.tags.includes('Unrated')) {
                const c = isSelected ? (dark ? '#dddddd' : '#888888') : (dark ? '#bbbbbb' : '#666666');
                return { color: c, fontWeight: level.isVerified ? 'bold' : 'normal' };
            }
            if (level.tags && level.tags.includes('Rated')) {
                return { color: dark ? '#ffffff' : '#000000', fontWeight: level.isVerified ? 'bold' : 'normal' };
            }
            if (level.isVerified) {
                const c = isSelected ? (dark ? '#ffffff' : '#000000') : (dark ? '#bbbbbb' : '#bbbbbb');
                return { color: c, fontWeight: 'bold' };
            }
            const recordPercent = Math.max(0, ...((level.records || []).map(r => Number(r.percent) || 0)));
            const runPercent = Math.max(0, ...((level.run || []).map(r => {
                const parts = String(r.percent).split('-').map(Number);
                return (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) ? Math.abs(parts[1] - parts[0]) : 0;
            })));
            const verificationProgress = Math.max(recordPercent, runPercent);
            const pf = level.percentFinished ?? 0;
            let color;
            if (pf === 100 && verificationProgress >= 60) color = dark ? (isSelected ? '#ff9999' : '#ff5555') : (isSelected ? '#cc7a7a' : '#cc4444');
            else if (pf === 100 && verificationProgress >= 30) color = dark ? (isSelected ? '#ffaa66' : '#ff6622') : (isSelected ? '#cc8851' : '#cc511b');
            else if (pf === 100) color = dark ? (isSelected ? '#ffcc77' : '#ffaa44') : (isSelected ? '#cca35f' : '#cc8836');
            else if (pf >= 70) color = dark ? (isSelected ? '#ffff77' : '#ffee55') : (isSelected ? '#cccc5f' : '#ccbe44');
            else if (pf >= 30) color = dark ? (isSelected ? '#88ff88' : '#55ee55') : (isSelected ? '#6ccc6c' : '#44be44');
            else if (pf >= 1) color = dark ? (isSelected ? '#66ffff' : '#33dddd') : (isSelected ? '#51cccc' : '#28b0b0');
            else color = dark ? (isSelected ? '#88bbff' : '#5599ff') : (isSelected ? '#6c95cc' : '#447acc');
            return { color, fontWeight: level.isVerified ? 'bold' : 'normal' };
        },
        levelThumbnail,
        isOldLevel(level) {
            if (!level.lastUpd) return false;
            const parts = level.lastUpd.split('.');
            if (parts.length !== 3) return false;
            const levelDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            return levelDate < oneYearAgo;
        },
        isVeryOldLevel(level) {
            if (!level.lastUpd) return false;
            const parts = level.lastUpd.split('.');
            if (parts.length !== 3) return false;
            const levelDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
            const hasLayoutTag = level.tags && level.tags.includes('Layout');
            const threshold = new Date();
            threshold.setMonth(threshold.getMonth() - (hasLayoutTag ? 12 : 15));
            return levelDate < threshold;
        },
        verifyProgress(level) {
            const recordPercent = Math.max(0, ...((level.records || []).map(r => Number(r.percent) || 0)));
            const runPercent = Math.max(0, ...((level.run || []).map(r => {
                const parts = String(r.percent).split('-').map(Number);
                return (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) ? Math.abs(parts[1] - parts[0]) : 0;
            })));
            return Math.max(recordPercent, runPercent);
        },
        pendingIcon(p) {
            const pl = (p.placement || '?').toString().toLowerCase();
            if (pl === 'up' || pl === 'down') return '/assets/move-' + pl + '.svg';
            return '/assets/' + (p.placement === '?' ? 'question' : p.placement) + '.svg';
        },
        pendingDesc(p) {
            const pl = (p.placement || '').toString().toLowerCase();
            if (pl === 'up' || pl === 'down') return 'Pending movement';
            if (p.indefinite) return 'Pending indefinitely';
            if (!p.placement || p.placement === '?') return 'Estimated position: to be determined';
            return 'Estimated position: around #' + p.placement;
        },
        applyFilters() {
            if (!this.list) return;
            this.list.forEach(item => {
                const level = item[0];
                if (!level) return;
                if (level.verifier && level.verifier.toLowerCase() === 'open verification') {
                    if (!level.tags) level.tags = [];
                    if (!level.tags.includes('Open Verification')) level.tags.push('Open Verification');
                }
                if (!level.isVerified && this.isOldLevel(level)) {
                    if (!level.tags) level.tags = [];
                    if (!level.tags.includes('Pending Removal')) level.tags.push('Pending Removal');
                }
                // Auto "Verifying" tag — same trigger as the orange/red name coloring
                // (decoration finished + meaningful verification progress).
                if (!level.tags) level.tags = [];
                const beingVerified = !level.isVerified && (level.percentFinished ?? 0) === 100 && this.verifyProgress(level) >= 30;
                if (beingVerified && !level.tags.includes('Verifying')) level.tags.push('Verifying');
                if (!beingVerified && level.tags.includes('Verifying')) level.tags = level.tags.filter(t => t !== 'Verifying');
            });

            const activeFilters = [...this.statusFilters, ...this.lengthFilters, ...this.otherFilters].filter(f => f.active);
            const searchQuery = this.search.toLowerCase().trim();
            const minDec = this.minDecoration || 0;
            const minVer = this.minVerification || 0;

            // Renumber first: the rank shown depends on benchmark mode, not on the
            // search/tag filters applied below.
            assignBenchmarkRanks(this.list, store.benchmarkMode);

            this.list.forEach(item => {
                const level = item[0];
                if (!level) return;
                const name = level.name.toLowerCase();
                const matchesSearch = !searchQuery || name.includes(searchQuery);
                let matchesTags = true;
                if (activeFilters.length > 0) {
                    for (const filter of activeFilters) {
                        if (!level.tags || !level.tags.includes(filter.key)) { matchesTags = false; break; }
                    }
                }
                const decoration = level.percentFinished ?? 0;
                const matchesDecoration = decoration >= minDec;
                const recordPercent = Math.max(0, ...((level.records || []).map(r => Number(r.percent) || 0)));
                const runPercent = Math.max(0, ...((level.run || []).map(r => {
                    const parts = String(r.percent).split('-').map(Number);
                    return (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) ? Math.abs(parts[1] - parts[0]) : 0;
                })));
                const verificationProgress = Math.max(recordPercent, runPercent);
                const matchesVerification = level.isVerified || verificationProgress >= minVer;
                const matchesDecorationFinal = level.isVerified || matchesDecoration;
                const matchesBenchmark = passesBenchmark(level, store.benchmarkMode);
                const notTooOld = level.isVerified || !this.isOldLevel(level);
                level.isHidden = !(matchesSearch && matchesTags && matchesDecorationFinal && matchesVerification && matchesBenchmark && notTooOld);
            });
            this.autoSelectFirst();
        },
        autoSelectFirst() {
            if (!this.list) return;
            const cur = this.list[this.selected]?.[0];
            if (cur && !cur.isHidden) return;
            const first = this.list.findIndex(([level]) => level && !level.isHidden);
            if (first !== -1) this.selected = first;
        },
        resetFilters() {
            this.statusFilters.forEach(f => f.active = false);
            this.lengthFilters.forEach(f => f.active = false);
            this.otherFilters.forEach(f => f.active = false);
            this.minDecoration = 0;
            this.minVerification = 0;
            // Benchmark mode is a display setting (it lives in the settings popup and
            // persists across pages), not one of these filters — leave it as the user set it.
            this.applyFilters();
        },
    },
};
