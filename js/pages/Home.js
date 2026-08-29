import { store } from '../main.js';
import { fetchEditors, fetchRecentChanges } from '../content.js';
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
    seniormod: 'Sr. Mod',
    mod: 'Mod',
    dev: 'Dev',
};

export default {
    components: { Footer },
    template: `
<main class="home-page surface">

    <!-- ── HERO ── -->
    <section class="home-hero">
        <div class="home-hero-content">
            <h1 class="home-hero-title">Upcoming Levels List</h1>
            <p class="home-hero-desc">
                Upcoming Levels List (ULL) is a community-mantained catalogue of upcoming Top 1-100 Extreme Demons in Geometry Dash projected to place on the Demonlist. It aims to forecast future rankings with the inclusion of worthy unrates.
            </p>
            <div class="home-hero-actions">
                <router-link to="/list" class="home-btn home-btn--primary">View All Levels</router-link>
                <router-link to="/listfuture" class="home-btn home-btn--primary">Explore Future List</router-link>
                <router-link to="/information" class="home-btn home-btn--primary">Learn More</router-link>
            </div>
            <div class="home-hero-social">
                <a href="https://discord.gg/QRX47v2qyC" target="_blank" class="home-social-btn">
                    <img src="/assets/discord.svg" :style="store.dark ? 'filter:invert(1)' : ''" alt="Discord" />
                    Discord
                </a>
                <a href="https://x.com/ull_gd" target="_blank" rel="noopener" class="home-social-btn">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    X
                </a>
            </div>
        </div>
    </section>

    <!-- ── CONTENT ── -->
    <div class="home-content">

        <!-- Row 1: Recent Changes + List Editors -->
        <div class="home-grid-2col">

            <!-- Recent Changes -->
            <div class="home-card home-card--scroll">
                <div class="home-card__title">Recent Changes</div>
                <div class="home-changes">
                    <template v-if="recentChanges.length">
                        <template v-for="group in recentChanges" :key="group.date">
                            <div class="home-changes-date">{{ group.date }}</div>
                            <div v-for="entry in group.entries" :key="entry" class="home-change" v-html="formatChange(entry)"></div>
                        </template>
                    </template>
                    <p v-else style="opacity:0.4;font-size:0.85rem;padding:0.5rem 0;">No recent changes recorded.</p>
                </div>
            </div>

            <!-- List Editors -->
            <div class="home-card">
                <div class="home-card__title">List Editors</div>
                <p class="home-editors-desc">Trusted members responsible for maintaining the Upcoming Levels List — adding levels, updating placements, and keeping the list accurate.</p>
                <div class="info-editors">
                    <div v-for="editor in editors" :key="editor.name" class="info-editor">
                        <img :src="'/assets/' + (roleIconMap[editor.role] || 'user-lock') + (store.dark ? '' : '-dark') + '.svg'" :alt="editor.role" />
                        <a v-if="editor.link && editor.link !== '#'" :href="editor.link" target="_blank">{{ editor.name }}</a>
                        <span v-else class="info-editor__name">{{ editor.name }}</span>
                        <span class="info-role" :class="'info-role-' + editor.role">{{ roleLabel(editor.role) }}</span>
                    </div>
                </div>
            </div>

        </div>

        <!-- Partner Lists (hidden for now) -->
        <div v-if="false" class="home-card">
            <div class="home-card__title">Partner Lists</div>
            <div class="home-partners-grid">
                <a href="#" target="_blank" class="home-partner">
                    <div class="home-partner-logo"><div class="home-partner-logo-placeholder"></div></div>
                    <div class="home-partner-name">Global Demonlist</div>
                    <div class="home-partner-desc">The best ranking of the hardest Geometry Dash extreme demons.</div>
                </a>
                <a href="#" target="_blank" class="home-partner">
                    <div class="home-partner-logo"><div class="home-partner-logo-placeholder"></div></div>
                    <div class="home-partner-name">The Shitty List</div>
                    <div class="home-partner-desc">A community-run list tracking all Shitty-styled levels.</div>
                </a>
                <a href="#" target="_blank" class="home-partner">
                    <div class="home-partner-logo"><div class="home-partner-logo-placeholder"></div></div>
                    <div class="home-partner-name">Hardest Achievements List</div>
                    <div class="home-partner-desc">Ranking the hardest achievements ever done in Geometry Dash.</div>
                </a>
                <a href="#" target="_blank" class="home-partner">
                    <div class="home-partner-logo"><div class="home-partner-logo-placeholder"></div></div>
                    <div class="home-partner-name">Pemonlist</div>
                    <div class="home-partner-desc">The list ranking the hardest platformer extreme demons.</div>
                </a>
            </div>
        </div>

    </div>

    <Footer />

</main>
    `,
    data: () => ({
        store,
        editors: [],
        recentChanges: [],
        roleIconMap,
    }),
    async mounted() {
        [this.editors, this.recentChanges] = await Promise.all([
            fetchEditors(),
            fetchRecentChanges(),
        ]);
        if (!this.editors) this.editors = [];
        if (!this.recentChanges) this.recentChanges = [];
        this.editors = this.editors.map(e => typeof e === 'string' ? { name: e, role: 'mod', link: '' } : e);
    },
    methods: {
        roleLabel(role) { return roleLabelMap[role] || role; },
        // Rendered with v-html so **bold** works — everything else is escaped so
        // stored text can never inject markup into the page.
        formatChange(text) {
            const esc = (s) => String(s)
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            const html = (text || '')
                .split(/(\*\*[^*]+\*\*)/)
                .map(part => part.startsWith('**') && part.endsWith('**')
                    ? `<strong>${esc(part.slice(2, -2))}</strong>`
                    : part ? `<span class="dim">${esc(part)}</span>` : '')
                .join('');
            return `<span class="dim">— </span>${html}`;
        },
    },
};
