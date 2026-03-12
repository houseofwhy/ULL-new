import { store } from '../main.js';
import { embed } from '../util.js';
import { fetchList } from '../content.js';
import { getLevelNameStyle, getThumbnail, isOldLevel, applyFiltersToList, makeFiltersListCopy } from './listHelpers.js';
import { levelDetailTpl } from './levelDetailTpl.js';
import Sidebar from './Sidebar.js';
import FiltersModal from './FiltersModal.js';
import SettingsModal from './SettingsModal.js';
import Spinner from '../components/Spinner.js';

export default {
    components: { Sidebar, FiltersModal, SettingsModal, Spinner },
    template: `
    <div class="pc-shell" :class="{ dark: store.dark }">
        <Sidebar @open-settings="showSettings = true" />
        <div class="pc-page">
            <div class="pc-toolbar">
                <input class="pc-search" v-model="search" @input="applyFilters" placeholder="Search levels…" />
                <button class="pc-filters-btn" :class="{'is-active': activeFilterCount > 0}" @click="showFilters = true">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="10" y1="18" x2="14" y2="18"/></svg>
                    Filters{{ activeFilterCount > 0 ? ' (' + activeFilterCount + ')' : '' }}
                </button>
            </div>
            <div v-if="loading" class="pc-spinner"><Spinner /></div>
            <div v-else class="pc-cols pc-cols--45-55">
                <div class="pc-col">
                    <table class="pc-list">
                        <tr v-for="([level, err], i) in list" :key="i"
                            class="pc-list-row"
                            :class="{ 'is-active': selected === i, 'level-hidden': level && level.isHidden }"
                            @click="selected = i; toggledShowcase = false">
                            <td class="pc-list-rank">{{ level ? (level.rankNum || ('#' + (i+1))) : '#'+(i+1) }}</td>
                            <td class="pc-list-content">
                                <div class="pc-list-inner">
                                    <img v-if="store.showThumbnails && level" class="pc-list-thumb" :src="getThumbnail(level)" alt="" />
                                    <div class="pc-list-text">
                                        <div class="pc-list-name" :style="store.showColors ? getLevelNameStyle(level, selected===i) : {}">
                                            {{ level ? (store.showColors && isOldLevel(level) && !level.isVerified ? level.name + ' 🚫' : level.name) : ('Error: ' + err) }}
                                        </div>
                                        <div class="pc-list-sub" v-if="level">{{ level.author }} · {{ level.verifier }}</div>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </table>
                </div>
                <div class="pc-col">${levelDetailTpl}</div>
            </div>
        </div>
        <FiltersModal v-if="showFilters" :initialFilters="filtersList" @close="showFilters = false" @apply="onApply" />
        <SettingsModal v-if="showSettings" @close="showSettings = false" />
    </div>`,
    data: () => ({
        store, list: [], loading: true, selected: 0, toggledShowcase: false,
        search: '', filtersList: makeFiltersListCopy(),
        showFilters: false, showSettings: false,
    }),
    computed: {
        level() { return this.list[this.selected]?.[0] ?? null; },
        video() {
            if (!this.level) return '';
            if (!this.level.showcase) return embed(this.level.verification);
            return embed(this.toggledShowcase || !this.level.isVerified ? this.level.showcase : this.level.verification);
        },
        activeFilterCount() { return this.filtersList.filter(f => f.active && !f.separator).length; },
    },
    methods: {
        getLevelNameStyle, getThumbnail, isOldLevel,
        applyFilters() { applyFiltersToList(this.list, this.filtersList, this.search); },
        onApply(filters) { this.filtersList = filters; this.applyFilters(); },
    },
    async mounted() {
        const all = await fetchList();
        this.list = all ? all.filter(([l]) => l?.isMain) : [];
        this.loading = false;
    },
};
