import { coloringLegend, pendingLegend } from '../_info.js';

// The two legends, without any window around them. /information shows them in
// its reader, /mobile/info in its sheet, and the question mark beside Level
// Coloring in Settings raises them over whatever page the visitor is on — so
// the markup lives here rather than in three places that can drift apart.
//
// It needs an .ull2 ancestor for the pill scale and an .info-page ancestor for
// the prose settings; every host already has both.
export default {
    template: `
<div class="info-cols">
    <div>
        <div class="u-eyebrow">Level colouring</div>
        <p class="info-note">
            A level&rsquo;s name is coloured by its state when Level Colouring is on in Settings. It is
            the same scale as the status pill on the level&rsquo;s own page.
        </p>
        <div class="info-legend">
            <div v-for="row in coloringLegend" :key="row.label + row.meaning">
                <span class="u-pill" :class="row.pill">
                    <i v-if="!row.glyph"></i>{{ row.label }}
                </span>
                <span>{{ row.meaning }}</span>
            </div>
        </div>
    </div>
    <div>
        <div class="u-eyebrow">Pending list icons</div>
        <p class="info-note">
            The icons on the Pending List show the range a level is expected to land in, and which way
            it is moving inside that range. Every one of them is an estimated position on the
            <strong>Demonlist</strong>, not on this list.
        </p>
        <div class="info-legend info-legend--icons">
            <div v-for="row in pendingLegend" :key="row.icon">
                <img :src="'/assets/' + row.icon + '.svg'" alt="" />
                <span>{{ row.label }}</span>
            </div>
        </div>
    </div>
</div>
    `,
    data: () => ({ coloringLegend, pendingLegend }),
};
