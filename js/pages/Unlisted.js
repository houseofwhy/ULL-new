import { store } from '../main.js';
import { embed } from '../util.js';
import { score } from '../score.js';
import { fetchEditors, fetchList, fetchUnlisted, fetchUnlistedPairs } from '../content.js';

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
        <main v-if="loading" class="surface">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-list">
            <div class="list-container surface">

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
                    <ListEditors :editors="editors" />
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
