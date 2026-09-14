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

// ── Level state ───────────────────────────────────────────────────────────
// Four readings every page needs and each used to derive for itself: how far
// the decoration has got, how far anyone has got into the level, what to call
// that state, and the best record and run behind it. LevelPage.js computed all
// of this inline; the list panel, upcoming, home and events each computed a
// different subset a different way. One implementation, shared.

export function decorationPercent(level) {
    return Math.max(0, Math.min(100, Number(level?.percentFinished) || 0));
}

// The furthest anyone has got, and what it was: the highest record set from 0%,
// or the longest span of a run, whichever reaches further. A verified level is
// 100 by definition.
//
// Two things read this. `verificationPercent` is the number — it drives the
// meters, the status tones and the order of the Upcoming Levels page.
// `verificationLabel` is how that number is written, and the two disagree on
// purpose: a run that covers 72% to 100% of a level reaches 28 percentage
// points, but nobody describes it that way. It is written as the span it
// covers, the same way the Best run card writes it, because "28%" beside a
// level that has been played from 72% to the end is misleading. A record is
// written as the single figure it reached.
export function verificationEvidence(level) {
    if (!level) return null;
    if (level.isVerified) return { kind: 'verified', value: 100, label: '100%', entry: null };

    let best = null;
    // Records first, so a record and a run that reach equally far read as the
    // record — the simpler of the two statements.
    for (const r of level.records || []) {
        const p = Number(r.percent) || 0;
        if (p > 0 && (!best || p > best.value)) best = { kind: 'record', value: p, label: `${p}%`, entry: r };
    }
    for (const r of level.run || []) {
        const parts = String(r.percent).split('-').map(Number);
        if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) continue;
        const span = Math.abs(parts[1] - parts[0]);
        if (span > 0 && (!best || span > best.value)) best = { kind: 'run', value: span, label: `${r.percent}%`, entry: r };
    }
    return best;
}

export function verificationPercent(level) {
    const best = verificationEvidence(level);
    return best ? Math.max(0, Math.min(100, best.value)) : 0;
}

// The same reading, written rather than measured. Empty where nobody has got
// anywhere yet, so a caller can fall back to its own "None".
export function verificationLabel(level) {
    const best = verificationEvidence(level);
    return best ? best.label : '';
}

// { label, tone } for the status pill. The tones are the same progression the
// list colours level names by, so a level reads the same in the row, in the
// panel, on its own page and in an events card.
export function levelStatus(level) {
    if (!level) return { label: '', tone: 'done' };
    if (level.isVerified) return { label: 'Verified', tone: 'done' };
    const pf = decorationPercent(level);
    const vp = verificationPercent(level);
    if (pf === 100) {
        return { label: 'Being verified', tone: vp >= 60 ? 'red' : vp >= 30 ? 'orange' : 'amber' };
    }
    if (!pf) return { label: 'Layout', tone: 'blue' };
    return { label: `Decoration ${pf}% done`, tone: pf >= 70 ? 'yellow' : pf >= 30 ? 'green' : 'cyan' };
}

// The list stores a placeholder row rather than an empty array when there is no
// record yet, so "none" and 0 both mean nothing has been set.
export function bestRecord(level) {
    return (level?.records || [])
        .filter((r) => r.user && r.user !== 'none' && Number(r.percent) > 0)
        .sort((a, b) => Number(b.percent) - Number(a.percent))[0] || null;
}

export function bestRun(level) {
    return (level?.run || []).find((r) => r.user && r.user !== 'none' && String(r.percent) !== '0' && String(r.percent) !== '') || null;
}

// A record's link is '#' when there is no video for it.
export function recordLink(record) {
    const link = record?.link;
    return link && link !== '#' ? link : '';
}

export function levelLength(level) {
    const secs = Number(level?.length) || 0;
    return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

// The list shows a private level's leaked ID when one is known.
export function levelId(level) {
    if (!level) return '';
    return level.id === 'private' ? (level.leakID != null ? level.leakID : 'Private') : level.id;
}

// "none" and "unknown" both mean the verifier is not decided yet.
export function hasVerifier(level) {
    const v = level?.verifier;
    return !!v && v !== 'none' && String(v).toLowerCase() !== 'unknown';
}

// Open Verification is not a person: nobody has claimed the level yet. The
// staff type it in whatever case they like, so match it in any.
export function isOpenVerification(level) {
    return String(level?.verifier || '').trim().toLowerCase() === 'open verification';
}

// What the Verifier row of a facts list says. An undecided verifier reads
// "unknown", lowercase, the same as every other value in those lists.
export function verifierLabel(level) {
    return hasVerifier(level) ? level.verifier : 'unknown';
}

// How the verifier reads in a byline, as { lead, name } so the name can carry
// its own weight in the markup. Null when there is nothing to say.
//
//   nobody has claimed it   →  on open verification
//   somebody is on it       →  to be verified by wPopoff
//   it is done              →  verified by wPopoff
export function verifierLine(level) {
    if (!level) return null;
    if (isOpenVerification(level) && !level.isVerified) return { lead: 'on', name: 'open verification' };
    if (!hasVerifier(level)) return null;
    return { lead: level.isVerified ? 'verified by' : 'to be verified by', name: level.verifier };
}

// A level's placement in each of the three tiers, always all three and always
// in the same order, so the chips do not reshuffle as you move between lists.
// `n` is null where the level is not on that tier — the chip says so rather
// than disappearing, which is the only way to tell "not on it" from "we did not
// mention it". `current` is the tier the reader is looking at, and the only one
// highlighted.
export function levelRanks(level, current = 'all', mobile = false) {
    if (!level) return [];
    const to = (desktop, phone) => (mobile ? phone : desktop);
    return [
        { key: 'all', n: level.allLevelsRank || null, label: 'All Levels', to: to('/list', '/mobile/all') },
        { key: 'main', n: level.mainRank || null, label: 'Main List', to: to('/listmain', '/mobile/main') },
        { key: 'future', n: level.futureRank || null, label: 'Future List', to: to('/listfuture', '/mobile/future') },
    ].map((r) => ({ ...r, lead: r.key === current }));
}
