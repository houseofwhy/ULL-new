// https://stackoverflow.com/questions/3452546/how-do-i-get-the-youtube-video-id-from-a-url
export function getYoutubeIdFromUrl(url) {
    return url.match(
        /.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=)([^#\&\?]*).*/,
    )?.[1] ?? '';
}

export function embed(video) {
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
	{ active: false, name: "Public", key: "Public"},
	{ active: false, name: "Finished", key: "Finished"},
	{ active: false, name: "Being Verified", key: "Verifying"},
	{ active: false, name: "Layout State", key: "Layout"},
	{ active: false, name: "Unrated", key: "Unrated"},
	{ active: false, name: "Rated", key: "Rated"},
	{ separator: true},
	{ active: false, name: "Medium", key: "Medium"},
	{ active: false, name: "Long", key: "Long"},
	{ active: false, name: "XL", key: "XL"},
	{ active: false, name: "XXL+", key: "XXL"},
	{ separator: true},
	{ active: false, name: "NC Level", key: "NC"},
	{ active: false, name: "Remake", key: "Remake"},
	{ active: false, name: "Uses NoNG", key: "NONG"},
	{ active: false, name: "Top Quality", key: "Quality"},
	{ separator: true}
]



export const filtersSetup = `<div style="flex-grow:1"></div>
				<div :class="{ 'filters-selected': isFiltersActive }" class="filters">
					<div class="filters-text" @click="filtersToggle">Filters <img :src="\`/assets/arrow-down\${!store.dark ? '-dark' : ''}.svg\`" style="display:inline; vertical-align: middle;"></div>
					<div class="filters-collapse">
						<div class="filters-menu"
							:style="{
								backgroundColor: !store.dark ? 'white' : 'black',
								color: store.dark ? 'black' : 'white'
							}"
						>
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
