import { store } from '../main.js';
import { mobileStore, applyFilters, resetFilters } from '../pages/mobile/mobileStore.js';

// The chrome every phone screen wears: the top bar, the tab bar, the sheets
// behind Settings, Filters and Other, and the footer. Whatever the route puts
// on screen goes in the slot.
//
// It was the top half of js/pages/Mobile.js until /level/<slug> needed it too.
// That route is the one page in the mobile tree that never redirects — every
// shared link and search result points at it — so it cannot live under
// /mobile/*, and before this it arrived wearing the desktop sidebar and the
// desktop footer instead. Now it wears this, and the two cannot drift apart.
export default {
    template: `
<div class="mob m2 ull2" :class="{ dark: store.dark }">

    <!-- Top bar. The destinations that used to live behind its "Pages" button
         are the tab bar at the bottom now, within reach of a thumb. -->
    <header class="mob-topbar m2-top">
        <router-link to="/mobile/home" class="mob-topbar-logo">
            <span class="m2-top__mark">ULL</span>
            <span class="m2-top__ver">v2.1.0</span>
        </router-link>
        <nav class="m2-top__acts">
            <button class="mob-topbar-btn m2-top__btn" :class="{ active: mobileStore.openMenu === 'settings' }" @click="toggleMenu('settings')" title="Settings">
                <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872l-.1-.34zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z"/></svg>
            </button>
            <a href="https://discord.gg/QRX47v2qyC" target="_blank" class="mob-topbar-btn m2-top__btn" title="Discord">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.3.5c1.6.4 2.9 1 4.1 1.8a13.9 13.9 0 0 0-14.4 0c1.2-.8 2.6-1.4 4.1-1.8L8.6 3a19.8 19.8 0 0 0-4.9 1.4C1.6 8 1 11.5 1.3 15a19.9 19.9 0 0 0 6 3l1.2-1.7c-1-.4-1.9-.9-2.7-1.4l.5-.4a14.2 14.2 0 0 0 11.4 0l.5.4c-.8.5-1.7 1-2.7 1.4l1.2 1.7a19.9 19.9 0 0 0 6-3c.4-4.1-.6-7.6-2.4-10.6ZM8.5 12.9c-1 0-1.7-.9-1.7-1.9s.8-1.9 1.7-1.9 1.8.9 1.7 1.9c0 1-.7 1.9-1.7 1.9Zm7 0c-1 0-1.7-.9-1.7-1.9s.8-1.9 1.7-1.9 1.8.9 1.7 1.9c0 1-.7 1.9-1.7 1.9Z"/></svg>
            </a>
        </nav>
    </header>

    <!-- The page itself, then the footer every mobile page carries. -->
    <div class="mob-content" ref="mobContent">
        <slot></slot>
        <div class="mob-footer">
            <h3>Upcoming Levels List</h3>
            <p>A community-maintained catalogue of the hardest upcoming levels in Geometry Dash.</p>
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
                    <a href="https://discord.gg/QRX47v2qyC" target="_blank">Discord</a>
                    <a href="https://x.com/ull_gd" target="_blank" rel="noopener">X (@ull_gd)</a>
                </div>
            </div>
            <div class="mob-footer-bottom">
                <p>&copy; 2023–2026 Upcoming Levels List. Not affiliated with RobTop Games.</p>
            </div>
        </div>
    </div>
    <!-- Tab bar -->
    <nav class="m2-nav">
        <router-link class="m2-nav__item" :class="{ 'is-on': $route.path === '/mobile/home' }" to="/mobile/home">
            <svg class="m2-nav__ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 6.8 8 2.5l5.5 4.3V13a.9.9 0 0 1-.9.9H3.4a.9.9 0 0 1-.9-.9V6.8Z"/><path d="M6.4 13.9V9.2h3.2v4.7"/></svg>
            Home
        </router-link>
        <router-link class="m2-nav__item" :class="{ 'is-on': isListRoute }" to="/mobile/all">
            <svg class="m2-nav__ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M5.5 4h8M5.5 8h8M5.5 12h8M2.5 4h.01M2.5 8h.01M2.5 12h.01"/></svg>
            Levels
        </router-link>
        <router-link class="m2-nav__item" :class="{ 'is-on': $route.path === '/mobile/info' }" to="/mobile/info">
            <svg class="m2-nav__ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="6.2"/><path d="M8 7.3v4M8 4.9h.01"/></svg>
            Information
        </router-link>
        <button class="m2-nav__item" type="button" :class="{ 'is-on': isOtherRoute || mobileStore.openMenu === 'pages' }" @click="toggleMenu('pages')">
            <svg class="m2-nav__ic" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><circle cx="3.2" cy="8" r="1.3"/><circle cx="8" cy="8" r="1.3"/><circle cx="12.8" cy="8" r="1.3"/></svg>
            Other
        </button>
    </nav>

    <!-- Sheets. The overlay keeps its old class name: it is the scrim, it
         covers the whole viewport, and tapping it closes whatever is open. -->
    <template v-if="mobileStore.openMenu">
        <div class="mob-popup-overlay m2-sheet-scrim" @click="mobileStore.openMenu = null"></div>
        <div class="m2-sheet" @click.stop>
            <div class="m2-sheet__grip"></div>

            <!-- Other pages -->
            <template v-if="mobileStore.openMenu === 'pages'">
                <div class="m2-sheet__head"><h2>Other pages</h2></div>
                <div class="m2-sheet__body m2-pages">
                    <div class="m2-pages__label">Lists</div>
                    <button class="m2-page" :class="{ 'is-on': $route.path === '/mobile/all' }" @click="goPage('all')">All Levels</button>
                    <button class="m2-page" :class="{ 'is-on': $route.path === '/mobile/main' }" @click="goPage('main')">Main List</button>
                    <button class="m2-page" :class="{ 'is-on': $route.path === '/mobile/future' }" @click="goPage('future')">Future List</button>
                    <div class="m2-pages__label">Other</div>
                    <button class="m2-page" :class="{ 'is-on': $route.path === '/mobile/leaderboard' }" @click="goPage('leaderboard')">Leaderboard</button>
                    <button class="m2-page" :class="{ 'is-on': $route.path === '/mobile/upcoming' }" @click="goPage('upcoming')">Upcoming Levels</button>
                    <button class="m2-page" :class="{ 'is-on': $route.path === '/mobile/pending' }" @click="goPage('pending')">Pending List</button>
                    <button class="m2-page" :class="{ 'is-on': $route.path === '/mobile/info' }" @click="goPage('info')">Information</button>
                    <button class="m2-page" :class="{ 'is-on': $route.path === '/mobile/events' }" @click="goPage('events')">Events</button>
                </div>
            </template>

            <!-- Filters -->
            <template v-if="mobileStore.openMenu === 'filters'">
                <div class="m2-sheet__head">
                    <h2>Filters</h2>
                    <span v-if="activeFilterCount" class="u-chip u-chip--round">{{ activeFilterCount }} active</span>
                </div>
                <div class="m2-sheet__body">
                    <div class="m2-nums">
                        <div class="m2-num">
                            <label>Min decoration</label>
                            <input type="number" min="0" max="100" v-model.number="mobileStore.minDecoration" placeholder="0" />
                        </div>
                        <div class="m2-num">
                            <label>Min verification</label>
                            <input type="number" min="0" max="100" v-model.number="mobileStore.minVerification" placeholder="0" />
                        </div>
                    </div>
                    <div class="m2-filters">
                        <template v-for="(item, index) in mobileStore.filtersList" :key="index">
                            <button v-if="!item.separator" class="m2-filter" :class="{ 'is-on': item.active }" @click="toggleFilter(index)">{{ item.name }}</button>
                        </template>
                    </div>
                </div>
                <div class="m2-sheet__foot">
                    <button class="u-btn u-btn--ghost" @click="doResetFilters()">Reset</button>
                    <button class="u-btn" @click="applyFilters(); mobileStore.openMenu = null">Apply filters</button>
                </div>
            </template>

            <!-- Settings -->
            <template v-if="mobileStore.openMenu === 'settings'">
                <div class="m2-sheet__head"><h2>Settings</h2></div>
                <div class="m2-sheet__body mob-settings-list">
                    <div class="m2-setting mob-setting-row">
                        <span class="m2-setting__label mob-setting-label">Thumbnails</span>
                        <div class="m2-toggle mob-toggle">
                            <button :class="{ 'is-on': !mobileStore.showThumbnails, active: !mobileStore.showThumbnails }" @click="setThumbnails(false)">OFF</button>
                            <button :class="{ 'is-on': mobileStore.showThumbnails, active: mobileStore.showThumbnails }" @click="setThumbnails(true)">ON</button>
                        </div>
                    </div>
                    <div class="m2-setting mob-setting-row">
                        <span class="m2-setting__label mob-setting-label">Level Coloring</span>
                        <div class="m2-toggle mob-toggle">
                            <button :class="{ 'is-on': !mobileStore.showColors, active: !mobileStore.showColors }" @click="setColors(false)">OFF</button>
                            <button :class="{ 'is-on': mobileStore.showColors, active: mobileStore.showColors }" @click="setColors(true)">ON</button>
                        </div>
                    </div>
                    <div class="m2-setting mob-setting-row">
                        <span class="m2-setting__label mob-setting-label">Benchmark Mode</span>
                        <div class="m2-toggle mob-toggle">
                            <button :class="{ 'is-on': !mobileStore.benchmarkMode, active: !mobileStore.benchmarkMode }" @click="setBenchmarkMode(false)">OFF</button>
                            <button :class="{ 'is-on': mobileStore.benchmarkMode, active: mobileStore.benchmarkMode }" @click="setBenchmarkMode(true)">ON</button>
                        </div>
                    </div>
                    <div class="m2-setting mob-setting-row">
                        <span class="m2-setting__label mob-setting-label">Theme</span>
                        <div class="m2-toggle mob-toggle">
                            <button :class="{ 'is-on': !store.dark, active: !store.dark }" @click="store.dark && store.toggleDark()">Dark</button>
                            <button :class="{ 'is-on': store.dark, active: store.dark }" @click="store.dark || store.toggleDark()">Light</button>
                        </div>
                    </div>
                </div>
                <div class="m2-sheet__foot">
                    <a href="https://x.com/ull_gd" target="_blank" rel="noopener" class="u-btn u-btn--ghost">Follow @ull_gd</a>
                    <a href="https://discord.gg/QRX47v2qyC" target="_blank" class="u-btn">Contact support</a>
                </div>
            </template>
        </div>
    </template>

</div>
    
    `,
    data: () => ({
        store,
        mobileStore,
    }),
    computed: {
        // Levels covers the three list pages and a level's own page, which is
        // reached from them; Other covers everything that opens from its sheet.
        isListRoute() {
            return ['/mobile/all', '/mobile/main', '/mobile/future'].includes(this.$route.path)
                || this.$route.path.startsWith('/level/');
        },
        isOtherRoute() {
            return ['/mobile/leaderboard', '/mobile/upcoming', '/mobile/pending', '/mobile/events'].includes(this.$route.path);
        },
        activeFilterCount() {
            return mobileStore.filtersList.filter((f) => !f.separator && f.active).length;
        },
    },
    watch: {
        '$route'() {
            this.$nextTick(() => {
                if (this.$refs.mobContent) this.$refs.mobContent.scrollTop = 0;
            });
        },
    },
    methods: {
        applyFilters,
        toggleMenu(name) { mobileStore.openMenu = mobileStore.openMenu === name ? null : name; },
        goPage(page) { this.$router.push('/mobile/' + page); mobileStore.openMenu = null; },
        toggleFilter(index) {
            if (mobileStore.filtersList[index].separator) return;
            mobileStore.filtersList[index].active = !mobileStore.filtersList[index].active;
        },
        doResetFilters() { resetFilters(); mobileStore.openMenu = null; },
        // Each of these is one setting under two names: the phone reads
        // mobileStore, the desktop reads store, and both persist under the
        // desktop's key so a choice made on one surface holds on the other.
        setThumbnails(value) {
            mobileStore.showThumbnails = value;
            store.thumbnails = value;
            store.saveSetting('thumbnails', value);
        },
        setColors(value) {
            mobileStore.showColors = value;
            store.levelColoring = value;
            store.saveSetting('levelColoring', value);
        },
        setBenchmarkMode(value) {
            store.benchmarkMode = value;
            mobileStore.benchmarkMode = value;
            store.saveSetting('benchmarkMode', value);
            applyFilters();
        },
    },
};
