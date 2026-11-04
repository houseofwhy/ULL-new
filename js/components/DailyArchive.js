// Every Level of the Day so far, newest first, in a window over the Events page.
// One row per day: the date, the level as it was called that day, and where it
// stood on All Levels that day — both of which have usually changed since.
//
// The parent resolves the rows (js/daily-level.js holds the archive; the parent
// knows the current list, so it knows which levels still have a page to link
// to). This only lists and searches them.
//
// Rendered in place rather than teleported to <body>: the page's .ull2 tokens and
// the dark theme are set on ancestors, and a window moved outside them would lose
// both.
const DAY_SHORT = { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' };
const DAY_LONG = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' };
const asDate = (key) => new Date(`${key}T00:00:00Z`);

export default {
    props: {
        open: { type: Boolean, default: false },
        // [{ date: 'YYYY-MM-DD', name, rank, slug: string|null, today: bool }], newest first.
        entries: { type: Array, default: () => [] },
    },
    emits: ['close'],
    template: `
<div v-if="open" class="da-win" @click.self="close()">
    <div class="da-box" role="dialog" aria-modal="true" aria-labelledby="da-title" tabindex="-1" ref="box">
        <div class="da-bar">
            <div class="da-bar__t">
                <span class="da-k">Events &middot; {{ entries.length }} day{{ entries.length === 1 ? '' : 's' }}</span>
                <b id="da-title">Level of the Day archive</b>
            </div>
            <button type="button" class="da-x" @click="close()">Close <span class="u-chip">Esc</span></button>
        </div>

        <div class="da-searchrow">
            <label class="da-search">
                <span class="da-mag" aria-hidden="true"></span>
                <input ref="q" v-model="q" type="search" class="da-search__f" autocomplete="off"
                       placeholder="Search by level or date…" aria-label="Search the archive" />
                <span v-if="q" class="da-search__n">{{ shown.length }}</span>
            </label>
        </div>

        <div class="da-head" aria-hidden="true">
            <span>Date</span><span>Level</span><span class="da-head__r">Position then</span>
        </div>
        <ol v-if="shown.length" class="da-list">
            <li v-for="e in shown" :key="e.date" class="da-row" :class="{ 'is-today': e.today }">
                <time class="da-date" :datetime="e.date" :title="e.long">
                    {{ e.label }}<span v-if="e.today" class="da-today">Today</span>
                </time>
                <router-link v-if="e.slug" class="da-name" :to="'/level/' + e.slug" @click="close()">{{ e.name }}</router-link>
                <span v-else class="da-name da-name--gone" title="No longer on the list">{{ e.name }}</span>
                <span class="da-rank" :title="'#' + e.rank + ' on All Levels that day'">#{{ e.rank }}</span>
            </li>
        </ol>
        <div v-else class="da-empty">
            <template v-if="q">Nothing in the archive matches “{{ q }}”.</template>
            <template v-else>No Levels of the Day recorded yet.</template>
        </div>
    </div>
</div>
    `,
    data: () => ({ q: '', opener: null }),
    computed: {
        rows() {
            return this.entries.map((e) => {
                const d = asDate(e.date);
                const label = d.toLocaleDateString('en-US', DAY_SHORT);
                const long = d.toLocaleDateString('en-US', DAY_LONG);
                return { ...e, label, long, hay: `${e.name} ${long} ${label} ${e.date}`.toLowerCase() };
            });
        },
        // Every word has to match somewhere, so "oct sevvend" finds the one day.
        shown() {
            const words = this.q.toLowerCase().split(/\s+/).filter(Boolean);
            if (!words.length) return this.rows;
            return this.rows.filter((r) => words.every((w) => r.hay.includes(w)));
        },
    },
    watch: {
        open: {
            immediate: true,
            handler(open) {
                if (typeof document === 'undefined') return;
                if (open) {
                    this.opener = document.activeElement;
                    document.body.classList.add('da-locked');
                    this.$nextTick(() => this.$refs.q?.focus());
                } else {
                    document.body.classList.remove('da-locked');
                    this.q = '';
                    // Back to the button that opened it, so the keyboard is where it was.
                    this.opener?.focus?.();
                    this.opener = null;
                }
            },
        },
    },
    methods: {
        close() { this.$emit('close'); },
        onKeydown(e) {
            if (!this.open) return;
            if (e.key === 'Escape') { e.stopPropagation(); this.close(); return; }
            // Keep Tab inside the window while it is up.
            if (e.key === 'Tab' && this.$refs.box) {
                const items = [...this.$refs.box.querySelectorAll('a[href], button, input')];
                if (!items.length) return;
                const first = items[0], last = items[items.length - 1];
                if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        },
    },
    mounted() { window.addEventListener('keydown', this.onKeydown, true); },
    beforeUnmount() {
        window.removeEventListener('keydown', this.onKeydown, true);
        document.body.classList.remove('da-locked');
    },
};
