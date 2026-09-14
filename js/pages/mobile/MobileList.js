import { store } from '../../main.js';
import {
    passesBenchmark, levelThumbnail, levelSlug,
    decorationPercent, verificationPercent, verificationLabel, levelStatus,
    bestRecord, bestRun, recordLink, hasVerifier, verifierLine, levelRanks,
} from '../../util.js';
import { mobileStore, applyFilters } from './mobileStore.js';

export default {
    props: {
        pageType: { type: String, default: 'all' },
    },
    template: `
        <div class="mob-list m2-page-body">
            <button v-if="showScrollTop" class="mob-scroll-top-btn" @click="scrollToTop">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708l6-6z"/></svg>
                Return to top
            </button>

            <section class="m2-hero">
                <h1 v-if="pageType === 'main'">Main List</h1>
                <h1 v-else-if="pageType === 'future'">Future List</h1>
                <h1 v-else>All Levels</h1>
                <p v-if="pageType === 'main'">Levels that meet the standards required to be considered for an official rating by the developer (a “Rate”).</p>
                <p v-else-if="pageType === 'future'">The strictest of the three tiers: only levels with a very high likelihood of being verified and published soon.</p>
                <p v-else>The widest of the three tiers, with the lowest bar for entry: every level with a conceivable chance of being verified and published.</p>
                <div class="m2-figs">
                    <span class="m2-fig m2-fig--lead"><b>{{ visibleCount }}</b><span>levels total</span></span>
                </div>
            </section>

            <div class="m2-search">
                <input v-model="mobileStore.search" @input="applyFilters()" type="text" placeholder="Search levels..." />
                <button class="m2-search__btn" :class="{ active: mobileStore.openMenu === 'filters' }" @click="mobileStore.openMenu = mobileStore.openMenu === 'filters' ? null : 'filters'" title="Filters">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/></svg>
                </button>
            </div>

            <div v-if="noResults" class="u-empty">
                <div class="u-empty__t">No levels match your search or filters</div>
                <div class="u-empty__d">Try a different name, or reset the filters to see everything.</div>
            </div>

            <div class="m2-rows">
                <div v-for="([level, err], i) in displayList" :key="i" class="mob-level-row" v-show="!level?.isHidden">
                    <button class="m2-row" :class="{ 'is-on': selected === i, 'is-error': !level }" @click="selected = selected === i ? -1 : i">
                        <span class="mob-rank m2-row__rank" :style="mobileStore.showColors ? getLevelNameStyle(level, selected === i) : {}">
                            <span v-if="rankOf(level, i) <= 500">#{{ rankOf(level, i) }}</span>
                            <span v-else>{{ pageType === 'all' ? 'Londenberg' : pageType === 'main' ? 'Leg' : 'Legacy' }}</span>
                        </span>
                        <img v-if="mobileStore.showThumbnails && level" class="m2-row__thumb" :src="levelThumbnail(level)" alt="" loading="lazy" />
                        <span class="m2-row__body">
                            <span class="m2-row__name" :style="mobileStore.showColors ? getLevelNameStyle(level, selected === i) : {fontWeight: level?.isVerified ? 'bold' : 'normal', color: level?.isVerified ? (selected === i ? (!store.dark ? '#ffffff' : '#000000') : '#bbbbbb') : ''}">
                                {{ level?.name ? (mobileStore.showColors && isOldLevel(level) && !level?.isVerified ? level.name + ' \u{1F6AB}' : level.name) : \`Error (\${err}.json)\` }}
                            </span>
                            <span v-if="level" class="m2-row__sub">{{ level.author }} · {{ level.verifier }}</span>
                        </span>
                        <span v-if="level && selected !== i" class="u-pill" :class="'u-pill--' + status(level).tone"><i></i>{{ shortStatus(level) }}</span>
                    </button>

                    <!-- A summary, not the whole record: where it stands, how far it
                         has got and the best two records. Everything else is on the
                         level's own page, which the button opens. -->
                    <div v-if="selected === i && level" class="m2-detail">
                        <div class="m2-detail__hero">
                            <div v-if="mobileStore.showThumbnails" class="m2-detail__bg" :style="{ backgroundImage: 'url(' + levelThumbnail(level) + ')' }"></div>
                            <div class="m2-detail__scrim"></div>
                            <div class="m2-detail__head">
                                <p class="m2-detail__by">
                                    by <b>{{ level.author }}</b>
                                    <template v-if="verifierLine(level)"> · {{ verifierLine(level).lead }} <b>{{ verifierLine(level).name }}</b></template>
                                </p>
                                <div class="m2-detail__pills">
                                    <span class="u-pill" :class="'u-pill--' + status(level).tone"><i></i>{{ status(level).label }}</span>
                                    <span v-for="tag in tags(level)" :key="tag" class="u-chip u-chip--round">{{ tag }}</span>
                                </div>
                                <div v-if="ranks(level).length" class="m2-ranks">
                                    <component v-for="rank in ranks(level)" :is="rank.n ? 'router-link' : 'span'" :key="rank.key"
                                               class="u-rank" :class="{ 'u-rank--lead': rank.lead, 'u-rank--off': !rank.n }"
                                               :to="rank.n ? rank.to : undefined">
                                        <span class="u-rank__n">{{ rank.n ? '#' + rank.n : 'N/A' }}</span>
                                        <span class="u-rank__l">{{ rank.label }}</span>
                                    </component>
                                </div>
                            </div>
                        </div>
                        <div class="m2-detail__body">
                            <div class="m2-sum">
                                <div class="m2-sum__meters">
                                    <div class="u-meter">
                                        <div class="u-meter__top"><span>Decoration</span><b>{{ decoration(level) }}%</b></div>
                                        <div class="u-bar"><i :style="{ width: decoration(level) + '%' }"></i></div>
                                    </div>
                                    <div class="u-meter">
                                        <div class="u-meter__top"><span>Verification</span><b>{{ furthest(level) || 'None' }}</b></div>
                                        <div class="u-bar u-bar--alt"><i :style="{ width: verification(level) + '%' }"></i></div>
                                    </div>
                                </div>
                                <div class="m2-sum__recs">
                                    <div class="m2-sum__rec">
                                        <div class="m2-sum__k">From 0%</div>
                                        <template v-if="record(level)">
                                            <a v-if="recordHref(record(level))" class="m2-sum__v" :href="recordHref(record(level))" target="_blank" rel="noopener">{{ record(level).percent }}%</a>
                                            <span v-else class="m2-sum__v">{{ record(level).percent }}%</span>
                                            <div class="m2-sum__u">{{ record(level).user }}</div>
                                        </template>
                                        <span v-else class="m2-sum__v m2-sum__v--none">None</span>
                                    </div>
                                    <div class="m2-sum__rec">
                                        <div class="m2-sum__k">Best run</div>
                                        <template v-if="run(level)">
                                            <a v-if="recordHref(run(level))" class="m2-sum__v" :href="recordHref(run(level))" target="_blank" rel="noopener">{{ run(level).percent }}%</a>
                                            <span v-else class="m2-sum__v">{{ run(level).percent }}%</span>
                                            <div class="m2-sum__u">{{ run(level).user }}</div>
                                        </template>
                                        <span v-else class="m2-sum__v m2-sum__v--none">None</span>
                                    </div>
                                </div>
                                <router-link v-if="level.path" class="u-btn" :to="'/level/' + slug(level)">Open level page</router-link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="pendingSuggestion && (noResults || visibleCount <= 3)" class="m2-suggest">
                <p class="m2-suggest__k">Maybe you were searching for this:</p>
                <div class="m2-suggest__name">
                    <img :src="pendingIcon(pendingSuggestion)" alt="" />
                    <a v-if="pendingSuggestion.link" :href="pendingSuggestion.link" target="_blank">{{ pendingSuggestion.name }}?</a>
                    <span v-else>{{ pendingSuggestion.name }}?</span>
                </div>
                <p class="m2-suggest__d">{{ pendingDesc(pendingSuggestion) }}</p>
                <p class="m2-suggest__d">The level is currently in <router-link to="/mobile/pending">Pending List</router-link>.</p>
            </div>
        </div>
    `,
    data: () => ({
        store,
        mobileStore,
        selected: -1,
        showScrollTop: false,
    }),
    computed: {
        displayList() {
            if (this.pageType === 'main') return mobileStore.rawList.filter(([l]) => l?.isMain || l?.isVerified);
            if (this.pageType === 'future') return mobileStore.rawList.filter(([l]) => l?.isFuture || l?.isVerified);
            return mobileStore.rawList;
        },
        // Benchmark mode hides verified non-benchmark levels, so the remaining rows are
        // renumbered 1..N instead of keeping the gaps their indices would leave. Kept as
        // a per-page Map rather than stamped onto the level objects: Main and Future are
        // subsets of the same shared rawList and each needs its own numbering.
        benchmarkRanks() {
            const ranks = new Map();
            if (!mobileStore.benchmarkMode) return ranks;
            let rank = 0;
            for (const [level] of this.displayList) {
                if (level && passesBenchmark(level, true)) ranks.set(level, ++rank);
            }
            return ranks;
        },
        noResults() {
            // Filters empty the list the same way a search does, and the page
            // owes the reader the same answer either way.
            if (!this.displayList.length) return false;
            return this.displayList.every(([level]) => !level || level.isHidden);
        },
        visibleCount() {
            return this.displayList.filter(([level]) => level && !level.isHidden).length;
        },
        allPaths() {
            return (mobileStore.rawList || []).map(([level]) => level?.path).filter(Boolean);
        },
        pendingSuggestion() {
            const q = mobileStore.search.toLowerCase().trim();
            if (!q) return null;
            return (mobileStore.pending || []).find(p => p && p.name && p.name.toLowerCase().includes(q)) || null;
        },
    },
    mounted() {
        applyFilters();
        const container = this.$el.closest('.mob-content');
        if (container) {
            this._scrollEl = container;
            this._onScroll = () => { this.showScrollTop = container.scrollTop > 300; };
            container.addEventListener('scroll', this._onScroll, { passive: true });
        }
    },
    beforeUnmount() {
        if (this._scrollEl) this._scrollEl.removeEventListener('scroll', this._onScroll);
    },
    methods: {
        rankOf(level, index) {
            return this.benchmarkRanks.get(level) || index + 1;
        },
        applyFilters,
        scrollToTop() {
            if (this._scrollEl) this._scrollEl.scrollTo({ top: 0, behavior: 'smooth' });
        },
        // The list this row belongs to leads; the others follow.
        // The same three chips in the same order on every list; only the list
        // being read is highlighted (js/util.js).
        ranks(level) { return levelRanks(level, this.pageType, true); },
        slug(level) {
            return levelSlug(level.path, this.allPaths);
        },
        decoration: decorationPercent,
        verification: verificationPercent,
        // The bar is the number, the reading is how it is written: a run says
        // the span it covers rather than the points it is worth.
        furthest: verificationLabel,
        status: levelStatus,
        record: bestRecord,
        run: bestRun,
        recordHref: recordLink,
        verifierKnown: hasVerifier,
        verifierLine,
        // The row has no room for "Decoration 80% done"; the panel spells it out.
        shortStatus(level) {
            const s = levelStatus(level);
            const pf = decorationPercent(level);
            if (s.label.startsWith('Decoration')) return pf + '%';
            if (s.label === 'Being verified') return 'Verifying';
            return s.label;
        },
        // The status pill already says what these tags say.
        tags(level) {
            const covered = ['verified', 'verifying', 'being verified', 'layout'];
            return (level?.tags || []).filter((t) => !covered.includes(String(t).toLowerCase()));
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
        levelThumbnail,
        getLevelNameStyle(level, isSelected) {
            if (!level) return {};
            const dark = !this.store.dark;
            if (level.tags?.includes('Unrated')) {
                const c = isSelected ? (dark ? '#dddddd' : '#888888') : (dark ? '#bbbbbb' : '#666666');
                return { color: c, fontWeight: level.isVerified ? 'bold' : 'normal' };
            }
            if (level.tags?.includes('Rated')) return { color: dark ? '#ffffff' : '#000000', fontWeight: level.isVerified ? 'bold' : 'normal' };
            if (level.isVerified) {
                return { color: isSelected ? (dark ? '#ffffff' : '#000000') : '#bbbbbb', fontWeight: 'bold' };
            }
            const rP = Math.max(0, ...((level.records || []).map(r => Number(r.percent) || 0)));
            const runP = Math.max(0, ...((level.run || []).map(r => {
                const p = String(r.percent).split('-').map(Number);
                return p.length === 2 ? Math.abs(p[1] - p[0]) : 0;
            })));
            const vP = Math.max(rP, runP);
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
        isOldLevel(level) {
            if (!level.lastUpd) return false;
            const p = level.lastUpd.split('.');
            if (p.length !== 3) return false;
            const d = new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
            const ago = new Date(); ago.setFullYear(ago.getFullYear() - 1);
            return d < ago;
        },
    },
};
