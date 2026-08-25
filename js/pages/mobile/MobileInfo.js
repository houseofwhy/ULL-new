import { store } from '../../main.js';
import { guidelinesData } from '../../_guidelines.js';
import { mobileStore } from './mobileStore.js';

const roleIconMap = {
    owner: 'crown',
    admin: 'user-gear',
    seniormod: 'user-shield',
    mod: 'user-lock',
    dev: 'code',
};

export default {
    template: `
        <div class="mob-info">
            <button v-if="showScrollTop" class="mob-scroll-top-btn" @click="scrollToTop">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708l6-6z"/></svg>
                Return to top
            </button>
            <!-- Hero -->
            <div class="mob-info-hero">
                <h1>Upcoming Levels List</h1>
                <p>The Upcoming Levels List (ULL) is a community-maintained catalogue of upcoming Top 1-100 Extreme Demons in Geometry Dash projected to place on the Demonlist. It aims to forecast future rankings with the inclusion of worthy unrates.</p>
            </div>

            <!-- Cards -->
            <div class="mob-info-content">
                <!-- List Editors -->
                <div class="mob-info-card">
                    <div class="mob-info-card__title">List Editors</div>
                    <div class="mob-info-editors">
                        <div v-for="editor in mobileStore.editors" class="mob-info-editor">
                            <img :src="'/assets/' + (roleIconMap[editor.role] || 'user-lock') + (store.dark ? '' : '-dark') + '.svg'" :alt="editor.role" />
                            <a v-if="editor.link && editor.link !== '#'" :href="editor.link" target="_blank">{{ editor.name }}</a>
                            <span v-else>{{ editor.name }}</span>
                            <span class="mob-info-role" :class="'mob-info-role-' + editor.role">{{ roleLabelMap[editor.role] || editor.role }}</span>
                        </div>
                    </div>
                </div>

                <!-- Level Coloring -->
                <div class="mob-info-card">
                    <div class="mob-info-card__title">Level Coloring</div>
                    <p class="mob-info-coloring-desc">When Level Coloring is enabled, level names in the list are color-coded based on their decoration progress and verification status.</p>
                    <div class="mob-info-legend">
                        <div class="mob-info-legend-row"><span class="mob-info-legend-dot" style="background:#5599ff"></span>On layout state<span class="mob-info-legend-label">Deco 0%</span></div>
                        <div class="mob-info-legend-row"><span class="mob-info-legend-dot" style="background:#33dddd"></span>Deco is 1%–29% finished<span class="mob-info-legend-label">Early deco</span></div>
                        <div class="mob-info-legend-row"><span class="mob-info-legend-dot" style="background:#55ee55"></span>Deco is 30%–69% finished<span class="mob-info-legend-label">Mid deco</span></div>
                        <div class="mob-info-legend-row"><span class="mob-info-legend-dot" style="background:#ffee55"></span>Deco is 70%–99% finished<span class="mob-info-legend-label">Late deco</span></div>
                        <div class="mob-info-legend-row"><span class="mob-info-legend-dot" style="background:#ffaa44"></span>Decoration finished<span class="mob-info-legend-label">Deco 100%</span></div>
                        <div class="mob-info-legend-row"><span class="mob-info-legend-dot" style="background:#ff6622"></span>Verification progress 30%–59%<span class="mob-info-legend-label">Early verify</span></div>
                        <div class="mob-info-legend-row"><span class="mob-info-legend-dot" style="background:#ff5555"></span>Verification progress 60%–99%<span class="mob-info-legend-label">Late verify</span></div>
                        <div class="mob-info-legend-row"><span class="mob-info-legend-dot" style="background:#bbbbbb"></span>Verified, not rated</div>
                        <div class="mob-info-legend-row"><span class="mob-info-legend-dot" style="background:#ffffff; border:1px solid #555;"></span>Verified and rated</div>
                        <div class="mob-info-legend-row"><span style="font-size:0.65rem; width:0.65rem; text-align:center; flex-shrink:0;">🚫</span>Pending for removal</div>
                    </div>
                </div>

                <!-- Pending List Legend -->
                <div class="mob-info-card">
                    <div class="mob-info-card__title">Pending List Legend</div>
                    <div class="mob-info-pending">
                        <div class="mob-info-pending-row"><img src="/assets/move-up.svg" alt="up" />Moving Up</div>
                        <div class="mob-info-pending-row"><img src="/assets/move-down.svg" alt="down" />Moving Down</div>
                        <div class="mob-info-pending-row"><img src="/assets/1.svg" alt="1" />Pending #1</div>
                        <div class="mob-info-pending-row"><img src="/assets/10.svg" alt="10" />Pending Top 10</div>
                        <div class="mob-info-pending-row"><img src="/assets/20.svg" alt="20" />Pending Top 20</div>
                        <div class="mob-info-pending-row"><img src="/assets/30.svg" alt="30" />Pending Top 30</div>
                        <div class="mob-info-pending-row"><img src="/assets/50.svg" alt="50" />Pending Top 50</div>
                        <div class="mob-info-pending-row"><img src="/assets/75.svg" alt="75" />Pending Top 75</div>
                        <div class="mob-info-pending-row"><img src="/assets/question.svg" alt="?" />Unknown Placement</div>
                    </div>
                </div>

                <!-- Guidelines -->
                <div class="mob-info-gl">
                    <div class="mob-info-gl-header">
                        <h2>Guidelines</h2>
                        <p class="mob-info-coloring-desc">How the Upcoming Levels List works — rules, criteria, and procedures</p>
                        <input class="mob-info-gl-search" type="text" placeholder="Search guidelines..." v-model="mobGlSearch" />
                    </div>
                    <div class="mob-info-toc">
                        <template v-for="group in mobFilteredGuidelines" :key="group.id">
                            <div class="mob-info-toc-group">{{ group.group }}</div>
                            <a v-for="section in group.sections" :key="section.id"
                               class="mob-info-toc-link"
                               :class="{ active: mobActiveSection === section.id }"
                               @click="mobScrollToSection(section.id)">
                                {{ section.title }}
                            </a>
                        </template>
                    </div>
                    <div class="mob-info-gl-content" ref="mobGlContent">
                        <template v-if="mobFilteredGuidelines.length">
                            <template v-for="group in mobFilteredGuidelines" :key="group.id">
                                <div class="mob-info-gl-group-header" :id="'mob-gl-group-' + group.id">
                                    <h2>{{ group.group }}</h2>
                                </div>
                                <div v-if="group.intro" class="mob-info-gl-intro" v-html="group.intro"></div>
                                <div v-for="section in group.sections" :key="section.id"
                                     :id="'mob-gl-' + section.id"
                                     class="mob-info-gl-section">
                                    <h3>{{ section.title }}</h3>
                                    <div v-html="section.content"></div>
                                </div>
                            </template>
                        </template>
                        <div v-else class="mob-info-gl-no-results">
                            <span>🔍</span>
                            <p>No guidelines match your search.</p>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    `,
    data: () => ({
        store,
        mobileStore,
        roleIconMap,
        roleLabelMap: { owner: 'Owner', admin: 'Admin', seniormod: 'Sr. Mod', mod: 'Mod', dev: 'Dev' },
        mobGlSearch: '',
        mobActiveSection: guidelinesData.length && guidelinesData[0].sections.length ? guidelinesData[0].sections[0].id : '',
        showScrollTop: false,
    }),
    computed: {
        mobFilteredGuidelines() {
            const q = this.mobGlSearch.trim().toLowerCase();
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
    mounted() {
        const container = this.$el.closest('.mob-content');
        if (container) {
            this._scrollEl = container;
            this._onScroll = () => { this.showScrollTop = container.scrollTop > 300; };
            container.addEventListener('scroll', this._onScroll, { passive: true });
        }
    },
    beforeUnmount() {
        if (this._scrollEl) this._scrollEl.removeEventListener('scroll', this._onScroll);
    },
    methods: {
        scrollToTop() {
            if (this._scrollEl) this._scrollEl.scrollTo({ top: 0, behavior: 'smooth' });
        },
        mobScrollToSection(id) {
            const el = document.getElementById('mob-gl-' + id);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                this.mobActiveSection = id;
            }
        },
    },
};
