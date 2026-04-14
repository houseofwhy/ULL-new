import { store } from "../main.js";
import { fetchPending, fetchList } from "../content.js";

import Spinner from "../components/Spinner.js";
import Footer from "../components/Footer.js";

export default {
    components: { Spinner, Footer },
    template: `
<component :is="'style'">
/* ── PENDING PAGE ── */
.page-pending {
    display: block;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    scrollbar-width: thin;
}
.page-pending, .page-pending * { font-family: "Lexend Deca", sans-serif; box-sizing: border-box; }
.page-pending h1, .page-pending h2, .page-pending h3, .page-pending h4, .page-pending p { margin: 0; padding: 0; }
.page-pending h1::before, .page-pending h1::after,
.page-pending h2::before, .page-pending h2::after,
.page-pending h3::before, .page-pending h3::after,
.page-pending h4::before, .page-pending h4::after { display: none; }

/* Hero */
.pending-hero {
    text-align: center;
    padding: 3rem 2rem 2.5rem;
    background: linear-gradient(180deg, rgba(102,10,239,0.15) 0%, transparent 100%);
    border-bottom: 1px solid rgba(128,128,128,0.15);
}
.root.dark .pending-hero {
    background: linear-gradient(180deg, rgba(62,0,249,0.08) 0%, transparent 100%);
}
.page-pending .pending-hero h1 {
    font-size: 2rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.2;
    color: #c084fc;
    margin-bottom: 0.75rem !important;
}
.pending-hero p {
    max-width: 500px;
    margin: 0 auto;
    font-size: 0.85rem;
    font-weight: 400;
    color: var(--color-on-background);
    opacity: 0.5;
    line-height: 1.7;
}

/* Content */
.pending-content {
    max-width: 1100px;
    margin: 0 auto;
    padding: 2.5rem 2rem;
}
.pending-cards {
    display: grid !important;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    width: 100%;
    align-items: start;
}

/* Right column stack */
.pending-right-stack {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

/* Card */
.pending-card {
    background: var(--color-background-hover);
    border: 1px solid rgba(128,128,128,0.15);
    border-radius: 0.75rem;
    padding: 1.75rem;
    transition: border-color 150ms ease;
}
.pending-card:hover { border-color: rgba(128,128,128,0.3); }
.pending-card__title {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: color-mix(in srgb, var(--color-primary) 65%, white);
    margin-bottom: 1rem;
}
.root.dark .pending-card__title {
    color: color-mix(in srgb, var(--color-primary) 65%, black);
}

/* Pending rows */
.pending-rows { display: flex; flex-direction: column; gap: 0.15rem; }
.pending-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.6rem;
    border-radius: 0.4rem;
    transition: background-color 100ms ease;
}
.pending-row:hover { background: rgba(128,128,128,0.06); }
.pending-row img { width: 1.3rem; height: 1.3rem; flex-shrink: 0; }
.pending-row a, .pending-row span {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--color-on-background);
    text-decoration: none;
    line-height: 1.4;
}
.pending-row a:hover { text-decoration: underline; }
.pending-row .pending-row__rank {
    font-size: 0.7rem;
    font-weight: 500;
    opacity: 0.4;
    margin-left: auto;
    white-space: nowrap;
}
.pending-empty {
    font-size: 0.85rem;
    font-weight: 400;
    color: var(--color-on-background);
    opacity: 0.45;
    padding: 0.75rem 0.6rem;
}

/* Footer spacing */
.page-pending .site-footer { margin-top: 3rem; }
</component>

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
        removalCandidates: [],
        loading: true,
        store,
    }),
    async mounted() {
        const [pending, list] = await Promise.all([fetchPending(), fetchList()]);

        if (pending) {
            this.pendingPlacements = pending
                .filter(p => !["up", "down"].includes(p.placement.toLowerCase()))
                .sort((a, b) => {
                    const getVal = (p) => p === "?" ? 999999 : (parseInt(p) || 999999);
                    return getVal(a.placement) - getVal(b.placement) || a.name.localeCompare(b.name);
                });

            this.pendingMovements = pending
                .filter(p => ["up", "down"].includes(p.placement.toLowerCase()));
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
