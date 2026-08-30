// https://stackoverflow.com/questions/3452546/how-do-i-get-the-youtube-video-id-from-a-url
export function getYoutubeIdFromUrl(url) {
    if (!url || typeof url !== 'string') return '';
    return url.match(
        /.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|shorts\/|live\/|watch\?v=)([^#\&\?]*).*/,
    )?.[1] ?? '';
}

export function embed(video) {
    if (!video || typeof video !== 'string') return '';
    return `https://www.youtube.com/embed/${getYoutubeIdFromUrl(video)}`;
}

export function localize(num) {
    return num.toLocaleString(undefined, { minimumFractionDigits: 3 });
}

export function getThumbnailFromId(id) {
    return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
}

// The image for a video URL, or '' if it is not a YouTube link.
export function youtubeThumbnail(url) {
    const id = getYoutubeIdFromUrl(url);
    return id ? getThumbnailFromId(id) : '';
}

// Whatever an editor pasted into a thumbnail field. A YouTube link of any shape
// becomes that video's thumbnail image — the page URL itself is not an image, so
// using it verbatim renders a broken picture. Anything else (i.ytimg.com,
// Imgur, …) is already a direct image URL and is passed through untouched.
export function thumbnailUrl(value) {
    if (!value || typeof value !== 'string') return '';
    const url = value.trim();
    return youtubeThumbnail(url) || url;
}

// The image to show for a level: its own thumbnail if one is set, otherwise
// derived from the verification video, then the showcase.
export function levelThumbnail(level) {
    if (!level) return '';
    return thumbnailUrl(level.thumbnail)
        || youtubeThumbnail(level.verification)
        || youtubeThumbnail(level.showcase);
}

// https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
export function shuffle(array) {
    let currentIndex = array.length, randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex != 0) {
        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex],
            array[currentIndex],
        ];
    }

    return array;
}


export const filtersList = [
    { separator: true },
    { active: false, name: "Public", key: "Public" },
    { active: false, name: "Finished", key: "Finished" },
    { active: false, name: "Open Verification", key: "Open Verification" },
    { active: false, name: "Being Verified", key: "Verifying" },
    { active: false, name: "Layout State", key: "Layout" },
    { active: false, name: "Verified", key: "Verified" },
    { active: false, name: "Unrated", key: "Unrated" },
    { active: false, name: "Rated", key: "Rated" },
    { separator: true },
    { active: false, name: "Medium", key: "Medium" },
    { active: false, name: "Long", key: "Long" },
    { active: false, name: "XL", key: "XL" },
    { active: false, name: "XXL", key: "XXL" },
    { active: false, name: "XXXL+", key: "XXXL" },
    { separator: true },
    { active: false, name: "NC Level", key: "NC" },
    { active: false, name: "Remake", key: "Remake" },
    { active: false, name: "Uses NoNG", key: "NONG" },
    { active: false, name: "Top Quality", key: "Quality" },
    { active: false, name: "2-Player", key: "2p" },
    { separator: true }
]



export const filtersSetup = `<div style="flex-grow:1"></div>
				<div :class="{ 'filters-selected': isFiltersActive }" class="filters">
					<div style="display:flex; align-items:center;">
						<button @click="showThumbnails = !showThumbnails" class="color-toggle-btn thumb-toggle-btn" :class="{ active: showThumbnails }" title="Toggle thumbnails">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="25" height="25">
								<rect v-if="!showThumbnails" x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2.5"/>
								<rect v-if="showThumbnails" x="3" y="5" width="18" height="14" rx="2" fill="currentColor"/>
								<path v-if="showThumbnails" fill="none" stroke="white" stroke-width="1.5" stroke-linejoin="round" d="M8 15l3-4 2.5 3 1.5-2 3 3"/>
								<circle v-if="showThumbnails" cx="8.5" cy="9.5" r="1.5" fill="white"/>
							</svg>
						</button>
						<button @click="showColors = !showColors" class="color-toggle-btn" :class="{ active: showColors }" title="Toggle level name colors">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
								<path v-if="!showColors" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" d="M12 2C9.38 2 4 9.22 4 14a8 8 0 0016 0c0-4.78-5.38-12-8-12z"/>
								<path v-if="showColors" fill="currentColor" d="M12 2C9.38 2 4 9.22 4 14a8 8 0 0016 0c0-4.78-5.38-12-8-12z"/>
							</svg>
						</button>
						<div class="filters-text" @click="filtersToggle">Filters <img :src="\`/assets/arrow-down\${store.dark ? '-dark' : ''}.svg\`" style="display:inline; vertical-align: middle;"></div>
					</div>
					<div class="filters-collapse">
						<div class="filters-menu"
							:style="{
								backgroundColor: !store.dark ? 'white' : 'black',
								color: !store.dark ? 'black' : 'white'
							}"
						>
							<div class="filters-numeric">
								<label class="filters-numeric-label">Min Decoration %</label>
								<input class="filters-numeric-input" type="number" min="0" max="100" v-model.number="minDecoration" @click.stop @input="applyFilters()" placeholder="0" />
							</div>
							<div class="filters-numeric">
								<label class="filters-numeric-label">Min Verification %</label>
								<input class="filters-numeric-input" type="number" min="0" max="100" v-model.number="minVerification" @click.stop @input="applyFilters()" placeholder="0" />
							</div>
							<div class="separator-filter"></div>
							<div class="filters-one"
 								v-for="(item,index) in filtersList"
								:key="index"
      								:class="{ active: item.active }"
                                 @click="useFilter(index)"
								>
								<div class="separator-filter" v-if="item.separator"></div>
								<div v-else>
									<span>✓</span> {{item.name}}
								</div>
							</div>
						</div>
					</div>
				</div>`;

// ── Benchmark mode ────────────────────────────────────────────────────────────
// Benchmark mode keeps every unverified level plus the verified ones flagged as
// benchmarks, and hides the rest. One predicate, used by both the filters and the
// renumbering below, so the two can never disagree about what is visible.
export function passesBenchmark(level, benchmarkMode) {
    return !benchmarkMode || !level.isVerified || level.benchmark === true;
}

// The list renders every row and hides the filtered-out ones, so the displayed rank
// is normally the row's index in the full list. Under benchmark mode that leaves
// gaps where the hidden levels were (#1, #2, #5, #6 …), so recount the placements
// across the levels benchmark mode actually shows and store it on each level.
//
// Deliberately independent of the search box and tag filters: those narrow the view
// but shouldn't change a level's placement, whereas benchmark mode is a different
// view of the list with its own numbering.
export function assignBenchmarkRanks(list, benchmarkMode) {
    let rank = 0;
    for (const entry of list || []) {
        const level = Array.isArray(entry) ? entry[0] : entry;
        if (!level) continue;
        level.benchmarkRank = benchmarkMode && passesBenchmark(level, true) ? ++rank : null;
    }
}

// The number to print next to a level: its benchmark placement when benchmark mode
// is on, otherwise its position in the full list.
export function displayRank(level, index, benchmarkMode) {
    return benchmarkMode && level && level.benchmarkRank ? level.benchmarkRank : index + 1;
}

// ── Level page URLs ─────────────────────────────────────────────────────────
// A level's API `path` is its stable identity: staff rename levels often, and a
// rename must not change the URL the level already ranks for. Paths are not
// URL-safe though ("top 0 (neiro)"), so they are slugified for the address bar.

export function slugify(path) {
    return String(path ?? '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'level';
}

// FNV-1a, so the build and the browser derive the same suffix.
export function shortHash(value) {
    let h = 0x811c9dc5;
    const s = String(value);
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(36).slice(0, 6);
}

// Two different paths can slugify to the same string. The one that sorts first
// keeps the clean slug; the rest get a hash suffix. Sorting rather than list
// order keeps the assignment stable when ranks move around.
export function levelSlug(path, allPaths) {
    const base = slugify(path);
    if (!allPaths) return base;
    const clashing = allPaths.filter((p) => slugify(p) === base).sort();
    return clashing.length > 1 && clashing[0] !== path ? `${base}-${shortHash(path)}` : base;
}

// The reverse: which level a /level/<slug> URL refers to.
export function levelForSlug(levels, slug) {
    if (!slug) return null;
    const paths = levels.map((l) => l.path);
    return levels.find((l) => levelSlug(l.path, paths) === slug) || null;
}
