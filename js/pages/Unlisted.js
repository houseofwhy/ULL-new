import { store } from '../main.js';
import { embed } from '../util.js';
import { score } from '../score.js';
import { fetchEditors, fetchList, fetchUnlisted, fetchUnlistedPairs } from '../content.js';

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
                                <div class="meta">
										<h3> Level Standards </h3>
										<p> For main list levels:</p>
										<p> - The level must be at least rate worthy. If there is no deco, only projects with high quality layouts or famous hosts will be added </p>
										<p> - The level should be at least 45 seconds long, since levels shorter very rarely get rated </p>
										<p> - The level must be easier than the current Top-1 of this list and harder than the lowest level of this list </p>
										<p> - The level must have any progress made in the last year </p>
										<p> For unlisted levels: </p>
										<p> - The level must be at least close to rate worthy or have sugnificant verification progress </p>
										<p> - The level must be at least 30 seconds long</p>
										<p> - The level must have any progress made in the last 2 years </p>
                                        <p> <p>
                                        <p> <p>
								</div>
								<div class="meta">
										<h3> WR Submission Requirements </h3>
										<p> When submitting a record, please ensure that you have the following:</p>
										<p> - A complete playthrough of the record with no cuts (if you make cuts in your submitted video, include raw footage that doesn't have them) </p>
										<p> - A decent amount of previous attempts (A single death at 1% is not sufficient, try to get somewhat far into the level. Everplay records are exempt from this.) </p>
										<p> - Cheat Indicator (Not necessary but desirable) </p>
										<p> - Fps/tps indicator (For mod menus that support one) </p>
										<p> - In-game source audio/Clicks (Either is fine, however both are strongly recommended. If you don't have either in your submission video, attach raw footage that does) </p>
										<p> Refer to <a href="https://docs.google.com/spreadsheets/d/1evE4nXATxRAQWu2Ajs54E6cVUqHBoSid8I7JauJnOzg/edit#gid=0"><b>this sheet</b></a> for a complete list of allowed mods.</p>
										<p> Please also check for the following:</p>
										<p> - Make sure you beat the level displayed on the site (for reference, check the level ID to ensure you're playing the correct level</p>
										<p> - Do not use secret routes or bug routes</p>
										<p> - Do not use easy modes, only a record of the unmodified level qualifies</p>
								</div>
            </div>
            <div class="level-container surface">
								<table class="list unlisted-table" v-if="unlisted">
										<tr v-for="pair in unlisted">
												<td v-for="level in pair" class="unlisted-td">
														<div class="unlisted-name type-h3">
																<a :href="level.link">{{ level.name }}</a>
														</div>
														<div class="unlisted-creator type-label-lg">
																{{level.creator}}
														</div>
												</td>
										</tr>
								</table>
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
                </div>
            </div>
        </main>
    `,
	data: () => ({
		list: [],
		editors: [],
		unlisted: [],
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
		this.unlisted = await fetchUnlistedPairs();

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
