import { store } from '../../main.js';
import { mobileStore } from './mobileStore.js';

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
    template: `
        <div class="mob-events-page">
            <div class="mob-pending-hero">
                <h1>Events</h1>
                <p>Featured level highlights — Level of the Month and the level closest to verification.</p>
            </div>

            <div class="mob-events-content">

                <!-- Level of the Month -->
                <div class="mob-info-card" v-if="mobileStore.levelMonth">
                    <div class="mob-info-card__title">Level of the Month</div>
                    <div v-if="lotmThumb" class="mob-events-thumb">
                        <img :src="lotmThumb" alt="" />
                    </div>
                    <div class="mob-events-level-name">{{ mobileStore.levelMonth.name }}</div>
                    <div class="mob-events-level-meta">
                        <span class="mob-events-rank">#{{ mobileStore.levelMonth.rank }}</span>
                        <span class="mob-events-sep">·</span>
                        <span class="mob-events-author">by {{ mobileStore.levelMonth.author }}</span>
                        <span v-if="mobileStore.levelMonth.id" class="mob-events-sep">·</span>
                        <span v-if="mobileStore.levelMonth.id" class="mob-events-id">{{ mobileStore.levelMonth.id }}</span>
                    </div>
                    <div class="mob-events-records">
                        <a :href="mobileStore.levelMonth.record?.link || '#'" class="mob-events-record-row">
                            <span class="mob-events-record-pct">{{ mobileStore.levelMonth.record?.percent }}</span>
                            <span class="mob-events-record-player">{{ mobileStore.levelMonth.record?.player }}</span>
                            <span class="mob-events-record-label">Best from zero</span>
                        </a>
                        <a :href="mobileStore.levelMonth.run?.link || '#'" class="mob-events-record-row">
                            <span class="mob-events-record-pct">{{ mobileStore.levelMonth.run?.percent }}</span>
                            <span class="mob-events-record-player">{{ mobileStore.levelMonth.run?.player }}</span>
                            <span class="mob-events-record-label">Best run</span>
                        </a>
                    </div>
                    <a href="https://discord.gg/9wVWSgJSe8" target="_blank" class="mob-events-discord-btn">
                        <img src="/assets/discord.svg" :style="store.dark ? 'filter:invert(1)' : ''" alt="Discord" />
                        Participate in our Discord Server
                    </a>
                </div>

                <!-- Closest to Verification -->
                <div class="mob-info-card" v-if="mobileStore.levelVerif">
                    <div class="mob-info-card__title">Closest to Verification</div>
                    <div v-if="ctvThumb" class="mob-events-thumb">
                        <img :src="ctvThumb" alt="" />
                    </div>
                    <div class="mob-events-level-name">{{ mobileStore.levelVerif.name }}</div>
                    <div class="mob-events-level-meta">
                        <span class="mob-events-rank">#{{ mobileStore.levelVerif.rank }}</span>
                        <span class="mob-events-sep">·</span>
                        <span class="mob-events-author">by {{ mobileStore.levelVerif.author }}</span>
                        <span class="mob-events-sep">·</span>
                        <span class="mob-events-author">Verifier: {{ mobileStore.levelVerif.verifier }}</span>
                    </div>
                    <div class="mob-events-records">
                        <a :href="mobileStore.levelVerif.record?.link || '#'" class="mob-events-record-row">
                            <span class="mob-events-record-pct">{{ mobileStore.levelVerif.record?.percent }}</span>
                            <span class="mob-events-record-player">{{ mobileStore.levelVerif.record?.player }}</span>
                            <span class="mob-events-record-label">Best from zero</span>
                        </a>
                        <a :href="mobileStore.levelVerif.run?.link || '#'" class="mob-events-record-row">
                            <span class="mob-events-record-pct">{{ mobileStore.levelVerif.run?.percent }}</span>
                            <span class="mob-events-record-player">{{ mobileStore.levelVerif.run?.player }}</span>
                            <span class="mob-events-record-label">Best run</span>
                        </a>
                    </div>
                    <router-link to="/mobile/upcoming" class="mob-events-ctv-btn">Go to Upcoming Levels →</router-link>
                </div>

                <!-- Level of the Day -->
                <div class="mob-info-card" v-if="levelDay">
                    <div class="mob-info-card__title">Level of the Day</div>
                    <div v-if="lotdThumb" class="mob-events-thumb">
                        <img :src="lotdThumb" alt="" />
                    </div>
                    <div class="mob-events-level-name">{{ levelDay.name }}</div>
                    <div class="mob-events-level-meta">
                        <span class="mob-events-rank">{{ levelDay.rankNum }}</span>
                        <span class="mob-events-sep">·</span>
                        <span class="mob-events-author">by {{ levelDay.author }}</span>
                        <span v-if="levelDay.id" class="mob-events-sep">·</span>
                        <span v-if="levelDay.id" class="mob-events-id">{{ levelDay.id }}</span>
                    </div>
                    <div class="mob-events-records" v-if="lotdRecord || lotdRun">
                        <a v-if="lotdRecord" :href="lotdRecord.link || '#'" class="mob-events-record-row">
                            <span class="mob-events-record-pct">{{ lotdRecord.percent }}%</span>
                            <span class="mob-events-record-player">{{ lotdRecord.user }}</span>
                            <span class="mob-events-record-label">Best from zero</span>
                        </a>
                        <a v-if="lotdRun" :href="lotdRun.link || '#'" class="mob-events-record-row">
                            <span class="mob-events-record-pct">{{ lotdRun.percent }}</span>
                            <span class="mob-events-record-player">{{ lotdRun.user }}</span>
                            <span class="mob-events-record-label">Best run</span>
                        </a>
                    </div>
                    <div class="mob-events-lotd-date">{{ todayDate }}</div>
                </div>

                <div v-if="!mobileStore.levelMonth && !mobileStore.levelVerif && !levelDay && !mobileStore.loading" style="padding:3rem 1rem;text-align:center;opacity:0.3;">
                    <p style="font-size:0.85rem;">No events available right now.</p>
                </div>

            </div>
        </div>
    `,
    data: () => ({ store, mobileStore }),
    computed: {
        lotmThumb() { return ytThumb(mobileStore.levelMonth?.thumbnail); },
        ctvThumb()  { return ytThumb(mobileStore.levelVerif?.thumbnail); },
        levelDay() { return mobileStore.rawList.length ? pickDailyLevel(mobileStore.rawList) : null; },
        lotdThumb() { return getThumbnail(this.levelDay); },
        lotdRecord() {
            const recs = this.levelDay?.records;
            if (!recs?.length) return null;
            return recs.reduce((b, r) => Number(r.percent) > Number(b.percent) ? r : b);
        },
        lotdRun() { return this.levelDay?.run?.[0] ?? null; },
        todayDate() {
            return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        },
    },
};
