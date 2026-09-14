import { store } from '../main.js';
import { coloringLegend, pendingLegend } from '../_info.js';
import MarksLegend from './MarksLegend.js';

// The reader /information opens for "What the marks mean", raised from the shell
// so the question mark next to Level Coloring in Settings can answer where the
// question was asked instead of sending the visitor to another page in another
// tab. It sits above the settings popup rather than replacing it, so closing it
// returns to the toggle the visitor came from.
//
// The wrapper carries .info-page and .ull2 for the prose settings and the pill
// scale; .info-page--bare stops it from generating a box of its own, since the
// shell is not a page.
export default {
    components: { MarksLegend },
    template: `
<div v-if="store.showMarks" class="info-page info-page--bare ull2">
    <div class="info-win info-win--over" @click.self="close()">
        <div class="info-win__box" role="dialog" aria-modal="true" aria-label="What the marks mean" tabindex="-1" ref="win">
            <div class="info-win__bar">
                <span class="info-win__k">Reference &middot; {{ markCount }} marks</span>
                <b>What the marks mean</b>
                <button type="button" class="info-win__x" @click="close()">Close <span class="u-chip">Esc</span></button>
            </div>
            <div class="info-win__body">
                <MarksLegend />
                <p class="info-note">
                    Everything else about the list is on the
                    <router-link class="info-a" to="/information" @click="leave()">Information page</router-link>.
                </p>
            </div>
        </div>
    </div>
</div>
    `,
    data: () => ({
        store,
        markCount: coloringLegend.length + pendingLegend.length,
    }),
    methods: {
        close() { store.showMarks = false; },
        // Following the link leaves both this and the settings popup that raised
        // it behind, rather than landing on /information with Settings still up.
        leave() { store.showMarks = false; store.showSettings = false; },
        // Esc closes this before the settings popup under it, so one press does
        // not dismiss both.
        onKeydown(e) {
            if (e.key !== 'Escape' || !store.showMarks) return;
            e.stopPropagation();
            this.close();
        },
    },
    watch: {
        'store.showMarks'(open) {
            if (open) this.$nextTick(() => this.$refs.win?.focus());
        },
    },
    mounted() { window.addEventListener('keydown', this.onKeydown, true); },
    beforeUnmount() { window.removeEventListener('keydown', this.onKeydown, true); },
};
