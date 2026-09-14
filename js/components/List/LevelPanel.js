import {
    embed, levelThumbnail, levelSlug,
    decorationPercent, verificationPercent, verificationLabel, levelStatus,
    bestRecord, bestRun, recordLink, levelLength, levelId, hasVerifier,
    verifierLabel, verifierLine, levelRanks,
} from '../../util.js';

// The detail panel beside a list. /level/<slug> already presented exactly this
// information well — a hero built from the level's own thumbnail, one status
// pill on the scale the list colours names by, the two progress numbers as
// meters, and the facts in a definition list — while the panel next to it
// printed the same values as prose ("World Record - From 0: None", "Status:
// Decoration being made - 80% done") through some forty inline styles.
//
// This is that page's design at panel size, and it is one component: All
// Levels, Main List, Future List and Upcoming Levels all render it, so the
// four near-identical copies of the old markup are gone.
//
// No value here is new. Every one of them was already on the level object.
export default {
    props: {
        level: { type: Object, default: null },
        // Needed to build the level's URL: two paths can slugify the same, and
        // the tie is broken against the whole set.
        allPaths: { type: Array, default: () => [] },
        // Which list the panel is sitting next to, so that placement leads.
        current: { type: String, default: 'all' },
        // Upcoming ranks by progress, so it leads with that reading instead.
        leadProgress: { type: Boolean, default: false },
    },
    template: `
<div v-if="!level" class="level-panel level-panel--empty">
    <div class="u-empty">
        <div class="u-empty__t">Select a level</div>
        <div class="u-empty__d">Pick one from the list to see its video, records and progress.</div>
    </div>
</div>
<article v-else class="level-panel">
    <header class="u-hero u-hero--flush lp-hero">
        <div v-if="thumbnail" class="u-hero__bg" :style="{ backgroundImage: 'url(' + thumbnail + ')' }"></div>
        <div class="u-hero__scrim"></div>
        <div class="u-hero__inner">
            <div class="u-hero__body">
                <h1 class="u-hero__title">{{ level.name }}</h1>
                <p class="u-hero__by">
                    by <b>{{ level.author }}</b>
                    <template v-if="verifierLine"> &middot; {{ verifierLine.lead }} <b>{{ verifierLine.name }}</b></template>
                </p>
                <div class="lp-pills">
                    <span class="u-pill" :class="'u-pill--' + status.tone"><i></i>{{ status.label }}</span>
                    <span v-for="tag in tags" :key="tag" class="u-chip u-chip--round">{{ tag }}</span>
                </div>
            </div>
            <div v-if="ranks.length" class="u-ranks">
                <component v-for="rank in ranks" :is="rank.n ? 'router-link' : 'span'" :key="rank.key" class="u-rank"
                           :class="{ 'u-rank--lead': rank.lead, 'u-rank--off': !rank.n }" :to="rank.n ? rank.to : undefined">
                    <span class="u-rank__n">{{ rank.n ? '#' + rank.n : 'N/A' }}</span>
                    <span class="u-rank__l">{{ rank.label }}</span>
                </component>
            </div>
        </div>
    </header>

    <div class="lp-body">
        <div v-if="leadProgress" class="u-card lp-lead">
            <div class="lp-lead__top">
                <div>
                    <b>{{ furthest || 'None' }}</b>
                    <span>Furthest progress</span>
                </div>
                <span class="u-pill" :class="'u-pill--' + status.tone"><i></i>{{ status.label }}</span>
            </div>
            <div class="u-bar u-bar--alt lp-lead__bar"><i :style="{ width: verification + '%' }"></i></div>
        </div>

        <div v-if="hasBothVideos" class="lp-tabs">
            <button class="lp-tab" :class="{ 'is-on': showcaseTab }" @click="showcaseTab = true">Showcase</button>
            <button class="lp-tab" :class="{ 'is-on': !showcaseTab }" @click="showcaseTab = false">Verification</button>
        </div>
        <iframe v-if="videoSrc" class="lp-video" :src="videoSrc" frameborder="0" allowfullscreen></iframe>
        <div v-else class="lp-video lp-video--empty">No video yet</div>

        <!-- Two independent stacks, not one grid: in a grid every card shares a
             row with the card beside it, so a short card was stretched to the
             taller one's height. Same shape the pending lanes use. -->
        <div class="lp-grid">
            <div class="lp-col">
                <div v-if="!leadProgress" class="u-card">
                    <h3 class="u-eyebrow">Progress</h3>
                    <div class="u-meter">
                        <div class="u-meter__top"><span>Decoration</span><b>{{ decoration }}%</b></div>
                        <div class="u-bar"><i :style="{ width: decoration + '%' }"></i></div>
                    </div>
                    <div class="u-meter">
                        <div class="u-meter__top"><span>Verification</span><b>{{ furthest || 'None' }}</b></div>
                        <div class="u-bar u-bar--alt"><i :style="{ width: verification + '%' }"></i></div>
                    </div>
                </div>
                <div class="u-card">
                    <h3 class="u-eyebrow">Details</h3>
                    <dl class="u-dl">
                        <template v-for="fact in facts" :key="fact[0]">
                            <dt>{{ fact[0] }}</dt>
                            <dd>
                                <a v-if="fact[2]" :href="fact[2]" target="_blank" rel="noopener">{{ fact[1] }}</a>
                                <template v-else>{{ fact[1] }}</template>
                            </dd>
                        </template>
                    </dl>
                </div>
            </div>
            <div class="lp-col">
                <div class="u-card">
                    <h3 class="u-eyebrow">World records</h3>
                    <div class="u-stats">
                        <div class="u-stat">
                            <div class="u-stat__k">From 0%</div>
                            <template v-if="record">
                                <a v-if="recordHref" class="u-stat__v" :href="recordHref" target="_blank" rel="noopener">{{ record.percent }}%</a>
                                <span v-else class="u-stat__v">{{ record.percent }}%</span>
                                <div class="u-stat__u">{{ record.user }}<template v-if="record.hz"> &middot; {{ record.hz }}Hz</template></div>
                            </template>
                            <span v-else class="u-stat__v u-stat__v--none">None</span>
                        </div>
                        <div class="u-stat">
                            <div class="u-stat__k">Best run</div>
                            <template v-if="run">
                                <a v-if="runHref" class="u-stat__v" :href="runHref" target="_blank" rel="noopener">{{ run.percent }}%</a>
                                <span v-else class="u-stat__v">{{ run.percent }}%</span>
                                <div class="u-stat__u">{{ run.user }}<template v-if="run.hz"> &middot; {{ run.hz }}Hz</template></div>
                            </template>
                            <span v-else class="u-stat__v u-stat__v--none">None</span>
                        </div>
                    </div>
                </div>
                <div v-if="level.creators && level.creators.length" class="u-card">
                    <h3 class="u-eyebrow">Creators <span class="u-count">{{ level.creators.length }}</span></h3>
                    <div class="u-chips">
                        <span v-for="(creator, i) in level.creators" :key="i" class="u-chip">{{ creator }}</span>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="slug" class="lp-actions">
            <router-link class="u-btn" :to="'/level/' + slug">Open level page</router-link>
            <!-- A real link to the level page — middle-clickable, right-click-copyable
                 and crawlable — that copies the URL instead of navigating on click. -->
            <a class="level-share" :class="{ 'level-share--copied': copied }"
               :href="'/level/' + slug" @click.prevent="copyLink">
                <svg v-if="copied" class="level-share__icon" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                     stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M3 8.5l3.2 3.2L13 5" />
                </svg>
                <svg v-else class="level-share__icon" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                     stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M6.6 9.4a2.9 2.9 0 0 0 4.1 0l2-2a2.9 2.9 0 1 0-4.1-4.1l-.6.6" />
                    <path d="M9.4 6.6a2.9 2.9 0 0 0-4.1 0l-2 2a2.9 2.9 0 1 0 4.1 4.1l.6-.6" />
                </svg>
                <span>{{ copied ? 'Link copied' : 'Share level' }}</span>
            </a>
        </div>
    </div>
</article>
    `,
    data: () => ({ showcaseTab: true, copied: false, copiedTimer: null }),
    computed: {
        thumbnail() { return this.level ? levelThumbnail(this.level) : ''; },
        verifierKnown() { return hasVerifier(this.level); },
        decoration() { return decorationPercent(this.level); },
        verification() { return verificationPercent(this.level); },
        // The meter's width is the number; the reading is how it is written
        // — a run says the span it covers, not the points it is worth.
        furthest() { return verificationLabel(this.level); },
        status() { return levelStatus(this.level); },
        record() { return bestRecord(this.level); },
        run() { return bestRun(this.level); },
        recordHref() { return recordLink(this.record); },
        runHref() { return recordLink(this.run); },
        slug() {
            return this.level?.path ? levelSlug(this.level.path, this.allPaths) : '';
        },
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
        // The status pill already says what these tags say.
        tags() {
            const covered = ['verified', 'verifying', 'being verified', 'layout'];
            return (this.level?.tags || []).filter((t) => !covered.includes(String(t).toLowerCase()));
        },
        // Always the same three, always in the same order; the list being read
        // is the one highlighted, and a tier the level is not on says so.
        ranks() { return levelRanks(this.level, this.current); },
        verifierLine() { return verifierLine(this.level); },
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
    watch: {
        // A verified level's showcase is the less interesting of the two.
        level: {
            immediate: true,
            handler(level) {
                this.showcaseTab = !level?.isVerified;
                this.copied = false;
            },
        },
    },
    methods: {
        async copyLink() {
            const url = `${window.location.origin}/level/${this.slug}`;
            let copied = false;
            try {
                await navigator.clipboard.writeText(url);
                copied = true;
            } catch {
                // The Clipboard API needs a secure context and permission; fall
                // back to a throwaway selection, which works anywhere.
                const field = document.createElement('textarea');
                field.value = url;
                field.setAttribute('readonly', '');
                field.style.position = 'fixed';
                field.style.opacity = '0';
                document.body.appendChild(field);
                field.select();
                try { copied = document.execCommand('copy'); } catch { copied = false; }
                field.remove();
            }
            // If neither route worked the link still leads somewhere useful, so
            // follow it rather than doing nothing.
            if (!copied) {
                this.$router.push(`/level/${this.slug}`);
                return;
            }
            this.copied = true;
            clearTimeout(this.copiedTimer);
            this.copiedTimer = setTimeout(() => { this.copied = false; }, 2000);
        },
    },
    unmounted() { clearTimeout(this.copiedTimer); },
};
