import { store } from '../main.js';

export default {
    name: 'Sidebar',
    emits: ['open-settings'],
    data: () => ({ store }),
    template: `
        <aside class="pc-sidebar">
            <a class="pc-sidebar-logo" href="#/">
                <div class="pc-sidebar-logo-inner">
                    <span class="pc-sidebar-logo-text">ULL</span>
                    <span class="pc-sidebar-logo-ver">v1.2.0</span>
                </div>
            </a>
            <nav class="pc-sidebar-nav">
                <div class="pc-sidebar-section">Lists</div>
                <router-link class="pc-sidebar-link" to="/">All Levels</router-link>
                <router-link class="pc-sidebar-link" to="/listmain">Main List</router-link>
                <router-link class="pc-sidebar-link" to="/listfuture">Future List</router-link>
                <div class="pc-sidebar-section">Other</div>
                <router-link class="pc-sidebar-link" to="/leaderboard">Leaderboard</router-link>
                <router-link class="pc-sidebar-link" to="/upcoming">Upcoming Levels</router-link>
                <router-link class="pc-sidebar-link" to="/pending">Pending List</router-link>
                <router-link class="pc-sidebar-link" to="/information">Information</router-link>
            </nav>
            <div class="pc-sidebar-bottom">
                <button class="pc-sidebar-bottom-btn" @click="$emit('open-settings')">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
                    </svg>
                    Settings
                </button>
                <a class="pc-sidebar-bottom-btn" href="https://discord.gg/9wVWSgJSe8" target="_blank">
                    <img src="/assets/discord.svg" width="17" height="17" :style="!store.dark ? 'filter:invert(1)' : ''" alt="Discord" />
                </a>
            </div>
        </aside>
    `,
};
