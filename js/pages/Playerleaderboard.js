import { store } from '../main.js';
import { fetchList } from '../content.js';
import { recordScore, round } from './formulas.js';
import Sidebar from './Sidebar.js';
import SettingsModal from './SettingsModal.js';
import Spinner from '../components/Spinner.js';

export default {
    components: { Sidebar, SettingsModal, Spinner },
    data: () => ({
        store, loading: true, players: [], selected: 0, showSettings: false,
    }),
    computed: {
        player() { return this.players[this.selected] ?? null; },
    },
    template: `
    <div class="pc-shell" :class="{ dark: store.dark }">
        <Sidebar @open-settings="showSettings = true" />
        <div class="pc-page">
            <div v-if="loading" class="pc-spinner"><Spinner /></div>
            <div v-else class="pc-cols pc-cols--45-55">
                <!-- Player list -->
                <div class="pc-col">
                    <table class="pc-list">
                        <tr v-for="(p, i) in players" :key="p.name"
                            class="pc-list-row"
                            :class="{ 'is-active': selected === i }"
                            @click="selected = i">
                            <td class="pc-list-rank">#{{ i + 1 }}</td>
                            <td class="pc-list-content">
                                <div class="pc-list-inner">
                                    <div class="pc-list-text">
                                        <div class="pc-list-name">{{ p.name }}</div>
                                        <div class="pc-list-sub">{{ p.total }} pts · {{ p.records.length }} record{{ p.records.length !== 1 ? 's' : '' }}</div>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </table>
                </div>
                <!-- Player detail -->
                <div class="pc-col">
                    <div v-if="player">
                        <div class="pc-player-header">
                            <div class="pc-player-name">{{ player.name }}</div>
                            <div class="pc-player-total">Total: {{ player.total }} pts</div>
                        </div>
                        <table class="pc-record-table">
                            <tr v-for="rec in player.records" :key="rec.levelName + rec.pct">
                                <td class="pc-record-score">{{ rec.score }} pts</td>
                                <td class="pc-record-name">
                                    <div>{{ rec.levelName }}</div>
                                    <div class="pc-record-level">Rank {{ rec.levelRank }}</div>
                                </td>
                                <td class="pc-record-pct">{{ rec.pct }}%</td>
                            </tr>
                        </table>
                    </div>
                    <div v-else style="height:100%;display:flex;align-items:center;justify-content:center;opacity:0.25;font-size:20px;">
                        (ノಠ益ಠ)ノ彡┻━┻
                    </div>
                </div>
            </div>
        </div>
        <SettingsModal v-if="showSettings" @close="showSettings = false" />
    </div>`,
    async mounted() {
        const list = await fetchList();
        if (!list) { this.loading = false; return; }

        // Assign unverified ranks
        let rank = 1;
        list.forEach(([level]) => {
            if (level) level._lbRank = level.isVerified ? null : rank++;
        });

        const playerMap = {};

        list.forEach(([level]) => {
            if (!level || level.isVerified || !level._lbRank) return;
            const lvlRank = level._lbRank;

            // Process records (from 0 runs)
            (level.records || []).forEach(rec => {
                if (!rec.user || rec.user === 'none' || !rec.percent || rec.percent === 0) return;
                const pct = Number(rec.percent);
                if (!pct) return;
                const score = recordScore(lvlRank, pct);
                if (score <= 0) return;
                const key = rec.user.toLowerCase();
                if (!playerMap[key]) playerMap[key] = { name: rec.user, records: [] };
                playerMap[key].records.push({ levelName: level.name, levelRank: lvlRank, pct, score });
            });

            // Process runs (a-b format)
            (level.run || []).forEach(run => {
                if (!run.user || run.user === 'none' || !run.percent || run.percent === '0') return;
                const parts = String(run.percent).split('-').map(Number);
                if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return;
                const runLen = Math.abs(parts[1] - parts[0]);
                if (runLen <= 0) return;
                const score = recordScore(lvlRank, runLen);
                if (score <= 0) return;
                const key = run.user.toLowerCase();
                if (!playerMap[key]) playerMap[key] = { name: run.user, records: [] };
                playerMap[key].records.push({ levelName: level.name, levelRank: lvlRank, pct: run.percent, score });
            });
        });

        this.players = Object.values(playerMap)
            .map(p => ({
                ...p,
                total: round(p.records.reduce((s, r) => s + r.score, 0)),
                records: p.records.sort((a, b) => b.score - a.score),
            }))
            .filter(p => p.total > 0)
            .sort((a, b) => b.total - a.total);

        this.loading = false;
    },
};
