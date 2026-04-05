import { store } from "../main.js";
import { embed, filtersList } from "../util.js";
import { fetchEditors, fetchList, fetchPending } from "../content.js";
import { recordScore } from "../formulas.js";
import Spinner from "../components/Spinner.js";

const roleIconMap = {
    owner: 'crown',
    admin: 'user-gear',
    seniormod: 'user-shield',
    mod: 'user-lock',
    dev: 'code',
};

export default {
    components: { Spinner },
    template: `
<component :is="'style'">
.mob, .mob * { font-family: "Lexend Deca", sans-serif; } .mob { display: flex; flex-direction: column; height: 100%; background-color: var(--color-background); color: var(--color-on-background); }

/* ── Headers ── */
.mob-header1 {
    display: flex; align-items: center;
    padding: 0 1rem; height: 3.825rem; flex-shrink: 0;
    background: linear-gradient(135deg, var(--color-primary) 0%, color-mix(in srgb, var(--color-primary) 65%, white) 100%);
    color: var(--color-on-primary);
}
.mob-header1 .logo { display: flex; align-items: flex-end; gap: 0; }
.mob-header1 .logo h2 { font-size: 28px; font-weight: 700; line-height: 1; margin-bottom: 0; }
.mob-header1 .logo p { font-size: 11px; font-weight: 500; opacity: 0.8; margin-left: 10px; line-height: 1; margin-bottom: 0; }

.mob-header2 {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 0.75rem; height: 3.5rem; flex-shrink: 0;
    background-color: var(--color-on-background); color: var(--color-background);
    position: relative; z-index: 100;
}
.mob-header2-left { display: flex; gap: 0.25rem; }
.mob-tab-btn {
    background: none; border: none; cursor: pointer;
    font-family: "Lexend Deca", sans-serif; font-size: 15px; font-weight: 500;
    color: inherit; padding: 0.5rem 0.75rem; border-radius: 0.4rem;
    transition: background-color 100ms;
}
.mob-tab-btn:hover, .mob-tab-btn.active { background-color: rgba(128,128,128,0.2); }
.mob-discord-btn {
    background: none; border: none; cursor: pointer;
    width: 2.5rem; height: 2.5rem; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    transition: background-color 100ms;
}
.mob-discord-btn:hover { background-color: rgba(128,128,128,0.2); }
.mob-discord-btn img { height: 1.125rem; }

/* ── Popups ── */
.mob-popup-overlay {
    position: fixed; inset: 0; z-index: 200;
    background: rgba(0,0,0,0.4);
}
.mob-popup {
    position: absolute; top: calc(3.825rem + 3.5rem); left: 0; right: 0;
    background: var(--color-background); color: var(--color-on-background);
    border-top: 2px solid var(--color-primary);
    padding: 1.25rem 1rem 3.5rem; z-index: 201;
    max-height: 75vh; overflow-y: auto;
}

/* Pages popup */
.mob-pages-grid { display: flex; flex-direction: column; gap: 1.5rem; }
.mob-pages-col h4 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.6; margin-bottom: 0.75rem; }
.mob-page-link {
    display: block; width: 100%; text-align: left; background: none; border: none;
    cursor: pointer; font-family: "Lexend Deca", sans-serif; font-size: 16px;
    font-weight: 500; color: inherit; padding: 0.6rem 0;
    border-bottom: 1px solid rgba(128,128,128,0.15);
    transition: color 100ms;
}
.mob-page-link:last-child { border-bottom: none; }
.mob-page-link.active { color: var(--color-primary); font-weight: 700; }
.mob-page-link:hover { color: var(--color-primary); }

/* Filters popup */
.mob-filters-popup { display: flex; flex-direction: column; gap: 0.5rem; }
.mob-filters-nums { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem; }
.mob-filter-num-group { display: flex; flex-direction: column; gap: 0.35rem; }
.mob-filter-num-group label { font-size: 12px; font-weight: 500; opacity: 0.7; }
.mob-filter-num-group input {
    padding: 0.5rem; border-radius: 4px;
    border: 1px solid rgba(128,128,128,0.3);
    background: rgba(128,128,128,0.08); color: inherit;
    font-family: "Lexend Deca", sans-serif; font-size: 14px;
}
.mob-filter-separator { height: 1px; background: rgba(128,128,128,0.25); margin: 0.35rem 0; }
.mob-filter-tag {
    display: flex; align-items: center; gap: 0.6rem; padding: 0.3rem 0.4rem;
    cursor: pointer; border-radius: 0.3rem; font-size: 15px; font-weight: 500;
    transition: background-color 100ms;
}
.mob-filter-tag:hover { background: rgba(128,128,128,0.12); }
.mob-filter-tag .mob-check { width: 1.1rem; height: 1.1rem; border: 2px solid rgba(128,128,128,0.5); border-radius: 3px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 100ms; }
.mob-filter-tag.active .mob-check { background: var(--color-primary); border-color: var(--color-primary); }
.mob-filter-tag.active .mob-check::after { content: "✓"; color: white; font-size: 11px; line-height: 1; }
.mob-filter-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-top: 1rem; }
.mob-filter-actions button {
    padding: 0.75rem; border: none; border-radius: 0.4rem; cursor: pointer;
    font-family: "Lexend Deca", sans-serif; font-size: 15px; font-weight: 500;
}
.mob-filter-apply { background: var(--color-primary); color: var(--color-on-primary); }
.mob-filter-reset { background: rgba(128,128,128,0.2); color: inherit; }

/* Settings popup */
.mob-settings-list { display: flex; flex-direction: column; gap: 0.5rem; }
.mob-setting-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0.85rem 0; border-bottom: 1px solid rgba(128,128,128,0.15);
}
.mob-setting-row:last-child { border-bottom: none; }
.mob-setting-label { font-size: 16px; font-weight: 500; }
.mob-toggle {
    display: flex; border-radius: 0.35rem; overflow: hidden;
    border: 1px solid rgba(128,128,128,0.3);
}
.mob-toggle button {
    padding: 0.4rem 0.85rem; border: none; cursor: pointer;
    font-family: "Lexend Deca", sans-serif; font-size: 14px; font-weight: 500;
    background: transparent; color: inherit; transition: all 100ms;
}
.mob-toggle button.active { background: var(--color-primary); color: var(--color-on-primary); }
.mob-contact-btn {
    width: 100%; padding: 0.85rem; border: none; border-radius: 0.4rem; cursor: pointer;
    background: #5865F2; color: white;
    font-family: "Lexend Deca", sans-serif; font-size: 15px; font-weight: 500;
    display: flex; align-items: center; justify-content: center; gap: 0.5rem;
    margin-top: 0.5rem; text-decoration: none;
}
.mob-contact-btn img { height: 1.2rem; filter: brightness(0) invert(1); }

/* ── Page content ── */
.mob-content { flex: 1; overflow-y: auto; }

/* List page */
.mob-list { display: flex; flex-direction: column; }
.mob-search {
    margin: 0.75rem; padding: 0.65rem 0.85rem;
    background: rgba(128,128,128,0.08); color: var(--color-on-background);
    border: 1px solid rgba(128,128,128,0.25); border-radius: 0.4rem;
    font-family: "Lexend Deca", sans-serif; font-size: 15px;
    box-sizing: border-box; width: calc(100% - 1.5rem);
}
.mob-search:focus { outline: 2px solid var(--color-primary); }

.mob-level-row { border-bottom: 1px solid rgba(128,128,128,0.15); }
.mob-level-btn {
    display: flex; align-items: center; gap: 0.75rem;
    width: 100%; background: none; border: none; cursor: pointer;
    padding: 0.6rem 0.75rem; color: inherit; text-align: left;
    transition: background-color 100ms;
}
.mob-level-btn:hover { background: rgba(128,128,128,0.08); }
.mob-level-btn.active {
    background: linear-gradient(135deg, var(--color-primary) 0%, color-mix(in srgb, var(--color-primary) 62%, white) 100%);
    color: var(--color-on-primary);
}
.mob-rank { font-size: 13px; font-weight: 500; opacity: 0.6; min-width: 2.5rem; text-align: right; flex-shrink: 0; }
.mob-thumb { width: 5.33rem; height: 3rem; object-fit: cover; border-radius: 0.3rem; flex-shrink: 0; background: #333; }
.mob-level-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.15rem; }
.mob-level-name { font-size: 16px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mob-level-sub { font-size: 12px; opacity: 0.65; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Dropdown detail */
.mob-level-detail {
    padding: 1rem 0.75rem 1.25rem;
    background: rgba(128,128,128,0.05);
    border-top: 1px solid rgba(128,128,128,0.1);
}
.mob-author-block { display: flex; flex-direction: column; gap: 0.3rem; margin-bottom: 0.5rem; }
.mob-author-row { display: flex; gap: 0.5rem; align-items: baseline; }
.mob-author-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; opacity: 0.55; flex-shrink: 0; }
.mob-author-value { font-size: 13px; font-weight: 500; }
.mob-tags { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-bottom: 0.75rem; }
.mob-tag { font-size: 12px; background: #5d5d5d; color: white; border-radius: 10px; padding: 3px 8px; }
.mob-video { width: 100%; aspect-ratio: 16/9; margin: 0.75rem 0; border-radius: 0.4rem; }
.mob-stats { display: flex; gap: 1rem; justify-content: space-around; text-align: center; margin-top: 0.75rem; }
.mob-stat dt { font-size: 11px; font-weight: 700; text-transform: uppercase; opacity: 0.6; }
.mob-stat dd { font-size: 15px; font-weight: 500; margin-top: 0.2rem; }
.mob-wr { font-size: 14px; font-weight: 500; margin-bottom: 0.4rem; }
.mob-wr a { text-decoration: underline; }
.mob-status { font-size: 14px; font-weight: 500; opacity: 0.75; margin-bottom: 0.5rem; }
.mob-showcase-tabs { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }
.mob-showcase-tab {
    padding: 0.4rem 1rem; border: none; border-radius: 0.35rem; cursor: pointer;
    font-family: "Lexend Deca", sans-serif; font-size: 14px; font-weight: 500;
    background: rgba(128,128,128,0.15); color: inherit; transition: all 100ms;
}
.mob-showcase-tab.active { background: var(--color-primary); color: var(--color-on-primary); }

/* Leaderboard */
.mob-lb-sub { font-size: 13px; opacity: 0.65; }

/* Pending */
.mob-pending-section { padding: 1rem 0.75rem; }
.mob-pending-section h3 { font-size: 18px; font-weight: 700; margin-bottom: 0.75rem; }
.mob-pending-row {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0.65rem 0; border-bottom: 1px solid rgba(128,128,128,0.12);
    font-size: 15px; font-weight: 500;
}
.mob-pending-row:last-child { border-bottom: none; }
.mob-pending-row img { height: 1.5rem; width: 1.5rem; flex-shrink: 0; }

/* Information */
.mob-info { padding: 1.25rem 0.75rem; display: flex; flex-direction: column; gap: 2rem; }
.mob-info h3 { font-size: 18px; font-weight: 700; margin-bottom: 0.75rem; }
.mob-legend-list { display: flex; flex-direction: column; gap: 0.6rem; }
.mob-legend-row { display: flex; align-items: center; gap: 0.6rem; font-size: 14px; font-weight: 500; }
.mob-legend-dot { width: 0.65rem; height: 0.65rem; border-radius: 50%; flex-shrink: 0; }
.mob-pending-legend { display: flex; flex-direction: column; gap: 0.5rem; }
.mob-pending-legend-row { display: flex; align-items: center; gap: 0.6rem; font-size: 14px; font-weight: 500; }
.mob-editors-list { display: flex; flex-direction: column; gap: 0.5rem; }
.mob-editor-row { display: flex; align-items: center; gap: 0.6rem; font-size: 14px; font-weight: 500; }
.mob-editor-row img { height: 1.3rem; width: 1.3rem; flex-shrink: 0; }
.mob-editor-row a:hover { text-decoration: underline; }
.mob-guidelines { font-size: 13px; line-height: 1.6; opacity: 0.85; }
.mob-guidelines p { font-size: 13px; line-height: 1.6; margin-bottom: 0.4rem; }
</component>

<div class="mob" :class="{ dark: store.dark }">

    <!-- Header 1 -->
    <header class="mob-header1">
        <div class="logo">
            <h2>ULL</h2>
            <p>v1.2.0</p>
        </div>
    </header>

    <!-- Header 2 -->
    <div class="mob-header2">
        <div class="mob-header2-left">
            <button class="mob-tab-btn" :class="{ active: openMenu === 'pages' }" @click="toggleMenu('pages')">Pages</button>
            <button v-if="currentPage !== 'pending'" class="mob-tab-btn" :class="{ active: openMenu === 'filters' }" @click="toggleMenu('filters')">Filters</button>
            <button class="mob-tab-btn" :class="{ active: openMenu === 'settings' }" @click="toggleMenu('settings')">Settings</button>
        </div>
        <a href="https://discord.gg/9wVWSgJSe8" target="_blank" class="mob-discord-btn">
            <img src="/assets/discord.svg" alt="Discord" :style="!store.dark ? 'filter:invert(1)' : ''" />
        </a>
    </div>

    <!-- Popup overlay -->
    <div v-if="openMenu" class="mob-popup-overlay" @click="openMenu = null">
        <div class="mob-popup" @click.stop>

            <!-- Pages -->
            <div v-if="openMenu === 'pages'" class="mob-pages-grid">
                <div class="mob-pages-col">
                    <h4>Lists</h4>
                    <button class="mob-page-link" :class="{ active: currentPage === 'all' }" @click="goPage('all')">All Levels</button>
                    <button class="mob-page-link" :class="{ active: currentPage === 'main' }" @click="goPage('main')">Main List</button>
                    <button class="mob-page-link" :class="{ active: currentPage === 'future' }" @click="goPage('future')">Future List</button>
                </div>
                <div class="mob-pages-col">
                    <h4>Other</h4>
                    <button class="mob-page-link" :class="{ active: currentPage === 'leaderboard' }" @click="goPage('leaderboard')">Leaderboard</button>
                    <button class="mob-page-link" :class="{ active: currentPage === 'upcoming' }" @click="goPage('upcoming')">Upcoming Levels</button>
                    <button class="mob-page-link" :class="{ active: currentPage === 'pending' }" @click="goPage('pending')">Pending List</button>
                    <button class="mob-page-link" :class="{ active: currentPage === 'info' }" @click="goPage('info')">Information</button>
                </div>
            </div>

            <!-- Filters -->
            <div v-if="openMenu === 'filters'" class="mob-filters-popup">
                <div class="mob-filters-nums">
                    <div class="mob-filter-num-group">
                        <label>Min Decoration %</label>
                        <input type="number" min="0" max="100" v-model.number="minDecoration" placeholder="0" />
                    </div>
                    <div class="mob-filter-num-group">
                        <label>Min Verification %</label>
                        <input type="number" min="0" max="100" v-model.number="minVerification" placeholder="0" />
                    </div>
                </div>
                <template v-for="(item, index) in filtersList" :key="index">
                    <div v-if="item.separator" class="mob-filter-separator"></div>
                    <div v-else class="mob-filter-tag" :class="{ active: item.active }" @click="toggleFilter(index)">
                        <div class="mob-check"></div>
                        {{ item.name }}
                    </div>
                </template>
                <div class="mob-filter-actions">
                    <button class="mob-filter-apply" @click="applyFilters(); openMenu = null">Apply Filters</button>
                    <button class="mob-filter-reset" @click="resetFilters()">Reset Filters</button>
                </div>
            </div>

            <!-- Settings -->
            <div v-if="openMenu === 'settings'" class="mob-settings-list">
                <div class="mob-setting-row">
                    <span class="mob-setting-label">Thumbnails</span>
                    <div class="mob-toggle">
                        <button :class="{ active: !showThumbnails }" @click="showThumbnails = false">OFF</button>
                        <button :class="{ active: showThumbnails }" @click="showThumbnails = true">ON</button>
                    </div>
                </div>
                <div class="mob-setting-row">
                    <span class="mob-setting-label">Level Coloring</span>
                    <div class="mob-toggle">
                        <button :class="{ active: !showColors }" @click="showColors = false">OFF</button>
                        <button :class="{ active: showColors }" @click="showColors = true">ON</button>
                    </div>
                </div>
                <div class="mob-setting-row">
                    <span class="mob-setting-label">Theme</span>
                    <div class="mob-toggle">
                        <button :class="{ active: !store.dark }" @click="store.dark && store.toggleDark()">Dark</button>
                        <button :class="{ active: store.dark }" @click="store.dark || store.toggleDark()">Light</button>
                    </div>
                </div>
                <a href="https://discord.gg/9wVWSgJSe8" target="_blank" class="mob-contact-btn">
                    <img src="/assets/discord.svg" /> Contact Support
                </a>
            </div>

        </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="mob-content" style="display:flex;align-items:center;justify-content:center;">
        <Spinner />
    </div>

    <!-- Content -->
    <div v-else class="mob-content">

        <!-- LIST PAGES (all / main / future) -->
        <div v-if="currentPage === 'all' || currentPage === 'main' || currentPage === 'future'" class="mob-list">
            <input v-model="search" @input="applyFilters()" class="mob-search" type="text" placeholder="Search levels..." />
            <div v-for="([level, err], i) in displayList" :key="i" class="mob-level-row" v-show="!level?.isHidden">
                <button class="mob-level-btn" :class="{ active: selected === i }" @click="selected = selected === i ? -1 : i">
                    <span class="mob-rank" :style="showColors ? getLevelNameStyle(level, selected === i) : {}">
                        <span v-if="i + 1 <= 500">#{{ i + 1 }}</span>
                        <span v-else>{{ currentPage === 'all' ? 'Londenberg' : currentPage === 'main' ? 'Leg' : 'Legacy' }}</span>
                    </span>
                    <img v-if="showThumbnails && level" class="mob-thumb" :src="getThumbnail(level)" alt="" />
                    <div class="mob-level-info">
                        <div class="mob-level-name" :style="showColors ? getLevelNameStyle(level, selected === i) : {fontWeight: level?.isVerified ? 'bold' : 'normal', color: level?.isVerified ? (selected === i ? (!store.dark ? '#ffffff' : '#000000') : '#bbbbbb') : ''}">
                            {{ level?.name ? (showColors && isOldLevel(level) && !level?.isVerified ? level.name + ' 🚫' : level.name) : \`Error (\${err}.json)\` }}
                        </div>
                        <div class="mob-level-sub" v-if="level">
                            {{ level.author }} · {{ level.verifier }}
                        </div>
                    </div>
                </button>
                <!-- Dropdown detail -->
                <div v-if="selected === i && level" class="mob-level-detail">
                    <div class="mob-author-block">
                        <div class="mob-author-row"><span class="mob-author-label">Level Author</span><span class="mob-author-value">{{ level.author }}</span></div>
                        <div class="mob-author-row" v-if="level.creators && level.creators.length"><span class="mob-author-label">Creators</span><span class="mob-author-value">{{ level.creators.join(', ') }}</span></div>
                        <div class="mob-author-row"><span class="mob-author-label">{{ level.isVerified ? 'Verified by' : 'To be verified by' }}</span><span class="mob-author-value">{{ level.verifier }}</span></div>
                    </div>
                    <div class="mob-tags" v-if="level.tags && level.tags.length">
                        <span v-for="tag in level.tags" class="mob-tag">{{ tag }}</span>
                    </div>
                    <div class="mob-status">
                        <template v-if="level.isVerified">Status: Verified</template>
                        <template v-else-if="level.percentFinished == 0">Status: Layout</template>
                        <template v-else-if="level.percentFinished == 100">Status: Being Verified</template>
                        <template v-else>Status: Decoration {{ level.percentFinished }}% done</template>
                    </div>
                    <div v-if="!level.isVerified && level.records[0].percent != 100">
                        <div v-if="level.records[0].percent != 0" class="mob-wr">
                            WR From 0: <a v-if="level.records[0].link && level.records[0].link != '#'" :href="level.records[0].link" target="_blank">{{ level.records[0].percent }}% by {{ level.records[0].user }}</a><template v-else>{{ level.records[0].percent }}% by {{ level.records[0].user }}</template>
                        </div>
                        <div v-else class="mob-wr">WR From 0: None</div>
                        <div v-if="level.run[0].percent != '0'" class="mob-wr">
                            WR Run: <a v-if="level.run[0].link && level.run[0].link != '#'" :href="level.run[0].link" target="_blank">{{ level.run[0].percent }}% by {{ level.run[0].user }}</a><template v-else>{{ level.run[0].percent }}% by {{ level.run[0].user }}</template>
                        </div>
                        <div v-else class="mob-wr">WR Run: None</div>
                    </div>
                    <div v-if="!level.isVerified && level.records[0].percent == 100" class="mob-wr">
                        Layout verified by {{ level.records[0].user }}
                    </div>
                    <div v-if="level.isVerified" class="mob-showcase-tabs">
                        <button class="mob-showcase-tab" :class="{ active: toggledShowcase }" @click="toggledShowcase = true">Showcase</button>
                        <button class="mob-showcase-tab" :class="{ active: !toggledShowcase }" @click="toggledShowcase = false">Verification</button>
                    </div>
                    <iframe class="mob-video" :src="getVideo(level)" frameborder="0" allowfullscreen></iframe>
                    <div class="mob-stats">
                        <dl class="mob-stat"><dt>ID</dt><dd>{{ (level.id === 'private' && level.leakID != null) ? level.leakID : level.id }}</dd></dl>
                        <dl class="mob-stat"><dt>Length</dt><dd>{{ Math.floor(level.length/60) }}m {{ level.length%60 }}s</dd></dl>
                        <dl class="mob-stat"><dt>Updated</dt><dd>{{ level.lastUpd }}</dd></dl>
                    </div>
                </div>
            </div>
        </div>

        <!-- LEADERBOARD (Player Rankings) -->
        <div v-if="currentPage === 'leaderboard'" class="mob-list">
            <input v-model="playerSearch" class="mob-search" type="text" placeholder="Search players..." />
            <div v-for="(player, i) in filteredPlayers" :key="player.name" class="mob-level-row">
                <button class="mob-level-btn" :class="{ active: playerSelected === i }" @click="playerSelected = playerSelected === i ? -1 : i">
                    <span class="mob-rank">#{{ player.globalRank }}</span>
                    <div class="mob-level-info">
                        <div class="mob-level-name">{{ player.name }}</div>
                        <div class="mob-level-sub">Score: {{ player.total.toFixed(3) }}</div>
                    </div>
                </button>
                <div v-if="playerSelected === i" class="mob-level-detail">
                    <div style="font-size:15px;font-weight:600;margin-bottom:0.75rem;">Records ({{ player.records.length }})</div>
                    <div v-for="rec in player.records" :key="rec.levelName + rec.percent + rec.type" style="display:flex;align-items:center;justify-content:space-between;padding:0.4rem 0;border-bottom:1px solid rgba(128,128,128,0.1);font-size:14px;">
                        <div style="display:flex;align-items:center;gap:0.4rem;">
                            <span style="font-weight:700;color:gray;font-size:12px;">+{{ rec.score.toFixed(3) }}</span>
                            <span style="font-weight:500;">{{ rec.levelName }}</span>
                            <span style="opacity:0.5;font-size:12px;">#{{ rec.levelRank }}</span>
                        </div>
                        <span v-if="rec.type === 'verification'" style="font-weight:500;">Verification</span>
                        <span v-else-if="rec.type === 'run'" style="font-weight:500;">{{ rec.displayPercent }}%</span>
                        <span v-else style="font-weight:500;">{{ rec.percent }}%</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- UPCOMING LEVELS (old leaderboard) -->
        <div v-if="currentPage === 'upcoming'" class="mob-list">
            <div v-for="([level, err], i) in lbList" :key="i" class="mob-level-row">
                <button class="mob-level-btn" :class="{ active: lbSelected === i }" @click="lbSelected = lbSelected === i ? -1 : i">
                    <span class="mob-rank">#{{ i + 1 }}</span>
                    <img v-if="showThumbnails && level" class="mob-thumb" :src="getThumbnail(level)" alt="" />
                    <div class="mob-level-info">
                        <div class="mob-level-name" :style="showColors ? getLevelNameStyle(level, lbSelected === i) : {}">{{ level?.name || \`Error (\${err}.json)\` }}</div>
                        <div class="mob-level-sub" v-if="level">
                            <template v-if="getLbBestRecord(level)">WR: {{ getLbBestRecord(level).percent }}%</template>
                            <template v-if="getLbBestRecord(level) && getLbBestRun(level)"> · </template>
                            <template v-if="getLbBestRun(level)">Run: {{ getLbBestRun(level).percent }}%</template>
                        </div>
                    </div>
                </button>
                <div v-if="lbSelected === i && level" class="mob-level-detail">
                    <div class="mob-author-block">
                        <div class="mob-author-row"><span class="mob-author-label">Level Author</span><span class="mob-author-value">{{ level.author }}</span></div>
                        <div class="mob-author-row" v-if="level.creators && level.creators.length"><span class="mob-author-label">Creators</span><span class="mob-author-value">{{ level.creators.join(', ') }}</span></div>
                    </div>
                    <div v-if="getLbBestRecord(level)" class="mob-wr">
                        Best from 0: <a v-if="getLbBestRecord(level).link && getLbBestRecord(level).link != '#'" :href="getLbBestRecord(level).link" target="_blank" style="color:#00b825;text-decoration:underline;">{{ getLbBestRecord(level).percent }}%</a><template v-else><span style="color:#00b825;">{{ getLbBestRecord(level).percent }}%</span></template> by {{ getLbBestRecord(level).user }}
                    </div>
                    <div v-if="getLbBestRun(level)" class="mob-wr">
                        Best run: <a v-if="getLbBestRun(level).link && getLbBestRun(level).link != '#'" :href="getLbBestRun(level).link" target="_blank" style="color:#00b825;text-decoration:underline;">{{ getLbBestRun(level).percent }}%</a><template v-else><span style="color:#00b825;">{{ getLbBestRun(level).percent }}%</span></template> by {{ getLbBestRun(level).user }}
                    </div>
                    <iframe class="mob-video" :src="getVideo(level)" frameborder="0" allowfullscreen></iframe>
                </div>
            </div>
        </div>

        <!-- PENDING -->
        <div v-if="currentPage === 'pending'">
            <div class="mob-pending-section">
                <h3>Pending Placements</h3>
                <div v-if="pendingPlacements.length > 0">
                    <div v-for="level in pendingPlacements" class="mob-pending-row">
                        <img :src="'/assets/' + (level.placement === '?' ? 'question' : level.placement) + '.svg'" />
                        {{ level.name }}
                    </div>
                </div>
                <p v-else style="opacity:0.6;">No pending placements.</p>
            </div>
            <div class="mob-pending-section">
                <h3>Pending Movements</h3>
                <div v-if="pendingMovements.length > 0">
                    <div v-for="level in pendingMovements" class="mob-pending-row">
                        <img :src="'/assets/move-' + (level.placement === 'up' ? 'up' : 'down') + '.svg'" />
                        {{ level.name }}
                    </div>
                </div>
                <p v-else style="opacity:0.6;">No pending movements.</p>
            </div>
        </div>

        <!-- INFORMATION -->
        <div v-if="currentPage === 'info'" class="mob-info">
            <!-- List Legend -->
            <div>
                <h3>Legend</h3>
                <div class="mob-legend-list">
                    <div class="mob-legend-row"><span class="mob-legend-dot" style="background:#5599ff"></span>On layout state</div>
                    <div class="mob-legend-row"><span class="mob-legend-dot" style="background:#33dddd"></span>Deco is 1%–29% finished</div>
                    <div class="mob-legend-row"><span class="mob-legend-dot" style="background:#55ee55"></span>Deco is 30%–69% finished</div>
                    <div class="mob-legend-row"><span class="mob-legend-dot" style="background:#ffee55"></span>Deco is 70%–99% finished</div>
                    <div class="mob-legend-row"><span class="mob-legend-dot" style="background:#ffaa44"></span>Finished</div>
                    <div class="mob-legend-row"><span class="mob-legend-dot" style="background:#ff6622"></span>Verification progress is 30%–59%</div>
                    <div class="mob-legend-row"><span class="mob-legend-dot" style="background:#ff5555"></span>Verification progress is 60%–99%</div>
                    <div class="mob-legend-row"><span class="mob-legend-dot" style="background:#bbbbbb"></span>Verified, not rated</div>
                    <div class="mob-legend-row"><span class="mob-legend-dot" style="background:#ffffff;border:1px solid #555;"></span>Verified and rated</div>
                    <div class="mob-legend-row"><span style="font-size:0.65rem;margin-left:-1px;">🚫</span>Pending for removal</div>
                </div>
            </div>
            <!-- Pending Legend -->
            <div>
                <h3>Pending Legend</h3>
                <div class="mob-pending-legend">
                    <div class="mob-pending-legend-row"><img src="/assets/move-up.svg" style="height:1.3rem;width:1.3rem;" />Moving Up</div>
                    <div class="mob-pending-legend-row"><img src="/assets/move-down.svg" style="height:1.3rem;width:1.3rem;" />Moving Down</div>
                    <div class="mob-pending-legend-row"><img src="/assets/1.svg" style="height:1.3rem;width:1.3rem;" />Pending #1</div>
                    <div class="mob-pending-legend-row"><img src="/assets/10.svg" style="height:1.3rem;width:1.3rem;" />Pending Top 10</div>
                    <div class="mob-pending-legend-row"><img src="/assets/20.svg" style="height:1.3rem;width:1.3rem;" />Pending Top 20</div>
                    <div class="mob-pending-legend-row"><img src="/assets/30.svg" style="height:1.3rem;width:1.3rem;" />Pending Top 30</div>
                    <div class="mob-pending-legend-row"><img src="/assets/50.svg" style="height:1.3rem;width:1.3rem;" />Pending Top 50</div>
                    <div class="mob-pending-legend-row"><img src="/assets/75.svg" style="height:1.3rem;width:1.3rem;" />Pending Top 75</div>
                    <div class="mob-pending-legend-row"><img src="/assets/question.svg" style="height:1.3rem;width:1.3rem;" />Unknown Placement</div>
                </div>
            </div>
            <!-- List Guidelines -->
            <div>
                <h3>List Guidelines</h3>
                <div class="mob-guidelines">
                    <p>The guidelines explain how each aspect of the Upcoming Level List works. You can view them <a href="https://docs.google.com/document/d/13dmRfx2OCiLEaM2EcgEd-mKdok11_k8k7HsA5a-K6nY/edit?usp=sharing" target="_blank" style="text-decoration:underline;">here</a></p>
                </div>
            </div>
            <!-- Editors -->
            <div>
                <h3>List Editors</h3>
                <div class="mob-editors-list">
                    <div v-for="editor in editors" class="mob-editor-row">
                        <img :src="'/assets/' + (roleIconMap[editor.role] || 'user') + (!store.dark ? '-dark' : '') + '.svg'" />
                        <a v-if="editor.link" :href="editor.link" target="_blank">{{ editor.name }}</a>
                        <span v-else>{{ editor.name }}</span>
                    </div>
                </div>
            </div>
        </div>

    </div>
</div>
    `,
    data: () => ({
        store,
        filtersList: filtersList.map(f => ({ ...f })),
        currentPage: 'all',
        openMenu: null,
        loading: true,
        // list data
        rawList: [],
        editors: [],
        roleIconMap,
        pendingPlacements: [],
        pendingMovements: [],
        selected: -1,
        lbSelected: -1,
        playerSelected: -1,
        playerSearch: '',
        players: [],
        toggledShowcase: false,
        // settings
        showThumbnails: true,
        showColors: true,
        // filters
        search: '',
        minDecoration: 0,
        minVerification: 0,
    }),
    computed: {
        displayList() {
            if (this.currentPage === 'main') return this.rawList.filter(([l]) => l?.isMain);
            if (this.currentPage === 'future') return this.rawList.filter(([l]) => l?.isFuture);
            return this.rawList;
        },
        filteredPlayers() {
            if (!this.playerSearch.trim()) return this.players;
            const q = this.playerSearch.toLowerCase().trim();
            return this.players.filter(p => p.name.toLowerCase().includes(q));
        },
        lbList() {
            if (!this.rawList.length) return [];
            const scored = this.rawList
                .filter(([l]) => l && !l.isVerified)
                .filter(([l]) => !((l.records || []).some(r => Number(r.percent) >= 100)))
                .map(([l, e]) => {
                    const maxP = Math.max(0, ...((l.records || []).map(r => Number(r.percent) || 0)));
                    const maxR = Math.max(0, ...((l.run || []).map(r => {
                        const p = String(r.percent).split('-').map(Number);
                        return p.length === 2 ? Math.abs(p[1] - p[0]) : 0;
                    })));
                    l.rankingScore = Math.max(maxP, maxR) ** 2 + Math.min(maxP, maxR) ** 1.8;
                    return [l, e];
                })
                .filter(([l]) => l.rankingScore > 0)
                .sort((a, b) => b[0].rankingScore - a[0].rankingScore);
            return scored;
        },
    },
    async mounted() {
        this.rawList = await fetchList() || [];
        this.editors = await fetchEditors() || [];
        const pending = await fetchPending();
        if (pending) {
            this.pendingPlacements = pending
                .filter(p => !['up', 'down'].includes(p.placement.toLowerCase()))
                .sort((a, b) => {
                    const v = p => p === '?' ? 999999 : (parseInt(p) || 999999);
                    return v(a.placement) - v(b.placement) || a.name.localeCompare(b.name);
                });
            this.pendingMovements = pending.filter(p => ['up', 'down'].includes(p.placement.toLowerCase()));
        }
        // Auto-assign Open Verification tag
        this.rawList.forEach(item => {
            const l = item[0]; if (!l) return;
            if (l.verifier?.toLowerCase() === 'open verification') {
                if (!l.tags) l.tags = [];
                if (!l.tags.includes('Open Verification')) l.tags.push('Open Verification');
            }
        });
        // Build player leaderboard
        const playerMap = {};
        this.rawList.forEach(([level, err], rank) => {
            if (err || !level) return;
            const levelRank = rank + 1;
            const levelName = level.name;
            if (level.isVerified && level.verifier) {
                const key = level.verifier.toLowerCase();
                if (!playerMap[key]) playerMap[key] = { name: level.verifier, records: [] };
                const sc = recordScore(levelRank, 100) * 2;
                playerMap[key].records.push({ levelName, levelRank, percent: 100, score: sc, type: 'verification' });
                return;
            }
            if (level.records) {
                level.records.forEach(record => {
                    if (!record.user || record.percent <= 0) return;
                    const key = record.user.toLowerCase();
                    if (!playerMap[key]) playerMap[key] = { name: record.user, records: [] };
                    const percent = Number(record.percent);
                    playerMap[key].records.push({ levelName, levelRank, percent, score: recordScore(levelRank, percent), type: 'record' });
                });
            }
            if (level.run) {
                level.run.forEach(runRecord => {
                    if (!runRecord.user) return;
                    const parts = String(runRecord.percent).split('-').map(Number);
                    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return;
                    const percent = Math.abs(parts[1] - parts[0]);
                    if (percent <= 0) return;
                    const key = runRecord.user.toLowerCase();
                    if (!playerMap[key]) playerMap[key] = { name: runRecord.user, records: [] };
                    playerMap[key].records.push({ levelName, levelRank, percent, displayPercent: String(runRecord.percent), score: recordScore(levelRank, percent), type: 'run' });
                });
            }
        });
        this.players = Object.values(playerMap).map(p => {
            p.records.sort((a, b) => b.score - a.score);
            p.total = p.records.reduce((sum, r) => sum + r.score, 0);
            return p;
        }).sort((a, b) => b.total - a.total);
        this.players.forEach((p, i) => { p.globalRank = i + 1; });

        this.loading = false;
    },
    methods: {
        toggleMenu(name) { this.openMenu = this.openMenu === name ? null : name; },
        goPage(page) { this.currentPage = page; this.openMenu = null; this.selected = -1; this.lbSelected = -1; this.playerSelected = -1; },
        toggleFilter(index) {
            if (this.filtersList[index].separator) return;
            this.filtersList[index].active = !this.filtersList[index].active;
        },
        resetFilters() {
            this.filtersList.forEach(f => { if (!f.separator) f.active = false; });
            this.minDecoration = 0; this.minVerification = 0; this.search = '';
            this.applyFilters(); this.openMenu = null;
        },
        applyFilters() {
            const active = this.filtersList.filter(f => f.active && !f.separator);
            const q = this.search.toLowerCase().trim();
            const minD = this.minDecoration || 0, minV = this.minVerification || 0;
            this.rawList.forEach(item => {
                const l = item[0]; if (!l) return;
                const matchesSearch = !q || l.name.toLowerCase().includes(q);
                let matchesTags = true;
                if (active.length > 0) {
                    for (const f of active) {
                        if (!l.tags || !l.tags.includes(f.key)) { matchesTags = false; break; }
                    }
                }
                const rP = Math.max(0, ...((l.records || []).map(r => Number(r.percent) || 0)));
                const runP = Math.max(0, ...((l.run || []).map(r => {
                    const p = String(r.percent).split('-').map(Number);
                    return p.length === 2 ? Math.abs(p[1] - p[0]) : 0;
                })));
                const vP = Math.max(rP, runP);
                const matchesDec = l.isVerified || (l.percentFinished ?? 0) >= minD;
                const matchesVer = l.isVerified || vP >= minV;
                l.isHidden = !(matchesSearch && matchesTags && matchesDec && matchesVer);
            });
        },
        getThumbnail(level) {
            if (level.thumbnail) return level.thumbnail;
            const yt = url => {
                if (!url || typeof url !== 'string') return '';
                const m = url.match(/.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=)([^#&?]*).*/);
                return m ? `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg` : '';
            };
            return yt(level.verification) || yt(level.showcase) || '';
        },
        getVideo(level) {
            const toStr = v => (v && typeof v === 'string') ? v : '';
            if (!level.showcase) return embed(toStr(level.verification));
            return embed(this.toggledShowcase || !level.isVerified ? toStr(level.showcase) : toStr(level.verification));
        },
        getLevelNameStyle(level, isSelected) {
            if (!level) return {};
            const dark = !this.store.dark;
            if (level.tags?.includes('Unrated')) {
                const c = isSelected ? (dark ? '#dddddd' : '#888888') : (dark ? '#bbbbbb' : '#666666');
                return { color: c, fontWeight: level.isVerified ? 'bold' : 'normal' };
            }
            if (level.tags?.includes('Rated')) return { color: dark ? '#ffffff' : '#000000', fontWeight: level.isVerified ? 'bold' : 'normal' };
            if (level.isVerified) {
                return { color: isSelected ? (dark ? '#ffffff' : '#000000') : '#bbbbbb', fontWeight: 'bold' };
            }
            const rP = Math.max(0, ...((level.records || []).map(r => Number(r.percent) || 0)));
            const runP = Math.max(0, ...((level.run || []).map(r => {
                const p = String(r.percent).split('-').map(Number);
                return p.length === 2 ? Math.abs(p[1] - p[0]) : 0;
            })));
            const vP = Math.max(rP, runP);
            const pf = level.percentFinished ?? 0;
            let color;
            if (pf === 100 && vP >= 60) color = dark ? (isSelected ? '#ff9999' : '#ff5555') : (isSelected ? '#cc7a7a' : '#cc4444');
            else if (pf === 100 && vP >= 30) color = dark ? (isSelected ? '#ffaa66' : '#ff6622') : (isSelected ? '#cc8851' : '#cc511b');
            else if (pf === 100) color = dark ? (isSelected ? '#ffcc77' : '#ffaa44') : (isSelected ? '#cca35f' : '#cc8836');
            else if (pf >= 70) color = dark ? (isSelected ? '#ffff77' : '#ffee55') : (isSelected ? '#cccc5f' : '#ccbe44');
            else if (pf >= 30) color = dark ? (isSelected ? '#88ff88' : '#55ee55') : (isSelected ? '#6ccc6c' : '#44be44');
            else if (pf >= 1) color = dark ? (isSelected ? '#66ffff' : '#33dddd') : (isSelected ? '#51cccc' : '#28b0b0');
            else color = dark ? (isSelected ? '#88bbff' : '#5599ff') : (isSelected ? '#6c95cc' : '#447acc');
            return { color, fontWeight: 'normal' };
        },
        isOldLevel(level) {
            if (!level.lastUpd) return false;
            const p = level.lastUpd.split('.');
            if (p.length !== 3) return false;
            const d = new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
            const ago = new Date(); ago.setFullYear(ago.getFullYear() - 1);
            return d < ago;
        },
        getLbBestRecord(level) {
            if (!level?.records?.length) return null;
            const s = [...level.records].sort((a, b) => b.percent - a.percent);
            return s[0].percent === 0 ? null : s[0];
        },
        getLbBestRun(level) {
            if (!level?.run?.length) return null;
            const s = [...level.run].sort((a, b) => {
                const diff = r => { const p = String(r.percent).split('-').map(Number); return p.length === 2 ? p[1] - p[0] : 0; };
                return diff(b) - diff(a);
            });
            const best = s[0];
            const p = String(best.percent).split('-').map(Number);
            return p.length === 2 && p[1] - p[0] > 0 ? best : null;
        },
    },
};
