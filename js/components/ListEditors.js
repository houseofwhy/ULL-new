import { store } from "../main.js";

const roleIconMap = {
    owner: "crown",
    admin: "user-gear",
    seniormod: "user-shield",
    mod: "user-lock",
    dev: "code",
};

export default {
    props: {
        editors: {
            type: Array,
            default: []
        }
    },
    data: () => ({
        roleIconMap,
        store
    }),
    template: `
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

        <div class="meta">
            <h3> List Guidelines </h3>
            <p> Currently in works: https://docs.google.com/document/d/13dmRfx2OCiLEaM2EcgEd-mKdok11_k8k7HsA5a-K6nY/edit?usp=sharing </p>
        </div>
<!--
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
            <p> Refer to <a href="https://docs.google.com/spreadsheets/d/1evE4nXATxRAQWu2Ajs54E6cVUqHBoSid8I7JauJnOzg/edit#gid=0">this sheet</a> for a complete list of allowed mods.</p>
            <p> Please also check for the following:</p>
            <p> - Make sure you beat the level displayed on the site (for reference, check the level ID to ensure you're playing the correct level</p>
            <p> - Do not use secret routes or bug routes</p>
            <p> - Do not use easy modes, only a record of the unmodified level qualifies</p>
        </div>-->
    `
};
