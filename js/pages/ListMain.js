import { store } from "../main.js";
import { embed, filtersList, filtersSetup, getYoutubeIdFromUrl, getThumbnailFromId } from "../util.js";
import { score } from "../score.js";
import { fetchEditors, fetchList } from "../content.js";

import Spinner from "../components/Spinner.js";
import LevelAuthors from "../components/List/LevelAuthors.js";
import ListEditors from "../components/ListEditors.js";

// Set to false to hide thumbnails in the level list
const SHOW_THUMBNAILS = false;

// Set to false to disable level name coloring
const SHOW_COLORS = false;

const roleIconMap = {
    owner: "crown",
    admin: "user-gear",
    seniormod: "user-shield",
    mod: "user-lock",
    dev: "code",
};

export default {
    components: { Spinner, LevelAuthors, ListEditors },
    template:
        `
	<component :is="'style'">

        .search {
            width: 100%;
            padding: 10px;
            background-color: rgba(255, 255, 255, 0.05);
            color: var(--color-on-background);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            margin-bottom: 15px;
            font-family: inherit;
            font-size: 16px;
            box-sizing: border-box;
        }
        .search:focus {
            outline: 2px solid var(--color-primary);
            background-color: rgba(255, 255, 255, 0.1);
        }
	</component>
	<header class="new">

            <nav class="nav">
                <router-link class="nav__tab" to="/">
                    <span class="type-label-lg">All Levels</span>
                </router-link>
                <router-link class="nav__tab" to="/listmain">
                    <span class="type-label-lg">Main List</span>
                </router-link>
                <router-link class="nav__tab" to="/listfuture">
                    <span class="type-label-lg">Future List</span>
                </router-link>
								` +
        filtersSetup +
        `
            </nav>
        </header>
		<main v-if="loading" class="surface">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-list">
            <div class="list-container surface">
                <input
                    v-model="search"
                    class="search"
                    type="text"
                    placeholder="Search levels..."
                >
                <table class="list" v-if="list">
                    <tr v-for="([level, err], i) in list" :class="{ 'level-hidden': level?.isHidden}">
                        <td class="rank">
							<span :class="{ 'rank-verified': level?.isVerified}">
                                <p v-if="i + 1 <= 500" class="type-label-lg">#{{ i + 1 }}</p>
                                <p v-else class="type-label-lg" :style="SHOW_COLORS ? getLevelNameStyle(level, selected == i) : {}">Leg</p>
							</span>
                        </td>
                        <td class="level" :class="{ 'active': selected == i, 'error': !level }">
                            <button @click="selected = i">
                                <img v-if="level && SHOW_THUMBNAILS" class="level-thumbnail" :src="getThumbnail(level)" alt="" />
                                <span :class="{ 'rank-verified': level?.isVerified}">
                                    <span class="type-label-lg" :style="SHOW_COLORS ? getLevelNameStyle(level, selected == i) : {fontWeight: level?.isVerified ? 'bold' : 'normal'}">{{ level?.name || \`Error (\${err}.json)\` }}</span>
                                </span>
                            </button>
                        </td>
                    </tr>
                </table>
            </div>
            <div class="level-container surface">
                <div class="level" v-if="level">
                    <h1>{{ level.name }}</h1>
                    <LevelAuthors :author="level.author" :creators="level.creators" :verifier="level.verifier" :isVerified="level.isVerified"></LevelAuthors>
                    <div style="display:flex">
                        <div v-for="tag in level.tags" class="tag">{{tag}}</div>
                    </div>
                        <div>
                            <div v-if="!level.isVerified && level.records[0].percent != 100">
                                <div v-if="!level.isVerified && level.records[0].percent != 0" class="worldrecord">
                                    <p class="type-body">
                                            World Record - From 0: {{level.records[0].percent}}% by {{level.records[0].user}}
                                    </p>
                                </div>
                                <div v-if="!level.isVerified && level.records[0].percent == 0" class="worldrecord">
                                    <p class="type-body">
                                            World Record - From 0: None
                                    </p>
                                </div>
                                <div v-if="!level.isVerified && level.run[0].percent != '0'" class="worldrecord">
                                    <p class="type-body">
                                            World Record - Run: {{level.run[0].percent}}% by {{level.run[0].user}}
                                    </p>
                                </div>
                                <div v-if="!level.isVerified && level.run[0].percent == '0'" class="worldrecord">
                                    <p class="type-body">
                                            World Record - Run: None
                                    </p>
                                </div>
                            </div>
                            <div v-if="!level.isVerified && level.records[0].percent == 100" class="worldrecord">
                                <p class="type-body">
                                    Layout verified by {{level.records[0].user}}
                                </p>
                            </div>
                            <div class="lvlstatus">
                                <p class="type-body">
                                    <template v-if="level.isVerified">
                                            Status: Verified
                                    </template>
                                    <template v-if="level.percentFinished == 0">
                                            Status: Layout
                                    </template>
                                    <template v-if="level.percentFinished == 100 && !level.isVerified">
                                            Status: Being Verified
                                    </template>
                                    <template v-if="level.percentFinished != 0 && level.percentFinished != 100">
                                            Status: Decoration being made - {{level.percentFinished}}% done
                                    </template>
                                </p>
                            </div>
                        </div>
                    <div v-if="level.isVerified" class="tabs">
                        <button class="tab" :class="{selected: toggledShowcase || !level.isVerified}" @click="toggledShowcase = true">
                                <span class="type-label-lg">Showcase</span>
                        </button>
                        <template v-if="level.isVerified">
                            <button class="tab type-label-lg" :class="{selected: !toggledShowcase}" @click="toggledShowcase = false">
                                <span class="type-label-lg">Verification</span>
                            </button>
                        </template>
                    </div>
                    <iframe class="video" id="videoframe" :src="video" frameborder="0"></iframe>
                    <ul class="stats">

                        <li>
                            <div class="type-title-sm">ID</div>
                            <p>{{ (level.id === "private" && level.leakID != null) ? level.leakID : level.id }}</p>
                        </li>
                        <li>
                            <div class="type-title-sm">Length</div>
                            <p>{{Math.floor(level.length/60)}}m {{level.length%60}}s</p>
                        </li>
						<li>
                            <div class="type-title-sm">Last Update</div>
                            <p>{{level.lastUpd}}</p>
                        </li>
                    </ul>
                </div>
                <div v-else class="level" style="height: 100%; justify-content: center; align-items: center;">
                    <p>(ノಠ益ಠ)ノ彡┻━┻</p>
                </div>
            </div>
            <div class="meta-container surface">
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
        isFiltersActive: false,
        filtersList: filtersList,
        SHOW_THUMBNAILS,
        SHOW_COLORS,
        search: "",
        minDecoration: 0,
        minVerification: 0,
    }),
    watch: {
        search() {
            this.applyFilters();
        }
    },
    computed: {
        level() {
            return this.list[this.selected][0];
        },
        video() {
            if (!this.level.showcase) {
                return embed(this.level.verification);
            }

            return embed(
                this.toggledShowcase || !this.level.isVerified
                    ? this.level.showcase
                    : this.level.verification
            );
        },
    },
    async mounted() {
        // Hide loading spinner
        const list1 = await fetchList();
        this.list = [];

        // Filter only levels with isMain === true
        for (const key in list1) {
            if (list1[key][0].isMain) {
                this.list[this.list.length] = list1[key];
            }
        }

        this.editors = await fetchEditors();

        // Error handling
        if (!this.list) {
            this.errors = [
                "Failed to load list. Retry in a few minutes or notify list staff.",
            ];
        } else {
            this.errors.push(
                ...this.list
                    .filter(([_, err]) => err)
                    .map(([_, err]) => {
                        return `Failed to load level. (${err}.json)`;
                    })
            );
            if (!this.editors) {
                this.errors.push("Failed to load list editors.");
            }
        }

        this.loading = false;
    },
    methods: {
        embed,
        score,
        filtersToggle() {
            this.isFiltersActive = !this.isFiltersActive;
        },
        getLevelNameStyle(level, isSelected) {
            if (!level) return {};
            const dark = !this.store.dark; // .dark class = light theme, so invert

            // Unrated: always gray
            if (level.tags && level.tags.includes('Unrated')) {
                const c = isSelected
                    ? (dark ? '#dddddd' : '#b0b0b0')
                    : '#888888';
                return { color: c, fontWeight: level.isVerified ? 'bold' : 'normal' };
            }
            // Rated: pure white/black
            if (level.tags && level.tags.includes('Rated')) {
                return { color: dark ? '#ffffff' : '#000000', fontWeight: level.isVerified ? 'bold' : 'normal' };
            }

            // Compute verificationProgress
            const recordPercent = Math.max(0, ...((level.records || []).map(r => Number(r.percent) || 0)));
            const runPercent = Math.max(0, ...((level.run || []).map(r => {
                const parts = String(r.percent).split('-').map(Number);
                return (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) ? Math.abs(parts[1] - parts[0]) : 0;
            })));
            const verificationProgress = Math.max(recordPercent, runPercent);

            const pf = level.percentFinished ?? 0;
            let color;

            if (level.isVerified) {
                return { fontWeight: 'bold' };
            } else if (pf === 100 && verificationProgress >= 60) {
                color = dark
                    ? (isSelected ? '#ff9999' : '#ff5555')
                    : (isSelected ? '#cc7a7a' : '#cc4444');
            } else if (pf === 100 && verificationProgress >= 30) {
                color = dark
                    ? (isSelected ? '#ffaa66' : '#ff6622')
                    : (isSelected ? '#cc8851' : '#cc511b');
            } else if (pf === 100) {
                color = dark
                    ? (isSelected ? '#ffcc77' : '#ffaa44')
                    : (isSelected ? '#cca35f' : '#cc8836');
            } else if (pf >= 70) {
                color = dark
                    ? (isSelected ? '#ffff77' : '#ffee55')
                    : (isSelected ? '#cccc5f' : '#ccbe44');
            } else if (pf >= 30) {
                color = dark
                    ? (isSelected ? '#88ff88' : '#55ee55')
                    : (isSelected ? '#6ccc6c' : '#44be44');
            } else if (pf >= 1) {
                color = dark
                    ? (isSelected ? '#66ffff' : '#33dddd')
                    : (isSelected ? '#51cccc' : '#28b0b0');
            } else {
                color = dark
                    ? (isSelected ? '#88bbff' : '#5599ff')
                    : (isSelected ? '#6c95cc' : '#447acc');
            }

            return { color, fontWeight: level.isVerified ? 'bold' : 'normal' };
        },
        getThumbnail(level) {
            const url = level.thumbnail || level.verification || level.showcase || '';
            const id = getYoutubeIdFromUrl(url);
            return id ? getThumbnailFromId(id) : '';
        },
        applyFilters() {
            if (!this.list) return;

            const activeFilters = this.filtersList.filter(f => f.active && !f.separator);
            const searchQuery = this.search.toLowerCase().trim();
            const minDec = this.minDecoration || 0;
            const minVer = this.minVerification || 0;

            this.list.forEach(item => {
                const level = item[0];
                if (!level) return;

                // Search
                const name = level.name.toLowerCase();
                const matchesSearch = !searchQuery || name.includes(searchQuery);

                // Tag filters
                let matchesTags = true;
                if (activeFilters.length > 0) {
                    for (const filter of activeFilters) {
                        if (!level.tags || !level.tags.includes(filter.key)) {
                            matchesTags = false;
                            break;
                        }
                    }
                }

                // Min Decoration % filter (uses level.percentFinished)
                const decoration = level.percentFinished ?? 0;
                const matchesDecoration = decoration >= minDec;

                // Min Verification % filter
                // records: use percent directly
                const recordPercent = Math.max(0, ...((level.records || [])
                    .map(r => Number(r.percent) || 0)));
                // run: use |end - start| from "start-end" string format
                const runPercent = Math.max(0, ...((level.run || [])
                    .map(r => {
                        const parts = String(r.percent).split('-').map(Number);
                        return (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]))
                            ? Math.abs(parts[1] - parts[0])
                            : 0;
                    })));
                const verificationProgress = Math.max(recordPercent, runPercent);
                const matchesVerification = !level.isVerified && verificationProgress >= minVer;

                level.isHidden = !(matchesSearch && matchesTags && matchesDecoration && matchesVerification);
            });
        },
        useFilter(index) {
            if (filtersList[index].separator) return;
            this.filtersList[index].active = !this.filtersList[index].active;
            this.applyFilters();
        },
    },
};
