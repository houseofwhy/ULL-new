import { store } from '../main.js';
import { fetchList } from '../content.js';
import { recordScore } from '../formulas.js';

import Spinner from '../components/Spinner.js';

export default {
    components: { Spinner },
    template: `
    <main v-if="loading" class="surface" style="display:flex;align-items:center;justify-content:center;">
        <Spinner></Spinner>
    </main>
    <main v-else class="page-list-new page-leaderboard">
        <div class="list-container-new surface">
            <div class="search-row search-row--leaderboard">
                <input v-model="search" class="search-new" type="text" placeholder="Search players..." />
            </div>
            <table class="list" v-if="players.length">
                <tr v-for="(player, i) in filteredPlayers" :key="player.name" :class="{ 'level-hidden': false }">
                    <td class="rank">
                        <p class="type-label-lg">#{{ player.globalRank }}</p>
                    </td>
                    <td class="level" :class="{ 'active': selected === i }">
                        <button @click="selected = i">
                            <span class="type-label-lg">{{ player.name }}</span>
                            <span class="type-label-lg" style="opacity:0.6; font-size:0.85rem; margin-right:20px;">{{ player.total.toFixed(3) }}</span>
                        </button>
                    </td>
                </tr>
            </table>
            <p v-else style="padding:1rem; opacity:0.5;">No players found</p>
        </div>
        <div class="level-container-new surface">
            <div v-if="selectedPlayer" class="level" style="gap:1.5rem;">
                <div>
                    <h1>{{ selectedPlayer.name }}</h1>
                    <p class="type-body" style="margin-top:1rem; margin-bottom:0.5rem; opacity:0.7; font-size:1.1rem; font-family:'Lexend Deca',sans-serif;">Total Score: <strong>{{ selectedPlayer.total.toFixed(3) }}</strong></p>
                </div>
                <div v-if="selectedPlayer.records.length">
                    <h3 style="margin-bottom:0.75rem;">Records ({{ selectedPlayer.records.length }})</h3>
                    <table style="width:100%; border-collapse:collapse;">
                        <tr v-for="rec in selectedPlayer.records" :key="rec.levelName + rec.percent" style="border-bottom: 1px solid rgba(128,128,128,0.15);">
                            <td style="padding:0.6rem 0; width:4.5rem; text-align:right; padding-right:1rem; opacity:0.7;">
                                <span style="font-size:0.85rem;">+{{ rec.score.toFixed(3) }}</span>
                            </td>
                            <td style="padding:0.6rem 0; flex:1;">
                                <span class="type-label-lg">{{ rec.levelName }}</span>
                                <span style="opacity:0.5; font-size:0.8rem; margin-left:0.5rem;">#{{ rec.levelRank }}</span>
                            </td>
                            <td style="padding:0.6rem 0; text-align:right; padding-left:1rem; font-family:'Lexend Deca',sans-serif;">
                                <span v-if="rec.type === 'run'">{{ rec.displayPercent }}%</span>
                                <span v-else>{{ rec.percent }}%</span>
                            </td>
                        </tr>
                    </table>
                </div>
                <p v-else style="opacity:0.5;">No records</p>
            </div>
            <div v-else class="level" style="height: 100%; justify-content: center; align-items: center;">
                <p>Select a player</p>
            </div>
        </div>
    </main>
    `,
    data: () => ({
        players: [],
        loading: true,
        selected: 0,
        search: '',
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
    },
    watch: {
        search() {
            this.selected = 0;
        }
    },
    async mounted() {
        const list = await fetchList();
        if (!list) { this.loading = false; return; }

        const playerMap = {};

        list.forEach(([level, err], rank) => {
            if (err || !level) return;
            const levelRank = rank + 1;
            const levelName = level.name;

            // Process records (from 0%)
            if (level.records) {
                level.records.forEach(record => {
                    if (!record.user || record.percent <= 0) return;
                    const key = record.user.toLowerCase();
                    if (!playerMap[key]) playerMap[key] = { name: record.user, records: [] };
                    const percent = Number(record.percent);
                    const sc = recordScore(levelRank, percent);
                    playerMap[key].records.push({
                        levelName,
                        levelRank,
                        percent,
                        score: sc,
                        type: 'record',
                    });
                });
            }

            // Process runs
            if (level.run) {
                level.run.forEach(runRecord => {
                    if (!runRecord.user) return;
                    const parts = String(runRecord.percent).split('-').map(Number);
                    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return;
                    const percent = Math.abs(parts[1] - parts[0]);
                    if (percent <= 0) return;
                    const key = runRecord.user.toLowerCase();
                    if (!playerMap[key]) playerMap[key] = { name: runRecord.user, records: [] };
                    const sc = recordScore(levelRank, percent);
                    playerMap[key].records.push({
                        levelName,
                        levelRank,
                        percent,
                        displayPercent: String(runRecord.percent),
                        score: sc,
                        type: 'run',
                    });
                });
            }
        });

        // Calculate totals and sort
        this.players = Object.values(playerMap).map(p => {
            p.records.sort((a, b) => b.score - a.score);
            p.total = p.records.reduce((sum, r) => sum + r.score, 0);
            return p;
        }).sort((a, b) => b.total - a.total);

        // Assign global ranks
        this.players.forEach((p, i) => { p.globalRank = i + 1; });

        this.loading = false;
    },
};
