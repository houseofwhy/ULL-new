import { store } from '../../main.js';
import {
    levelThumbnail, thumbnailUrl, levelStatus,
    bestRecord, bestRun, recordLink, levelLength, levelId, hasVerifier,
    verifierLabel, verifierLine,
} from '../../util.js';
import { mobileStore } from './mobileStore.js';

function pickDailyLevel(list) {
    const valid = list.filter(([l, e]) => l && !e && !l.isVerified);
    if (!valid.length) return null;
    const d = new Date();
    const seed = (d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()) >>> 0;
    const hash = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b) >>> 0;
    return valid[hash % valid.length][0];
}

export default {
    template: `
        <div class="mob-events-page m2-page-body">
            <section class="m2-hero">
                <h1>Events</h1>
                <p>Three levels the list is pointing at right now — one for the day, one for the month, and the one closest to being verified.</p>
            </section>

            <div class="m2-body">

                <!-- Level of the Day -->
                <article v-if="levelDay" class="m2-feature">
                    <header class="u-hero">
                        <div v-if="lotdThumb" class="u-hero__bg" :style="{ backgroundImage: 'url(' + lotdThumb + ')' }"></div>
                        <div class="u-hero__scrim"></div>
                        <div class="u-hero__inner">
                            <div class="u-hero__body">
                                <div class="m2-tag"><b>Level of the Day</b><span>{{ todayDate }}</span></div>
                                <h2 class="u-hero__title">{{ levelDay.name }}</h2>
                                <p class="u-hero__by">
                                    by <b>{{ levelDay.author }}</b>
                                    <template v-if="dayLine"> · {{ dayLine.lead }} <b>{{ dayLine.name }}</b></template>
                                </p>
                                <div v-if="levelDay.rankNum" class="m2-ranks">
                                    <router-link class="u-rank u-rank--lead" to="/mobile/all">
                                        <span class="u-rank__n">{{ levelDay.rankNum }}</span>
                                        <span class="u-rank__l">All Levels</span>
                                    </router-link>
                                </div>
                            </div>
                        </div>
                    </header>
                    <div class="m2-feature__body">
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
                        <div class="u-chips">
                            <span class="u-pill" :class="'u-pill--' + dayStatus.tone"><i></i>{{ dayStatus.label }}</span>
                            <span v-for="tag in dayTags" :key="tag" class="u-chip u-chip--round">{{ tag }}</span>
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

                <!-- Level of the Month -->
                <article v-if="mobileStore.levelMonth" class="m2-feature">
                    <header class="u-hero">
                        <div v-if="monthThumb" class="u-hero__bg" :style="{ backgroundImage: 'url(' + monthThumb + ')' }"></div>
                        <div class="u-hero__scrim"></div>
                        <div class="u-hero__inner">
                            <div class="u-hero__body">
                                <div class="m2-tag"><b>Level of the Month</b><span>{{ thisMonth }}</span></div>
                                <h2 class="u-hero__title">{{ mobileStore.levelMonth.name }}</h2>
                                <p class="u-hero__by">by <b>{{ mobileStore.levelMonth.author }}</b></p>
                                <div v-if="mobileStore.levelMonth.rank" class="m2-ranks">
                                    <router-link class="u-rank u-rank--lead" to="/mobile/all">
                                        <span class="u-rank__n">#{{ mobileStore.levelMonth.rank }}</span>
                                        <span class="u-rank__l">All Levels</span>
                                    </router-link>
                                </div>
                            </div>
                        </div>
                    </header>
                    <div class="m2-feature__body">
                        <div class="u-stats">
                            <div class="u-stat">
                                <div class="u-stat__k">Best record</div>
                                <a class="u-stat__v" :href="mobileStore.levelMonth.record.link || '#'" target="_blank" rel="noopener">{{ mobileStore.levelMonth.record.percent }}</a>
                                <div class="u-stat__u">{{ mobileStore.levelMonth.record.player }}</div>
                            </div>
                            <div class="u-stat">
                                <div class="u-stat__k">Best run</div>
                                <a class="u-stat__v" :href="mobileStore.levelMonth.run.link || '#'" target="_blank" rel="noopener">{{ mobileStore.levelMonth.run.percent }}</a>
                                <div class="u-stat__u">{{ mobileStore.levelMonth.run.player }}</div>
                            </div>
                        </div>
                        <a href="https://discord.gg/QRX47v2qyC" target="_blank" class="u-btn u-btn--ghost">Participate in our Discord Server</a>
                    </div>
                </article>

                <!-- Closest to Verification -->
                <article v-if="mobileStore.levelVerif" class="m2-feature">
                    <header class="u-hero">
                        <div v-if="verifThumb" class="u-hero__bg" :style="{ backgroundImage: 'url(' + verifThumb + ')' }"></div>
                        <div class="u-hero__scrim"></div>
                        <div class="u-hero__inner">
                            <div class="u-hero__body">
                                <div class="m2-tag"><b>Closest to Verification</b><span>{{ mobileStore.levelVerif.record.percent }}</span></div>
                                <h2 class="u-hero__title">{{ mobileStore.levelVerif.name }}</h2>
                                <p class="u-hero__by">by <b>{{ mobileStore.levelVerif.author }}</b><template v-if="verifLine"> · {{ verifLine.lead }} <b>{{ verifLine.name }}</b></template></p>
                                <div v-if="mobileStore.levelVerif.rank" class="m2-ranks">
                                    <router-link class="u-rank u-rank--lead" to="/mobile/all">
                                        <span class="u-rank__n">#{{ mobileStore.levelVerif.rank }}</span>
                                        <span class="u-rank__l">All Levels</span>
                                    </router-link>
                                </div>
                            </div>
                        </div>
                    </header>
                    <div class="m2-feature__body">
                        <div class="u-stats">
                            <div class="u-stat">
                                <div class="u-stat__k">Best record</div>
                                <a class="u-stat__v" :href="mobileStore.levelVerif.record.link || '#'" target="_blank" rel="noopener">{{ mobileStore.levelVerif.record.percent }}</a>
                                <div class="u-stat__u">{{ mobileStore.levelVerif.record.player }}</div>
                            </div>
                            <div class="u-stat">
                                <div class="u-stat__k">Best run</div>
                                <a class="u-stat__v" :href="mobileStore.levelVerif.run.link || '#'" target="_blank" rel="noopener">{{ mobileStore.levelVerif.run.percent }}</a>
                                <div class="u-stat__u">{{ mobileStore.levelVerif.run.player }}</div>
                            </div>
                        </div>
                        <router-link to="/mobile/upcoming" class="u-btn u-btn--ghost">Go to Upcoming Levels</router-link>
                    </div>
                </article>

                <div v-if="!mobileStore.levelMonth && !mobileStore.levelVerif && !levelDay && !mobileStore.loading" class="u-empty">
                    <div class="u-empty__t">Nothing featured right now</div>
                </div>
            </div>
        </div>
    `,
    data: () => ({ store, mobileStore }),
    computed: {
        monthThumb() { return thumbnailUrl(mobileStore.levelMonth?.thumbnail); },
        verifThumb() { return thumbnailUrl(mobileStore.levelVerif?.thumbnail); },
        levelDay() { return mobileStore.rawList.length ? pickDailyLevel(mobileStore.rawList) : null; },
        lotdThumb() { return levelThumbnail(this.levelDay); },
        dayVerifier() { return hasVerifier(this.levelDay); },
        dayLine() { return verifierLine(this.levelDay); },
        dayVerifierLabel() { return verifierLabel(this.levelDay); },
        verifLine() { return verifierLine(mobileStore.levelVerif); },
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
};
