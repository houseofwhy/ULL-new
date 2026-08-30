import { store } from '../main.js';
import { fetchList } from '../content.js';
import { embed, levelThumbnail, levelForSlug } from '../util.js';
import Spinner from '../components/Spinner.js';
import Footer from '../components/Footer.js';

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
    components: { Spinner, Footer },
    template: `
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
                        <template v-if="hasVerifier"> · {{ level.isVerified ? 'verified by' : 'to be verified by' }} <b>{{ level.verifier }}</b></template>
                    </p>
                    <div class="lvl-pills">
                        <span class="lvl-status" :class="'lvl-status--' + status.tone"><i></i>{{ status.label }}</span>
                        <span v-for="tag in tags" :key="tag" class="lvl-tag">{{ tag }}</span>
                    </div>
                </div>
                <div class="lvl-ranks">
                    <router-link class="lvl-rank lvl-rank--lead" to="/list">
                        <span class="lvl-rank__n">#{{ level.allLevelsRank }}</span>
                        <span class="lvl-rank__l">All Levels</span>
                    </router-link>
                    <router-link v-if="level.mainRank" class="lvl-rank" to="/listmain">
                        <span class="lvl-rank__n">#{{ level.mainRank }}</span>
                        <span class="lvl-rank__l">Main List</span>
                    </router-link>
                    <router-link v-if="level.futureRank" class="lvl-rank" to="/listfuture">
                        <span class="lvl-rank__n">#{{ level.futureRank }}</span>
                        <span class="lvl-rank__l">Future List</span>
                    </router-link>
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
                        <div class="lvl-meter__top"><span>Verification</span><b>{{ verification }}%</b></div>
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

    <Footer />
</main>
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
            const v = this.level?.verifier;
            return !!v && v !== 'none' && v.toLowerCase() !== 'unknown';
        },
        decoration() {
            return Math.max(0, Math.min(100, Number(this.level?.percentFinished) || 0));
        },
        // How far anyone has got into the level, from either a from-0 record or
        // the span of a run. The same measure the list colours level names by.
        verification() {
            const l = this.level;
            if (!l) return 0;
            if (l.isVerified) return 100;
            const records = (l.records || []).map((r) => Number(r.percent) || 0);
            const runs = (l.run || []).map((r) => {
                const parts = String(r.percent).split('-').map(Number);
                return parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) ? Math.abs(parts[1] - parts[0]) : 0;
            });
            return Math.max(0, Math.min(100, Math.max(0, ...records, ...runs)));
        },
        // Wording matches the list panel; the colour follows the same scale the
        // list uses for level names, so a level reads the same in both places.
        status() {
            const l = this.level;
            if (!l) return { label: '', tone: 'cold' };
            if (l.isVerified) return { label: 'Verified', tone: 'done' };
            const pf = this.decoration;
            const vp = this.verification;
            if (pf === 100) {
                const tone = vp >= 60 ? 'red' : vp >= 30 ? 'orange' : 'amber';
                return { label: 'Being verified', tone };
            }
            if (!pf) return { label: 'Layout', tone: 'blue' };
            return { label: `Decoration ${pf}% done`, tone: pf >= 70 ? 'yellow' : pf >= 30 ? 'green' : 'cyan' };
        },
        record() {
            return (this.level?.records || [])
                .filter((r) => r.user && r.user !== 'none' && Number(r.percent) > 0)
                .sort((a, b) => Number(b.percent) - Number(a.percent))[0] || null;
        },
        run() {
            return (this.level?.run || []).find((r) => r.user && r.user !== 'none' && String(r.percent) !== '0') || null;
        },
        recordLink() {
            const link = this.record?.link;
            return link && link !== '#' ? link : '';
        },
        runLink() {
            const link = this.run?.link;
            return link && link !== '#' ? link : '';
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
            const id = l.id === 'private' ? (l.leakID != null ? l.leakID : 'Private') : l.id;
            const frames = typeof l.frameCounter === 'string' ? l.frameCounter.trim() : '';
            return [
                ['Host', l.author],
                ['Verifier', this.hasVerifier ? l.verifier : 'Unknown'],
                ['Level ID', id],
                l.length ? ['Length', `${Math.floor(l.length / 60)}m ${l.length % 60}s`] : null,
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
