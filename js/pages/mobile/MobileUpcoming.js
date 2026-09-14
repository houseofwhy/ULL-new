import {
    levelThumbnail, levelSlug, verificationPercent, verificationLabel, levelStatus,
    bestRecord, bestRun, recordLink, hasVerifier, verifierLine, levelRanks,
} from '../../util.js';
import { upcomingRanking } from '../../formulas.js';
import { mobileStore } from './mobileStore.js';

export default {
    template: `
        <div class="mob-list m2-page-body">
            <button v-if="showScrollTop" class="mob-scroll-top-btn" @click="scrollToTop">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708l6-6z"/></svg>
                Return to top
            </button>
            <section class="m2-hero">
                <h1>Upcoming Levels</h1>
                <p>Levels closest to verification, ranked by the highest progress achieved toward completing them.</p>
                <div class="m2-figs">
                    <span class="m2-fig m2-fig--lead"><b>{{ lbList.length }}</b><span>levels</span></span>
                </div>
            </section>

            <div class="m2-search">
                <input type="text" placeholder="Search levels..." v-model="search" />
                <button class="m2-search__btn" :class="{ active: mobileStore.openMenu === 'filters' }" @click="mobileStore.openMenu = mobileStore.openMenu === 'filters' ? null : 'filters'" title="Filters">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/></svg>
                </button>
            </div>

            <div v-if="!filteredList.length && search" class="u-empty">
                <div class="u-empty__t">No levels match your search</div>
                <div class="u-empty__d">Try part of a name, or clear the box to see everything.</div>
            </div>

            <div class="m2-rows">
                <div v-for="([level, err], i) in filteredList" :key="i" class="mob-level-row">
                    <button class="m2-row" :class="{ 'is-on': lbSelected === i }" @click="lbSelected = lbSelected === i ? -1 : i">
                        <span class="mob-rank m2-row__rank"><span>#{{ i + 1 }}</span></span>
                        <img v-if="mobileStore.showThumbnails && level" class="m2-row__thumb" :src="levelThumbnail(level)" alt="" loading="lazy" />
                        <span class="m2-row__body">
                            <span class="m2-row__name">{{ level?.name || \`Error (\${err}.json)\` }}</span>
                            <span class="m2-row__sub" v-if="level">{{ progressLabel(level) }}</span>
                            <!-- The bar the ordering is built from. -->
                            <span v-if="level" class="u-bar u-bar--thin m2-row__bar"><i :style="{ width: progress(level) + '%' }"></i></span>
                        </span>
                        <span v-if="level" class="m2-row__end">{{ furthest(level) || 'None' }}</span>
                    </button>

                    <div v-if="lbSelected === i && level" class="m2-detail">
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
                                <div class="u-card">
                                    <div class="m2-total">
                                        <div><b>{{ furthest(level) || 'None' }}</b><span>Furthest progress</span></div>
                                    </div>
                                    <div class="u-bar u-bar--alt m2-total__bar"><i :style="{ width: progress(level) + '%' }"></i></div>
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
        </div>
    `,
    data: () => ({
        mobileStore,
        lbSelected: -1,
        search: '',
        showScrollTop: false,
    }),
    computed: {
        lbList() {
            if (!mobileStore.rawList.length) return [];
            // Shared with the desktop page and the baked static content.
            const ranked = new Set(upcomingRanking(mobileStore.rawList.map(([l]) => l).filter(Boolean)));
            return mobileStore.rawList
                .filter(([l]) => ranked.has(l))
                .sort((a, b) => b[0].rankingScore - a[0].rankingScore);
        },
        allPaths() {
            return (mobileStore.rawList || []).map(([level]) => level?.path).filter(Boolean);
        },
        filteredList() {
            const q = this.search.trim().toLowerCase();
            if (!q) return this.lbList;
            return this.lbList.filter(([l]) => l && l.name.toLowerCase().includes(q));
        },
    },
    mounted() {
        // .mob-content is the shell's scroll container; the button appears once
        // roughly a screen of rows has gone past.
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
        scrollToTop() {
            if (this._scrollEl) this._scrollEl.scrollTo({ top: 0, behavior: 'smooth' });
        },
        levelThumbnail,
        progress: verificationPercent,
        // The bar is the number; the figure is how it reads (js/util.js).
        furthest: verificationLabel,
        status: levelStatus,
        record: bestRecord,
        run: bestRun,
        recordHref: recordLink,
        verifierKnown: hasVerifier,
        verifierLine,
        slug(level) {
            return levelSlug(level.path, this.allPaths);
        },
        // Says which of the two readings the bar is showing.
        progressLabel(level) {
            const run = bestRun(level);
            const rec = bestRecord(level);
            const runSpan = run ? verificationPercent({ run: [run], records: [] }) : 0;
            if (run && runSpan >= (rec ? Number(rec.percent) : 0)) return `run ${run.percent}% by ${run.user}`;
            if (rec) return `from 0% — ${rec.percent}% by ${rec.user}`;
            return 'no progress recorded';
        },
        ranks(level) { return levelRanks(level, 'all', true); },
    },
};
