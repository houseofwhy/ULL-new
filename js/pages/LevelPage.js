import { store } from '../main.js';
import { fetchList } from '../content.js';
import { embed, levelThumbnail, levelForSlug } from '../util.js';
import Spinner from '../components/Spinner.js';
import Footer from '../components/Footer.js';

// The standalone page behind /level/<slug>. The same information the list's
// detail panel shows, at a URL that can be linked, shared and indexed.
// scripts/build-seo.mjs pre-renders one of these per level.

export default {
    components: { Spinner, Footer },
    template: `
<main v-if="loading" class="surface" style="display:flex;align-items:center;justify-content:center;">
    <Spinner></Spinner>
</main>
<main v-else class="level-page surface">
    <div v-if="level" class="level-page__inner">
        <nav class="level-page__crumbs">
            <router-link to="/">Upcoming Levels List</router-link>
            <span>/</span>
            <router-link to="/list">All Levels</router-link>
        </nav>

        <h1 class="level-page__title">{{ level.name }}</h1>
        <p class="level-page__ranks">
            <router-link to="/list">#{{ level.allLevelsRank }} in All Levels</router-link>
            <template v-if="level.mainRank"> · <router-link to="/listmain">#{{ level.mainRank }} in Main List</router-link></template>
            <template v-if="level.futureRank"> · <router-link to="/listfuture">#{{ level.futureRank }} in Future List</router-link></template>
        </p>

        <div class="level-page__tags">
            <span v-for="tag in level.tags" :key="tag" class="tag">{{ tag }}</span>
        </div>

        <iframe v-if="videoSrc" class="level-page__video" :src="videoSrc" frameborder="0" allowfullscreen></iframe>

        <dl class="level-page__facts">
            <template v-for="fact in facts" :key="fact[0]">
                <dt>{{ fact[0] }}</dt>
                <dd>{{ fact[1] }}</dd>
            </template>
        </dl>

        <div class="level-page__links">
            <a v-if="level.showcase" :href="level.showcase" target="_blank" rel="noopener">Showcase video</a>
            <a v-if="level.verification" :href="level.verification" target="_blank" rel="noopener">Verification video</a>
            <a v-if="level.frameCounter" :href="level.frameCounter" target="_blank" rel="noopener">Frame Windows Counter</a>
        </div>

        <p class="level-page__about">
            The Upcoming Levels List catalogues Extreme Demons still in development, decoration or
            verification, and forecasts where each will place on the Demonlist once released.
            {{ level.name }}'s position is set by the staff team according to the
            <router-link to="/information">list guidelines</router-link>, and moves as the level progresses.
        </p>
    </div>

    <div v-else class="level-page__inner level-page__missing">
        <h1>Level not found</h1>
        <p>This level is not on the Upcoming Levels List right now. It may have been published and
        moved to the Demonlist, or removed by the staff team.</p>
        <p><router-link to="/list">Browse all levels</router-link></p>
    </div>

    <Footer />
</main>
    `,
    data: () => ({ store, level: null, loading: true }),
    computed: {
        videoSrc() {
            const video = this.level?.showcase || this.level?.verification;
            return video ? embed(video) : '';
        },
        facts() {
            const l = this.level;
            if (!l) return [];
            const record = this.best(l.records);
            const run = (l.run || []).find((r) => r.user && r.user !== 'none' && String(r.percent) !== '0');
            return [
                ['Host', l.author],
                (l.creators || []).length ? ['Creators', l.creators.join(', ')] : null,
                l.verifier && l.verifier !== 'none' ? ['Verifier', l.verifier] : null,
                ['Status', this.status(l)],
                record ? ['Best record', `${record.percent}% by ${record.user}`] : null,
                run ? ['Best run', `${run.percent}% by ${run.user}`] : null,
                l.id && l.id !== 'private' ? ['Level ID', l.id] : null,
                l.length ? ['Length', `${Math.floor(l.length / 60)}m ${l.length % 60}s`] : null,
                l.lastUpd ? ['Last updated', l.lastUpd] : null,
            ].filter(Boolean);
        },
    },
    methods: {
        best(records) {
            return (records || [])
                .filter((r) => r.user && r.user !== 'none' && Number(r.percent) > 0)
                .sort((a, b) => Number(b.percent) - Number(a.percent))[0] || null;
        },
        status(l) {
            if (l.isVerified) return 'Verified';
            if (l.percentFinished === 100) return 'Being verified';
            if (!l.percentFinished) return 'Layout';
            return `Decoration ${l.percentFinished}% finished`;
        },
        async load() {
            this.loading = true;
            const list = await fetchList();
            const levels = (list || []).map(([level]) => level).filter(Boolean);

            // Cross-list positions come from the full ordering.
            let mainRank = 0, futureRank = 0;
            levels.forEach((l, i) => {
                l.allLevelsRank = i + 1;
                if (l.isMain || l.isVerified) l.mainRank = ++mainRank;
                if (l.isFuture || l.isVerified) l.futureRank = ++futureRank;
            });

            this.level = levelForSlug(levels, this.$route.params.slug);
            this.loading = false;
            if (this.level) document.title = `${this.level.name} — Geometry Dash Extreme Demon | Upcoming Levels List`;
        },
    },
    watch: { '$route.params.slug': 'load' },
    mounted() { this.load(); },
};
