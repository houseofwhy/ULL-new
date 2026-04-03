import { store } from "../main.js";
import { fetchEditors, fetchPending } from "../content.js";

import Spinner from "../components/Spinner.js";

export default {
    components: { Spinner },
    template: `
        <main v-if="loading" class="surface" style="display:flex;align-items:center;justify-content:center;">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-pending-new">
            <div class="pending-section surface">
                <h3 style="margin-bottom: 1rem;">Pending Placements</h3>
                <table class="list" v-if="pendingPlacements.length > 0">
                    <tr v-for="(level, i) in pendingPlacements">
                        <td class="rank">
                            <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.5rem;">
                                <img :src="getIconPath(level.placement === '?' ? 'question' : level.placement)" style="height: 1.5rem; width: 1.5rem;">
                            </div>
                        </td>
                        <td class="level">
                            <div class="type-label-lg" style="padding: 1rem;">
                                <a :href="level.link">{{ level.name }}</a>
                            </div>
                        </td>
                    </tr>
                </table>
                <p v-else style="padding: 1rem;">No pending placements :)</p>
            </div>
            <div class="pending-section surface">
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
                <p v-else style="padding: 1rem;">No pending movements :)</p>
            </div>
        </main>
    `,
    data: () => ({
        pendingPlacements: [],
        pendingMovements: [],
        loading: true,
        store,
    }),
    async mounted() {
        const pending = await fetchPending();

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

        this.loading = false;
    },
    methods: {
        getIconPath(icon) {
            return `/assets/${icon}.svg`;
        },
    },
};
