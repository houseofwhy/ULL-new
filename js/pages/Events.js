import { store } from '../main.js';
import { fetchLevelMonth, fetchLevelVerif, fetchList } from '../content.js';
import Footer from '../components/Footer.js';

function ytThumb(url) {
    if (!url) return '';
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : url;
}

function getThumbnail(level) {
    if (!level) return '';
    if (level.thumbnail) return level.thumbnail;
    const extractYT = (url) => {
        if (!url || typeof url !== 'string') return '';
        const m = url.match(/.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=)([^#&?]*).*/);
        return m ? `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg` : '';
    };
    return extractYT(level.verification) || extractYT(level.showcase) || '';
}

function pickDailyLevel(list) {
    const valid = list.filter(([l, e]) => l && !e);
    if (!valid.length) return null;
    const d = new Date();
    const seed = (d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()) >>> 0;
    const hash = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b) >>> 0;
    return valid[hash % valid.length][0];
}

export default {
    components: { Footer },
    template: `
<main class="info-page surface">
    <section class="info-hero">
        <h1>Events</h1>
        <p>Featured level highlights — Level of the Month, the level closest to verification, and today's featured level.</p>
    </section>

    <div class="info-content events-content">
        <div class="events-grid">

            <!-- Level of the Day (first, spans 2 rows in left column) -->
            <div class="home-card home-lotd-card events-lotd-card" v-if="levelDay">
                <div class="home-card__title">Level of the Day</div>
                <div class="events-lotd-cols">
                    <!-- Left: existing content -->
                    <div class="events-lotd-left">
                        <div class="home-level-header">
                            <div class="home-level-thumb">
                                <img v-if="getThumbnail(levelDay)" :src="getThumbnail(levelDay)" alt="" />
                            </div>
                            <div class="home-level-meta">
                                <div class="home-level-name">{{ levelDay.name }}</div>
                                <div class="home-level-info">
                                    <span class="home-level-rank">{{ levelDay.rankNum }}</span>
                                    <span class="home-level-sep">·</span>
                                    <span class="home-level-author">by {{ levelDay.author }}</span>
                                    <span v-if="levelDay.id" class="home-level-sep">·</span>
                                    <span v-if="levelDay.id" class="home-level-id">{{ levelDay.id }}</span>
                                </div>
                            </div>
                        </div>
                        <div class="home-record-box" v-if="lotdRecord || lotdRun">
                            <a v-if="lotdRecord" :href="lotdRecord.link || '#'" class="home-record-row">
                                <span class="home-record-pct">{{ lotdRecord.percent }}%</span>
                                <span class="home-record-player">{{ lotdRecord.user }}</span>
                                <span class="home-record-label">Best Record</span>
                            </a>
                            <a v-if="lotdRun" :href="lotdRun.link || '#'" class="home-record-row">
                                <span class="home-record-pct">{{ lotdRun.percent }}</span>
                                <span class="home-record-player">{{ lotdRun.user }}</span>
                                <span class="home-record-label">Best run</span>
                            </a>
                        </div>
                        <div class="home-lotd-date">{{ todayDate }}</div>
                    </div>
                    <!-- Right: additional information -->
                    <div class="events-lotd-right">
                        <div class="events-info-label">Additional Information</div>
                        <ul class="events-stat-list">
                            <li>
                                <div class="events-stat-key">Status</div>
                                <div class="events-stat-val">
                                    <template v-if="levelDay.isVerified">Verified</template>
                                    <template v-else-if="levelDay.percentFinished == 0">Layout</template>
                                    <template v-else-if="levelDay.percentFinished == 100">Being Verified</template>
                                    <template v-else>Decoration {{ levelDay.percentFinished }}% done</template>
                                </div>
                            </li>
                            <li>
                                <div class="events-stat-key">Verifier</div>
                                <div class="events-stat-val">{{ levelDay.verifier }}</div>
                            </li>
                            <li>
                                <div class="events-stat-key">Length</div>
                                <div class="events-stat-val">{{ Math.floor(levelDay.length / 60) }}m {{ levelDay.length % 60 }}s</div>
                            </li>
                            <li>
                                <div class="events-stat-key">Last Update</div>
                                <div class="events-stat-val">{{ levelDay.lastUpd }}</div>
                            </li>
                        </ul>
                        <div v-if="levelDay.tags && levelDay.tags.length" class="events-tags">
                            <div class="events-stat-key">Tags</div>
                            <div style="display:flex;flex-wrap:wrap;">
                                <div v-for="tag in levelDay.tags" class="tag">{{ tag }}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Level of the Month -->
            <div class="home-card home-lotm-card" v-if="levelMonth">
                <div class="home-card__title">Level of the Month</div>
                <div class="home-level-header">
                    <div class="home-level-thumb">
                        <img v-if="ytThumb(levelMonth.thumbnail)" :src="ytThumb(levelMonth.thumbnail)" alt="" />
                    </div>
                    <div class="home-level-meta">
                        <div class="home-level-name">{{ levelMonth.name }}</div>
                        <div class="home-level-info">
                            <span class="home-level-rank">#{{ levelMonth.rank }}</span>
                            <span class="home-level-sep">·</span>
                            <span class="home-level-author">by {{ levelMonth.author }}</span>
                            <span v-if="levelMonth.id" class="home-level-sep">·</span>
                            <span v-if="levelMonth.id" class="home-level-id">{{ levelMonth.id }}</span>
                        </div>
                    </div>
                </div>
                <div class="home-record-box">
                    <a :href="levelMonth.record.link || '#'" class="home-record-row">
                        <span class="home-record-pct">{{ levelMonth.record.percent }}</span>
                        <span class="home-record-player">{{ levelMonth.record.player }}</span>
                        <span class="home-record-label">Best Record</span>
                    </a>
                    <a :href="levelMonth.run.link || '#'" class="home-record-row">
                        <span class="home-record-pct">{{ levelMonth.run.percent }}</span>
                        <span class="home-record-player">{{ levelMonth.run.player }}</span>
                        <span class="home-record-label">Best run</span>
                    </a>
                </div>
                <a href="https://discord.gg/9wVWSgJSe8" target="_blank" class="home-discord-btn">
                    <img src="/assets/discord.svg" :style="store.dark ? 'filter:invert(1)' : ''" alt="Discord" />
                    Participate in our Discord Server
                </a>
            </div>

            <!-- Closest to Verification -->
            <div class="home-card home-ctv-card" v-if="levelVerif">
                <div class="home-card__title">Closest to Verification</div>
                <div class="home-level-header">
                    <div class="home-level-thumb">
                        <img v-if="ytThumb(levelVerif.thumbnail)" :src="ytThumb(levelVerif.thumbnail)" alt="" />
                    </div>
                    <div class="home-level-meta">
                        <div class="home-level-name">{{ levelVerif.name }}</div>
                        <div class="home-level-info">
                            <span class="home-level-rank">#{{ levelVerif.rank }}</span>
                            <span class="home-level-sep">·</span>
                            <span class="home-level-author">by {{ levelVerif.author }}</span>
                            <span class="home-level-sep">·</span>
                            <span class="home-level-author">Verifier: {{ levelVerif.verifier }}</span>
                        </div>
                    </div>
                </div>
                <div class="home-record-box">
                    <a :href="levelVerif.record.link || '#'" class="home-record-row">
                        <span class="home-record-pct">{{ levelVerif.record.percent }}</span>
                        <span class="home-record-player">{{ levelVerif.record.player }}</span>
                        <span class="home-record-label">Best Record</span>
                    </a>
                    <a :href="levelVerif.run.link || '#'" class="home-record-row">
                        <span class="home-record-pct">{{ levelVerif.run.percent }}</span>
                        <span class="home-record-player">{{ levelVerif.run.player }}</span>
                        <span class="home-record-label">Best run</span>
                    </a>
                </div>
                <router-link to="/upcoming" class="home-ctv-btn">Go to Upcoming Levels</router-link>
            </div>

        </div>
    </div>

    <Footer />
</main>
    `,
    data: () => ({
        store,
        levelMonth: null,
        levelVerif: null,
        levelDay: null,
    }),
    computed: {
        lotdRecord() {
            const recs = this.levelDay?.records;
            if (!recs?.length) return null;
            return recs.reduce((b, r) => Number(r.percent) > Number(b.percent) ? r : b);
        },
        lotdRun() {
            return this.levelDay?.run?.[0] ?? null;
        },
        todayDate() {
            return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        },
    },
    methods: { ytThumb, getThumbnail },
    async mounted() {
        const [lm, lv, list] = await Promise.all([
            fetchLevelMonth(),
            fetchLevelVerif(),
            fetchList(),
        ]);
        this.levelMonth = lm;
        this.levelVerif = lv;
        if (list?.length) this.levelDay = pickDailyLevel(list);
    },
};
