import { store } from '../main.js';
import { embed } from '../util.js';
import { fetchList } from '../content.js';

import Spinner from '../components/Spinner.js';
import LevelAuthors from '../components/List/LevelAuthors.js';

export default {
    components: { Spinner, LevelAuthors },
    template: `
    <main v-if="loading" class="surface" style="display:flex;align-items:center;justify-content:center;">
        <Spinner></Spinner>
    </main>
    <main v-else class="page-list-new">
        <div class="list-container-new surface">
            <div class="search-row">
                <input v-model="search" class="search-new" type="text" placeholder="Search levels..." />
                <button class="filters-btn" @click="showFilters = true">Filters</button>
            </div>
            <table class="list" v-if="list.length && filteredList.length">
                <tr v-for="([level, err], i) in filteredList" :key="i" :class="{ 'level-hidden': level?.isHidden }">
                    <td class="rank">
                        <p class="type-label-lg">#{{ i + 1 }}</p>
                    </td>
                    <td class="level" :class="{ 'active': selected === i, 'error': !level }">
                        <button @click="selected = i">
                            <img v-if="store.thumbnails && level" :src="getThumbnail(level)" class="level-thumbnail" alt="" />
                            <div class="level-info">
                                <span class="type-label-lg" :style="store.levelColoring ? getLevelNameStyle(level, selected === i) : {}">{{ level?.name || \`Error (\${err}.json)\` }}</span>
                                <span v-if="level" class="level-subinfo">WR: {{ getWR(level) }} | Run: {{ getRunString(level) }}</span>
                            </div>
                        </button>
                    </td>
                </tr>
            </table>
            <div v-else-if="list.length && !filteredList.length" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3rem 1rem;opacity:0.25;gap:0.5rem;text-align:center;color:var(--color-on-background);">
                <span style="font-size:2rem;">\\u{1F50D}</span>
                <p style="font-size:0.85rem;font-family:'Lexend Deca',sans-serif;">No levels match your search.</p>
            </div>
            <p v-else style="padding:1rem; opacity:0.5;">No upcoming levels found</p>
        </div>
        <div class="level-container-new surface">
            <div class="level" v-if="selectedLevel">
                <h1>{{ selectedLevel.name }}</h1>
                <LevelAuthors :author="selectedLevel.author" :creators="selectedLevel.creators" :verifier="selectedLevel.verifier"></LevelAuthors>
                <div>
                    <div v-if="bestRecord" class="best-record">
                        <p class="type-body">
                            Best progress from 0: <a :href="bestRecord.link != '#' ? bestRecord.link : undefined" :target="bestRecord.link != '#' ? '_blank' : undefined" :style="bestRecord.link != '#' ? 'text-decoration: underline; cursor: pointer;' : ''"><span :style="bestRecord.link != '#' ? 'color: #00b825;' : ''">{{ bestRecord.percent }}%</span> by {{ bestRecord.user }}</a>
                        </p>
                    </div>
                    <div v-if="bestRun" class="best-run">
                        <p class="type-body">
                            Best run: <a :href="bestRun.link != '#' ? bestRun.link : undefined" :target="bestRun.link != '#' ? '_blank' : undefined" :style="bestRun.link != '#' ? 'text-decoration: underline; cursor: pointer;' : ''"><span :style="bestRun.link != '#' ? 'color: #00b825;' : ''">{{ bestRun.percent }}%</span> by {{ bestRun.user }}</a>
                        </p>
                    </div>
                </div>
                <div v-if="selectedLevel.isVerified" class="tabs" style="height:45px;">
                    <button class="tab" :class="{selected: !toggledShowcase}" @click="toggledShowcase = false">
                        <span class="type-label-lg">Verification</span>
                    </button>
                    <button class="tab" :class="{selected: toggledShowcase}" @click="toggledShowcase = true">
                        <span class="type-label-lg">Showcase</span>
                    </button>
                </div>
                <iframe class="video" id="videoframe" :src="video" frameborder="0"></iframe>
            </div>
            <div v-else class="level" style="height: 100%; justify-content: center; align-items: center;">
                <p>Select a level</p>
            </div>
        </div>

        <!-- Filters Popup -->
        <div class="filters-overlay" v-if="showFilters" @click.self="showFilters = false">
            <div class="filters-popup">
                <div class="filters-popup__title">Filters</div>
                <div class="filters-popup__columns">
                    <div>
                        <div class="filters-popup__column-title">Status</div>
                        <div class="filters-popup__item" v-for="(item, index) in statusFilters" :key="'s'+index" :class="{ active: item.active }" @click="item.active = !item.active">
                            <div class="filters-popup__checkbox"><span class="filters-popup__check">✓</span></div>
                            <span>{{ item.name }}</span>
                        </div>
                        <div class="filters-popup__numeric" style="margin-top:0.75rem;">
                            <label>Min Decoration %</label>
                            <input type="number" min="0" max="100" v-model.number="minDecoration" placeholder="0" />
                        </div>
                        <div class="filters-popup__numeric">
                            <label>Min Verification %</label>
                            <input type="number" min="0" max="100" v-model.number="minVerification" placeholder="0" />
                        </div>
                    </div>
                    <div>
                        <div class="filters-popup__column-title">Length</div>
                        <div class="filters-popup__item" v-for="(item, index) in lengthFilters" :key="'l'+index" :class="{ active: item.active }" @click="item.active = !item.active">
                            <div class="filters-popup__checkbox"><span class="filters-popup__check">✓</span></div>
                            <span>{{ item.name }}</span>
                        </div>
                    </div>
                    <div>
                        <div class="filters-popup__column-title">Other</div>
                        <div class="filters-popup__item" v-for="(item, index) in otherFilters" :key="'o'+index" :class="{ active: item.active }" @click="item.active = !item.active">
                            <div class="filters-popup__checkbox"><span class="filters-popup__check">✓</span></div>
                            <span>{{ item.name }}</span>
                        </div>
                    </div>
                </div>
                <div class="filters-popup__actions">
                    <button class="filters-popup__btn filters-popup__btn--reset" @click="resetFilters()">Reset Filters</button>
                    <button class="filters-popup__btn filters-popup__btn--apply" @click="applyFilters(); showFilters = false">Apply Filters</button>
                </div>
            </div>
        </div>
    </main>
    `,
    data: () => ({
        list: [],
        loading: true,
        selected: 0,
        store,
        toggledShowcase: false,
        search: '',
        showFilters: false,
        statusFilters: [
            { active: false, name: "Public", key: "Public" },
            { active: false, name: "Finished", key: "Finished" },
            { active: false, name: "Open Verification", key: "Open Verification" },
            { active: false, name: "Being Verified", key: "Verifying" },
            { active: false, name: "Layout State", key: "Layout" },
            { active: false, name: "Verified", key: "Verified" },
            { active: false, name: "Unrated", key: "Unrated" },
            { active: false, name: "Rated", key: "Rated" },
        ],
        lengthFilters: [
            { active: false, name: "Medium", key: "Medium" },
            { active: false, name: "Long", key: "Long" },
            { active: false, name: "XL", key: "XL" },
            { active: false, name: "XXL", key: "XXL" },
            { active: false, name: "XXXL+", key: "XXXL" },
        ],
        otherFilters: [
            { active: false, name: "NC Level", key: "NC" },
            { active: false, name: "Remake", key: "Remake" },
            { active: false, name: "Uses NoNG", key: "NONG" },
            { active: false, name: "Top Quality", key: "Quality" },
            { active: false, name: "2-Player", key: "2p" },
        ],
        minDecoration: 0,
        minVerification: 0,
    }),
    computed: {
        filteredList() {
            if (!this.search.trim()) return this.list;
            const q = this.search.toLowerCase().trim();
            return this.list.filter(([level]) => level && level.name.toLowerCase().includes(q));
        },
        selectedLevel() {
            const item = this.filteredList[this.selected];
            return item ? item[0] : null;
        },
        video() {
            if (!this.selectedLevel) return '';
            if (!this.selectedLevel.verification) return embed(this.selectedLevel.showcase);
            return embed(this.toggledShowcase ? this.selectedLevel.showcase : this.selectedLevel.verification);
        },
        bestRecord() {
            if (!this.selectedLevel || !this.selectedLevel.records || !this.selectedLevel.records.length) return null;
            const sorted = [...this.selectedLevel.records].sort((a, b) => b.percent - a.percent);
            return sorted[0].percent > 0 ? sorted[0] : null;
        },
        bestRun() {
            if (!this.selectedLevel || !this.selectedLevel.run || !this.selectedLevel.run.length) return null;
            const sorted = [...this.selectedLevel.run].sort((a, b) => {
                const diffA = (parseInt(a.percent.split('-')[1]) || 0) - (parseInt(a.percent.split('-')[0]) || 0);
                const diffB = (parseInt(b.percent.split('-')[1]) || 0) - (parseInt(b.percent.split('-')[0]) || 0);
                return diffB - diffA;
            });
            const best = sorted[0];
            const parts = String(best.percent).split('-').map(Number);
            const diff = (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) ? parts[1] - parts[0] : 0;
            return diff > 0 ? { ...best, diff } : null;
        },
    },
    watch: { search() { this.selected = 0; } },
    async mounted() {
        let list = await fetchList();
        if (!list) { this.loading = false; return; }

        list.forEach(([level, err]) => {
            if (err || !level) return;
            let maxPercent = Math.max(0, ...(level.records || []).map(r => r.percent));
            let maxRunDiff = 0;
            if (level.run && level.run.length) {
                const diffs = level.run.map(r => {
                    const parts = String(r.percent).split('-').map(Number);
                    return (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) ? parts[1] - parts[0] : 0;
                });
                maxRunDiff = Math.max(0, ...diffs);
            }
            level.maxPercent = maxPercent;
            level.maxRunDifference = maxRunDiff;
            level.rankingScore = Math.max(maxPercent, maxRunDiff) ** 2 + Math.min(maxPercent, maxRunDiff) ** 1.8;
        });

        this.list = list
            .filter(([level, err]) => level && !level.isVerified && level.rankingScore > 0 && !(level.records || []).some(r => Number(r.percent) >= 100))
            .sort((a, b) => b[0].rankingScore - a[0].rankingScore);

        this.loading = false;
    },
    methods: {
        embed,
        getWR(level) {
            if (!level.records || !level.records.length) return 'None';
            const best = Math.max(0, ...level.records.map(r => r.percent));
            return best > 0 ? best + '%' : 'None';
        },
        getRunString(level) {
            if (!level.run || !level.run.length) return 'None';
            let bestRun = null;
            let bestDiff = 0;
            for (const r of level.run) {
                const parts = String(r.percent).split('-').map(Number);
                if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                    const diff = Math.abs(parts[1] - parts[0]);
                    if (diff > bestDiff) { bestDiff = diff; bestRun = r; }
                }
            }
            return bestRun ? bestRun.percent : 'None';
        },
        getThumbnail(level) {
            if (level.thumbnail) return level.thumbnail;
            const extractYT = (url) => { if (!url || typeof url !== 'string') return ''; const m = url.match(/.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=)([^#&?]*).*/); return m ? `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg` : ''; };
            return extractYT(level.verification) || extractYT(level.showcase) || '';
        },
        getLevelNameStyle(level, isSelected) {
            if (!level) return {};
            const dark = !this.store.dark;
            const recordPercent = Math.max(0, ...((level.records || []).map(r => Number(r.percent) || 0)));
            const runPercent = Math.max(0, ...((level.run || []).map(r => { const parts = String(r.percent).split('-').map(Number); return (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) ? Math.abs(parts[1] - parts[0]) : 0; })));
            const vP = Math.max(recordPercent, runPercent);
            const pf = level.percentFinished ?? 0;
            let color;
            if (pf === 100 && vP >= 60) color = dark ? (isSelected ? '#ff9999' : '#ff5555') : (isSelected ? '#cc7a7a' : '#cc4444');
            else if (pf === 100 && vP >= 30) color = dark ? (isSelected ? '#ffaa66' : '#ff6622') : (isSelected ? '#cc8851' : '#cc511b');
            else if (pf === 100) color = dark ? (isSelected ? '#ffcc77' : '#ffaa44') : (isSelected ? '#cca35f' : '#cc8836');
            else if (pf >= 70) color = dark ? (isSelected ? '#ffff77' : '#ffee55') : (isSelected ? '#cccc5f' : '#ccbe44');
            else if (pf >= 30) color = dark ? (isSelected ? '#88ff88' : '#55ee55') : (isSelected ? '#6ccc6c' : '#44be44');
            else if (pf >= 1) color = dark ? (isSelected ? '#66ffff' : '#33dddd') : (isSelected ? '#51cccc' : '#28b0b0');
            else color = dark ? (isSelected ? '#88bbff' : '#5599ff') : (isSelected ? '#6c95cc' : '#447acc');
            return { color, fontWeight: 'normal' };
        },
        applyFilters() {
            if (!this.list) return;
            const activeFilters = [...this.statusFilters, ...this.lengthFilters, ...this.otherFilters].filter(f => f.active);
            const minDec = this.minDecoration || 0;
            const minVer = this.minVerification || 0;
            this.list.forEach(item => {
                const level = item[0]; if (!level) return;
                let matchesTags = true;
                if (activeFilters.length > 0) { for (const f of activeFilters) { if (!level.tags || !level.tags.includes(f.key)) { matchesTags = false; break; } } }
                const matchesDecoration = (level.percentFinished ?? 0) >= minDec;
                const recordPercent = Math.max(0, ...((level.records || []).map(r => Number(r.percent) || 0)));
                const runPercent = Math.max(0, ...((level.run || []).map(r => { const parts = String(r.percent).split('-').map(Number); return (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) ? Math.abs(parts[1] - parts[0]) : 0; })));
                const matchesVerification = Math.max(recordPercent, runPercent) >= minVer;
                level.isHidden = !(matchesTags && matchesDecoration && matchesVerification);
            });
        },
        resetFilters() {
            this.statusFilters.forEach(f => f.active = false);
            this.lengthFilters.forEach(f => f.active = false);
            this.otherFilters.forEach(f => f.active = false);
            this.minDecoration = 0; this.minVerification = 0;
            this.applyFilters();
        },
    },
};
