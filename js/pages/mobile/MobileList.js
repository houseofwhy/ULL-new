import { store } from '../../main.js';
import { embed, passesBenchmark } from '../../util.js';
import { mobileStore, applyFilters } from './mobileStore.js';

export default {
    props: {
        pageType: { type: String, default: 'all' },
    },
    template: `
        <div class="mob-list">
            <button v-if="showScrollTop" class="mob-scroll-top-btn" @click="scrollToTop">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708l6-6z"/></svg>
                Return to top
            </button>
            <div class="mob-page-hero">
                <h1 v-if="pageType === 'main'">Main List</h1>
                <h1 v-else-if="pageType === 'future'">Future List</h1>
                <h1 v-else>All Levels</h1>
                <p v-if="pageType === 'main'">The Main List highlights levels that meet the fundamental standards required to be considered for an official rating by the developer (“Rate”). </p>
                <p v-else-if="pageType === 'future'">This tier functions as a focused preview, listing only levels with a very high likelihood of soon verification and publication.</p>
                <p v-else>The most comprehensive tier, offering the largest level count and lowest bar for entry.</p>
            </div>
            <div class="mob-search-row">
                <input v-model="mobileStore.search" @input="applyFilters()" class="mob-search" type="text" placeholder="Search levels..." />
                <button class="mob-search-filter-btn" :class="{ active: mobileStore.openMenu === 'filters' }" @click="mobileStore.openMenu = mobileStore.openMenu === 'filters' ? null : 'filters'" title="Filters">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/></svg>
                </button>
            </div>
            <div v-if="noResults" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3rem 1rem 0;gap:0.5rem;opacity:0.25;text-align:center;color:var(--color-on-background);">
                <span style="font-size:1.5rem;">🔍</span>
                <p style="font-size:0.8rem;font-family:'Lexend Deca',sans-serif;">No levels match your search.</p>
            </div>
            <div v-for="([level, err], i) in displayList" :key="i" class="mob-level-row" v-show="!level?.isHidden">
                <button class="mob-level-btn" :class="{ active: selected === i }" @click="selected = selected === i ? -1 : i">
                    <span class="mob-rank" :style="mobileStore.showColors ? getLevelNameStyle(level, selected === i) : {}">
                        <span v-if="rankOf(level, i) <= 500">#{{ rankOf(level, i) }}</span>
                        <span v-else>{{ pageType === 'all' ? 'Londenberg' : pageType === 'main' ? 'Leg' : 'Legacy' }}</span>
                    </span>
                    <img v-if="mobileStore.showThumbnails && level" class="mob-thumb" :src="getThumbnail(level)" alt="" />
                    <div class="mob-level-info">
                        <div class="mob-level-name" :style="mobileStore.showColors ? getLevelNameStyle(level, selected === i) : {fontWeight: level?.isVerified ? 'bold' : 'normal', color: level?.isVerified ? (selected === i ? (!store.dark ? '#ffffff' : '#000000') : '#bbbbbb') : ''}">
                            {{ level?.name ? (mobileStore.showColors && isOldLevel(level) && !level?.isVerified ? level.name + ' \u{1F6AB}' : level.name) : \`Error (\${err}.json)\` }}
                        </div>
                        <div class="mob-level-sub" v-if="level">
                            {{ level.author }} · {{ level.verifier }}
                        </div>
                    </div>
                </button>
                <div v-if="selected === i && level" class="mob-level-detail">
                    <div v-if="otherListRanks(level).length" style="font-family:'Lexend Deca',sans-serif;font-size:0.75rem;opacity:0.5;margin-bottom:0.5rem;">
                        {{ otherListRanks(level).join(' · ') }}
                    </div>
                    <div class="mob-author-block">
                        <div class="mob-author-row"><span class="mob-author-label">Level Author</span><span class="mob-author-value">{{ level.author }}</span></div>
                        <div class="mob-author-row" v-if="level.creators && level.creators.length"><span class="mob-author-label">Creators</span><span class="mob-author-value">{{ level.creators.join(', ') }}</span></div>
                        <div class="mob-author-row"><span class="mob-author-label">{{ level.isVerified ? 'Verified by' : 'To be verified by' }}</span><span class="mob-author-value">{{ level.verifier }}</span></div>
                    </div>
                    <div class="mob-tags" v-if="level.tags && level.tags.length">
                        <span v-for="tag in level.tags" class="mob-tag">{{ tag }}</span>
                    </div>
                    <div class="mob-status">
                        <template v-if="level.isVerified">Status: Verified</template>
                        <template v-else-if="level.percentFinished == 0">Status: Layout</template>
                        <template v-else-if="level.percentFinished == 100">Status: Being Verified</template>
                        <template v-else>Status: Decoration {{ level.percentFinished }}% done</template>
                    </div>
                    <div v-if="!level.isVerified && level.records[0].percent != 100">
                        <div v-if="level.records[0].percent != 0" class="mob-wr">
                            WR From 0: <a v-if="level.records[0].link && level.records[0].link != '#'" :href="level.records[0].link" target="_blank">{{ level.records[0].percent }}% by {{ level.records[0].user }}</a><template v-else>{{ level.records[0].percent }}% by {{ level.records[0].user }}</template>
                        </div>
                        <div v-else class="mob-wr">WR From 0: None</div>
                        <div v-if="level.run[0].percent != '0'" class="mob-wr">
                            WR Run: <a v-if="level.run[0].link && level.run[0].link != '#'" :href="level.run[0].link" target="_blank">{{ level.run[0].percent }}% by {{ level.run[0].user }}</a><template v-else>{{ level.run[0].percent }}% by {{ level.run[0].user }}</template>
                        </div>
                        <div v-else class="mob-wr">WR Run: None</div>
                    </div>
                    <div v-if="!level.isVerified && level.records[0].percent == 100" class="mob-wr">
                        Layout verified by {{ level.records[0].user }}
                    </div>
                    <div v-if="level.isVerified" class="mob-showcase-tabs">
                        <button class="mob-showcase-tab" :class="{ active: toggledShowcase }" @click="toggledShowcase = true">Showcase</button>
                        <button class="mob-showcase-tab" :class="{ active: !toggledShowcase }" @click="toggledShowcase = false">Verification</button>
                    </div>
                    <iframe class="mob-video" :src="getVideo(level)" frameborder="0" allowfullscreen></iframe>
                    <div class="mob-stats">
                        <dl class="mob-stat"><dt>ID</dt><dd>{{ (level.id === 'private' && level.leakID != null) ? level.leakID : level.id }}</dd></dl>
                        <dl class="mob-stat"><dt>Length</dt><dd>{{ Math.floor(level.length/60) }}m {{ level.length%60 }}s</dd></dl>
                        <dl class="mob-stat"><dt>Updated</dt><dd>{{ level.lastUpd }}</dd></dl>
                    </div>
                </div>
            </div>
            <div v-if="pendingSuggestion && (noResults || visibleCount <= 3)" style="display:flex;flex-direction:column;align-items:center;gap:0.5rem;margin:1.25rem auto;max-width:22rem;padding:1rem 1.25rem;border:1px solid rgba(128,128,128,0.25);border-radius:0.6rem;font-family:'Lexend Deca',sans-serif;text-align:center;color:var(--color-on-background);">
                <p style="font-size:0.75rem;opacity:0.55;margin:0;">Maybe you were searching for this:</p>
                <div style="display:flex;align-items:center;gap:0.4rem;">
                    <img :src="pendingIcon(pendingSuggestion)" alt="" style="width:1.3rem;height:1.3rem;flex-shrink:0;" />
                    <a v-if="pendingSuggestion.link" :href="pendingSuggestion.link" target="_blank" style="font-size:1rem;font-weight:700;text-decoration:underline;">{{ pendingSuggestion.name }}?</a>
                    <span v-else style="font-size:1rem;font-weight:700;">{{ pendingSuggestion.name }}?</span>
                </div>
                <p style="font-size:0.72rem;opacity:0.6;margin:0;">{{ pendingDesc(pendingSuggestion) }}</p>
                <p style="font-size:0.78rem;opacity:0.8;margin:0;">The level is currently in <router-link to="/mobile/pending" style="text-decoration:underline;">Pending List</router-link>.</p>
            </div>
        </div>
    `,
    data: () => ({
        store,
        mobileStore,
        selected: -1,
        toggledShowcase: false,
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
            if (!mobileStore.search.trim()) return false;
            return this.displayList.every(([level]) => !level || level.isHidden);
        },
        visibleCount() {
            return this.displayList.filter(([level]) => level && !level.isHidden).length;
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
        otherListRanks(level) {
            if (!level) return [];
            const out = [];
            if (this.pageType !== 'all' && level.allLevelsRank) out.push('#' + level.allLevelsRank + ' in All Levels');
            if (this.pageType !== 'main' && level.mainRank) out.push('#' + level.mainRank + ' in Main List');
            if (this.pageType !== 'future' && level.futureRank) out.push('#' + level.futureRank + ' in Future List');
            return out;
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
        getThumbnail(level) {
            if (level.thumbnail) return level.thumbnail;
            const yt = url => {
                if (!url || typeof url !== 'string') return '';
                const m = url.match(/.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=)([^#&?]*).*/);
                return m ? `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg` : '';
            };
            return yt(level.verification) || yt(level.showcase) || '';
        },
        getVideo(level) {
            const toStr = v => (v && typeof v === 'string') ? v : '';
            if (!level.showcase) return embed(toStr(level.verification));
            return embed(this.toggledShowcase || !level.isVerified ? toStr(level.showcase) : toStr(level.verification));
        },
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
