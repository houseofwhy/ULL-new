import { store } from '../main.js';
import { embed, filtersList, filtersSetup } from '../util.js';
import { score } from '../score.js';
import { fetchEditors, fetchList } from '../content.js';

import Spinner from '../components/Spinner.js';
import LevelAuthors from '../components/List/LevelAuthors.js';
import ListEditors from "../components/ListEditors.js";

const roleIconMap = {
    owner: 'crown',
    admin: 'user-gear',
    seniormod: 'user-shield',
    mod: 'user-lock',
    dev: 'code'
};

export default {
    components: { Spinner, LevelAuthors, ListEditors },
    template: `
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
                <router-link class="nav__tab" to="/pending">
                    <span class="type-label-lg">Pending List</span>
                </router-link>
								`+ filtersSetup + `
            </nav>
        </header>
		<main v-if="loading" class="surface">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-list">
            <div class="list-container surface">
                <table class="list" v-if="list">
                    <tr v-for="([level, err], i) in list" :class="{ 'level-hidden': level?.isHidden}">
                        <td class="rank">
                                                        <span :class="{ 'rank-verified': level?.isVerified}">
                                    <p v-if="i + 1 <= 200" class="type-label-lg">#{{ i + 1 }}</p>
                                    <p v-else class="type-label-lg">Legacy</p>
                                                        </span>
                        </td>
                        <td class="level" :class="{ 'active': selected == i, 'error': !level }">
                                <button @click="selected = i">
                                                                    <span :class="{ 'rank-verified': level?.isVerified}">
                                            <span class="type-label-lg">{{ level?.name || \`Error (\${err}.json)\` }}</span>
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
										<div>
												<div v-if="!level.isVerified && level.wrman" class="worldrecord">
														<p class="type-body">
																<template v-if="typeof level.percentToQualify == 'number'">
																		World Record: {{level.percentToQualify-1}}% by {{level.wrman}}
																</template>
																<template v-if="typeof level.percentToQualify == 'string'">
																		World Record: {{level.percentToQualify}}% by {{level.wrman}}
																</template>
														</p>
												</div>
												<div class="lvlstatus">
														<p class="type-body">
																<template v-if="level.isVerified">
																		Status: Verified
																</template>
																<template v-if="level.percentFinished == 100 && !level.isVerified">
																		Status: On Verification
																</template>
																<template v-if="level.percentFinished != 100 && !level.isVerified">
																		Status: Deco in Progress ({{Math.floor(level.percentFinished-level.percentFinished/8)}}% finished)
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
                            <div class="type-title-sm">Coolness Score</div>
                            <p>{{ Math.floor(Math.sqrt(level.percentFinished)*level.rating*level.rating*Math.sqrt(level.length)*Math.sqrt(level.rating)*45/1000*3.141592356/Math.E*1000)/1000 }}</p>
                        </li>
                        <li>
                            <div class="type-title-sm">ID</div>
                            <p>{{ (level.id === "private" && level.leakID != null) ? level.leakID : level.id }}</p>
                        </li>
                        <li>
                            <div class="type-title-sm">Length</div>
                            <p>{{Math.floor(level.length/60)}}m {{level.length%60}}s</p>
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
        filtersList: filtersList
    }),
    computed: {
        level() {
            return this.list[this.selected][0];
        },
        video() {
            if (!this.level.showcase) {
                return embed(this.level.verification);
            }

            return embed(
                (this.toggledShowcase || !this.level.isVerified) ? this.level.showcase : this.level.verification,
            );
        },
    },
    async mounted() {
        // Hide loading spinner
        this.list1 = await fetchList();
        this.list = []
        for (const key in this.list1) {
            if (this.list1[key][0].isFuture) {
                this.list[this.list.length] = this.list1[key]
            }
        }
        console.log(this.list1)
        this.editors = await fetchEditors();

        // Error handling
        if (!this.list) {
            this.errors = [
                'Failed to load list. Retry in a few minutes or notify list staff.',
            ];
        } else {
            this.errors.push(
                ...this.list
                    .filter(([_, err]) => err)
                    .map(([_, err]) => {
                        return `Failed to load level. (${err}.json)`;
                    }),
            );
            if (!this.editors) {
                this.errors.push('Failed to load list editors.');
            }
        }

        this.loading = false;
    },
    methods: {
        embed,
        score,
        filtersToggle() {
            this.isFiltersActive = !this.isFiltersActive
        },
        useFilter(index) {
            if (filtersList[index].separator) return
            this.filtersList[index].active = !this.filtersList[index].active;
            this.filtersToggled = 0
            for (let filter of filtersList) {
                if (filter.active) this.filtersToggled++
            }
            if (this.filtersToggled != 0) {
                this.list.map(level => {
                    for (let filter of filtersList) {
                        if (!filter.active) {
                            continue
                        }
                        if (level[0].tags == undefined || !level[0].tags.includes(filter.key)) {
                            level[0].isHidden = true
                            break
                        }
                        else {
                            level[0].isHidden = false
                        }
                    }
                    //				level[0].isHidden=!(this.filtersList.filter(item => item.active && level[0].tags != undefined && level[0].tags.includes(item.key))).length > 0
                })
            }
            else {
                for (let level of this.list) {
                    level[0].isHidden = false
                }
            }
        }
    },
};
