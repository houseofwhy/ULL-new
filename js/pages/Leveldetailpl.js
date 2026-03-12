export const levelDetailTpl = `
<div class="pc-level" v-if="level">
    <h1>{{ level.name }}</h1>
    <div class="pc-level-authors">
        <div class="pc-level-author-row">
            <span class="pc-level-author-lbl">Author</span>
            <span class="pc-level-author-val">{{ level.author }}</span>
        </div>
        <div class="pc-level-author-row" v-if="level.creators && level.creators.length">
            <span class="pc-level-author-lbl">Creators</span>
            <span class="pc-level-author-val">{{ level.creators.join(', ') }}</span>
        </div>
        <div class="pc-level-author-row">
            <span class="pc-level-author-lbl">{{ level.isVerified ? 'Verified by' : 'To be verified' }}</span>
            <span class="pc-level-author-val">{{ level.verifier }}</span>
        </div>
    </div>
    <div class="pc-level-tags" v-if="level.tags && level.tags.length">
        <span class="pc-level-tag" v-for="tag in level.tags" :key="tag">{{ tag }}</span>
    </div>
    <div class="pc-level-status">
        <template v-if="level.isVerified">Status: Verified</template>
        <template v-else-if="level.percentFinished == 0">Status: Layout</template>
        <template v-else-if="level.percentFinished == 100">Status: Being Verified</template>
        <template v-else>Status: Decoration — {{ level.percentFinished }}% done</template>
    </div>
    <div v-if="!level.isVerified" class="pc-level-wr">
        <div v-if="level.records && level.records[0] && level.records[0].percent > 0 && level.records[0].percent < 100">
            WR (from 0):
            <a v-if="level.records[0].link && level.records[0].link !== '#'" :href="level.records[0].link" target="_blank">{{ level.records[0].percent }}%</a>
            <span v-else>{{ level.records[0].percent }}%</span>
            by {{ level.records[0].user }}
        </div>
        <div v-else-if="!level.records || !level.records[0] || level.records[0].percent === 0">
            WR (from 0): None
        </div>
        <div v-if="level.records && level.records[0] && level.records[0].percent === 100">
            Layout verified by {{ level.records[0].user }}
        </div>
        <div v-if="level.run && level.run[0] && level.run[0].percent && level.run[0].percent !== '0'">
            WR (run):
            <a v-if="level.run[0].link && level.run[0].link !== '#'" :href="level.run[0].link" target="_blank">{{ level.run[0].percent }}%</a>
            <span v-else>{{ level.run[0].percent }}%</span>
            by {{ level.run[0].user }}
        </div>
        <div v-else-if="!level.run || !level.run[0] || level.run[0].percent === '0'">
            WR (run): None
        </div>
    </div>
    <div v-if="level.isVerified" class="pc-level-tabs">
        <button class="pc-level-tab" :class="{'is-active': toggledShowcase}" @click="toggledShowcase = true">Showcase</button>
        <button class="pc-level-tab" :class="{'is-active': !toggledShowcase}" @click="toggledShowcase = false">Verification</button>
    </div>
    <iframe class="pc-level-video" :src="video" frameborder="0" allowfullscreen></iframe>
    <div class="pc-level-stats">
        <div class="pc-level-stat">
            <div class="pc-level-stat-lbl">ID</div>
            <div class="pc-level-stat-val">{{ (level.id === 'private' && level.leakID) ? level.leakID : level.id }}</div>
        </div>
        <div class="pc-level-stat">
            <div class="pc-level-stat-lbl">Length</div>
            <div class="pc-level-stat-val">{{ Math.floor(level.length / 60) }}m {{ level.length % 60 }}s</div>
        </div>
        <div class="pc-level-stat">
            <div class="pc-level-stat-lbl">Updated</div>
            <div class="pc-level-stat-val">{{ level.lastUpd }}</div>
        </div>
    </div>
</div>
<div v-else style="height:100%;display:flex;align-items:center;justify-content:center;opacity:0.25;font-size:20px;">
    (ノಠ益ಠ)ノ彡┻━┻
</div>
`;
