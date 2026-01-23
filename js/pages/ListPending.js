import { store } from "../main.js";
import { fetchEditors, fetchPending } from "../content.js";

import Spinner from "../components/Spinner.js";
import ListEditors from "../components/ListEditors.js";

const roleIconMap = {
    owner: "crown",
    admin: "user-gear",
    seniormod: "user-shield",
    mod: "user-lock",
    dev: "code",
};

export default {
    components: { Spinner, ListEditors },
    template: `
        <header class="new">
            <nav class="nav">
                <router-link class="nav__tab" to="/">
                    <span class="type-label-lg">All Levels</span>
                </router-link>
                <router-link class="nav__tab" to="/listmain">
                    <span class="type-label-lg">Main List</span>
                </router-link>
                <router-link class="nav__tab" to="/listfuture">
                    <span class="type-label-lg">Future List</span>
                </router-link>
                <router-link class="nav__tab" to="/pending">
                    <span class="type-label-lg">Pending List</span>
                </router-link>
            </nav>
        </header>
        <main v-if="loading" class="surface">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-list">
            <div class="list-container surface">
                <h3 style="margin-bottom: 1rem;">Pending Placements</h3>
                <table class="list" v-if="pendingPlacements.length > 0">
                    <tr v-for="(level, i) in pendingPlacements">
                        <td class="rank">
                            <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.5rem;">
                                <img :src="getIconPath(level.placement === '?' ? 'question' : level.placement)" style="height: 1.5rem; width: 1.5rem;">
                            </div>
                        </td>
                        <td class="level">
                            <div class="type-label-lg" style="padding: 1rem;">{{ level.name }}</div>
                        </td>
                    </tr>
                </table>
                <p v-else style="padding: 1rem;">No pending placements.</p>
            </div>
            <div class="level-container surface">
                <h3 style="margin-bottom: 1rem;">Pending Movements</h3>
                <table class="list" v-if="pendingMovements.length > 0">
                    <tr v-for="(level, i) in pendingMovements">
                        <td class="rank">
                            <div style="display: flex; align-items: center; justify-content: flex-end;">
                                <img :src="'/assets/move-' + (level.placement === 'up' ? 'up' : 'down') + '.svg'" style="height: 1.5rem; width: 1.5rem;">
                            </div>
                        </td>
                        <td class="level">
                            <div class="type-label-lg" style="padding: 1rem;">{{ level.name }}</div>
                        </td>
                    </tr>
                </table>
                <p v-else style="padding: 1rem;">No pending movements.</p>
            </div>
            <div class="meta-container surface">
                <div class="meta">
                    <div class="meta">
                        <h3>Legend</h3>
                        <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem;">
                            <!-- Movements -->
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <img src="/assets/move-up.svg" style="height: 1.5rem; width: 1.5rem;">
                                <p>Moving Up</p>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <img src="/assets/move-down.svg" style="height: 1.5rem; width: 1.5rem;">
                                <p>Moving Down</p>
                            </div>
                            <!-- Placements -->
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <img src="/assets/1.svg" style="height: 1.5rem; width: 1.5rem;">
                                <p>Pending #1</p>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <img src="/assets/10.svg" style="height: 1.5rem; width: 1.5rem;">
                                <p>Pending Top 10</p>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <img src="/assets/20.svg" style="height: 1.5rem; width: 1.5rem;">
                                <p>Pending Top 20</p>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <img src="/assets/30.svg" style="height: 1.5rem; width: 1.5rem;">
                                <p>Pending Top 30</p>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <img src="/assets/50.svg" style="height: 1.5rem; width: 1.5rem;">
                                <p>Pending Top 50</p>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <img src="/assets/75.svg" style="height: 1.5rem; width: 1.5rem;">
                                <p>Pending Top 75</p>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <img src="/assets/question.svg" style="height: 1.5rem; width: 1.5rem;">
                                <p>Unknown Placement</p>
                            </div>
                        </div>
                    </div>
                    <ListEditors :editors="editors" />
            </div>
        </main>
    `,
    data: () => ({
        pendingPlacements: [],
        pendingMovements: [],
        editors: [],
        loading: true,
        roleIconMap,
        store,
    }),
    async mounted() {
        const pending = await fetchPending();
        this.editors = await fetchEditors();

        if (pending) {
            this.pendingPlacements = pending
                .filter(p => !["up", "down"].includes(p.placement.toLowerCase()))
                .sort((a, b) => {
                    const getVal = (p) => {
                        if (p === "?") return 999999;
                        return parseInt(p) || 999999;
                    };
                    const valA = getVal(a.placement);
                    const valB = getVal(b.placement);
                    if (valA !== valB) return valA - valB;
                    return a.name.localeCompare(b.name);
                });

            this.pendingMovements = pending
                .filter(p => ["up", "down"].includes(p.placement.toLowerCase()));
        }

        this.loading = false;
    },
    methods: {
        getIconPath(icon) {
            return `/assets/${icon}.svg`;
        },
    },
};
