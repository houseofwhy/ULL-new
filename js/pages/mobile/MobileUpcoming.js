import { embed } from '../../util.js';
import { upcomingScore } from '../../formulas.js';
import { mobileStore } from './mobileStore.js';

export default {
    template: `
        <div class="mob-list">
            <div class="mob-page-hero">
                <h1>Upcoming Levels</h1>
                <p>Levels closest to verification — ranked by highest recorded progress.</p>
            </div>
            <div class="mob-search-row">
                <input class="mob-search" type="text" placeholder="Search upcoming levels..." v-model="search" />
                <button class="mob-search-filter-btn" :class="{ active: mobileStore.openMenu === 'filters' }" @click="mobileStore.openMenu = mobileStore.openMenu === 'filters' ? null : 'filters'" title="Filters">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/></svg>
                </button>
            </div>
            <div v-for="([level, err], i) in filteredList" :key="i" class="mob-level-row">
                <button class="mob-level-btn" :class="{ active: lbSelected === i }" @click="lbSelected = lbSelected === i ? -1 : i">
                    <span class="mob-rank">#{{ i + 1 }}</span>
                    <img v-if="mobileStore.showThumbnails && level" class="mob-thumb" :src="getThumbnail(level)" alt="" />
                    <div class="mob-level-info">
                        <div class="mob-level-name">{{ level?.name || \`Error (\${err}.json)\` }}</div>
                        <div class="mob-level-sub" v-if="level">
                            <template v-if="getLbBestRecord(level)">WR: {{ getLbBestRecord(level).percent }}%</template>
                            <template v-if="getLbBestRecord(level) && getLbBestRun(level)"> · </template>
                            <template v-if="getLbBestRun(level)">Run: {{ getLbBestRun(level).percent }}</template>
                        </div>
                    </div>
                </button>
                <div v-if="lbSelected === i && level" class="mob-level-detail">
                    <div v-if="level.allLevelsRank || level.mainRank || level.futureRank" style="display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;font-size:0.72rem;opacity:0.45;margin-bottom:0.75rem;">
                        <span v-if="level.allLevelsRank">#{{ level.allLevelsRank }} in All Levels</span>
                        <span v-if="level.mainRank">· #{{ level.mainRank }} in Main List</span>
                        <span v-if="level.futureRank">· #{{ level.futureRank }} in Future List</span>
                    </div>
                    <div class="mob-author-block">
                        <div class="mob-author-row"><span class="mob-author-label">Level Author</span><span class="mob-author-value">{{ level.author }}</span></div>
                        <div class="mob-author-row" v-if="level.creators && level.creators.length"><span class="mob-author-label">Creators</span><span class="mob-author-value">{{ level.creators.join(', ') }}</span></div>
                    </div>
                    <div v-if="getLbBestRecord(level)" class="mob-wr">
                        Best from 0: <a v-if="getLbBestRecord(level).link && getLbBestRecord(level).link != '#'" :href="getLbBestRecord(level).link" target="_blank" style="color:#00b825;text-decoration:underline;">{{ getLbBestRecord(level).percent }}%</a><template v-else><span style="color:#00b825;">{{ getLbBestRecord(level).percent }}%</span></template> by {{ getLbBestRecord(level).user }}
                    </div>
                    <div v-if="getLbBestRun(level)" class="mob-wr">
                        Best run: <a v-if="getLbBestRun(level).link && getLbBestRun(level).link != '#'" :href="getLbBestRun(level).link" target="_blank" style="color:#00b825;text-decoration:underline;">{{ getLbBestRun(level).percent }}%</a><template v-else><span style="color:#00b825;">{{ getLbBestRun(level).percent }}%</span></template> by {{ getLbBestRun(level).user }}
                    </div>
                    <iframe class="mob-video" :src="getVideo(level)" frameborder="0" allowfullscreen></iframe>
                </div>
            </div>
            <div v-if="!filteredList.length && search" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3rem 1rem;opacity:0.25;gap:0.5rem;text-align:center;">
                <span style="font-size:2rem;">🔍</span>
                <p style="font-size:0.85rem;">No levels match your search.</p>
            </div>
        </div>
    `,
    data: () => ({
        mobileStore,
        lbSelected: -1,
        search: '',
    }),
    computed: {
        lbList() {
            if (!mobileStore.rawList.length) return [];
            return mobileStore.rawList
                .filter(([l]) => l && !l.isVerified)
                .filter(([l]) => !((l.records || []).some(r => Number(r.percent) >= 100)))
                .map(([l, e]) => {
                    const maxP = Math.max(0, ...((l.records || []).map(r => Number(r.percent) || 0)));
                    const maxR = Math.max(0, ...((l.run || []).map(r => {
                        const p = String(r.percent).split('-').map(Number);
                        return p.length === 2 ? Math.abs(p[1] - p[0]) : 0;
                    })));
                    l.rankingScore = upcomingScore(maxP, maxR);
                    return [l, e];
                })
                .filter(([l]) => l.rankingScore > 0)
                .sort((a, b) => b[0].rankingScore - a[0].rankingScore);
        },
        filteredList() {
            const q = this.search.trim().toLowerCase();
            if (!q) return this.lbList;
            return this.lbList.filter(([l]) => l && l.name.toLowerCase().includes(q));
        },
    },
    methods: {
        getThumbnail(level) {
            if (level.thumbnail) return level.thumbnail;
            const yt = url => {
                if (!url || typeof url !== 'string') return '';
                const m = url.match(/.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=)([^#&?]*).*/);
                return m ? `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg` : '';
            };
            return yt(level.verification) || yt(level.showcase) || '';
        },
        getVideo(level) {
            const toStr = v => (v && typeof v === 'string') ? v : '';
            if (!level.showcase) return embed(toStr(level.verification));
            return embed(toStr(level.showcase));
        },
        getLbBestRecord(level) {
            if (!level?.records?.length) return null;
            const s = [...level.records].sort((a, b) => b.percent - a.percent);
            return s[0].percent === 0 ? null : s[0];
        },
        getLbBestRun(level) {
            if (!level?.run?.length) return null;
            const s = [...level.run].sort((a, b) => {
                const diff = r => { const p = String(r.percent).split('-').map(Number); return p.length === 2 ? p[1] - p[0] : 0; };
                return diff(b) - diff(a);
            });
            const best = s[0];
            const p = String(best.percent).split('-').map(Number);
            return p.length === 2 && p[1] - p[0] > 0 ? best : null;
        },
    },
};
