import { mobileStore } from './mobileStore.js';

export default {
    template: `
        <div class="mob-pending-page">
            <div class="mob-pending-hero">
                <h1>Pending List</h1>
                <p>Levels currently awaiting placement or movement on the Upcoming Levels List.</p>
            </div>
            <div class="mob-pending-cards">
                <div class="mob-pending-card">
                    <div class="mob-pending-card__title">Pending Placements</div>
                    <div v-if="mobileStore.pendingPlacements.length > 0" class="mob-pending-rows">
                        <div v-for="level in mobileStore.pendingPlacements" class="mob-pending-row">
                            <img :src="'/assets/' + (level.placement === '?' ? 'question' : level.placement) + '.svg'" alt="" />
                            <a v-if="level.link" :href="level.link">{{ level.name }}</a>
                            <span v-else>{{ level.name }}</span>
                        </div>
                    </div>
                    <p v-else class="mob-pending-empty">No pending placements.</p>
                </div>
                <div class="mob-pending-card">
                    <div class="mob-pending-card__title">Pending Movements</div>
                    <div v-if="mobileStore.pendingMovements.length > 0" class="mob-pending-rows">
                        <div v-for="level in mobileStore.pendingMovements" class="mob-pending-row">
                            <img :src="'/assets/move-' + (level.placement === 'up' ? 'up' : 'down') + '.svg'" alt="" />
                            <a v-if="level.link" :href="level.link">{{ level.name }}</a>
                            <span v-else>{{ level.name }}</span>
                        </div>
                    </div>
                    <p v-else class="mob-pending-empty">No pending movements.</p>
                </div>
                <div class="mob-pending-card">
                    <div class="mob-pending-card__title">Pending Removals</div>
                    <div v-if="removalCandidates.length > 0" class="mob-pending-rows">
                        <div v-for="level in removalCandidates" class="mob-pending-row">
                            <span class="mob-pending-removal-icon">&#x1F6AB;</span>
                            <a v-if="level.link" :href="level.link">{{ level.name }}</a>
                            <span v-else>{{ level.name }}</span>
                            <span class="mob-pending-row__rank">#{{ level.rank }}</span>
                        </div>
                    </div>
                    <p v-else class="mob-pending-empty">No pending removals.</p>
                </div>
                <div class="mob-pending-card">
                    <div class="mob-pending-card__title">Pending Indefinitely</div>
                    <div v-if="mobileStore.pendingIndefinite.length > 0" class="mob-pending-rows">
                        <div v-for="level in mobileStore.pendingIndefinite" class="mob-pending-row">
                            <img :src="'/assets/' + (level.placement === '?' ? 'question' : level.placement) + '.svg'" alt="" />
                            <a v-if="level.link" :href="level.link">{{ level.name }}</a>
                            <span v-else>{{ level.name }}</span>
                        </div>
                    </div>
                    <p v-else class="mob-pending-empty">No levels pending indefinitely.</p>
                </div>
            </div>
        </div>
    `,
    data: () => ({ mobileStore }),
    computed: {
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
};
