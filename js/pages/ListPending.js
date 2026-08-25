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
        <main v-else class="page-pending surface">
            <!-- Hero -->
            <section class="pending-hero">
                <h1>Pending List</h1>
                <p>Levels currently awaiting placement or movement on<br>the Upcoming Levels List.</p>
            </section>

            <!-- Cards -->
            <div class="pending-content">
                <div class="pending-cards">
                    <!-- Placements (left) -->
                    <div class="pending-card">
                        <div class="pending-card__title">Pending Placements</div>
                        <div v-if="pendingPlacements.length > 0" class="pending-rows">
                            <div v-for="level in pendingPlacements" class="pending-row">
                                <img :src="getIconPath(level.placement === '?' ? 'question' : level.placement)" alt="" />
                                <a v-if="level.link" :href="level.link">{{ level.name }}</a>
                                <span v-else>{{ level.name }}</span>
                            </div>
                        </div>
                        <p v-else class="pending-empty">No pending placements.</p>
                    </div>

                    <!-- Right column: Movements + Removals -->
                    <div class="pending-right-stack">
                        <!-- Movements -->
                        <div class="pending-card">
                            <div class="pending-card__title">Pending Movements</div>
                            <div v-if="pendingMovements.length > 0" class="pending-rows">
                                <div v-for="level in pendingMovements" class="pending-row">
                                    <img :src="'/assets/move-' + (level.placement === 'up' ? 'up' : 'down') + '.svg'" alt="" />
                                    <span>{{ level.name }}</span>
                                </div>
                            </div>
                            <p v-else class="pending-empty">No pending movements.</p>
                        </div>

                        <!-- Removals -->
                        <div class="pending-card">
                            <div class="pending-card__title">Pending Removals</div>
                            <div v-if="removalCandidates.length > 0" class="pending-rows">
                                <div v-for="level in removalCandidates" class="pending-row">
                                    <span style="font-size:0.85rem; flex-shrink:0;">🚫</span>
                                    <span>{{ level.name }}</span>
                                    <span class="pending-row__rank">#{{ level.rank }}</span>
                                </div>
                            </div>
                            <p v-else class="pending-empty">No pending removals.</p>
                        </div>

                        <!-- Indefinitely -->
                        <div class="pending-card">
                            <div class="pending-card__title">Pending Indefinitely</div>
                            <div v-if="pendingIndefinite.length > 0" class="pending-rows">
                                <div v-for="level in pendingIndefinite" class="pending-row">
                                    <img :src="getIconPath(level.placement === '?' ? 'question' : level.placement)" alt="" />
                                    <a v-if="level.link" :href="level.link">{{ level.name }}</a>
                                    <span v-else>{{ level.name }}</span>
                                </div>
                            </div>
                            <p v-else class="pending-empty">No levels pending indefinitely.</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <Footer />
        </main>
    `,
    data: () => ({
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
                    return { name: level.name, rank: i + 1 };
                })
                .filter(Boolean);
        }

        this.loading = false;
    },
    methods: {
        getIconPath(icon) {
            return `/assets/${icon}.svg`;
        },
    },
};
