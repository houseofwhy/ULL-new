import { mobileStore } from './mobileStore.js';

export default {
    template: `
        <div class="mob-pending-page m2-page-body">
            <section class="m2-hero">
                <h1>Pending List</h1>
                <p>Levels awaiting a decision from the staff team — a first placement, a move up or down, a removal, or a hold. Each marker is the level's estimated position on the <strong>Demonlist</strong>, not on this list.</p>
                <div class="m2-figs">
                    <button class="m2-fig" type="button" @click="jumpTo('place')"><b>{{ placements.length }}</b><span>placements</span></button>
                    <button class="m2-fig" type="button" @click="jumpTo('move')"><b>{{ movements.length }}</b><span>movements</span></button>
                    <button class="m2-fig" type="button" @click="jumpTo('remove')"><b>{{ removals.length }}</b><span>removals</span></button>
                    <button class="m2-fig" type="button" @click="jumpTo('hold')"><b>{{ holds.length }}</b><span>on hold</span></button>
                </div>
            </section>

            <!-- One field over all four lanes, and the counts above follow it. -->
            <div class="m2-search">
                <input v-model="query" type="text" placeholder="Search pending levels..." />
            </div>

            <div class="m2-body">
                <section class="mob-pending-card u-card m2-lane m2-lane--place" ref="place">
                    <h2 class="u-eyebrow">Pending Placements <span class="u-count">{{ placements.length }}</span></h2>
                    <div v-if="placements.length" class="m2-plist">
                        <div v-for="level in placements" :key="level.name" class="mob-pending-row m2-prow">
                            <img class="m2-prow__icon" :src="getIconPath(level.placement)" alt="" />
                            <a v-if="level.link" :href="level.link" class="m2-prow__name">{{ level.name }}</a>
                            <span v-else class="m2-prow__name">{{ level.name }}</span>
                            <span class="m2-prow__target">{{ placementLabel(level.placement) }}</span>
                        </div>
                    </div>
                    <p v-else class="u-empty__d">No pending placements.</p>
                </section>

                <section class="mob-pending-card u-card m2-lane m2-lane--move" ref="move">
                    <h2 class="u-eyebrow">Pending Movements <span class="u-count">{{ movements.length }}</span></h2>
                    <div v-if="movements.length" class="m2-plist">
                        <div v-for="level in movements" :key="level.name" class="mob-pending-row m2-prow">
                            <img class="m2-prow__icon" :src="'/assets/move-' + (level.placement === 'up' ? 'up' : 'down') + '.svg'" alt="" />
                            <a v-if="level.link" :href="level.link" class="m2-prow__name">{{ level.name }}</a>
                            <span v-else class="m2-prow__name">{{ level.name }}</span>
                            <span class="m2-prow__target">{{ level.placement === 'up' ? 'Move up' : 'Move down' }}</span>
                        </div>
                    </div>
                    <p v-else class="u-empty__d">No pending movements.</p>
                </section>

                <section class="mob-pending-card u-card m2-lane m2-lane--remove" ref="remove">
                    <h2 class="u-eyebrow">Pending Removals <span class="u-count">{{ removals.length }}</span></h2>
                    <div v-if="removals.length" class="m2-plist">
                        <div v-for="level in removals" :key="level.name" class="mob-pending-row m2-prow">
                            <span class="m2-prow__icon m2-prow__icon--mark">&times;</span>
                            <a v-if="level.link" :href="level.link" class="m2-prow__name">{{ level.name }}</a>
                            <span v-else class="m2-prow__name">{{ level.name }}</span>
                            <span class="m2-prow__target">#{{ level.rank }}</span>
                        </div>
                    </div>
                    <p v-else class="u-empty__d">No pending removals.</p>
                </section>

                <section class="mob-pending-card u-card m2-lane m2-lane--hold" ref="hold">
                    <h2 class="u-eyebrow">Pending Indefinitely <span class="u-count">{{ holds.length }}</span></h2>
                    <div v-if="holds.length" class="m2-plist">
                        <div v-for="level in holds" :key="level.name" class="mob-pending-row m2-prow">
                            <img class="m2-prow__icon" :src="getIconPath(level.placement)" alt="" />
                            <a v-if="level.link" :href="level.link" class="m2-prow__name">{{ level.name }}</a>
                            <span v-else class="m2-prow__name">{{ level.name }}</span>
                            <span class="m2-prow__target">{{ placementLabel(level.placement) }}</span>
                        </div>
                    </div>
                    <p v-else class="u-empty__d">No levels pending indefinitely.</p>
                </section>
            </div>
        </div>
    `,
    data: () => ({ mobileStore, query: '' }),
    computed: {
        // The four lanes as the page draws them: everything the shell loaded,
        // until the search field says otherwise.
        placements() { return this.matching(mobileStore.pendingPlacements); },
        movements() { return this.matching(mobileStore.pendingMovements); },
        holds() { return this.matching(mobileStore.pendingIndefinite); },
        removals() { return this.matching(this.removalCandidates); },
        removalCandidates() {
            if (!mobileStore.rawList.length) return [];
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            return mobileStore.rawList
                .map(([level, err], i) => {
                    if (err || !level || level.isVerified) return null;
                    if (!level.lastUpd) return null;
                    const parts = level.lastUpd.split('.');
                    if (parts.length !== 3) return null;
                    const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
                    if (d >= oneYearAgo) return null;
                    // Removal candidates come from the level list, not the
                    // pending table, so they carry no link of their own — fall
                    // back to the level's showcase (then verification) video.
                    return { name: level.name, rank: i + 1, link: level.showcase || level.verification || '' };
                })
                .filter(Boolean);
        },
    },
    methods: {
        matching(rows) {
            const q = this.query.trim().toLowerCase();
            if (!q) return rows || [];
            return (rows || []).filter((r) => String(r.name || '').toLowerCase().includes(q));
        },
        jumpTo(lane) {
            const el = this.$refs[lane];
            const target = Array.isArray(el) ? el[0] : el;
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        },
        getIconPath(placement) {
            return `/assets/${placement === '?' || !placement ? 'question' : placement}.svg`;
        },
        // The placement a level waits for is the one thing this page exists to
        // say, and it used to be encoded only in which of six icons was drawn.
        placementLabel(placement) {
            return !placement || placement === '?' ? 'No info' : `Top ${placement}`;
        },
    },
};
