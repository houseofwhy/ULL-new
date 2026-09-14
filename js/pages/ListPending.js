import { store } from "../main.js";
import { fetchPending, fetchList } from "../content.js";

import Spinner from "../components/Spinner.js";
import Footer from "../components/Footer.js";

export default {
    components: { Spinner, Footer },
    template: `
        <main v-if="loading" class="surface" style="display:flex;align-items:center;justify-content:center;">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-pending surface ull2">
            <!-- Hero -->
            <section class="pending-hero">
                <h1>Pending List</h1>
                <p>Levels awaiting a decision from the staff team &mdash; a first placement, a move up or down, a removal, or a hold with no decision expected soon. Each marker is the level&rsquo;s estimated position on the <strong>Demonlist</strong>, not on this list.</p>
                <div class="pending-counts">
                    <button class="pending-count" type="button" @click="jumpTo('place')"><b>{{ placements.length }}</b><span>placements</span></button>
                    <button class="pending-count" type="button" @click="jumpTo('move')"><b>{{ movements.length }}</b><span>movements</span></button>
                    <button class="pending-count" type="button" @click="jumpTo('remove')"><b>{{ removals.length }}</b><span>removals</span></button>
                    <button class="pending-count" type="button" @click="jumpTo('hold')"><b>{{ holds.length }}</b><span>on hold</span></button>
                </div>
                <!-- Four lanes and no way to find a name in them: the field
                     filters all four at once, and the counts above follow it. -->
                <div class="pending-search">
                    <span class="info-mag" aria-hidden="true"></span>
                    <input v-model="query" type="search" class="pending-search__field"
                           placeholder="Search pending levels" aria-label="Search the pending list" @keydown.esc="query = ''" />
                </div>
            </section>

            <!-- Two columns of stacked lanes rather than one grid. In a grid
                 every card shares a row, so a short lane left the card beneath
                 it waiting on the tall lane beside it. -->
            <div class="pending-content">
                <div class="pending-cards">
                    <div class="pending-col">
                        <section class="pending-card pending-card--place" ref="place">
                            <h2 class="u-eyebrow pending-card__title">Pending Placements <span class="u-count">{{ placements.length }}</span></h2>
                            <div v-if="placements.length" class="pending-rows">
                                <div v-for="level in placements" :key="level.name" class="pending-row">
                                    <img class="pending-row__icon" :src="getIconPath(level.placement === '?' ? 'question' : level.placement)" alt="" />
                                    <a v-if="level.link" :href="level.link" class="pending-row__name">{{ level.name }}</a>
                                    <span v-else class="pending-row__name">{{ level.name }}</span>
                                    <span class="pending-row__target">{{ placementLabel(level.placement) }}</span>
                                </div>
                            </div>
                            <p v-else class="pending-empty">No pending placements.</p>
                        </section>
                        <template v-if="!placementsDominate">
                        <section class="pending-card pending-card--hold" ref="hold">
                            <h2 class="u-eyebrow pending-card__title">Pending Indefinitely <span class="u-count">{{ holds.length }}</span></h2>
                            <div v-if="holds.length" class="pending-rows">
                                <div v-for="level in holds" :key="level.name" class="pending-row">
                                    <img class="pending-row__icon" :src="getIconPath(level.placement === '?' ? 'question' : level.placement)" alt="" />
                                    <a v-if="level.link" :href="level.link" class="pending-row__name">{{ level.name }}</a>
                                    <span v-else class="pending-row__name">{{ level.name }}</span>
                                    <span class="pending-row__target">{{ placementLabel(level.placement) }}</span>
                                </div>
                            </div>
                            <p v-else class="pending-empty">No levels pending indefinitely.</p>
                        </section>
                        </template>
                    </div>
                    <div class="pending-col">
                        <!-- Placements can run longer than the other three put
                             together. When it does, the hold lane moves over so
                             the second column is not left short. -->
                        <template v-if="placementsDominate">
                        <section class="pending-card pending-card--hold" ref="hold">
                            <h2 class="u-eyebrow pending-card__title">Pending Indefinitely <span class="u-count">{{ holds.length }}</span></h2>
                            <div v-if="holds.length" class="pending-rows">
                                <div v-for="level in holds" :key="level.name" class="pending-row">
                                    <img class="pending-row__icon" :src="getIconPath(level.placement === '?' ? 'question' : level.placement)" alt="" />
                                    <a v-if="level.link" :href="level.link" class="pending-row__name">{{ level.name }}</a>
                                    <span v-else class="pending-row__name">{{ level.name }}</span>
                                    <span class="pending-row__target">{{ placementLabel(level.placement) }}</span>
                                </div>
                            </div>
                            <p v-else class="pending-empty">No levels pending indefinitely.</p>
                        </section>
                        </template>
                        <section class="pending-card pending-card--move" ref="move">
                            <h2 class="u-eyebrow pending-card__title">Pending Movements <span class="u-count">{{ movements.length }}</span></h2>
                            <div v-if="movements.length" class="pending-rows">
                                <div v-for="level in movements" :key="level.name" class="pending-row">
                                    <img class="pending-row__icon" :src="'/assets/move-' + (level.placement === 'up' ? 'up' : 'down') + '.svg'" alt="" />
                                    <a v-if="level.link" :href="level.link" class="pending-row__name">{{ level.name }}</a>
                                    <span v-else class="pending-row__name">{{ level.name }}</span>
                                    <span class="pending-row__target">{{ level.placement === 'up' ? 'Move up' : 'Move down' }}</span>
                                </div>
                            </div>
                            <p v-else class="pending-empty">No pending movements.</p>
                        </section>
                        <section class="pending-card pending-card--remove" ref="remove">
                            <h2 class="u-eyebrow pending-card__title">Pending Removals <span class="u-count">{{ removals.length }}</span></h2>
                            <div v-if="removals.length" class="pending-rows">
                                <div v-for="level in removals" :key="level.name" class="pending-row">
                                    <span class="pending-row__icon pending-row__icon--mark">&times;</span>
                                    <a v-if="level.link" :href="level.link" class="pending-row__name">{{ level.name }}</a>
                                    <span v-else class="pending-row__name">{{ level.name }}</span>
                                    <span class="pending-row__target">#{{ level.rank }}</span>
                                </div>
                            </div>
                            <p v-else class="pending-empty">No pending removals.</p>
                        </section>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <Footer />
        </main>
    `,
    data: () => ({
        query: '',
        pendingPlacements: [],
        pendingMovements: [],
        pendingIndefinite: [],
        removalCandidates: [],
        loading: true,
        store,
    }),
    async mounted() {
        const [pending, list] = await Promise.all([fetchPending(), fetchList()]);

        if (pending) {
            const isMove = (p) => ["up", "down"].includes((p.placement || "").toLowerCase());
            const byPlacement = (a, b) => {
                const getVal = (p) => p === "?" ? 999999 : (parseInt(p) || 999999);
                return getVal(a.placement) - getVal(b.placement) || a.name.localeCompare(b.name);
            };

            this.pendingPlacements = pending
                .filter(p => !isMove(p) && !p.indefinite)
                .sort(byPlacement);

            this.pendingMovements = pending.filter(isMove);

            this.pendingIndefinite = pending
                .filter(p => !isMove(p) && p.indefinite)
                .sort(byPlacement);
        }

        if (list) {
            const now = new Date();
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(now.getFullYear() - 1);

            this.removalCandidates = list
                .map(([level, err], i) => {
                    if (err || !level || level.isVerified) return null;
                    if (!level.lastUpd) return null;
                    const parts = level.lastUpd.split('.');
                    if (parts.length !== 3) return null;
                    const levelDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
                    if (levelDate >= oneYearAgo) return null;
                    // Removal candidates come from the level list, not the
                    // pending table, so they carry no link of their own — fall
                    // back to the level's showcase (then verification) video.
                    return { name: level.name, rank: i + 1, link: level.showcase || level.verification || '' };
                })
                .filter(Boolean);
        }

        this.loading = false;
    },
    computed: {
        // The four lanes as the page draws them: everything the API gave us
        // until the search field says otherwise.
        placements() { return this.matching(this.pendingPlacements); },
        movements() { return this.matching(this.pendingMovements); },
        removals() { return this.matching(this.removalCandidates); },
        holds() { return this.matching(this.pendingIndefinite); },
        // Rows, not pixels: the lanes are all the same shape, so their row
        // counts stand in for their heights without measuring anything.
        placementsDominate() {
            return this.placements.length
                > this.movements.length + this.removals.length + this.holds.length;
        },
    },
    methods: {
        matching(rows) {
            const q = this.query.trim().toLowerCase();
            if (!q) return rows;
            return rows.filter((r) => String(r.name || '').toLowerCase().includes(q));
        },
        jumpTo(lane) {
            const el = this.$refs[lane];
            const target = Array.isArray(el) ? el[0] : el;
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        },
        // The placement a level is waiting for is the one thing this page
        // exists to say, and it used to be encoded only in which of six icons
        // was drawn. The icon stays for scanning; the words say it outright.
        placementLabel(placement) {
            return !placement || placement === '?' ? 'No info' : `Top ${placement}`;
        },
        getIconPath(icon) {
            return `/assets/${icon}.svg`;
        },
    },
};
