import { store } from '../../main.js';
import { fetchRecentChanges } from '../../content.js';
import { mobileStore } from './mobileStore.js';

const roleIconMap = {
    owner: 'crown',
    admin: 'user-gear',
    seniormod: 'user-shield',
    mod: 'user-lock',
    dev: 'code',
};

const roleLabelMap = { owner: 'Owner', admin: 'Admin', seniormod: 'Sr. Mod', mod: 'Mod', dev: 'Dev' };

export default {
    template: `
        <div class="mob-home-page">

            <!-- Hero -->
            <div class="mob-home-hero">
                <h1>Upcoming Levels List</h1>
                <p>A community-maintained catalogue of upcoming Top 1-100 Extreme Demons in Geometry Dash.</p>
            </div>

            <!-- Actions -->
            <div class="mob-home-actions">
                <div class="mob-home-btn-col">
                    <router-link to="/mobile/all" class="mob-home-btn">View All Levels</router-link>
                    <router-link to="/mobile/main" class="mob-home-btn">Main List</router-link>
                    <router-link to="/mobile/future" class="mob-home-btn">Explore Future List</router-link>
                    <button class="mob-home-btn mob-home-otherpages-btn" @click="showOtherPages = !showOtherPages">
                        Other Pages <span class="mob-home-otherpages-arrow">{{ showOtherPages ? '▲' : '▼' }}</span>
                    </button>
                    <div v-if="showOtherPages" class="mob-home-otherpages-menu">
                        <router-link to="/mobile/leaderboard" class="mob-home-other-btn">Leaderboard</router-link>
                        <router-link to="/mobile/upcoming" class="mob-home-other-btn">Upcoming Levels</router-link>
                        <router-link to="/mobile/pending" class="mob-home-other-btn">Pending List</router-link>
                        <router-link to="/mobile/info" class="mob-home-other-btn">Information</router-link>
                        <router-link to="/mobile/events" class="mob-home-other-btn">Events</router-link>
                        <button class="mob-home-other-btn" @click="mobileStore.openMenu = 'settings'">Settings</button>
                    </div>
                </div>
                <div class="mob-home-social-row">
                    <a href="https://discord.gg/9wVWSgJSe8" target="_blank" class="mob-home-social-btn" title="Discord">
                        <img src="/assets/discord.svg" :style="store.dark ? 'filter:invert(1)' : ''" alt="Discord" />
                    </a>
                    <a href="https://x.com/ull_gd" target="_blank" rel="noopener" class="mob-home-social-btn" title="X (@ull_gd)">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    </a>
                </div>
            </div>

            <!-- Cards -->
            <div class="mob-home-cards">

                <!-- Recent Changes -->
                <div class="mob-info-card">
                    <div class="mob-info-card__title">Recent Changes</div>
                    <div class="mob-home-changes">
                        <template v-if="recentChanges.length">
                            <template v-for="group in recentChanges" :key="group.date">
                                <div class="mob-home-changes-date">{{ group.date }}</div>
                                <div v-for="entry in group.entries" :key="entry" class="mob-home-change" v-html="formatChange(entry)"></div>
                            </template>
                        </template>
                        <p v-else style="opacity:0.4;font-size:0.85rem;padding:0.5rem 0;">No recent changes recorded.</p>
                    </div>
                </div>

                <!-- List Editors -->
                <div class="mob-info-card">
                    <div class="mob-info-card__title">List Editors</div>
                    <div class="mob-info-editors">
                        <div v-for="editor in mobileStore.editors" :key="editor.name" class="mob-info-editor">
                            <img :src="'/assets/' + (roleIconMap[editor.role] || 'user-lock') + (store.dark ? '' : '-dark') + '.svg'" :alt="editor.role" />
                            <a v-if="editor.link && editor.link !== '#'" :href="editor.link" target="_blank">{{ editor.name }}</a>
                            <span v-else>{{ editor.name }}</span>
                            <span class="mob-info-role" :class="'mob-info-role-' + editor.role">{{ roleLabelMap[editor.role] || editor.role }}</span>
                        </div>
                    </div>
                </div>

                <!-- Partner Lists (hidden for now) -->
                <div v-if="false" class="mob-info-card">
                    <div class="mob-info-card__title">Partner Lists</div>
                    <div class="mob-home-partners-grid">
                        <a href="#" target="_blank" class="mob-home-partner">
                            <div class="mob-home-partner-logo"><div class="mob-home-partner-logo-placeholder"></div></div>
                            <div class="mob-home-partner-name">Demonlist</div>
                        </a>
                        <a href="#" target="_blank" class="mob-home-partner">
                            <div class="mob-home-partner-logo"><div class="mob-home-partner-logo-placeholder"></div></div>
                            <div class="mob-home-partner-name">Challenge List</div>
                        </a>
                        <a href="#" target="_blank" class="mob-home-partner">
                            <div class="mob-home-partner-logo"><div class="mob-home-partner-logo-placeholder"></div></div>
                            <div class="mob-home-partner-name">Platformer List</div>
                        </a>
                        <a href="#" target="_blank" class="mob-home-partner">
                            <div class="mob-home-partner-logo"><div class="mob-home-partner-logo-placeholder"></div></div>
                            <div class="mob-home-partner-name">Upcoming List</div>
                        </a>
                    </div>
                </div>

            </div>

            <!-- Footer -->
            <div class="mob-footer">
                <h3>Upcoming Levels List</h3>
                <p>A community-maintained catalogue forecasting the future of the Geometry Dash Demonlist.</p>
                <div class="mob-footer-links">
                    <div class="mob-footer-col">
                        <h4>Navigate</h4>
                        <router-link to="/mobile/all">All Levels</router-link>
                        <router-link to="/mobile/leaderboard">Leaderboard</router-link>
                        <router-link to="/mobile/pending">Pending List</router-link>
                        <router-link to="/mobile/upcoming">Upcoming Levels</router-link>
                    </div>
                    <div class="mob-footer-col">
                        <h4>Community</h4>
                        <a href="https://discord.gg/9wVWSgJSe8" target="_blank">Discord</a>
                        <a href="https://x.com/ull_gd" target="_blank" rel="noopener">X (@ull_gd)</a>
                    </div>
                </div>
                <div class="mob-footer-bottom">
                    <p>&copy; 2024\u20132026 Upcoming Levels List. Not affiliated with RobTop Games or Pointercrate.</p>
                </div>
            </div>
        </div>
    `,
    data: () => ({
        store,
        mobileStore,
        roleIconMap,
        roleLabelMap,
        recentChanges: [],
        showOtherPages: false,
    }),
    async mounted() {
        this.recentChanges = await fetchRecentChanges() || [];
    },
    methods: {
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
