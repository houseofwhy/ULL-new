import { store } from '../main.js';
import { fetchPending } from '../content.js';
import Sidebar from './Sidebar.js';
import SettingsModal from './SettingsModal.js';
import Spinner from '../components/Spinner.js';

export default {
    components: { Sidebar, SettingsModal, Spinner },
    data: () => ({
        store, loading: true,
        pendingPlacements: [], pendingMovements: [],
        showSettings: false,
    }),
    methods: {
        getIconPath(icon) { return `/assets/${icon}.svg`; },
    },
    template: `
    <div class="pc-shell" :class="{ dark: store.dark }">
        <Sidebar @open-settings="showSettings = true" />
        <div class="pc-page">
            <div v-if="loading" class="pc-spinner"><Spinner /></div>
            <div v-else class="pc-cols pc-cols--50-50">
                <!-- Pending Placements -->
                <div class="pc-col">
                    <div class="pc-pending-title">Pending Placements</div>
                    <div v-if="pendingPlacements.length">
                        <div class="pc-pending-row" v-for="level in pendingPlacements" :key="level.name">
                            <img :src="getIconPath(level.placement === '?' ? 'question' : level.placement)" alt="" />
                            <span>{{ level.name }}</span>
                        </div>
                    </div>
                    <p v-else style="opacity:0.45;font-size:14px;">No pending placements.</p>
                </div>
                <!-- Pending Movements -->
                <div class="pc-col">
                    <div class="pc-pending-title">Pending Movements</div>
                    <div v-if="pendingMovements.length">
                        <div class="pc-pending-row" v-for="level in pendingMovements" :key="level.name">
                            <img :src="'/assets/move-' + (level.placement === 'up' ? 'up' : 'down') + '.svg'" alt="" />
                            <span>{{ level.name }}</span>
                        </div>
                    </div>
                    <p v-else style="opacity:0.45;font-size:14px;">No pending movements.</p>

                    <div style="margin-top:2rem;">
                        <div class="pc-pending-title">Legend</div>
                        <div class="pc-pending-row"><img src="/assets/move-up.svg" /><span>Moving Up</span></div>
                        <div class="pc-pending-row"><img src="/assets/move-down.svg" /><span>Moving Down</span></div>
                        <div class="pc-pending-row"><img src="/assets/1.svg" /><span>Pending #1</span></div>
                        <div class="pc-pending-row"><img src="/assets/10.svg" /><span>Pending Top 10</span></div>
                        <div class="pc-pending-row"><img src="/assets/20.svg" /><span>Pending Top 20</span></div>
                        <div class="pc-pending-row"><img src="/assets/30.svg" /><span>Pending Top 30</span></div>
                        <div class="pc-pending-row"><img src="/assets/50.svg" /><span>Pending Top 50</span></div>
                        <div class="pc-pending-row"><img src="/assets/75.svg" /><span>Pending Top 75</span></div>
                        <div class="pc-pending-row"><img src="/assets/question.svg" /><span>Unknown Placement</span></div>
                    </div>
                </div>
            </div>
        </div>
        <SettingsModal v-if="showSettings" @close="showSettings = false" />
    </div>`,
    async mounted() {
        const pending = await fetchPending();
        if (pending) {
            this.pendingPlacements = pending
                .filter(p => !['up','down'].includes(p.placement.toLowerCase()))
                .sort((a,b) => {
                    const v = p => p.placement === '?' ? 999999 : (parseInt(p.placement)||999999);
                    return v(a) - v(b) || a.name.localeCompare(b.name);
                });
            this.pendingMovements = pending.filter(p => ['up','down'].includes(p.placement.toLowerCase()));
        }
        this.loading = false;
    },
};
