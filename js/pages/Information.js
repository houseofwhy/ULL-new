import { store } from '../main.js';
import { fetchEditors } from '../content.js';
import { guidelinesData } from '../_guidelines.js';

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
    template: `
<component :is="'style'">
/* ── INFO PAGE ── */
.info-page {
    display: block;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    scrollbar-width: thin;
}
.info-page, .info-page * { font-family: "Lexend Deca", sans-serif; box-sizing: border-box; }
.info-page h1,
.info-page h2,
.info-page h3,
.info-page h4,
.info-page p { margin: 0; padding: 0; }
.info-page h1::before, .info-page h1::after,
.info-page h2::before, .info-page h2::after,
.info-page h3::before, .info-page h3::after,
.info-page h4::before, .info-page h4::after { display: none; }

/* ── HERO ── */
.info-hero {
    display: block;
    text-align: center;
    padding: 4rem 2rem 3rem;
    background: linear-gradient(180deg, rgba(102,10,239,0.15) 0%, transparent 100%);
    border-bottom: 1px solid rgba(128,128,128,0.15);
}
.root.dark .info-hero {
    background: linear-gradient(180deg, rgba(62,0,249,0.08) 0%, transparent 100%);
}
.info-page .info-hero h1 {
    font-size: 2.5rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.2;
    color: #c084fc;
    margin-bottom: 30px !important;
}
.info-hero p {
    max-width: 600px;
    margin: 1rem auto 0;
    font-size: 0.95rem;
    font-weight: 400;
    color: var(--color-on-background);
    opacity: 0.5;
    line-height: 1.7;
}

/* ── CONTENT ── */
.info-content {
    max-width: 1100px;
    margin: 0 auto;
    padding: 2.5rem 2rem;
}

/* ── CARDS GRID ── */
.info-cards {
    display: grid !important;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin-bottom: 3rem;
    width: 100%;
}
.info-card {
    background: var(--color-background-hover);
    border: 1px solid rgba(128,128,128,0.15);
    border-radius: 0.75rem;
    padding: 1.75rem;
    transition: border-color 150ms ease;
}
.info-card:hover { border-color: rgba(128,128,128,0.3); }
.info-card__title {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: color-mix(in srgb, var(--color-primary) 65%, white);
    margin-bottom: 1rem;
}
.root.dark .info-card__title {
    color: color-mix(in srgb, var(--color-primary) 65%, black);
}

/* ── EDITORS ── */
.info-editors {
    display: grid !important;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
}
.info-editor {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.4rem 0.5rem;
    border-radius: 0.35rem;
    transition: background-color 100ms ease;
}
.info-editor:hover { background: rgba(128,128,128,0.08); }
.info-editor img {
    width: 1.1rem;
    height: 1.1rem;
    opacity: 0.7;
}
.info-editor a, .info-editor span.info-editor__name {
    color: var(--color-on-background);
    text-decoration: none;
    font-size: 0.85rem;
    font-weight: 500;
    line-height: 1.6;
}
.info-editor a:hover { text-decoration: underline; }
.info-role {
    font-size: 0.6rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0.15rem 0.4rem;
    border-radius: 0.25rem;
    background: rgba(128,128,128,0.15);
    color: var(--color-on-background);
    opacity: 0.5;
    margin-left: auto;
    white-space: nowrap;
}
.info-role-owner  { background: rgba(255,180,50,0.15); color: #ffcc55; opacity:1; }
.info-role-admin  { background: rgba(100,180,255,0.15); color: #77bbff; opacity:1; }
.info-role-seniormod { background: rgba(100,220,180,0.15); color: #66ddaa; opacity:1; }
.info-role-dev    { background: rgba(200,100,255,0.15); color: #cc88ff; opacity:1; }
.root.dark .info-role-owner  { background: rgba(200,140,0,0.15); color: #b38800; }
.root.dark .info-role-admin  { background: rgba(30,100,200,0.15); color: #2266bb; }
.root.dark .info-role-seniormod { background: rgba(30,160,100,0.15); color: #1a8855; }
.root.dark .info-role-dev    { background: rgba(130,40,200,0.15); color: #7722bb; }

/* ── COLORING LEGEND ── */
.info-legend { display: flex; flex-direction: column; gap: 0.55rem; }
.info-legend-row {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    font-size: 0.85rem;
    font-weight: 400;
    line-height: 1.6;
    color: var(--color-on-background);
}
.info-legend-dot {
    width: 0.7rem; height: 0.7rem;
    border-radius: 50%; flex-shrink: 0;
}
.info-legend-label {
    color: var(--color-on-background);
    opacity: 0.4;
    font-size: 0.75rem;
    margin-left: auto;
    white-space: nowrap;
}
.info-coloring-desc {
    font-size: 0.8rem;
    font-weight: 400;
    color: var(--color-on-background);
    opacity: 0.5;
    margin-bottom: 16px !important;
    line-height: 1.6;
}

/* ── PENDING LEGEND ── */
.info-pending {
    display: grid !important;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
}
.info-pending-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-size: 0.85rem;
    font-weight: 400;
    padding: 0.35rem 0.5rem;
    border-radius: 0.35rem;
    color: var(--color-on-background);
}
.info-pending-row img { width: 1.3rem; height: 1.3rem; }

/* ── GUIDELINES ── */
.info-guidelines {
    background: var(--color-background-hover);
    border: 1px solid rgba(128,128,128,0.15);
    border-radius: 0.75rem;
    overflow: hidden;
}
.info-guidelines-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem 1.75rem;
    border-bottom: 1px solid rgba(128,128,128,0.15);
    background: var(--color-background-hover);
}
.info-page .info-guidelines-header h2 {
    font-size: 1.25rem;
    font-weight: 700;
    line-height: 1.3;
    color: var(--color-on-background);
}
.info-page .info-guidelines-header p {
    font-size: 0.8rem;
    font-weight: 400;
    color: var(--color-on-background);
    opacity: 0.5;
    margin-top: 0.35rem;
}
.info-page .info-guidelines-search {
    padding: 0.5rem 0.85rem;
    background: rgba(128,128,128,0.08);
    border: 1px solid rgba(128,128,128,0.3);
    border-radius: 0.4rem;
    color: var(--color-on-background);
    font-family: "Lexend Deca", sans-serif;
    font-size: 0.8rem;
    font-weight: 400;
    width: 220px;
    line-height: 1.4;
}
.info-guidelines-search:focus {
    outline: 2px solid var(--color-primary);
    background: rgba(128,128,128,0.12);
}
.info-guidelines-search::placeholder { color: var(--color-on-background); opacity: 0.35; }
.info-guidelines-body {
    display: grid !important;
    grid-template-columns: 240px 1fr;
    min-height: 600px;
    width: 100%;
}

/* TOC */
.info-toc {
    border-right: 1px solid rgba(128,128,128,0.15);
    padding: 1rem 0;
    overflow-y: auto;
    max-height: 600px;
    scrollbar-width: thin;
}
.info-toc-group {
    font-size: 0.6rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-on-background);
    opacity: 0.4;
    padding: 1.1rem 1.25rem 0.4rem;
}
.info-toc-group:first-child { padding-top: 0.25rem; }
.info-toc-link {
    display: block;
    padding: 0.5rem 1.25rem 0.5rem 1.5rem;
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--color-on-background);
    opacity: 0.45;
    text-decoration: none;
    transition: all 100ms ease;
    cursor: pointer;
    border-left: 2px solid transparent;
}
.info-toc-link:hover {
    opacity: 0.8;
    background: rgba(128,128,128,0.05);
}
.info-toc-link.active {
    color: color-mix(in srgb, var(--color-primary) 65%, white);
    opacity: 1;
    background: rgba(102,10,239,0.08);
    border-left-color: var(--color-primary);
}
.root.dark .info-toc-link.active {
    color: color-mix(in srgb, var(--color-primary) 65%, black);
}

/* Content pane */
.info-guidelines-content {
    padding: 2rem 2.5rem;
    overflow-y: auto;
    max-height: 600px;
    scrollbar-width: thin;
}
.info-guidelines-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    opacity: 0.25;
    gap: 0.75rem;
    text-align: center;
    color: var(--color-on-background);
}
.info-guidelines-placeholder span { font-size: 2.5rem; }
.info-guidelines-placeholder p { font-size: 0.9rem; }

/* ── GUIDELINES CONTENT ── */
.info-gl-group-header {
    margin-top: 2.5rem;
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgba(128,128,128,0.15);
}
.info-gl-group-header:first-child { margin-top: 0; }
.info-page .info-gl-group-header h2 {
    font-size: 1rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: color-mix(in srgb, var(--color-primary) 65%, white);
    line-height: 1.3;
}
.root.dark .info-gl-group-header h2 {
    color: color-mix(in srgb, var(--color-primary) 65%, black);
}
.info-gl-intro {
    margin-bottom: 1.5rem;
    padding: 1rem 1.25rem;
    background: rgba(128,128,128,0.04);
    border-left: 3px solid rgba(128,128,128,0.2);
    border-radius: 0 0.35rem 0.35rem 0;
}
.info-gl-intro p {
    font-size: 0.82rem;
    font-weight: 400;
    line-height: 1.7;
    color: var(--color-on-background);
    opacity: 0.6;
}
.info-gl-intro p + p { margin-top: 0.6rem; }
.info-gl-section {
    margin-bottom: 2.5rem;
}
.info-page .info-gl-section h3 {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--color-on-background);
    line-height: 1.4;
    margin-bottom: 1rem;
    padding-bottom: 0.4rem;
    border-bottom: 1px solid rgba(128,128,128,0.08);
}
.info-page .info-gl-section h4 {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--color-on-background);
    opacity: 0.85;
    line-height: 1.4;
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
}
.info-gl-section p {
    font-size: 0.82rem;
    font-weight: 400;
    line-height: 1.7;
    color: var(--color-on-background);
    opacity: 0.75;
}
.info-gl-section p + p { margin-top: 0.75rem; }
.info-gl-section ul,
.info-gl-section ol {
    margin: 0.6rem 0 0.6rem 1.4rem;
    padding: 0;
    font-size: 0.82rem;
    font-weight: 400;
    line-height: 1.7;
    color: var(--color-on-background);
    opacity: 0.75;
}
.info-gl-section ol { list-style-type: decimal; }
.info-gl-section ul { list-style-type: disc; }
.info-gl-section li {
    margin-bottom: 0.35rem;
    padding-left: 0.3rem;
}
.info-gl-section li ul,
.info-gl-section li ol {
    margin-top: 0.3rem;
    opacity: 1;
}
.info-gl-section li ol { list-style-type: lower-alpha; }
.info-gl-section li li ol { list-style-type: lower-roman; }
.info-gl-section li ul { list-style-type: circle; }
.info-gl-section li li ul { list-style-type: square; }
.info-gl-section strong {
    font-weight: 600;
    opacity: 1;
    color: var(--color-on-background);
}
.info-gl-section a {
    color: color-mix(in srgb, var(--color-primary) 65%, white);
    text-decoration: underline;
    text-decoration-color: transparent;
    transition: text-decoration-color 100ms ease;
}
.info-gl-section a:hover { text-decoration-color: currentColor; }
.root.dark .info-gl-section a {
    color: color-mix(in srgb, var(--color-primary) 65%, black);
}
/* Contact cards */
.gl-contacts-grid {
    display: grid !important;
    grid-template-columns: 1fr 1fr;
    gap: 0.6rem;
}
.gl-contact-card {
    background: rgba(128,128,128,0.06);
    border: 1px solid rgba(128,128,128,0.12);
    border-radius: 0.5rem;
    padding: 0.75rem 1rem;
    transition: border-color 150ms ease;
}
.gl-contact-card:hover { border-color: rgba(128,128,128,0.25); }
.gl-contact-role {
    font-size: 0.6rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: color-mix(in srgb, var(--color-primary) 60%, white);
    margin-bottom: 0.3rem;
}
.root.dark .gl-contact-role {
    color: color-mix(in srgb, var(--color-primary) 60%, black);
}
.gl-contact-name {
    font-size: 0.88rem;
    font-weight: 700;
    color: var(--color-on-background);
    margin-bottom: 0.15rem;
}
.gl-contact-detail {
    font-size: 0.72rem;
    font-weight: 400;
    color: var(--color-on-background);
    opacity: 0.45;
    margin-bottom: 0.3rem;
}
.gl-contact-links {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
}
.gl-contact-links span {
    font-size: 0.72rem;
    font-weight: 400;
    color: var(--color-on-background);
    opacity: 0.55;
}

.info-gl-no-results {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    opacity: 0.25;
    gap: 0.5rem;
    text-align: center;
    color: var(--color-on-background);
}
.info-gl-no-results span { font-size: 2rem; }
.info-gl-no-results p { font-size: 0.85rem; }

/* ── FOOTER ── */
.info-footer {
    margin-top: 4rem;
    border-top: 1px solid rgba(128,128,128,0.15);
    padding: 2.5rem 2rem 2rem;
}
.info-footer-inner {
    max-width: 1100px;
    margin: 0 auto;
    display: flex !important;
    align-items: flex-start;
    justify-content: space-between;
    gap: 2rem;
}
.info-page .info-footer-brand h3 {
    font-size: 1rem;
    font-weight: 700;
    line-height: 1.3;
    color: var(--color-on-background);
    margin-bottom: 0.25rem;
}
.info-page .info-footer-brand p {
    font-size: 0.75rem;
    font-weight: 400;
    color: var(--color-on-background);
    opacity: 0.4;
    line-height: 1.6;
    max-width: 320px;
    margin-top: 1em;
}
.info-footer-links {
    display: flex !important;
    gap: 2.5rem;
}
.info-footer-col h4 {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-on-background);
    opacity: 0.4;
    margin-bottom: 0.6rem;
}
.info-footer-col a {
    display: block;
    font-size: 0.78rem;
    color: var(--color-on-background);
    opacity: 0.4;
    text-decoration: none;
    padding: 0.2rem 0;
    transition: opacity 100ms ease;
}
.info-footer-col a:hover { opacity: 0.8; }
.info-footer-bottom {
    max-width: 1100px;
    margin: 1.5rem auto 0;
    padding-top: 1.25rem;
    border-top: 1px solid rgba(128,128,128,0.15);
    display: flex !important;
    align-items: center;
    justify-content: space-between;
}
.info-footer-bottom p {
    font-size: 0.68rem;
    color: var(--color-on-background);
    opacity: 0.2;
}
</component>

<main class="info-page surface">
    <!-- Hero -->
    <section class="info-hero">
        <h1>Upcoming Levels List</h1>
        <p>
            The Upcoming Levels List (ULL) is a comprehensive catalogue of upcoming Top 1\u2013100 Extreme Demons
            projected to be verified and placed on Pointercrate. The list aims to forecast the future of
            the Demonlist, and also features unrated Extreme Demons that may have qualified for a rating
            at the time of their creation.
        </p>
    </section>

    <!-- Cards -->
    <div class="info-content">
        <div class="info-cards">

            <!-- List Editors -->
            <div class="info-card">
                <div class="info-card__title">List Editors</div>
                <p class="info-coloring-desc">
                     Trusted group of dedicated members responsible for maintaining the Upcoming Levels List. Their work includes adding new levels, editing existing ones, and ensuring the list stays accurate.
                </p>
                <div class="info-editors">
                    <div v-for="editor in editors" class="info-editor">
                        <img :src="'/assets/' + (roleIconMap[editor.role] || 'user-lock') + (store.dark ? '' : '-dark') + '.svg'" :alt="editor.role" />
                        <a v-if="editor.link && editor.link !== '#'" :href="editor.link" target="_blank">{{ editor.name }}</a>
                        <span v-else class="info-editor__name">{{ editor.name }}</span>
                        <span class="info-role" :class="'info-role-' + editor.role">{{ roleLabel(editor.role) }}</span>
                    </div>
                </div>
            </div>

            <!-- Level Coloring -->
            <div class="info-card">
                <div class="info-card__title">Level Coloring</div>
                <p class="info-coloring-desc">
                    When Level Coloring is enabled, level names in the list are color-coded
                    based on their decoration progress and verification status.
                </p>
                <div class="info-legend">
                    <div class="info-legend-row">
                        <span class="info-legend-dot" style="background:#5599ff"></span>
                        On layout state
                        <span class="info-legend-label">Deco 0%</span>
                    </div>
                    <div class="info-legend-row">
                        <span class="info-legend-dot" style="background:#33dddd"></span>
                        Deco is 1%\u201329% finished
                        <span class="info-legend-label">Early deco</span>
                    </div>
                    <div class="info-legend-row">
                        <span class="info-legend-dot" style="background:#55ee55"></span>
                        Deco is 30%\u201369% finished
                        <span class="info-legend-label">Mid deco</span>
                    </div>
                    <div class="info-legend-row">
                        <span class="info-legend-dot" style="background:#ffee55"></span>
                        Deco is 70%\u201399% finished
                        <span class="info-legend-label">Late deco</span>
                    </div>
                    <div class="info-legend-row">
                        <span class="info-legend-dot" style="background:#ffaa44"></span>
                        Decoration finished
                        <span class="info-legend-label">Deco 100%</span>
                    </div>
                    <div class="info-legend-row">
                        <span class="info-legend-dot" style="background:#ff6622"></span>
                        Verification progress 30%\u201359%
                        <span class="info-legend-label">Early verify</span>
                    </div>
                    <div class="info-legend-row">
                        <span class="info-legend-dot" style="background:#ff5555"></span>
                        Verification progress 60%\u201399%
                        <span class="info-legend-label">Late verify</span>
                    </div>
                    <div class="info-legend-row">
                        <span class="info-legend-dot" style="background:#bbbbbb"></span>
                        Verified, not rated
                    </div>
                    <div class="info-legend-row">
                        <span class="info-legend-dot" style="background:#ffffff; border:1px solid #555;"></span>
                        Verified and rated
                    </div>
                    <div class="info-legend-row">
                        <span style="font-size:0.7rem; width:0.7rem; text-align:center; flex-shrink:0;">\u{1F6AB}</span>
                        Pending for removal
                    </div>
                </div>
            </div>

            <!-- Pending List Legend (full width) -->
            <div class="info-card" style="grid-column: 1 / -1;">
                <div class="info-card__title">Pending List Legend</div>
                <div class="info-pending">
                    <div class="info-pending-row"><img src="/assets/move-up.svg" alt="up" />Moving Up</div>
                    <div class="info-pending-row"><img src="/assets/move-down.svg" alt="down" />Moving Down</div>
                    <div class="info-pending-row"><img src="/assets/1.svg" alt="1" />Pending #1</div>
                    <div class="info-pending-row"><img src="/assets/10.svg" alt="10" />Pending Top 10</div>
                    <div class="info-pending-row"><img src="/assets/20.svg" alt="20" />Pending Top 20</div>
                    <div class="info-pending-row"><img src="/assets/30.svg" alt="30" />Pending Top 30</div>
                    <div class="info-pending-row"><img src="/assets/50.svg" alt="50" />Pending Top 50</div>
                    <div class="info-pending-row"><img src="/assets/75.svg" alt="75" />Pending Top 75</div>
                    <div class="info-pending-row"><img src="/assets/question.svg" alt="?" />Unknown Placement</div>
                </div>
            </div>
        </div>

        <!-- Guidelines -->
        <div class="info-guidelines">
            <div class="info-guidelines-header">
                <div>
                    <h2>Guidelines</h2>
                    <p>How the Upcoming Levels List works \u2014 rules, criteria, and procedures</p>
                </div>
                <input class="info-guidelines-search" type="text" placeholder="Search guidelines..." v-model="glSearch" />
            </div>
            <div class="info-guidelines-body">
                <nav class="info-toc">
                    <template v-for="group in filteredGuidelines" :key="group.id">
                        <div class="info-toc-group">{{ group.group }}</div>
                        <a v-for="section in group.sections" :key="section.id"
                           class="info-toc-link"
                           :class="{ active: activeSection === section.id }"
                           @click="scrollToSection(section.id)">
                            {{ section.title }}
                        </a>
                    </template>
                </nav>
                <div class="info-guidelines-content" ref="glContent" @scroll="onGlScroll">
                    <template v-if="filteredGuidelines.length">
                        <template v-for="group in filteredGuidelines" :key="group.id">
                            <div class="info-gl-group-header" :id="'gl-group-' + group.id">
                                <h2>{{ group.group }}</h2>
                            </div>
                            <div v-if="group.intro" class="info-gl-intro" v-html="group.intro"></div>
                            <div v-for="section in group.sections" :key="section.id"
                                 :id="'gl-' + section.id"
                                 class="info-gl-section">
                                <h3>{{ section.title }}</h3>
                                <div v-html="section.content"></div>
                            </div>
                        </template>
                    </template>
                    <div v-else class="info-gl-no-results">
                        <span>\u{1F50D}</span>
                        <p>No guidelines match your search.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Footer -->
    <footer class="info-footer">
        <div class="info-footer-inner">
            <div class="info-footer-brand">
                <h3>Upcoming Levels List</h3>
                <p>A community-maintained catalogue forecasting the future of the Geometry Dash Demonlist.</p>
            </div>
            <div class="info-footer-links">
                <div class="info-footer-col">
                    <h4>Navigate</h4>
                    <a href="#/list">All Levels</a>
                    <a href="#/leaderboard">Leaderboard</a>
                    <a href="#/pending">Pending List</a>
                    <a href="#/upcoming">Upcoming Levels</a>
                </div>
                <div class="info-footer-col">
                    <h4>Community</h4>
                    <a href="https://discord.gg/9wVWSgJSe8" target="_blank">Discord Server</a>
                    <a href="https://docs.google.com/document/d/13dmRfx2OCiLEaM2EcgEd-mKdok11_k8k7HsA5a-K6nY/edit?usp=sharing" target="_blank">Full Guidelines Doc</a>
                </div>
                <div class="info-footer-col">
                    <h4>Contact</h4>
                    <a href="https://discord.gg/9wVWSgJSe8" target="_blank">Discord Support</a>
                    <a href="https://www.youtube.com/channel/UC72Ceml55mVisJNEByLBHPA" target="_blank">YouTube</a>
                </div>
            </div>
        </div>
        <div class="info-footer-bottom">
            <p>&copy; 2024\u20132026 Upcoming Levels List. Not affiliated with RobTop Games or Pointercrate.</p>
            <p>Built by the ULL Team</p>
        </div>
    </footer>
</main>
    `,
    data: () => ({
        store,
        roleIconMap,
        editors: [],
        glSearch: '',
        activeSection: '',
    }),
    computed: {
        filteredGuidelines() {
            const q = this.glSearch.trim().toLowerCase();
            if (!q) return guidelinesData;
            return guidelinesData
                .map(group => {
                    const sections = group.sections.filter(s =>
                        s.title.toLowerCase().includes(q) ||
                        s.content.toLowerCase().includes(q)
                    );
                    if (!sections.length) return null;
                    return { ...group, sections };
                })
                .filter(Boolean);
        },
    },
    methods: {
        roleLabel(role) {
            return roleLabelMap[role] || role;
        },
        scrollToSection(id) {
            const container = this.$refs.glContent;
            const el = document.getElementById('gl-' + id);
            if (el && container) {
                container.scrollTo({
                    top: el.offsetTop - container.offsetTop,
                    behavior: 'smooth'
                });
                this.activeSection = id;
            }
        },
        onGlScroll() {
            const container = this.$refs.glContent;
            if (!container) return;
            const sections = container.querySelectorAll('.info-gl-section');
            let current = '';
            for (const sec of sections) {
                const rect = sec.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                if (rect.top - containerRect.top <= 60) {
                    current = sec.id.replace('gl-', '');
                }
            }
            if (current) this.activeSection = current;
        },
    },
    async mounted() {
        this.editors = await fetchEditors() || [];
        if (guidelinesData.length && guidelinesData[0].sections.length) {
            this.activeSection = guidelinesData[0].sections[0].id;
        }
    },
};

