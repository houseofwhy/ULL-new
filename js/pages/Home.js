import { store } from '../main.js';
import { fetchEditors, fetchRecentChanges, fetchList } from '../content.js';
import {
    levelThumbnail, levelSlug, levelStatus,
    decorationPercent, verificationPercent, verificationLabel, verifierLine,
} from '../util.js';
import { homeStats } from '../home-stats.js';
import Footer from '../components/Footer.js';

const roleIconMap = {
    owner: 'crown',
    admin: 'user-gear',
    seniormod: 'user-shield',
    mod: 'user-lock',
    dev: 'code',
};

const roleLabelMap = {
    owner: 'Owner',
    admin: 'Admin',
    seniormod: 'Elder Mod',
    mod: 'Mod',
    dev: 'Dev',
};

// Editors are shown in the order the database gives them, grouped by seniority.
// The groups only decide the sub-headings; within a group the DB order stands.
const roleGroups = [
    { label: 'Owner & admin', roles: ['owner', 'admin'], lead: true },
    { label: 'Elder moderators', roles: ['seniormod'] },
    { label: 'Moderators', roles: ['mod'] },
    { label: 'Developers', roles: ['dev'] },
];

// How many levels the Upcoming Top 1 lane shows.
const TOP1_ROWS = 5;

// The landing page of a level list used to show no levels. It now opens on one:
// #1 introduced the way /level/<slug> introduces it, with its blurred
// thumbnail, its status pill and both progress meters, beside the copy that
// says what the list is — the half of the hero that used to be empty at every
// width. Hero, credentials, sections and footer share one column measure; the
// hero used to pad off the main region while the body was a 1100px column
// centred in what was left, which put the two 72px apart at 1440 and 312px
// apart at 1920.
export default {
    components: { Footer },
    template: `
<main class="home-page surface ull2">

    <div class="home-band">
        <div class="home-col home-hero" :class="{ 'home-hero--solo': !spotlight }">
            <div class="home-hero__body">
                <div class="home-hero-eyebrow">Geometry Dash &middot; Extreme Demons</div>
                <h1 class="home-hero-title">Upcoming Levels List</h1>
                <p class="home-hero-desc">
                    Upcoming Levels List (ULL) is a community-maintained catalogue of upcoming Top 1-135 Extreme Demons in Geometry Dash projected to place on the Demonlist. It aims to forecast future rankings with the inclusion of worthy unrates.
                </p>
                <div class="home-hero-actions">
                    <!-- One filled call to action. The sidebar carries Future
                         List and Information permanently, 180px to the left. -->
                    <router-link to="/list" class="u-btn">Browse all{{ counts ? ' ' + counts.all : '' }} levels</router-link>
                    <router-link to="/information" class="u-btn u-btn--ghost">How placement works</router-link>
                </div>
                <div class="home-hero-social">
                    <a href="https://discord.gg/QRX47v2qyC" target="_blank" class="home-social-btn">
                        <img src="/assets/discord.svg" :style="store.dark ? 'filter:invert(1)' : ''" alt="" />
                        Discord
                    </a>
                    <a href="https://x.com/ull_gd" target="_blank" rel="noopener" class="home-social-btn">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        X
                    </a>
                </div>
            </div>

            <!-- The spotlight is /level/<slug>'s own header at the size the
                 hero was leaving empty. Nothing on it is new. -->
            <router-link v-if="spotlight" class="home-spot" :to="'/level/' + spotlight.slug">
                <div class="u-hero">
                    <div class="u-hero__bg" :style="{ backgroundImage: 'url(' + spotlight.thumbnail + ')' }"></div>
                    <div class="u-hero__scrim"></div>
                    <div class="u-hero__inner">
                        <div class="u-hero__body">
                            <div class="u-eyebrow home-spot__k">Top of the list &middot; #1</div>
                            <h2 class="u-hero__title">{{ spotlight.level.name }}</h2>
                            <p class="u-hero__by">
                                by <b>{{ spotlight.level.author }}</b><template v-if="spotlight.verifier"> &middot; {{ spotlight.verifier.lead }} <b>{{ spotlight.verifier.name }}</b></template>
                            </p>
                        </div>
                        <span class="u-pill" :class="'u-pill--' + spotlight.status.tone"><i></i>{{ spotlight.status.label }}</span>
                    </div>
                </div>
                <div class="home-spot__body">
                    <div class="u-meter">
                        <div class="u-meter__top"><span>Decoration</span><b>{{ spotlight.decoration }}%</b></div>
                        <span class="u-bar"><i :style="{ width: spotlight.decoration + '%' }"></i></span>
                    </div>
                    <div class="u-meter">
                        <div class="u-meter__top"><span>Furthest anyone has got</span><b>{{ spotlight.furthest || 'None' }}</b></div>
                        <span class="u-bar u-bar--alt"><i :style="{ width: spotlight.progress + '%' }"></i></span>
                    </div>
                    <div class="home-spot__foot"><span class="u-btn u-btn--ghost u-btn--block">Open level page</span></div>
                </div>
            </router-link>
        </div>
    </div>

    <div v-if="counts" class="home-col home-cred">
        <div class="u-cred">
            <div v-for="stat in stats" :key="stat.key" class="u-cred__item">
                <svg class="u-cred__ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path v-for="d in stat.paths" :key="d" :d="d" />
                </svg>
                <span class="u-cred__t"><b v-if="stat.value">{{ stat.value }}</b>{{ stat.label }}</span>
            </div>
        </div>
    </div>

    <div class="home-col home-content">

        <!-- Not the next five rows of the list, but the five levels above the
             hardest level that is already verified which have got furthest
             through verification: the ones that would take the Top 1 spot if
             they were finished today, in the order they are likely to do it. -->
        <section v-if="top1.length" class="home-section">
            <div class="home-section__head">
                <h2 class="u-eyebrow u-eyebrow--lg">Upcoming Top 1 levels</h2>
                <router-link class="home-more" to="/upcoming">All upcoming &rarr;</router-link>
            </div>
            <p v-if="hardestVerified" class="home-section__note">
                Above <b>{{ hardestVerified.name }}</b>, the hardest level on the list that is verified, and closest to being verified themselves.
            </p>
            <div class="home-top">
                <router-link v-for="entry in top1" :key="entry.slug" class="u-row home-row" :to="'/level/' + entry.slug">
                    <span class="u-row__lead">#{{ entry.rank }}</span>
                    <img class="u-row__thumb" :src="entry.thumbnail" alt="" loading="lazy" />
                    <span class="u-row__body">
                        <span class="home-row__head">
                            <span class="u-row__name">{{ entry.level.name }}</span>
                            <span class="u-pill" :class="'u-pill--' + entry.status.tone"><i></i>{{ entry.status.label }}</span>
                        </span>
                        <span class="u-row__sub">
                            by {{ entry.level.author }}<template v-if="entry.verifier"> &middot; {{ entry.verifier.lead }} {{ entry.verifier.name }}</template>
                        </span>
                        <span class="u-bar u-bar--alt u-bar--thin home-row__meter"><i :style="{ width: entry.progress + '%' }"></i></span>
                    </span>
                    <span class="home-row__fig" :class="{ 'home-row__fig--none': !entry.furthest }">
                        {{ entry.furthest || '&mdash;' }}<span>furthest</span>
                    </span>
                </router-link>
            </div>
        </section>

        <div class="home-cols">

            <section>
                <div class="home-section__head">
                    <h2 class="u-eyebrow">Recent changes</h2>
                </div>
                <!-- A framed window the feed scrolls inside, rather than the
                     whole feed in the page's flow: there is no changelog route
                     to send a reader to, and unrolled it pushed the editors
                     beside it off the end of a long page. -->
                <div v-if="recentChanges.length" class="home-feed">
                    <template v-for="group in recentChanges" :key="group.date">
                        <div class="home-changes-date">{{ group.date }}</div>
                        <div v-for="entry in group.entries" :key="entry" class="home-change" :class="changeTone(entry)">
                            <span class="home-change__dot"></span>
                            <span class="home-change__text" v-html="formatChange(entry)"></span>
                        </div>
                    </template>
                </div>
                <div v-else class="u-empty">
                    <div class="u-empty__t">Nothing logged yet</div>
                    <div class="u-empty__d">Placement changes show up here as the staff team makes them.</div>
                </div>
            </section>

            <section>
                <h2 class="u-eyebrow">List editors <span class="u-count">{{ editors.length }}</span></h2>
                <div class="home-editors">
                    <div v-for="group in editorGroups" :key="group.label" class="home-editors-group">
                        <div class="home-editors-group__label">{{ group.label }}</div>
                        <div class="home-editors-line">
                            <component v-for="editor in group.editors" :key="editor.name"
                                       :is="editor.link && editor.link !== '#' ? 'a' : 'span'"
                                       class="home-editor" :class="{ 'home-editor--lead': group.lead }"
                                       :href="editor.link && editor.link !== '#' ? editor.link : undefined"
                                       :target="editor.link && editor.link !== '#' ? '_blank' : undefined">
                                <img :src="'/assets/' + (roleIconMap[editor.role] || 'user-lock') + (store.dark ? '' : '-dark') + '.svg'" :alt="editor.role" />
                                {{ editor.name }}
                            </component>
                        </div>
                    </div>
                </div>
                <p class="home-editors-desc">
                    Trusted members who add levels, update placements and keep the list accurate. Roles and contact routes are on <router-link to="/information">Information</router-link>.
                </p>
            </section>

        </div>

    </div>

    <Footer />

</main>
    `,
    data: () => ({
        store,
        editors: [],
        recentChanges: [],
        counts: null,
        spotlight: null,
        top1: [],
        hardestVerified: null,
        roleIconMap,
    }),
    computed: {
        // Three things about the list, shared with the phone (js/home-stats.js).
        stats() { return homeStats(this.counts && this.counts.all); },
        // Grouped for the sub-headings, but never reordered inside a group: the
        // e2e test pins editors to the order the database returns.
        editorGroups() {
            return roleGroups
                .map((g) => ({ label: g.label, lead: !!g.lead, editors: this.editors.filter((e) => g.roles.includes(e.role)) }))
                .filter((g) => g.editors.length);
        },
    },
    async mounted() {
        const [editors, recentChanges, list] = await Promise.all([
            fetchEditors(),
            fetchRecentChanges(),
            fetchList(),
        ]);

        this.editors = (editors || []).map((e) => (typeof e === 'string' ? { name: e, role: 'mod', link: '' } : e));
        this.recentChanges = recentChanges || [];

        const levels = (list || []).map(([level]) => level).filter(Boolean);
        if (!levels.length) return;

        this.counts = { all: levels.length };

        const paths = levels.map((l) => l.path);
        const entry = (level, i) => ({
            level,
            rank: i + 1,
            slug: levelSlug(level.path, paths),
            thumbnail: levelThumbnail(level),
            status: levelStatus(level),
            verifier: verifierLine(level),
            decoration: decorationPercent(level),
            progress: verificationPercent(level),
            furthest: verificationLabel(level),
        });

        this.spotlight = entry(levels[0], 0);

        // A level placed above the hardest verified level is projected to be
        // harder than it, so finishing it makes it the new Top 1. Which of them
        // gets there first is the question this lane answers, so they are
        // ordered by how far anyone has got rather than by placement.
        const verifiedAt = levels.findIndex((l) => l.isVerified);
        this.hardestVerified = verifiedAt === -1 ? null : levels[verifiedAt];
        const above = verifiedAt === -1 ? levels : levels.slice(0, verifiedAt);
        this.top1 = above
            .map((level, i) => entry(level, i))
            .filter((e) => !e.level.isVerified)
            .sort((a, b) => b.progress - a.progress)
            .slice(0, TOP1_ROWS);
    },
    methods: {
        roleLabel(role) { return roleLabelMap[role] || role; },
        // A change line already says which way a level moved; the dot only
        // repeats it in colour so the feed can be scanned without reading.
        changeTone(text) {
            const t = String(text || '').toLowerCase();
            if (/\badded\b|\bplaced\b/.test(t)) return 'is-new';
            if (/\braised\b|\bmoved up\b|\bup\b/.test(t)) return 'is-up';
            if (/\blowered\b|\bmoved down\b|\bdown\b|\bremoved\b/.test(t)) return 'is-down';
            return '';
        },
        // Rendered with v-html so **bold** works — everything else is escaped so
        // stored text can never inject markup into the page.
        formatChange(text) {
            const esc = (s) => String(s)
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            return (text || '')
                .split(/(\*\*[^*]+\*\*)/)
                .map(part => part.startsWith('**') && part.endsWith('**')
                    ? `<strong>${esc(part.slice(2, -2))}</strong>`
                    : part ? `<span class="dim">${esc(part)}</span>` : '')
                .join('');
        },
    },
};
