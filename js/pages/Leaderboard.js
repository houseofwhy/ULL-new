import { store } from '../main.js';
import { fetchList } from '../content.js';
import { buildLeaderboard, recordProgress, recordTypeLabel } from '../leaderboard.js';

import Spinner from '../components/Spinner.js';

// The tones are the status scale used everywhere else, borrowed here to
// separate the four ways a score can be earned at a glance.
const TYPE_TONE = {
    verification: 'blue',
    layout: 'amber',
    run: 'cyan',
    record: 'green',
};

// The player panel used to be a name, a "Total Score: 12.408" sentence and a
// borrowed table held together by twenty-five inline styles, with nothing to
// separate first place from two-hundredth. It is now a profile: the total as a
// display figure and the records as rows, each with what it was worth and what
// kind of record it was. Every number comes from js/leaderboard.js as before.
export default {
    components: { Spinner },
    template: `
    <main v-if="loading" class="surface" style="display:flex;align-items:center;justify-content:center;">
        <Spinner></Spinner>
    </main>
    <main v-else class="page-list-new page-leaderboard page-with-hero ull2">
        <div class="u-phero">
            <div class="u-phero__body">
                <h1>Leaderboard</h1>
                <p>This page shows the top players ranked according to their records set on upcoming levels as well as according to their verifications of levels on the Demonlist.</p>
            </div>
            <div class="u-phero__side">
                <div class="u-stat"><div class="u-stat__k">Players</div><span class="u-stat__v">{{ players.length }}</span></div>
            </div>
        </div>

        <div class="list-container-new surface">
            <div class="search-row search-row--leaderboard">
                <label class="search-field">
                    <span class="info-mag" aria-hidden="true"></span>
                    <input v-model="search" class="search-new" type="text" placeholder="Search players..." />
                </label>
            </div>

            <div v-if="podium.length === 3 && !search.trim()" class="lb-podium">
                <button v-for="p in podium" :key="p.name" class="lb-pod" :class="'lb-pod--' + p.globalRank"
                        @click="selectByName(p.name)">
                    <span class="lb-pod__p">{{ ordinal(p.globalRank) }}</span>
                    <span class="lb-pod__n">{{ p.name }}</span>
                    <span class="lb-pod__s">{{ p.total.toFixed(3) }}</span>
                </button>
            </div>

            <div v-if="filteredPlayers.length" class="lb-rows">
                <button v-for="(player, i) in filteredPlayers" :key="player.name"
                        class="lb-row" :class="{ 'is-on': selected === i }" @click="selected = i">
                    <span class="lb-row__r">#{{ player.globalRank }}</span>
                    <span class="lb-row__n">{{ player.name }}</span>
                    <span class="lb-row__s">{{ player.total.toFixed(3) }}</span>
                </button>
            </div>
            <div v-else-if="players.length" class="u-empty">
                <div class="u-empty__t">No players match your search</div>
                <div class="u-empty__d">Try part of a name, or clear the box to see everyone.</div>
            </div>
            <div v-else class="u-empty">
                <div class="u-empty__t">No players yet</div>
                <div class="u-empty__d">Scores appear as records are added to the list.</div>
            </div>
            <div class="scroll-top-wrap">
                <button v-if="showScrollTop" class="scroll-top-btn" @click="scrollToTop">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708l6-6z"/></svg>
                    Return to top
                </button>
            </div>
        </div>

        <div class="level-container-new surface">
            <div v-if="selectedPlayer" class="lb-player">
                <header class="lb-head">
                    <div class="lb-head__who">
                        <h1 class="lb-head__name">{{ selectedPlayer.name }}</h1>
                        <p class="lb-head__sub">Ranked {{ ordinal(selectedPlayer.globalRank) }} of {{ players.length }} players</p>
                    </div>
                    <div class="lb-total">
                        <b>{{ selectedPlayer.total.toFixed(3) }}</b>
                        <span>Total points</span>
                    </div>
                </header>

                <section v-if="selectedPlayer.records.length">
                    <h2 class="u-eyebrow">Records <span class="u-count">{{ selectedPlayer.records.length }}</span></h2>
                    <div class="lb-recs">
                        <div v-for="rec in selectedPlayer.records" :key="rec.levelName + rec.percent + rec.type" class="lb-rec">
                            <span class="lb-rec__score">+{{ rec.score.toFixed(3) }}</span>
                            <span class="lb-rec__lvl">
                                {{ rec.levelName }}<span class="lb-rec__pct">{{ recordProgress(rec) }}</span><span class="lb-rec__rank">#{{ rec.levelRank }}</span>
                            </span>
                            <span class="u-pill" :class="'u-pill--' + tone(rec.type)"><i></i>{{ recordLabel(rec) }}</span>
                        </div>
                    </div>
                </section>
                <div v-else class="u-empty">
                    <div class="u-empty__t">No scoring records</div>
                </div>
            </div>
            <div v-else class="lb-player lb-player--empty">
                <div class="u-empty">
                    <div class="u-empty__t">Select a player</div>
                    <div class="u-empty__d">Pick one from the board to see how their score was earned.</div>
                </div>
            </div>
        </div>
    </main>
    `,
    data: () => ({
        players: [],
        loading: true,
        selected: 0,
        search: '',
        showScrollTop: false,
        store,
    }),
    computed: {
        filteredPlayers() {
            if (!this.search.trim()) return this.players;
            const q = this.search.toLowerCase().trim();
            return this.players.filter(p => p.name.toLowerCase().includes(q));
        },
        selectedPlayer() {
            return this.filteredPlayers[this.selected] || null;
        },
        // Second, first, third — so the winner stands in the middle.
        podium() {
            const [first, second, third] = this.players;
            return [second, first, third].filter(Boolean).length === 3 ? [second, first, third] : [];
        },
    },
    watch: {
        search() {
            this.selected = 0;
        },
    },
    async mounted() {
        const list = await fetchList();
        if (!list) { this.loading = false; return; }

        this.players = buildLeaderboard(list);

        this.loading = false;
        this.$nextTick(() => this.watchScroll());
    },
    beforeUnmount() {
        if (this._scrollEl) this._scrollEl.removeEventListener('scroll', this._onScroll);
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
                    const row = el.querySelector('.lb-row');
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

        tone(type) { return TYPE_TONE[type] || 'done'; },
        ordinal(n) {
            const tens = n % 100;
            if (tens >= 11 && tens <= 13) return `${n}th`;
            return `${n}${['th', 'st', 'nd', 'rd'][n % 10] || 'th'}`;
        },
        recordProgress,
        // How far the player got sits next to the level name now, so the pill
        // at the end of the row says what kind of record it is.
        recordLabel: recordTypeLabel,
        selectByName(name) {
            const at = this.filteredPlayers.findIndex((p) => p.name === name);
            if (at >= 0) this.selected = at;
        },
    },
};
