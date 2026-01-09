import { store } from '../main.js';
import { embed } from '../util.js';
import { fetchEditors, fetchList } from '../content.js';

import Spinner from '../components/Spinner.js';
import LevelAuthors from '../components/List/LevelAuthors.js';

const roleIconMap = {
    owner: 'crown',
    admin: 'user-gear',
    seniormod: 'user-shield',
    mod: 'user-lock',
    dev: 'code',
};

export default {
    components: { Spinner, LevelAuthors },
    template: `
        <main v-if="loading" class="surface">
            <Spinner></Spinner>
        </main>
        <h2 class="type-label-lg" style="font-weight: normal; font-size: 24px; margin: 30px 0 20px 0; letter-spacing: 0.45px; padding: 0 1rem;">
            The leaderboard shows closest to verification upcoming levels
        </h2>
        <main v-if="!loading" class="page-list">
            <div class="list-container surface" style="padding-block: 2rem;">
                <table class="list" v-if="list">
                    <tr v-for="([level, err], i) in list">
                        <td class="rank">
                            <p class="type-label-lg">#{{ i + 1 }}</p>
                        </td>
                        <td class="level" :class="{ 'active': selected == i, 'error': !level }">
                            <button @click="selected = i">
                                <span class="type-label-lg">{{ level?.name || \`Error (\${err}.json)\` }}</span>
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
                                Best progress from 0: <a :href="bestRecord.link" target="_blank" style="text-decoration: underline;"><span style="color: #00b825;">{{ bestRecord.percent }}%</span> by {{ bestRecord.user }}</a>
                            </p>
                        </div>
                        <div v-if="bestRun" class="best-run">
                            <p class="type-body">
                                Best run: <a :href="bestRun.link" target="_blank" style="text-decoration: underline;"><span style="color: #00b825;">{{ bestRun.percent }}%</span> by {{ bestRun.user }}</a>
                            </p>
                        </div>
                    </div>
                    <div v-if="level.isVerified" class="tabs">
                        <button class="tab" :class="{selected: !toggledShowcase}" @click="toggledShowcase = false">
                            <span class="type-label-lg">Verification</span>
                        </button>
                        <button class="tab" :class="{selected: toggledShowcase}" @click="toggledShowcase = true">
                            <span class="type-label-lg">Showcase</span>
                        </button>
                    </div>
                    <iframe class="video" id="videoframe" :src="video" frameborder="0"></iframe>
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
                    <template v-if="editors">
                        <h3>List Editors</h3>
                        <ol class="editors">
                            <li v-for="editor in editors">
                                <img :src="\`/assets/\${roleIconMap[editor.role]}\${(!store.dark || store.shitty) ? '-dark' : ''}.svg\`" :alt="editor.role">
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
        loading: true,
        selected: 0,
        errors: [],
        roleIconMap,
        store,
        toggledShowcase: false,
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
                level.rankingScore = Math.max(maxPercent, maxRunDifference);
            });

            const filteredList = list.filter(([level, err]) => level && !level.isVerified && level.rankingScore > 0);
            this.list = filteredList.sort((a, b) => b[0].rankingScore - a[0].rankingScore);

            if (!this.editors) {
                this.errors.push('Failed to load list editors.');
            }
        }

        this.loading = false;
    },
    methods: {
        embed,
    },
};
