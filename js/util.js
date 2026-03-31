// https://stackoverflow.com/questions/3452546/how-do-i-get-the-youtube-video-id-from-a-url
export function getYoutubeIdFromUrl(url) {
    if (!url || typeof url !== 'string') return '';
    return url.match(
        /.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=)([^#\&\?]*).*/,
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
