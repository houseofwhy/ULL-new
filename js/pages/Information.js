import { store } from '../main.js';
import { fetchEditors } from '../content.js';
import { guidelinesData } from '../_guidelines.js';
import {
    navigationData, faqData, apiData, coloringLegend, pendingLegend, contactRouting,
} from '../_info.js';
import {
    WINDOWS, WINDOW_TITLES, WINDOW_EYEBROWS, flatSections, searchInformation,
    sectionCount, faqCount, pageCount, markCount, roleIconMap, roleLabel,
} from '../info-windows.js';
import Footer from '../components/Footer.js';
import MarksLegend from '../components/MarksLegend.js';

export default {
    components: { Footer, MarksLegend },
    template: `
<main class="info-page surface ull2" :class="{ 'info-page--locked': openKey }" ref="page">

    <section class="info-hero">
        <h1>Information</h1>
        <p>
            The Upcoming Levels List predicts which Extreme Demons will be verified and placed on the
            Demonlist. This page covers how those positions are decided, what the pages and the marks on
            the site mean, who to contact, and how to read the list through the API.
            <button type="button" class="info-more" @click="open('about')">What this list is, in full &rarr;</button>
        </p>

        <div class="info-search" :class="{ 'is-open': query.trim().length > 0 }">
            <span class="info-mag" aria-hidden="true"></span>
            <input
                ref="search"
                v-model="query"
                type="search"
                class="info-search__field"
                placeholder="Search the guidelines, the FAQ, the endpoints and the legends"
                aria-label="Search this page"
                @keydown.esc="query = ''"
            />
            <kbd v-if="!query.trim()" class="info-kbd">Ctrl K</kbd>
            <div v-if="query.trim()" class="info-results">
                <button
                    v-for="hit in results"
                    :key="hit.kind + hit.label + (hit.section || '')"
                    type="button"
                    class="info-result"
                    @click="openHit(hit)"
                >
                    <span class="info-result__k">{{ hit.where }}</span>
                    <span class="info-result__t">{{ hit.label }}</span>
                    <span v-if="hit.sub" class="info-result__s">{{ hit.sub }}</span>
                </button>
                <p v-if="!results.length" class="info-result__none">Nothing on this page matches &ldquo;{{ query.trim() }}&rdquo;.</p>
            </div>
        </div>
    </section>

    <div class="info-blocks">
        <button type="button" class="info-block info-block--faq" @click="open('faq')">
            <div class="u-eyebrow">Answers &middot; {{ faqCount }} questions</div>
            <h2>FAQ</h2>
            <p>
                How to submit a level and a record, what proof a record needs, how leaderboard points
                are calculated, and why a total changes when you have submitted nothing. {{ faqCount }} questions in {{ faqData.length }} groups.
            </p>
            <span class="info-block__more">All {{ faqCount }} questions &rarr;</span>
        </button>

        <button type="button" class="info-block info-block--nav" @click="open('navigation')">
            <div class="u-eyebrow">Navigation &middot; {{ pageCount }} pages</div>
            <h2>What is on each page</h2>
            <p>
                Every page on the site and what is on it: the three list tiers and how they differ, the
                Pending and Upcoming pages, the leaderboard, events, and a level&rsquo;s own page.
            </p>
            <div class="info-chips">
                <span v-for="page in navPreview" :key="page" class="u-chip">{{ page }}</span>
                <span v-if="pageCount > navPreview.length" class="u-chip">+{{ pageCount - navPreview.length }}</span>
            </div>
        </button>

        <button type="button" class="info-block info-block--gl" @click="open('guidelines')">
            <div class="u-eyebrow">The rules</div>
            <h2>Guidelines</h2>
            <p>
                How records are accepted, how levels are chosen and positioned, and what the staff may
                and may not do. {{ sectionCount }} sections in total.
            </p>
            <div class="info-groups">
                <div v-for="group in guidelinesData" :key="group.id">
                    {{ group.group }}<span>{{ group.sections.length }}</span>
                </div>
            </div>
            <span class="u-btn">Open the guidelines</span>
        </button>

        <button type="button" class="info-block info-block--ref" @click="open('reference')">
            <div class="u-eyebrow">Reference &middot; {{ markCount }} marks</div>
            <h2>What the marks mean</h2>
            <p>What the colour of a level&rsquo;s name stands for, and what the icons on the Pending List
            mean.</p>
            <div class="info-marks">
                <div class="info-dots">
                    <i v-for="row in coloringLegend.slice(0, 8)" :key="row.label" :class="['info-dot', row.pill]"></i>
                </div>
                <div class="info-icons">
                    <img v-for="row in pendingLegend.slice(0, 5)" :key="row.icon" :src="'/assets/' + row.icon + '.svg'" :alt="''" />
                </div>
            </div>
        </button>

        <button type="button" class="info-block info-block--staff" @click="open('staff')">
            <div class="u-eyebrow">Who to talk to<template v-if="editors.length"> &middot; {{ editors.length }} people</template></div>
            <h2>Staff &amp; contact</h2>
            <p>The team that maintains the list, and where to take a submission, a record, a correction
            or a complaint.</p>
        </button>

        <button type="button" class="info-block info-block--api" @click="open('api')">
            <div class="u-eyebrow">Build on it &middot; {{ apiData.endpoints.length }} endpoints</div>
            <h2>API documentation</h2>
            <p>The whole list as public JSON. No key and no signup are needed.</p>
            <div class="info-chips">
                <span class="u-chip">/api/list</span>
                <span class="u-chip">/api/pending</span>
                <span class="u-chip">+{{ apiData.endpoints.length - 2 }}</span>
            </div>
        </button>
    </div>

    <Footer />

    <!-- ── The reader ─────────────────────────────────────────────────────── -->
    <div v-if="openKey" class="info-win" @click.self="close()">
        <div class="info-win__box" role="dialog" aria-modal="true" :aria-label="winTitle" tabindex="-1" ref="win">
            <div class="info-win__bar">
                <span class="info-win__k">{{ winEyebrow }}</span>
                <b>{{ winTitle }}</b>
                <button type="button" class="info-win__x" @click="close()">Close <span class="u-chip">Esc</span></button>
            </div>

            <!-- Guidelines: index beside one section -->
            <div v-if="openKey === 'guidelines'" class="info-win__split">
                <nav class="info-toc">
                    <template v-for="group in guidelinesData" :key="group.id">
                        <div class="info-toc__g">{{ group.group }}</div>
                        <button
                            v-for="section in group.sections"
                            :key="section.id"
                            type="button"
                            class="info-toc__a"
                            :class="{ 'is-on': section.id === activeSection }"
                            @click="goSection(section.id)"
                        >{{ section.title }}</button>
                    </template>
                </nav>
                <div class="info-win__body" ref="body">
                    <div class="info-crumb">{{ current.group }}</div>
                    <h3>{{ current.title }}</h3>
                    <div class="info-prose" v-html="current.content"></div>
                    <div class="info-updown">
                        <button type="button" :disabled="!prevSection" @click="prevSection && goSection(prevSection.id)">
                            <span v-if="prevSection">&larr; {{ prevSection.title }}</span>
                        </button>
                        <button type="button" :disabled="!nextSection" @click="nextSection && goSection(nextSection.id)">
                            <span v-if="nextSection">{{ nextSection.title }} &rarr;</span>
                        </button>
                    </div>
                </div>
            </div>

            <div v-else class="info-win__body">

                <!-- What this list is -->
                <template v-if="openKey === 'about'">
                    <p class="info-lead">
                        The Upcoming Levels List catalogues upcoming Top 1&ndash;135 Extreme Demons
                        projected to be verified and placed on the Demonlist, along with unrated Extreme
                        Demons that would have qualified for a rating when they were made. The positions
                        on it are predictions of where these levels will rank once they are released.
                    </p>
                    <div class="info-prose">
                        <p>
                            Nothing here is official. Positions are estimates made by the list staff
                            against the criteria written in the guidelines, and they change as levels
                            progress. Levels that are already rated are placed in strict accordance with
                            their ranking on Pointercrate.
                        </p>
                        <h4>The three tiers</h4>
                        <p>All three tiers use the same order. They differ only in how strict the
                        threshold to appear on them is.</p>
                        <ul>
                            <li><strong>All Levels</strong> &mdash; every level with a conceivable chance of being verified and published. A level&rsquo;s rank here is what leaderboard points are calculated from.</li>
                            <li><strong>Main List</strong> &mdash; levels that meet the standards required to be considered for an official rating.</li>
                            <li><strong>Future List</strong> &mdash; levels very likely to be verified and published soon.</li>
                        </ul>
                        <h4>How to read a level</h4>
                        <p>
                            The colour of a level&rsquo;s name shows its state, from layout through
                            decoration and verification to rated. Every level carries two percentages:
                            how much of its decoration is finished, and how far the best run on it has
                            got. The badges are its position in each tier, so a level can be #4 in All
                            Levels and #2 in the Future List at the same time.
                        </p>
                    </div>
                    <div class="info-winlinks">
                        <button type="button" class="u-btn u-btn--ghost" @click="open('navigation')">What is on each page &rarr;</button>
                        <button type="button" class="u-btn u-btn--ghost" @click="open('reference')">What the marks mean &rarr;</button>
                    </div>
                </template>

                <!-- FAQ -->
                <template v-else-if="openKey === 'faq'">
                    <div v-for="group in faqData" :key="group.group" class="info-faqg">
                        <div class="u-eyebrow">{{ group.group }}</div>
                        <div v-for="item in group.questions" :key="item.q" class="info-q">
                            <b>{{ item.q }}</b>
                            <div class="info-prose" v-html="item.a"></div>
                        </div>
                    </div>
                </template>

                <!-- Navigation -->
                <template v-else-if="openKey === 'navigation'">
                    <p class="info-lead">Every page on the site, grouped the way the menu groups them.</p>
                    <div class="info-cols">
                        <div v-for="group in navigationData" :key="group.group">
                            <div class="u-eyebrow">{{ group.group }}</div>
                            <router-link v-for="page in group.pages" :key="page.name" :to="page.to" class="info-nav">
                                <span class="info-nav__n">{{ page.name }} <code>{{ page.path || page.to }}</code></span>
                                <span class="info-nav__d">{{ page.desc }}</span>
                            </router-link>
                        </div>
                    </div>
                </template>

                <!-- Reference -->
                <template v-else-if="openKey === 'reference'">
                    <MarksLegend />
                </template>

                <!-- Staff & contact -->
                <template v-else-if="openKey === 'staff'">
                    <p class="info-lead">
                        Moderators and Elder Moderators decide level positions, place levels, take part
                        in quality control and keep the site up to date. Each Admin manages one area of
                        the project; the List Leader oversees the list and its staff.
                    </p>
                    <div class="info-cols">
                        <div>
                            <div class="u-eyebrow">The team <span v-if="editors.length" class="u-count">{{ editors.length }}</span></div>
                            <div class="info-people">
                                <div v-for="(editor, i) in editors" :key="editor.name + i" class="info-person">
                                    <img :src="'/assets/' + (roleIconMap[editor.role] || 'user-lock') + (store.dark ? '' : '-dark') + '.svg'" :alt="''" />
                                    <a v-if="editor.link && editor.link !== '#'" :href="editor.link" target="_blank" rel="noopener">{{ editor.name }}</a>
                                    <span v-else>{{ editor.name }}</span>
                                    <span class="u-chip">{{ roleLabel(editor.role) }}</span>
                                </div>
                                <p v-if="!editors.length" class="info-note">The staff list could not be loaded.</p>
                            </div>
                        </div>
                        <div>
                            <div class="u-eyebrow">Where to take what</div>
                            <dl class="u-dl">
                                <template v-for="row in contactRouting" :key="row.what">
                                    <dt>{{ row.what }}</dt><dd>{{ row.where }}</dd>
                                </template>
                            </dl>
                            <div class="info-winlinks">
                                <a class="u-btn" href="https://discord.gg/QRX47v2qyC" target="_blank" rel="noopener">
                                    <img src="/assets/discord.svg" alt="" width="14" height="14" />discord.gg/QRX47v2qyC
                                </a>
                                <a class="u-btn u-btn--ghost" href="https://x.com/ull_gd" target="_blank" rel="noopener">@ull_gd</a>
                            </div>
                            <p class="info-note">
                                Individual handles for the people above are listed under
                                <button type="button" class="info-link" @click="goSection('contacts')">Contacts</button>
                                in the guidelines.
                            </p>
                        </div>
                    </div>
                </template>

                <!-- API -->
                <template v-else-if="openKey === 'api'">
                    <p class="info-lead">
                        Everything on this site comes from a public JSON API. It needs no key and no
                        signup, and it sends <code>Access-Control-Allow-Origin: *</code>, so a page or a
                        bot can read the list directly from a browser.
                    </p>
                    <h4 class="info-h4">Base URL</h4>
                    <pre class="info-pre">{{ apiData.base }}</pre>
                    <h4 class="info-h4">Endpoints</h4>
                    <table class="info-tbl">
                        <thead><tr><th class="info-tbl__path">Path</th><th>Returns</th></tr></thead>
                        <tbody>
                            <tr v-for="row in apiData.endpoints" :key="row.path">
                                <td class="info-mono"><span class="info-get">GET</span>{{ row.path }}</td>
                                <td>{{ row.returns }}</td>
                            </tr>
                        </tbody>
                    </table>
                    <p class="info-note">
                        Writing to the list needs a staff API key and is not part of the public API.
                        There is no leaderboard endpoint either; the leaderboard is calculated from
                        <code>/api/list</code> by the rules under &ldquo;How are leaderboard points
                        calculated?&rdquo; in the FAQ.
                    </p>
                    <h4 class="info-h4">Example</h4>
                    <pre class="info-pre">{{ apiData.example }}</pre>
                    <h4 class="info-h4">The level object</h4>
                    <table class="info-tbl">
                        <thead><tr><th class="info-tbl__field">Field</th><th class="info-tbl__type">Type</th><th>Meaning</th></tr></thead>
                        <tbody>
                            <tr v-for="row in apiData.fields" :key="row.name">
                                <td class="info-mono">{{ row.name }}</td>
                                <td>{{ row.type }}</td>
                                <td>{{ row.meaning }}</td>
                            </tr>
                        </tbody>
                    </table>
                    <h4 class="info-h4">Fair use</h4>
                    <div class="info-prose">
                        <ul><li v-for="rule in apiData.fairUse" :key="rule">{{ rule }}</li></ul>
                    </div>
                </template>

            </div>
        </div>
    </div>
</main>
    `,
    data: () => ({
        store,
        roleIconMap,
        guidelinesData,
        navigationData,
        faqData,
        apiData,
        coloringLegend,
        pendingLegend,
        contactRouting,
        // Constants, not state: every count is the length of the array behind
        // it, computed once in js/info-windows.js.
        sectionCount,
        faqCount,
        pageCount,
        markCount,
        editors: [],
        query: '',
        // Whether this component pushed the ?open= entry, so closing can go back
        // rather than stacking another entry on the history.
        pushed: 0,
    }),
    computed: {
        openKey() {
            const key = this.$route.query.open;
            return WINDOWS.includes(key) ? key : '';
        },
        activeSection() {
            const id = this.$route.query.section;
            return flatSections.some((s) => s.id === id) ? id : flatSections[0].id;
        },
        current() {
            return flatSections.find((s) => s.id === this.activeSection) || flatSections[0];
        },
        sectionIndex() {
            return flatSections.findIndex((s) => s.id === this.current.id);
        },
        prevSection() { return flatSections[this.sectionIndex - 1] || null; },
        nextSection() { return flatSections[this.sectionIndex + 1] || null; },
        navPreview() {
            return navigationData.flatMap((g) => g.pages.map((p) => p.name)).slice(0, 7);
        },
        winTitle() { return WINDOW_TITLES[this.openKey] || ''; },
        winEyebrow() { return WINDOW_EYEBROWS[this.openKey] || ''; },
        // The index runs over the guidelines, the FAQ, the endpoints, the level
        // fields and both legends; it is shared with /mobile/info.
        results() { return searchInformation(this.query); },
    },
    methods: {
        roleLabel,
        open(key, section) {
            const query = { ...this.$route.query, open: key };
            if (section) query.section = section; else delete query.section;
            this.pushed += 1;
            this.$router.push({ query });
        },
        close() {
            if (this.pushed > 0) {
                this.pushed -= 1;
                this.$router.back();
                return;
            }
            // Arrived straight at /information?open=…: there is nothing of ours
            // to go back to, so drop the query without growing the history.
            const query = { ...this.$route.query };
            delete query.open;
            delete query.section;
            this.$router.replace({ query });
        },
        goSection(id) {
            if (this.openKey === 'guidelines') {
                this.pushed += 1;
                this.$router.push({ query: { ...this.$route.query, open: 'guidelines', section: id } });
            } else {
                this.open('guidelines', id);
            }
        },
        openHit(hit) {
            this.query = '';
            this.open(hit.kind, hit.kind === 'guidelines' ? hit.section : undefined);
        },
        onKeydown(e) {
            if (e.key === 'Escape') {
                if (this.openKey) { this.close(); return; }
                if (this.query) this.query = '';
                return;
            }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
                e.preventDefault();
                this.$refs.search?.focus();
            }
        },
    },
    watch: {
        openKey(key) {
            if (!key) return;
            this.$nextTick(() => this.$refs.win?.focus());
        },
        // A different section is a different read: start it at the top rather
        // than wherever the previous one was scrolled to.
        activeSection() {
            this.$nextTick(() => { if (this.$refs.body) this.$refs.body.scrollTop = 0; });
        },
    },
    async mounted() {
        window.addEventListener('keydown', this.onKeydown);
        this.editors = await fetchEditors().then((r) => r || []);
    },
    beforeUnmount() {
        window.removeEventListener('keydown', this.onKeydown);
    },
};
