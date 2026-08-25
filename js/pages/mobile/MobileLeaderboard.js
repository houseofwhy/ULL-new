import { mobileStore } from './mobileStore.js';

export default {
    template: `
        <div class="mob-list">
            <div class="mob-page-hero">
                <h1>Leaderboard</h1>
                <p>Top players ranked according to their records on upcoming levels and their verifications of Demonlist levels.</p>
            </div>
            <input v-model="playerSearch" class="mob-search" type="text" placeholder="Search players..." />
            <div v-if="filteredPlayers.length === 0 && playerSearch.trim()" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3rem 1rem;opacity:0.25;gap:0.5rem;text-align:center;color:var(--color-on-background);">
                <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/></svg>
                <p style="font-size:0.8rem;font-family:'Lexend Deca',sans-serif;">No players match your search.</p>
            </div>
            <div v-for="(player, i) in filteredPlayers" :key="player.name" class="mob-level-row">
                <button class="mob-level-btn" :class="{ active: playerSelected === i }" @click="playerSelected = playerSelected === i ? -1 : i">
                    <span class="mob-rank">#{{ player.globalRank }}</span>
                    <div class="mob-level-info">
                        <div class="mob-level-name">{{ player.name }}</div>
                        <div class="mob-level-sub">Score: {{ player.total.toFixed(3) }}</div>
                    </div>
                </button>
                <div v-if="playerSelected === i" class="mob-level-detail">
                    <div style="font-size:15px;font-weight:600;margin-bottom:0.75rem;">Records ({{ player.records.length }})</div>
                    <div v-for="rec in player.records" :key="rec.levelName + rec.percent + rec.type" style="display:flex;align-items:center;justify-content:space-between;padding:0.4rem 0;border-bottom:1px solid rgba(128,128,128,0.1);font-size:14px;">
                        <div style="display:flex;align-items:center;gap:0.4rem;">
                            <span style="font-weight:700;color:gray;font-size:12px;">+{{ rec.score.toFixed(3) }}</span>
                            <span style="font-weight:500;">{{ rec.levelName }}</span>
                            <span style="opacity:0.5;font-size:12px;">#{{ rec.levelRank }}</span>
                        </div>
                        <span v-if="rec.type === 'verification'" style="font-weight:500;">Verification</span>
                        <span v-else-if="rec.type === 'layout'" style="font-weight:500;">Layout Completion</span>
                        <span v-else-if="rec.type === 'run'" style="font-weight:500;">{{ rec.displayPercent }}%</span>
                        <span v-else style="font-weight:500;">{{ rec.percent }}%</span>
                    </div>
                </div>
            </div>
        </div>
    `,
    data: () => ({
        mobileStore,
        playerSelected: -1,
        playerSearch: '',
    }),
    computed: {
        filteredPlayers() {
            if (!this.playerSearch.trim()) return mobileStore.players;
            const q = this.playerSearch.toLowerCase().trim();
            return mobileStore.players.filter(p => p.name.toLowerCase().includes(q));
        },
    },
};
