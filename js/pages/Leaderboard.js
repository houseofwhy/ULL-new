import { store } from '../main.js';
import { embed, filtersList, filtersSetup } from '../util.js';
import { fetchEditors, fetchList } from '../content.js';

import Spinner from '../components/Spinner.js';
import LevelAuthors from '../components/List/LevelAuthors.js';
import ListEditors from "../components/ListEditors.js";

const roleIconMap = {
    owner: 'crown',
    admin: 'user-gear',
    seniormod: 'user-shield',
    mod: 'user-lock',
    dev: 'code',
};

export default {
    components: { Spinner, LevelAuthors, ListEditors },
    template: `
        <main v-if="loading" class="surface">
            <Spinner></Spinner>
        </main>
        <header v-if="!loading" class="new" :style="store.dark ? '--tab-active-bg: var(--color-background); --tab-active-color: var(--color-on-background);' : '--tab-active-bg: var(--color-on-background); --tab-active-color: var(--color-background);'">
            <style>
                header.new .nav__tab.router-link-active {
                    background-color: var(--tab-active-bg);
                    color: var(--tab-active-color);
                    border-color: transparent;
                }
            </style>
            <nav class="nav">
                <div style="flex-grow:1"></div>
				<div :class="{ 'filters-selected': isFiltersActive }" class="filters">
					<div style="display:flex; align-items:center;">
						<button @click="showThumbnails = !showThumbnails" class="color-toggle-btn thumb-toggle-btn" :class="{ active: showThumbnails }" title="Toggle thumbnails">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="25" height="25">
								<rect v-if="!showThumbnails" x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2.5"/>
								<rect v-if="showThumbnails" x="3" y="5" width="18" height="14" rx="2" fill="currentColor"/>
								<path v-if="showThumbnails" fill="none" stroke="white" stroke-width="1.5" stroke-linejoin="round" d="M8 15l3-4 2.5 3 1.5-2 3 3"/>
								<circle v-if="showThumbnails" cx="8.5" cy="9.5" r="1.5" fill="white"/>
							</svg>
						</button>
						<button @click="showColors = !showColors" class="color-toggle-btn" :class="{ active: showColors }" title="Toggle level name colors">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
								<path v-if="!showColors" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" d="M12 2C9.38 2 4 9.22 4 14a8 8 0 0016 0c0-4.78-5.38-12-8-12z"/>
								<path v-if="showColors" fill="currentColor" d="M12 2C9.38 2 4 9.22 4 14a8 8 0 0016 0c0-4.78-5.38-12-8-12z"/>
							</svg>
						</button>
						<div class="filters-text" @click="filtersToggle">Filters <img :src="\`/assets/arrow-down\${store.dark ? '-dark' : ''}.svg\`" style="display:inline; vertical-align: middle;"></div>
					</div>
					<div class="filters-collapse">
						<div class="filters-menu"
							:style="{
								backgroundColor: !store.dark ? 'white' : 'black',
								color: !store.dark ? 'black' : 'white'
							}"
						>
							<div class="filters-numeric">
								<label class="filters-numeric-label">Min Decoration %</label>
								<input class="filters-numeric-input" type="number" min="0" max="100" v-model.number="minDecoration" @click.stop @input="applyFilters()" placeholder="0" />
							</div>
							<div class="filters-numeric">
								<label class="filters-numeric-label">Min Verification %</label>
								<input class="filters-numeric-input" type="number" min="0" max="100" v-model.number="minVerification" @click.stop @input="applyFilters()" placeholder="0" />
							</div>
							<div class="separator-filter"></div>
							<div class="filters-one"
 								v-for="(item,index) in filtersList"
								:key="index"
      								:class="{ active: item.active }"
                                 @click="useFilter(index)"
								>
								<div class="separator-filter" v-if="item.separator"></div>
								<div v-else>
									<span>✓</span> {{item.name}}
								</div>
							</div>
						</div>
					</div>
				</div>
            </nav>
        </header>
        <h2 v-if="!loading" class="type-label-lg" style="font-weight: normal; font-size: 24px; margin: 30px 0 30px 0; letter-spacing: 0.35px; padding: 0 1rem;">
            The leaderboard shows closest to verification upcoming levels
        </h2>
        <main v-if="!loading" class="page-list">
            <div class="list-container surface" style="padding-block: 0rem;">
                <table class="list" v-if="list">
                    <tr v-for="([level, err], i) in list" :class="{ 'level-hidden': level?.isHidden }">
                        <td class="rank">
                            <p class="type-label-lg">#{{ i + 1 }}</p>
                        </td>
                        <td class="level" :class="{ 'active': selected == i, 'error': !level }">
                            <button @click="selected = i" style="display:flex;align-items:center;gap:0.75rem;">
                                <img v-if="showThumbnails && level" :src="getThumbnail(level)" style="width:5.33rem;height:3rem;object-fit:cover;border-radius:0.35rem;flex-shrink:0;" alt="" />
                                <span class="type-label-lg" :style="showColors ? getLevelNameStyle(level, selected == i) : {}">{{ level?.name || \`Error (\${err}.json)\` }}</span>
                            </button>
                        </td>
                    </tr>
                </table>
            </div>
            <div class="level-container surface" style="padding-block: 2rem;">
                <div class="level" v-if="level">
                    <h1>{{ level.name }}</h1>
                    <LevelAuthors :author="level.author" :creators="level.creators" :verifier="level.verifier"></LevelAuthors>
                    <div>
                        <div v-if="bestRecord" class="best-record">
                            <p class="type-body">
                                Best progress from 0: <a :href="bestRecord.link != '#' ? bestRecord.link : undefined" :target="bestRecord.link != '#' ? '_blank' : undefined" :style="bestRecord.link != '#' ? 'text-decoration: underline; cursor: pointer;' : ''"><span :style="bestRecord.link != '#' ? 'color: #00b825;' : ''">{{ bestRecord.percent }}%</span> by {{ bestRecord.user }}</a>
                            </p>
                        </div>
                        <div v-if="bestRun" class="best-run">
                            <p class="type-body">
                                Best run: <a :href="bestRun.link != '#' ? bestRun.link : undefined" :target="bestRun.link != '#' ? '_blank' : undefined" :style="bestRun.link != '#' ? 'text-decoration: underline; cursor: pointer;' : ''"><span :style="bestRun.link != '#' ? 'color: #00b825;' : ''">{{ bestRun.percent }}%</span> by {{ bestRun.user }}</a>
                            </p>
                        </div>
                    </div>
                    <div v-if="level.isVerified" class="tabs; height: 45px;">
                        <button class="tab" :class="{selected: !toggledShowcase}" @click="toggledShowcase = false">
                            <span class="type-label-lg">Verification</span>
                        </button>
                        <button class="tab" :class="{selected: toggledShowcase}" @click="toggledShowcase = true">
                            <span class="type-label-lg">Showcase</span>
                        </button>
                    </div>
                    <div>
                        <iframe class="video" id="videoframe" :src="video" frameborder="0"></iframe>
                    </div>
                </div>
                <div v-else class="level" style="height: 100%; justify-content: center; align-items: center;">
                    <p>(ノಠ益ಠ)ノ彡┻━┻</p>
                </div>
            </div>
            <div class="meta-container surface" style="padding-block: 2rem;">
                <div class="meta">
                    <div class="errors" v-show="errors.length > 0">
                        <p class="error" v-for="error of errors">{{ error }}</p>
                    </div>
                    <ListEditors :editors="editors" />
                </div>
            </div>
        </main>
    `,
    data: () => ({
        list: [],
        editors: [],
        loading: true,
        selected: 0,
        errors: [],
        roleIconMap,
        store,
        toggledShowcase: false,
        showThumbnails: true,
        showColors: true,
        isFiltersActive: false,
        filtersList: filtersList,
        search: "",
        minDecoration: 0,
        minVerification: 0,
    }),
    computed: {
        level() {
            if (!this.list.length) return null;
            return this.list[this.selected][0];
        },
        video() {
            if (!this.level) return;
            if (!this.level.verification) {
                return embed(this.level.showcase);
            }
            return embed(
                this.toggledShowcase
                    ? this.level.showcase
                    : this.level.verification
            );
        },
        bestRecord() {
            if (!this.level || !this.level.records || this.level.records.length === 0) {
                return null;
            }
            const sortedRecords = [...this.level.records].sort((a, b) => b.percent - a.percent);
            if (sortedRecords[0].percent === 0) {
                return null;
            }
            return sortedRecords[0];
        },
        bestRun() {
            if (!this.level || !this.level.run || this.level.run.length === 0) {
                return null;
            }
            const sortedRuns = [...this.level.run].sort((a, b) => {
                const diffA = (parseInt(a.percent.split('-')[1]) || 0) - (parseInt(a.percent.split('-')[0]) || 0);
                const diffB = (parseInt(b.percent.split('-')[1]) || 0) - (parseInt(b.percent.split('-')[0]) || 0);
                return diffB - diffA;
            });
            const best = sortedRuns[0];
            const parts = String(best.percent).split('-').map(Number);
            const diff = (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) ? parts[1] - parts[0] : 0;
            if (diff === 0) {
                return null;
            }
            return {
                ...best,
                diff: diff,
            };
        }
    },
    async mounted() {
        let list = await fetchList();
        this.editors = await fetchEditors();

        if (!list) {
            this.errors = [
                'Failed to load list. Retry in a few minutes or notify list staff.',
            ];
        } else {
            list.forEach(([level, err]) => {
                if (err) {
                    this.errors.push(`Failed to load level. (${err}.json)`);
                    return;
                }

                let maxPercent = 0;
                if (level.records && level.records.length > 0) {
                    maxPercent = Math.max(0, ...level.records.map(record => record.percent));
                }

                let maxRunDifference = 0;
                if (level.run && level.run.length > 0) {
                    const differences = level.run.map(runRecord => {
                        const parts = String(runRecord.percent).split('-').map(Number);
                        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                            return parts[1] - parts[0];
                        }
                        return 0;
                    });
                    maxRunDifference = Math.max(0, ...differences);
                }

                level.maxPercent = maxPercent;
                level.maxRunDifference = maxRunDifference;
                level.rankingScore = Math.max(maxPercent, maxRunDifference) ** 2 + Math.min(maxPercent, maxRunDifference) ** 1.8;
            });

            const filteredList = list.filter(([level, err]) => level && !level.isVerified && level.rankingScore > 0 && !((level.records || []).some(r => Number(r.percent) >= 100)));
            this.list = filteredList.sort((a, b) => b[0].rankingScore - a[0].rankingScore);

            if (!this.editors) {
                this.errors.push('Failed to load list editors.');
            }
        }

        this.loading = false;
    },
    methods: {
        embed,
        filtersToggle() { this.isFiltersActive = !this.isFiltersActive; },
        getLevelNameStyle(level, isSelected) {
            if (!level) return {};
            const dark = !this.store.dark;
            if (level.tags && level.tags.includes('Unrated')) {
                const c = isSelected ? (dark ? '#dddddd' : '#888888') : (dark ? '#bbbbbb' : '#666666');
                return { color: c, fontWeight: 'normal' };
            }
            if (level.tags && level.tags.includes('Rated')) return { color: dark ? '#ffffff' : '#000000', fontWeight: 'normal' };
            const recordPercent = Math.max(0, ...((level.records || []).map(r => Number(r.percent) || 0)));
            const runPercent = Math.max(0, ...((level.run || []).map(r => {
                const parts = String(r.percent).split('-').map(Number);
                return (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) ? Math.abs(parts[1] - parts[0]) : 0;
            })));
            const vP = Math.max(recordPercent, runPercent);
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
        getThumbnail(level) {
            if (level.thumbnail) return level.thumbnail;
            const extractYT = (url) => {
                if (!url) return '';
                const m = url.match(/.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=)([^#&?]*).*/);
                return m ? `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg` : '';
            };
            return extractYT(level.verification) || extractYT(level.showcase) || '';
        },
        useFilter(index) {
            if (filtersList[index].separator) return;
            this.filtersList[index].active = !this.filtersList[index].active;
            this.applyFilters();
        },
        applyFilters() {
            if (!this.list) return;
            const activeFilters = this.filtersList.filter(f => f.active && !f.separator);
            const minDec = this.minDecoration || 0;
            const minVer = this.minVerification || 0;
            this.list.forEach(item => {
                const level = item[0];
                if (!level) return;
                let matchesTags = true;
                if (activeFilters.length > 0) {
                    for (const filter of activeFilters) {
                        if (!level.tags || !level.tags.includes(filter.key)) {
                            matchesTags = false;
                            break;
                        }
                    }
                }
                const decoration = level.percentFinished ?? 0;
                const matchesDecoration = decoration >= minDec;
                const recordPercent = Math.max(0, ...((level.records || []).map(r => Number(r.percent) || 0)));
                const runPercent = Math.max(0, ...((level.run || []).map(r => {
                    const parts = String(r.percent).split('-').map(Number);
                    return (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) ? Math.abs(parts[1] - parts[0]) : 0;
                })));
                const verificationProgress = Math.max(recordPercent, runPercent);
                const matchesVerification = verificationProgress >= minVer;
                level.isHidden = !(matchesTags && matchesDecoration && matchesVerification);
            });
        },
    },
};
