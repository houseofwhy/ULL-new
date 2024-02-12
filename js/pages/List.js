import { store } from '../main.js';
import { embed } from '../util.js';
import { score } from '../score.js';
import { fetchEditors, fetchList } from '../content.js';

import Spinner from '../components/Spinner.js';
import LevelAuthors from '../components/List/LevelAuthors.js';

const roleIconMap = {
	owner: 'crown',
	admin: 'user-gear',
	seniormod: 'user-shield',
	mod: 'user-lock',
	dev: 'code'
};

export default {
	components: { Spinner, LevelAuthors },
	template: `
        <main v-if="loading" class="surface">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-list">
            <div class="list-container surface">
                <table class="list" v-if="list">
                    <tr v-for="([level, err], i) in list">
                        <td class="rank">
                            <p v-if="i + 1 <= 200" class="type-label-lg">#{{ i + 1 }}</p>
                            <p v-else class="type-label-lg">Legacy</p>
                        </td>
                        <td class="level" :class="{ 'active': selected == i, 'error': !level }">
                            <button @click="selected = i">
                                <span class="type-label-lg">{{ level?.name || \`Error (\${err}.json)\` }}</span>
                            </button>
                        </td>
                    </tr>
                </table>
            </div>
            <div class="level-container surface">
                <div class="level" v-if="level">
                    <h1>{{ level.name }}</h1>
                    <LevelAuthors :author="level.author" :creators="level.creators" :verifier="level.verifier" :isVerified="level.isVerified"></LevelAuthors>
                    <div v-if="level.showcase" class="tabs">
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
                            <p>{{ Math.floor(level.percentFinished*level.rating*level.length/1000*3.141592356*1000)/1000 }}</p>
                        </li>
                        <li>
                            <div class="type-title-sm">ID</div>
                            <p>{{ level.id }}</p>
                        </li>
                        <li>
                            <div class="type-title-sm">Password</div>
                            <p>{{ level.password || 'Free to Copy' }}</p>
                        </li>
                    </ul>
                    <h2>World Record</h2>
                    <p><strong>{{ level.percentToQualify }}%</strong> or better to accept</p>
                    <table class="records">
                        <tr v-for="record in level.records" class="record">
                            <td class="percent">
                                <p>{{ record.percent }}%</p>
                            </td>
                            <td class="user">
                                <a :href="record.link" target="_blank" class="type-label-lg">{{ record.user }}</a>
                            </td>
                            <td class="mobile">
                                <img v-if="record.mobile" :src="\`/assets/phone-landscape\${store.dark ? '-dark' : ''}.svg\`" alt="Mobile">
                            </td>
                            <td class="hz">
                                <p>{{ record.hz }}Hz</p>
                            </td>
                        </tr>
                    </table>
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
                    <template v-if="editors">
                        <h3>List Editors</h3>
                        <ol class="editors">
                            <li v-for="editor in editors">
                                <img :src="\`/assets/\${roleIconMap[editor.role]}\${(store.dark || store.shitty) ? '-dark' : ''}.svg\`" :alt="editor.role">
                                <a v-if="editor.link" class="type-label-lg link" target="_blank" :href="editor.link">{{ editor.name }}</a>
                                <p v-else>{{ editor.name }}</p>
                            </li>
                        </ol>
                    </template>
                    <h3> Submission Requirements </h3>
                    <p> When submitting a record, please ensure that you have the following:</p>
                    <p> - A complete playthrough of the record with no cuts (if you make cuts in your submitted video, include raw footage that doesn't have them) </p>
                    <p> - A decent amount of previous attempts (A single death at 1% is not sufficient, try to get somewhat far into the level. Everplay records are exempt from this.) </p>
                    <p> - Cheat Indicator (Not necessary but desirable) </p>
                    <p> - Fps/tps indicator (For mod menus that support one) </p>
                    <p> - In-game source audio/Clicks (Either is fine, however both are strongly recommended. If you don't have either in your submission video, attach raw footage that does) </p>
                    <p> Refer to <a href="https://docs.google.com/spreadsheets/d/1evE4nXATxRAQWu2Ajs54E6cVUqHBoSid8I7JauJnOzg/edit#gid=0">this sheet</a> for a complete list of allowed mods.</p>
                    <p> Please also check for the following:</p>
                    <p> - Make sure you beat the level displayed on the site (for reference, check the level ID to ensure you're playing the correct level</p>
                    <p> - Do not use secret routes or bug routes</p>
                    <p> - Do not use easy modes, only a record of the unmodified level qualifies</p>
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
		this.list = await fetchList();
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
	},
};
