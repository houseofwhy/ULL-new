import { store } from '../main.js';

export default {
    name: 'FiltersModal',
    emits: ['close', 'apply'],
    props: {
        initialFilters: { type: Array, required: true },
    },
    data() {
        return {
            store,
            localFilters: this.initialFilters.map(f => ({ ...f })),
        };
    },
    computed: {
        // Split non-separator items into 3 groups by their separator groupings
        columns() {
            const groups = [];
            let cur = [];
            for (const f of this.localFilters) {
                if (f.separator) {
                    if (cur.length) { groups.push(cur); cur = []; }
                } else {
                    cur.push(f);
                }
            }
            if (cur.length) groups.push(cur);
            // distribute into 3 columns
            const cols = [[], [], []];
            groups.forEach((g, i) => cols[i % 3].push(...g));
            return cols;
        },
    },
    methods: {
        toggle(f) { f.active = !f.active; },
        apply() {
            this.$emit('apply', this.localFilters.map(f => ({ ...f })));
            this.$emit('close');
        },
        reset() {
            this.localFilters.forEach(f => { if (!f.separator) f.active = false; });
            this.$emit('apply', this.localFilters.map(f => ({ ...f })));
            this.$emit('close');
        },
    },
    template: `
        <div class="pc-modal-overlay" @click.self="$emit('close')">
            <div class="pc-filters-modal">
                <div class="pc-filters-modal-hdr">
                    <span class="pc-filters-modal-title">Filters</span>
                    <button class="pc-modal-close" @click="$emit('close')">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
                <div class="pc-filters-modal-cols">
                    <div class="pc-filters-modal-col" v-for="(col, ci) in columns" :key="ci">
                        <div class="pc-filters-modal-item" v-for="f in col" :key="f.key"
                             :class="{'is-active': f.active}" @click="toggle(f)">
                            <span class="pc-filters-check">
                                <svg v-if="f.active" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </span>
                            {{ f.name }}
                        </div>
                    </div>
                </div>
                <div class="pc-filters-modal-actions">
                    <button class="pc-filters-apply-btn" @click="apply">Apply Filters</button>
                    <button class="pc-filters-reset-btn" @click="reset">Reset Filters</button>
                </div>
            </div>
        </div>
    `,
};
