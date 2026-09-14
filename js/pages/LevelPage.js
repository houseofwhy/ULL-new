import { store } from '../main.js';
import { fetchList } from '../content.js';
import {
    embed, levelThumbnail, levelForSlug,
    decorationPercent, verificationPercent, verificationLabel, levelStatus,
    bestRecord, bestRun, recordLink, levelLength, levelId, hasVerifier,
    verifierLabel, verifierLine, levelRanks,
} from '../util.js';
import Spinner from '../components/Spinner.js';
import Footer from '../components/Footer.js';
import MobileShell from '../components/MobileShell.js';

// On a phone this page wears the mobile shell instead of the desktop chrome;
// on the desktop the wrapper is a passthrough that renders nothing of its own,
// so the page below is written once and reads the same on both.
const Passthrough = { template: '<slot></slot>' };

// The standalone page behind /level/<slug>. The same information the list's
// detail panel shows, at a URL that can be linked, shared and indexed.
// scripts/build-seo.mjs pre-renders one of these per level.
//
// It is the only page a visitor can arrive at cold from a search result or a
// shared link, so it carries its own hero rather than borrowing the list's
// chrome: the level's own thumbnail, blurred behind the title, its placements
// in each of the three lists, and its progress — then the video, credits and
// facts underneath. Every value comes from the list API's existing fields.

export default {
    components: { Spinner, Footer, MobileShell, Passthrough },
    template: `
<component :is="store.mobile ? 'MobileShell' : 'Passthrough'">
    <main v-if="loading" class="surface" style="display:flex;align-items:center;justify-content:center;">
        <Spinner></Spinner>
    </main>
    <main v-else class="level-page surface">
        <template v-if="level">
            <header class="lvl-hero">
                <div v-if="heroImage" class="lvl-hero__bg" :style="{ backgroundImage: 'url(' + heroImage + ')' }"></div>
                <div class="lvl-hero__scrim"></div>
                <div class="lvl-hero__inner">
                    <div class="lvl-hero__body">
                        <nav class="lvl-crumbs">
                            <router-link to="/">Upcoming Levels List</router-link>
                            <span>/</span>
                            <router-link to="/list">All Levels</router-link>
                            <span>/</span>
                            <b>{{ level.name }}</b>
                        </nav>
                        <h1 class="lvl-title">{{ level.name }}</h1>
                        <p class="lvl-byline">
                            by <b>{{ level.author }}</b>
                            <template v-if="verifierLine"> · {{ verifierLine.lead }} <b>{{ verifierLine.name }}</b></template>
                        </p>
                        <div class="lvl-pills">
                            <span class="lvl-status" :class="'lvl-status--' + status.tone"><i></i>{{ status.label }}</span>
                            <span v-for="tag in tags" :key="tag" class="lvl-tag">{{ tag }}</span>
                        </div>
                    </div>
                    <div class="lvl-ranks">
                        <component v-for="rank in ranks" :is="rank.n ? 'router-link' : 'span'" :key="rank.key"
                                   class="lvl-rank" :class="{ 'lvl-rank--lead': rank.lead, 'lvl-rank--off': !rank.n }"
                                   :to="rank.n ? rank.to : undefined">
                            <span class="lvl-rank__n">{{ rank.n ? '#' + rank.n : 'N/A' }}</span>
                            <span class="lvl-rank__l">{{ rank.label }}</span>
                        </component>
                    </div>
                </div>
            </header>

            <div class="lvl-body">
                <div class="lvl-main">
                    <div v-if="hasBothVideos" class="lvl-tabs">
                        <button class="lvl-tab" :class="{ 'is-on': showcaseTab }" @click="showcaseTab = true">Showcase</button>
                        <button class="lvl-tab" :class="{ 'is-on': !showcaseTab }" @click="showcaseTab = false">Verification</button>
                    </div>
                    <iframe v-if="videoSrc" class="lvl-video" :src="videoSrc" frameborder="0" allowfullscreen></iframe>
                    <div v-else class="lvl-video lvl-video--empty">No video yet</div>

                    <section v-if="level.creators && level.creators.length" class="lvl-section">
                        <h2 class="lvl-h2">Creators <span class="lvl-count">{{ level.creators.length }}</span></h2>
                        <div class="lvl-creators">
                            <span v-for="(c, i) in level.creators" :key="i" class="lvl-creator">{{ c }}</span>
                        </div>
                    </section>
                </div>

                <aside class="lvl-side">
                    <div class="lvl-card">
                        <h3 class="lvl-h3">Progress</h3>
                        <div class="lvl-meter">
                            <div class="lvl-meter__top"><span>Decoration</span><b>{{ decoration }}%</b></div>
                            <div class="lvl-bar"><i :style="{ width: decoration + '%' }"></i></div>
                        </div>
                        <div class="lvl-meter">
                            <div class="lvl-meter__top"><span>Verification</span><b>{{ furthest || 'None' }}</b></div>
                            <div class="lvl-bar lvl-bar--alt"><i :style="{ width: verification + '%' }"></i></div>
                        </div>
                    </div>

                    <div class="lvl-card">
                        <h3 class="lvl-h3">World records</h3>
                        <div class="lvl-wr">
                            <div class="lvl-wr__card">
                                <div class="lvl-wr__k">From 0%</div>
                                <template v-if="record">
                                    <a v-if="recordLink" class="lvl-wr__v" :href="recordLink" target="_blank" rel="noopener">{{ record.percent }}%</a>
                                    <div v-else class="lvl-wr__v">{{ record.percent }}%</div>
                                    <div class="lvl-wr__u">{{ record.user }}<template v-if="record.hz"> · {{ record.hz }}Hz</template></div>
                                </template>
                                <div v-else class="lvl-wr__v lvl-wr__v--none">None</div>
                            </div>
                            <div class="lvl-wr__card">
                                <div class="lvl-wr__k">Best run</div>
                                <template v-if="run">
                                    <a v-if="runLink" class="lvl-wr__v" :href="runLink" target="_blank" rel="noopener">{{ run.percent }}%</a>
                                    <div v-else class="lvl-wr__v">{{ run.percent }}%</div>
                                    <div class="lvl-wr__u">{{ run.user }}<template v-if="run.hz"> · {{ run.hz }}Hz</template></div>
                                </template>
                                <div v-else class="lvl-wr__v lvl-wr__v--none">None</div>
                            </div>
                        </div>
                    </div>

                    <div class="lvl-card">
                        <h3 class="lvl-h3">Details</h3>
                        <dl class="lvl-dl">
                            <template v-for="fact in facts" :key="fact[0]">
                                <dt>{{ fact[0] }}</dt>
                                <dd>
                                    <a v-if="fact[2]" class="lvl-dl__link" :href="fact[2]" target="_blank" rel="noopener">{{ fact[1] }}</a>
                                    <template v-else>{{ fact[1] }}</template>
                                </dd>
                            </template>
                        </dl>
                    </div>

                    <div class="lvl-links">
                        <a v-if="level.showcase" class="lvl-link" :href="level.showcase" target="_blank" rel="noopener">Showcase video</a>
                        <a v-if="level.verification" class="lvl-link" :class="{ 'lvl-link--ghost': level.showcase }" :href="level.verification" target="_blank" rel="noopener">Verification video</a>
                        <button class="lvl-link lvl-link--ghost" :class="{ 'lvl-link--copied': copied }" @click="copyLink">
                            {{ copied ? 'Link copied' : 'Copy link to this level' }}
                        </button>
                    </div>
                </aside>

                <p class="lvl-about">
                    The Upcoming Levels List catalogues Extreme Demons still in development, decoration or
                    verification, and forecasts where each will place on the Demonlist once released.
                    {{ level.name }}'s position is set by the staff team according to the
                    <router-link to="/information">list guidelines</router-link>, and moves as the level progresses.
                </p>
            </div>
        </template>

        <div v-else class="lvl-missing">
            <h1>Level not found</h1>
            <p>This level is not on the Upcoming Levels List right now. It may have been published and
            moved to the Demonlist, or removed by the staff team.</p>
            <router-link class="lvl-link" to="/list">Browse all levels</router-link>
        </div>

        <!-- The phone gets the shell's footer instead. -->
        <Footer v-if="!store.mobile" />
    </main>
</component>
    `,
    data: () => ({ store, level: null, loading: true, showcaseTab: true, copied: false, copiedTimer: null }),
    computed: {
        // The list panel shows the showcase for unverified levels and lets you
        // switch once a verification exists; the same rule applies here.
        hasBothVideos() {
            return !!(this.level?.showcase && this.level?.verification);
        },
        videoSrc() {
            const l = this.level;
            if (!l) return '';
            const video = this.hasBothVideos
                ? (this.showcaseTab ? l.showcase : l.verification)
                : (l.showcase || l.verification);
            return video ? embed(video) : '';
        },
        heroImage() {
            return this.level ? levelThumbnail(this.level) : '';
        },
        hasVerifier() {
            return hasVerifier(this.level);
        },
        verifierLine() { return verifierLine(this.level); },
        // All three tiers, in order. All Levels leads here: there is no "current
        // list" on a level's own page, and that is the tier its points come from.
        ranks() { return levelRanks(this.level); },
        decoration() {
            return decorationPercent(this.level);
        },
        verification() {
            return verificationPercent(this.level);
        },
        // The meter is drawn from the number; the reading beside it is written
        // the way the evidence reads, so a run from 72% to the end says
        // "72-100%" rather than the 28 points it is worth (js/util.js).
        furthest() {
            return verificationLabel(this.level);
        },
        status() {
            return levelStatus(this.level);
        },
        record() {
            return bestRecord(this.level);
        },
        run() {
            return bestRun(this.level);
        },
        recordLink() {
            return recordLink(this.record);
        },
        runLink() {
            return recordLink(this.run);
        },
        // The status pill already says what these tags say.
        tags() {
            const covered = ['verified', 'verifying', 'being verified', 'layout'];
            return (this.level?.tags || []).filter((t) => !covered.includes(String(t).toLowerCase()));
        },
        // [label, text, href?] — a third entry turns the value into a link.
        facts() {
            const l = this.level;
            if (!l) return [];
            const frames = typeof l.frameCounter === 'string' ? l.frameCounter.trim() : '';
            return [
                ['Host', l.author],
                ['Verifier', verifierLabel(l)],
                ['Level ID', levelId(l)],
                l.length ? ['Length', levelLength(l)] : null,
                l.lastUpd ? ['Updated', l.lastUpd] : null,
                frames ? ['Frame Windows Counter', 'Watch here', frames] : null,
            ].filter(Boolean);
        },
    },
    methods: {
        async copyLink() {
            const url = window.location.href;
            try {
                await navigator.clipboard.writeText(url);
            } catch {
                // Clipboard API needs a secure context and permission; fall back
                // to a throwaway selection, which works anywhere.
                const field = document.createElement('textarea');
                field.value = url;
                field.setAttribute('readonly', '');
                field.style.position = 'fixed';
                field.style.opacity = '0';
                document.body.appendChild(field);
                field.select();
                try { document.execCommand('copy'); } catch { /* nothing else to try */ }
                field.remove();
            }
            this.copied = true;
            clearTimeout(this.copiedTimer);
            this.copiedTimer = setTimeout(() => { this.copied = false; }, 2000);
        },
        async load() {
            this.loading = true;
            const list = await fetchList();
            const levels = (list || []).map(([level]) => level).filter(Boolean);

            // Cross-list positions come from the full ordering.
            let mainRank = 0, futureRank = 0;
            levels.forEach((l, i) => {
                l.allLevelsRank = i + 1;
                if (l.isMain || l.isVerified) l.mainRank = ++mainRank;
                if (l.isFuture || l.isVerified) l.futureRank = ++futureRank;
            });

            this.level = levelForSlug(levels, this.$route.params.slug);
            // A verified level's showcase is the less interesting of the two.
            this.showcaseTab = !this.level?.isVerified;
            this.loading = false;
            if (this.level) document.title = `ULL — ${this.level.name}`;
        },
    },
    watch: { '$route.params.slug': 'load' },
    mounted() { this.load(); },
    unmounted() { clearTimeout(this.copiedTimer); },
};
