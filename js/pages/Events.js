import { store } from '../main.js';
import {
    levelThumbnail, thumbnailUrl, levelStatus,
    bestRecord, bestRun, recordLink, levelLength, levelId, hasVerifier,
    verifierLabel, verifierLine,
} from '../util.js';
import { fetchLevelMonth, fetchLevelVerif, fetchList } from '../content.js';
import Footer from '../components/Footer.js';
import Spinner from '../components/Spinner.js';

function pickDailyLevel(list) {
    const valid = list.filter(([l, e]) => l && !e && !l.isVerified);
    if (!valid.length) return null;
    const d = new Date();
    const seed = (d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()) >>> 0;
    const hash = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b) >>> 0;
    return valid[hash % valid.length][0];
}

// Three features that are the same kind of thing — a level the list is pointing
// at — drawn three different ways: Level of the Day had a two-column card with
// an "Additional Information" sub-heading, Level of the Month a compact header,
// Closest to Verification a third shape. One block now, at two sizes, built
// from the level page's hero so a featured level is introduced the way a level
// is introduced everywhere else.
//
// Level of the Month and Closest to Verification come from their own small
// records (data/_levelMonth.json, data/_levelVerif.json) rather than the level
// list, so they show what those records hold and nothing more.
export default {
    components: { Footer, Spinner },
    template: `
<main v-if="loading" class="events-page surface" style="display:flex;align-items:center;justify-content:center;">
    <Spinner></Spinner>
</main>
<main v-else class="events-page surface ull2">
    <section class="events-hero">
        <h1>Events</h1>
        <p>Three levels the list is pointing at right now &mdash; one picked for the day, one for the month, and the one closest to being verified.</p>
    </section>

    <div class="events-body">

        <article v-if="levelDay" class="events-feature">
            <header class="u-hero">
                <div v-if="dayThumb" class="u-hero__bg" :style="{ backgroundImage: 'url(' + dayThumb + ')' }"></div>
                <div class="u-hero__scrim"></div>
                <div class="u-hero__inner">
                    <div class="u-hero__body">
                        <div class="events-tag"><b>Level of the Day</b><span>{{ todayDate }}</span></div>
                        <h2 class="u-hero__title">{{ levelDay.name }}</h2>
                        <p class="u-hero__by">
                            by <b>{{ levelDay.author }}</b>
                            <template v-if="dayLine"> &middot; {{ dayLine.lead }} <b>{{ dayLine.name }}</b></template>
                        </p>
                    </div>
                    <div v-if="levelDay.rankNum" class="u-ranks">
                        <router-link class="u-rank u-rank--lead" to="/list">
                            <span class="u-rank__n">{{ levelDay.rankNum }}</span>
                            <span class="u-rank__l">All Levels</span>
                        </router-link>
                    </div>
                </div>
            </header>
            <div class="events-cols">
                <div>
                    <h3 class="u-eyebrow">World records</h3>
                    <div class="u-stats">
                        <div class="u-stat">
                            <div class="u-stat__k">From 0%</div>
                            <template v-if="dayRecord">
                                <a v-if="dayRecordHref" class="u-stat__v" :href="dayRecordHref" target="_blank" rel="noopener">{{ dayRecord.percent }}%</a>
                                <span v-else class="u-stat__v">{{ dayRecord.percent }}%</span>
                                <div class="u-stat__u">{{ dayRecord.user }}</div>
                            </template>
                            <span v-else class="u-stat__v u-stat__v--none">None</span>
                        </div>
                        <div class="u-stat">
                            <div class="u-stat__k">Best run</div>
                            <template v-if="dayRun">
                                <a v-if="dayRunHref" class="u-stat__v" :href="dayRunHref" target="_blank" rel="noopener">{{ dayRun.percent }}%</a>
                                <span v-else class="u-stat__v">{{ dayRun.percent }}%</span>
                                <div class="u-stat__u">{{ dayRun.user }}</div>
                            </template>
                            <span v-else class="u-stat__v u-stat__v--none">None</span>
                        </div>
                    </div>
                    <div class="u-chips events-chips">
                        <span class="u-pill" :class="'u-pill--' + dayStatus.tone"><i></i>{{ dayStatus.label }}</span>
                        <span v-for="tag in dayTags" :key="tag" class="u-chip u-chip--round">{{ tag }}</span>
                    </div>
                </div>
                <div>
                    <h3 class="u-eyebrow">Details</h3>
                    <dl class="u-dl">
                        <dt>Host</dt><dd>{{ levelDay.author }}</dd>
                        <dt>Verifier</dt><dd>{{ dayVerifierLabel }}</dd>
                        <dt>Level ID</dt><dd>{{ dayId }}</dd>
                        <dt>Length</dt><dd>{{ dayLength }}</dd>
                        <dt>Updated</dt><dd>{{ levelDay.lastUpd }}</dd>
                    </dl>
                </div>
            </div>
        </article>

        <div class="events-pair">

            <article v-if="levelMonth" class="events-feature events-feature--sm">
                <header class="u-hero">
                    <div v-if="monthThumb" class="u-hero__bg" :style="{ backgroundImage: 'url(' + monthThumb + ')' }"></div>
                    <div class="u-hero__scrim"></div>
                    <div class="u-hero__inner">
                        <div class="u-hero__body">
                            <div class="events-tag"><b>Level of the Month</b><span>{{ thisMonth }}</span></div>
                            <h2 class="u-hero__title">{{ levelMonth.name }}</h2>
                            <p class="u-hero__by">by <b>{{ levelMonth.author }}</b></p>
                        </div>
                        <div v-if="levelMonth.rank" class="u-ranks">
                            <router-link class="u-rank u-rank--lead" to="/list">
                                <span class="u-rank__n">#{{ levelMonth.rank }}</span>
                                <span class="u-rank__l">All Levels</span>
                            </router-link>
                        </div>
                    </div>
                </header>
                <div class="events-single">
                    <div class="u-stats">
                        <div class="u-stat">
                            <div class="u-stat__k">Best record</div>
                            <a class="u-stat__v" :href="levelMonth.record.link || '#'" target="_blank" rel="noopener">{{ levelMonth.record.percent }}</a>
                            <div class="u-stat__u">{{ levelMonth.record.player }}</div>
                        </div>
                        <div class="u-stat">
                            <div class="u-stat__k">Best run</div>
                            <a class="u-stat__v" :href="levelMonth.run.link || '#'" target="_blank" rel="noopener">{{ levelMonth.run.percent }}</a>
                            <div class="u-stat__u">{{ levelMonth.run.player }}</div>
                        </div>
                    </div>
                    <a href="https://discord.gg/QRX47v2qyC" target="_blank" rel="noopener" class="u-btn u-btn--ghost">
                        <img class="events-btn-icon" src="/assets/discord.svg" :style="store.dark ? 'filter:invert(1)' : ''" alt="" />
                        Participate in our Discord Server
                    </a>
                </div>
            </article>

            <article v-if="levelVerif" class="events-feature events-feature--sm">
                <header class="u-hero">
                    <div v-if="verifThumb" class="u-hero__bg" :style="{ backgroundImage: 'url(' + verifThumb + ')' }"></div>
                    <div class="u-hero__scrim"></div>
                    <div class="u-hero__inner">
                        <div class="u-hero__body">
                            <div class="events-tag"><b>Closest to Verification</b><span>{{ levelVerif.record.percent }}</span></div>
                            <h2 class="u-hero__title">{{ levelVerif.name }}</h2>
                            <p class="u-hero__by">by <b>{{ levelVerif.author }}</b><template v-if="verifLine"> &middot; {{ verifLine.lead }} <b>{{ verifLine.name }}</b></template></p>
                        </div>
                        <div v-if="levelVerif.rank" class="u-ranks">
                            <router-link class="u-rank u-rank--lead" to="/list">
                                <span class="u-rank__n">#{{ levelVerif.rank }}</span>
                                <span class="u-rank__l">All Levels</span>
                            </router-link>
                        </div>
                    </div>
                </header>
                <div class="events-single">
                    <div class="u-stats">
                        <div class="u-stat">
                            <div class="u-stat__k">Best record</div>
                            <a class="u-stat__v" :href="levelVerif.record.link || '#'" target="_blank" rel="noopener">{{ levelVerif.record.percent }}</a>
                            <div class="u-stat__u">{{ levelVerif.record.player }}</div>
                        </div>
                        <div class="u-stat">
                            <div class="u-stat__k">Best run</div>
                            <a class="u-stat__v" :href="levelVerif.run.link || '#'" target="_blank" rel="noopener">{{ levelVerif.run.percent }}</a>
                            <div class="u-stat__u">{{ levelVerif.run.player }}</div>
                        </div>
                    </div>
                    <router-link to="/upcoming" class="u-btn u-btn--ghost">Go to Upcoming Levels</router-link>
                </div>
            </article>

        </div>
    </div>

    <Footer />
</main>
    `,
    data: () => ({
        loading: true,
        store,
        levelMonth: null,
        levelVerif: null,
        levelDay: null,
    }),
    computed: {
        dayThumb() { return this.levelDay ? levelThumbnail(this.levelDay) : ''; },
        monthThumb() { return thumbnailUrl(this.levelMonth?.thumbnail); },
        verifThumb() { return thumbnailUrl(this.levelVerif?.thumbnail); },
        dayVerifier() { return hasVerifier(this.levelDay); },
        dayLine() { return verifierLine(this.levelDay); },
        dayVerifierLabel() { return verifierLabel(this.levelDay); },
        verifLine() { return verifierLine(this.levelVerif); },
        dayStatus() { return levelStatus(this.levelDay); },
        dayRecord() { return bestRecord(this.levelDay); },
        dayRun() { return bestRun(this.levelDay); },
        dayRecordHref() { return recordLink(this.dayRecord); },
        dayRunHref() { return recordLink(this.dayRun); },
        dayId() { return levelId(this.levelDay); },
        dayLength() { return levelLength(this.levelDay); },
        // The status pill already says what these tags say.
        dayTags() {
            const covered = ['verified', 'verifying', 'being verified', 'layout'];
            return (this.levelDay?.tags || []).filter((t) => !covered.includes(String(t).toLowerCase()));
        },
        todayDate() {
            return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        },
        thisMonth() {
            return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        },
    },
    async mounted() {
        const [lm, lv, list] = await Promise.all([
            fetchLevelMonth(),
            fetchLevelVerif(),
            fetchList(),
        ]);
        this.levelMonth = lm;
        this.levelVerif = lv;
        if (list?.length) this.levelDay = pickDailyLevel(list);
        this.loading = false;
    },
};
