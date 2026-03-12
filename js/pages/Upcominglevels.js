import { store } from '../main.js';
import { embed } from '../util.js';
import { fetchList } from '../content.js';
import { getLevelNameStyle, getThumbnail, isOldLevel, makeFiltersListCopy } from './listHelpers.js';
import Sidebar from './Sidebar.js';
import FiltersModal from './FiltersModal.js';
import SettingsModal from './SettingsModal.js';
import Spinner from '../components/Spinner.js';
import LevelAuthors from '../components/List/LevelAuthors.js';

export default {
    components: { Sidebar, FiltersModal, SettingsModal, Spinner, LevelAuthors },
    data: () => ({
        store, list: [], loading: true, selected: 0, toggledShowcase: false,
        search: '', filtersList: makeFiltersListCopy(),
        showFilters: false, showSettings: false,
    }),
    computed: {
        level() { return this.list[this.selected]?.[0] ?? null; },
        video() {
            if (!this.level) return '';
            if (!this.level.verification) return embed(this.level.showcase);
            return embed(this.toggledShowcase ? this.level.showcase : this.level.verification);
        },
        activeFilterCount() { return this.filtersList.filter(f => f.active && !f.separator).length; },
        bestRecord() {
            if (!this.level?.records?.length) return null;
            const sorted = [...this.level.records].sort((a, b) => b.percent - a.percent);
            return sorted[0].percent > 0 ? sorted[0] : null;
        },
        bestRun() {
            if (!this.level?.run?.length) return null;
            const sorted = [...this.level.run].sort((a, b) => {
                const diff = (r) => { const p = String(r.percent).split('-').map(Number); return p.length===2 ? Math.abs(p[1]-p[0]) : 0; };
                return diff(b) - diff(a);
            });
            const best = sorted[0];
            const parts = String(best.percent).split('-').map(Number);
            const d = parts.length === 2 ? Math.abs(parts[1]-parts[0]) : 0;
            return d > 0 ? { ...best, diff: d } : null;
        },
    },
    methods: {
        getLevelNameStyle, getThumbnail, isOldLevel, embed,
        applyFilters() {
            const active = this.filtersList.filter(f => f.active && !f.separator);
            const q = (this.search || '').toLowerCase().trim();
            this.list.forEach(item => {
                const level = item[0];
                if (!level) return;
                const matchSearch = !q || level.name.toLowerCase().includes(q);
                let matchTags = true;
                if (active.length) {
                    for (const f of active) {
                        if (!level.tags?.includes(f.key)) { matchTags = false; break; }
                    }
                }
                level.isHidden = !(matchSearch && matchTags);
            });
        },
        onApply(filters) { this.filtersList = filters; this.applyFilters(); },
    },
    template: `
    <div class="pc-shell" :class="{ dark: store.dark }">
        <Sidebar @open-settings="showSettings = true" />
        <div class="pc-page">
            <div class="pc-toolbar">
                <input class="pc-search" v-model="search" @input="applyFilters" placeholder="Search levels…" />
                <button class="pc-filters-btn" :class="{'is-active': activeFilterCount > 0}" @click="showFilters = true">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="10" y1="18" x2="14" y2="18"/></svg>
                    Filters{{ activeFilterCount > 0 ? ' (' + activeFilterCount + ')' : '' }}
                </button>
            </div>
            <div v-if="loading" class="pc-spinner"><Spinner /></div>
            <div v-else class="pc-cols pc-cols--45-55">
                <div class="pc-col">
                    <table class="pc-list">
                        <tr v-for="([level, err], i) in list" :key="i"
                            class="pc-list-row"
                            :class="{ 'is-active': selected === i, 'level-hidden': level && level.isHidden }"
                            @click="selected = i; toggledShowcase = false">
                            <td class="pc-list-rank">#{{ i + 1 }}</td>
                            <td class="pc-list-content">
                                <div class="pc-list-inner">
                                    <img v-if="store.showThumbnails && level" class="pc-list-thumb" :src="getThumbnail(level)" alt="" />
                                    <div class="pc-list-text">
                                        <div class="pc-list-name" :style="store.showColors ? getLevelNameStyle(level, selected===i) : {}">
                                            {{ level?.name || ('Error: ' + err) }}
                                        </div>
                                        <div class="pc-list-sub" v-if="level">
                                            <template v-if="level.records && level.records[0] && level.records[0].percent > 0">From 0: {{ level.records[0].percent }}%</template>
                                            <template v-else>From 0: None</template>
                                            <template v-if="level.run && level.run[0] && level.run[0].percent && level.run[0].percent !== '0'"> · Run: {{ level.run[0].percent }}%</template>
                                        </div>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </table>
                </div>
                <div class="pc-col">
                    <div class="pc-level" v-if="level">
                        <h1>{{ level.name }}</h1>
                        <div class="pc-level-authors">
                            <div class="pc-level-author-row"><span class="pc-level-author-lbl">Author</span><span class="pc-level-author-val">{{ level.author }}</span></div>
                            <div class="pc-level-author-row" v-if="level.creators && level.creators.length"><span class="pc-level-author-lbl">Creators</span><span class="pc-level-author-val">{{ level.creators.join(', ') }}</span></div>
                            <div class="pc-level-author-row"><span class="pc-level-author-lbl">To be verified</span><span class="pc-level-author-val">{{ level.verifier }}</span></div>
                        </div>
                        <div class="pc-level-tags" v-if="level.tags && level.tags.length">
                            <span class="pc-level-tag" v-for="tag in level.tags" :key="tag">{{ tag }}</span>
                        </div>
                        <div class="pc-level-wr" v-if="bestRecord">
                            Best progress (from 0):
                            <a v-if="bestRecord.link && bestRecord.link !== '#'" :href="bestRecord.link" target="_blank">{{ bestRecord.percent }}%</a>
                            <span v-else>{{ bestRecord.percent }}%</span>
                            by {{ bestRecord.user }}
                        </div>
                        <div class="pc-level-wr" v-if="bestRun">
                            Best run:
                            <a v-if="bestRun.link && bestRun.link !== '#'" :href="bestRun.link" target="_blank">{{ bestRun.percent }}%</a>
                            <span v-else>{{ bestRun.percent }}%</span>
                            by {{ bestRun.user }}
                        </div>
                        <div v-if="level.isVerified" class="pc-level-tabs">
                            <button class="pc-level-tab" :class="{'is-active': !toggledShowcase}" @click="toggledShowcase = false">Verification</button>
                            <button class="pc-level-tab" :class="{'is-active': toggledShowcase}" @click="toggledShowcase = true">Showcase</button>
                        </div>
                        <iframe class="pc-level-video" :src="video" frameborder="0" allowfullscreen></iframe>
                    </div>
                    <div v-else style="height:100%;display:flex;align-items:center;justify-content:center;opacity:0.25;font-size:20px;">(ノಠ益ಠ)ノ彡┻━┻</div>
                </div>
            </div>
        </div>
        <FiltersModal v-if="showFilters" :initialFilters="filtersList" @close="showFilters = false" @apply="onApply" />
        <SettingsModal v-if="showSettings" @close="showSettings = false" />
    </div>`,
    async mounted() {
        const all = await fetchList();
        if (!all) { this.loading = false; return; }
        // Same logic as old Leaderboard: unverified, rankingScore > 0, no 100% record
        all.forEach(([level]) => {
            if (!level) return;
            const rP = Math.max(0, ...((level.records||[]).map(r => Number(r.percent)||0)));
            const runP = Math.max(0, ...((level.run||[]).map(r => {
                const p = String(r.percent).split('-').map(Number);
                return (p.length===2&&!isNaN(p[0])&&!isNaN(p[1])) ? Math.abs(p[1]-p[0]) : 0;
            })));
            level.maxPercent = rP; level.maxRunDifference = runP;
            level.rankingScore = Math.max(rP,runP)**2 + Math.min(rP,runP)**1.8;
        });
        this.list = all
            .filter(([l]) => l && !l.isVerified && l.rankingScore > 0 && !(l.records||[]).some(r => Number(r.percent) >= 100))
            .sort((a,b) => b[0].rankingScore - a[0].rankingScore);
        this.loading = false;
    },
};
