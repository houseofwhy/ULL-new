import { store } from '../main.js';
import AdminLogin from '../components/AdminLogin.js';
import Footer from '../components/Footer.js';

const API = 'https://d1-wrkr.ullteam.workers.dev';

const AVAILABLE_TAGS = [
    'Public', 'Finished', 'Layout', 'Unrated', 'Rated',
    'Medium', 'Long', 'XL', 'XXL', 'NC', 'Remake', 'NONG', 'Quality',
];

const ROLE_OPTIONS = ['owner', 'admin', 'seniormod', 'mod', 'dev'];

// Change text is rendered with v-html so **bold** works, so escape everything
// else — an editor typing a "<" shouldn't be able to inject markup.
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Pull the Worker's error message out of a failed response instead of showing a
// generic "Failed to save" that hides what actually went wrong.
async function errorText(res, fallback) {
    const body = await res.json().catch(() => null);
    if (body && body.error) return body.error;
    return `${fallback} (HTTP ${res.status})`;
}

// fetch() only rejects when the request never produced a readable response —
// no connection, or a response the browser refused to hand over (a 5xx from the
// Worker that came back without CORS headers looks exactly like this). Saying so
// beats the old bare "Network error.", which sent people hunting their Wi-Fi.
function requestFailed(e) {
    return 'Could not reach the API — the request never completed.\n\n' +
        'This is usually the Worker erroring out before it can send CORS headers ' +
        '(check the Worker logs in the Cloudflare dashboard), or a lost connection.\n\n' +
        `Details: ${e && e.message ? e.message : e}`;
}

// Placement tiers that have an icon in /assets (plus "?" = question.svg).
const PLACEMENT_TIERS = ['?', '1', '10', '20', '30', '50', '75'];

const emptyPending = () => ({ id: null, name: '', section: 'placement', tier: '?', direction: 'up', link: '' });

// Which Pending List section an entry belongs to, derived from its data.
function pendingSectionOf(p) {
    if (['up', 'down'].includes((p.placement || '').toLowerCase())) return 'movement';
    return p.indefinite ? 'indefinite' : 'placement';
}

// `date` is free text so a change can carry any date, including a past one that
// is being backfilled long after the fact. MONTHS drives the <input type="date">
// helper, which just formats a picked day into that same free-text style.
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const emptyChange = () => ({ id: null, date: '', change: '', position: 'top' });

// "April 18, 2026" -> "2026-04-18" (for the date picker). Returns '' if the date
// is free text the picker can't represent — the text field stays authoritative.
function changeDateToInput(date) {
    const m = /^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/.exec((date || '').trim());
    if (!m) return '';
    const month = MONTHS.findIndex(x => x.toLowerCase() === m[1].toLowerCase());
    if (month === -1) return '';
    return `${m[3]}-${String(month + 1).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
}

// "2026-04-18" -> "April 18, 2026"
function inputToChangeDate(value) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
    if (!m) return '';
    return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

// A blank level. Every field may be left as-is — saveEdit() fills in the defaults a
// level needs to render (see levelDefaults below), so nothing here is mandatory
// except a name or a path to key the row on.
const emptyLevel = () => ({
    path: '', name: '', author: '', verifier: '',
    verification: '', showcase: '', thumbnail: '', frameCounter: '',
    id: 'private', lastUpd: '',
    length: 0, percentToQualify: 1, percentFinished: 0, rating: 1,
    tags: [], records: [], run: [],
    isVerified: false, isMain: true, isFuture: false, benchmark: false,
});

// The `path` is the row's primary key — it's what PUT /api/levels matches on to
// decide "update" vs "insert". Existing rows use lowercase words separated by
// spaces ("kingdom of miracles"), so derive the same shape from the name.
function slugify(name) {
    return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

// Blank is allowed everywhere, so a cleared number field falls back to its default
// rather than being written as NaN or an empty string.
function numOr(value, fallback) {
    const n = Number(value);
    return value === '' || value === null || value === undefined || isNaN(n) ? fallback : n;
}

function todayStamp() {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

const emptyLotm = () => ({
    name: '', author: '', rank: '', id: '', thumbnail: '',
    record: { percent: '', player: '', link: '' },
    run:    { percent: '', player: '', link: '' },
});
const emptyCtv = () => ({
    name: '', author: '', verifier: '', rank: '', thumbnail: '',
    record: { percent: '', player: '', link: '' },
    run:    { percent: '', player: '', link: '' },
});

export default {
    components: { AdminLogin, Footer },
    template: `
<main class="admin-page surface">
    <AdminLogin v-if="!store.authKey" />
    <div v-else class="admin-content">
        <div class="admin-header">
            <h1 class="admin-title">Admin Panel</h1>
            <button class="admin-logout-btn" @click="store.authKey = ''">Log out</button>
        </div>

        <div class="admin-tabs">
            <button class="admin-tab" :class="{ active: activeTab === 'levels' }" @click="activeTab = 'levels'">Levels</button>
            <button class="admin-tab" :class="{ active: activeTab === 'events' }" @click="activeTab = 'events'">Events</button>
            <button class="admin-tab" :class="{ active: activeTab === 'editors' }" @click="activeTab = 'editors'">Editors</button>
            <button class="admin-tab" :class="{ active: activeTab === 'pending' }" @click="activeTab = 'pending'">Pending</button>
            <button class="admin-tab" :class="{ active: activeTab === 'changes' }" @click="activeTab = 'changes'">Recent Changes</button>
            <button class="admin-tab" :class="{ active: activeTab === 'audit' }" @click="activeTab = 'audit'">Audit Log</button>
        </div>

        <!-- ── LEVELS ── -->
        <template v-if="activeTab === 'levels'">
            <div class="admin-toolbar">
                <button class="admin-btn admin-btn--new" @click="openNewLevel()">+ New Level</button>
                <input v-model="search" class="admin-search" placeholder="Search by name or author…" />
                <span class="admin-count">{{ filteredLevels.length }} levels</span>
            </div>
            <div v-if="levelNotice" class="admin-notice">{{ levelNotice }}</div>
            <div v-if="loading" class="admin-loading">Loading levels…</div>
            <div v-else-if="!filteredLevels.length" class="admin-empty">No levels match your search.</div>
            <table v-else class="admin-table">
                <thead>
                    <tr>
                        <th class="admin-th admin-th--pos">#</th>
                        <th class="admin-th">Level</th>
                        <th class="admin-th admin-th--type">Type</th>
                        <th class="admin-th admin-th--move">Move to</th>
                        <th class="admin-th admin-th--action"></th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="level in filteredLevels" :key="level.path" class="admin-row admin-row--clickable" @click="openEdit(level)">
                        <td class="admin-td admin-td--pos">{{ level._rank }}</td>
                        <td class="admin-td admin-td--name">
                            <div class="admin-level-name">{{ level.name }}</div>
                            <div class="admin-level-author">{{ level.author }}</div>
                        </td>
                        <td class="admin-td admin-td--type">
                            <span v-if="level.isVerified" class="admin-badge admin-badge--verified">Verified</span>
                            <span v-else-if="level.isFuture" class="admin-badge admin-badge--future">Future</span>
                            <span v-else-if="level.isMain" class="admin-badge admin-badge--main">Main</span>
                        </td>
                        <td class="admin-td admin-td--move" @click.stop>
                            <input v-model.number="level._newPos" type="number" min="1" :max="levels.length" class="admin-pos-input" @keydown.enter="moveLevel(level)" />
                            <button class="admin-btn admin-btn--move" :disabled="level._moving" @click="moveLevel(level)">{{ level._moving ? '…' : 'Move' }}</button>
                        </td>
                        <td class="admin-td admin-td--action" @click.stop>
                            <button class="admin-btn admin-btn--delete" :disabled="level._deleting" @click="deleteLevel(level)">{{ level._deleting ? '…' : 'Delete' }}</button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </template>

        <!-- ── EVENTS ── -->
        <template v-if="activeTab === 'events'">
            <div class="admin-events-grid">

                <div class="admin-card">
                    <div class="admin-card-title">Level of the Month</div>
                    <div class="admin-edit-group">
                        <label>Level Name</label>
                        <input v-model="lotm.name" type="text" />
                    </div>
                    <div class="admin-edit-row">
                        <div class="admin-edit-group">
                            <label>Author</label>
                            <input v-model="lotm.author" type="text" />
                        </div>
                        <div class="admin-edit-group">
                            <label>Rank</label>
                            <input v-model.number="lotm.rank" type="number" min="1" />
                        </div>
                        <div class="admin-edit-group">
                            <label>Level ID</label>
                            <input v-model="lotm.id" type="text" />
                        </div>
                    </div>
                    <div class="admin-edit-group">
                        <label>Thumbnail (YouTube or image URL)</label>
                        <input v-model="lotm.thumbnail" type="url" placeholder="https://youtu.be/..." />
                    </div>
                    <div class="admin-card-subhead">Best Record</div>
                    <div class="admin-edit-row">
                        <div class="admin-edit-group">
                            <label>Percent</label>
                            <input v-model="lotm.record.percent" type="text" placeholder="e.g. 85%" />
                        </div>
                        <div class="admin-edit-group">
                            <label>Player</label>
                            <input v-model="lotm.record.player" type="text" />
                        </div>
                        <div class="admin-edit-group">
                            <label>Link</label>
                            <input v-model="lotm.record.link" type="url" />
                        </div>
                    </div>
                    <div class="admin-card-subhead">Best Run</div>
                    <div class="admin-edit-row">
                        <div class="admin-edit-group">
                            <label>Percent / Range</label>
                            <input v-model="lotm.run.percent" type="text" placeholder="e.g. 50-100" />
                        </div>
                        <div class="admin-edit-group">
                            <label>Player</label>
                            <input v-model="lotm.run.player" type="text" />
                        </div>
                        <div class="admin-edit-group">
                            <label>Link</label>
                            <input v-model="lotm.run.link" type="url" />
                        </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:0.65rem;margin-top:0.85rem;">
                        <button class="admin-btn admin-btn--move" :disabled="eventsSaving === 'lotm'" @click="saveLotm()">{{ eventsSaving === 'lotm' ? 'Saving…' : 'Save LotM' }}</button>
                        <span v-if="eventsSaved === 'lotm'" style="font-size:0.78rem;color:#10b981;">Saved!</span>
                    </div>
                </div>

                <div class="admin-card">
                    <div class="admin-card-title">Closest to Verification</div>
                    <div class="admin-edit-group">
                        <label>Level Name</label>
                        <input v-model="ctv.name" type="text" />
                    </div>
                    <div class="admin-edit-row">
                        <div class="admin-edit-group">
                            <label>Author</label>
                            <input v-model="ctv.author" type="text" />
                        </div>
                        <div class="admin-edit-group">
                            <label>Verifier</label>
                            <input v-model="ctv.verifier" type="text" />
                        </div>
                        <div class="admin-edit-group">
                            <label>Rank</label>
                            <input v-model.number="ctv.rank" type="number" min="1" />
                        </div>
                    </div>
                    <div class="admin-edit-group">
                        <label>Thumbnail (YouTube or image URL)</label>
                        <input v-model="ctv.thumbnail" type="url" placeholder="https://youtu.be/..." />
                    </div>
                    <div class="admin-card-subhead">Best Record</div>
                    <div class="admin-edit-row">
                        <div class="admin-edit-group">
                            <label>Percent</label>
                            <input v-model="ctv.record.percent" type="text" placeholder="e.g. 85%" />
                        </div>
                        <div class="admin-edit-group">
                            <label>Player</label>
                            <input v-model="ctv.record.player" type="text" />
                        </div>
                        <div class="admin-edit-group">
                            <label>Link</label>
                            <input v-model="ctv.record.link" type="url" />
                        </div>
                    </div>
                    <div class="admin-card-subhead">Best Run</div>
                    <div class="admin-edit-row">
                        <div class="admin-edit-group">
                            <label>Percent / Range</label>
                            <input v-model="ctv.run.percent" type="text" placeholder="e.g. 50-100" />
                        </div>
                        <div class="admin-edit-group">
                            <label>Player</label>
                            <input v-model="ctv.run.player" type="text" />
                        </div>
                        <div class="admin-edit-group">
                            <label>Link</label>
                            <input v-model="ctv.run.link" type="url" />
                        </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:0.65rem;margin-top:0.85rem;">
                        <button class="admin-btn admin-btn--move" :disabled="eventsSaving === 'ctv'" @click="saveCtv()">{{ eventsSaving === 'ctv' ? 'Saving…' : 'Save CTV' }}</button>
                        <span v-if="eventsSaved === 'ctv'" style="font-size:0.78rem;color:#10b981;">Saved!</span>
                    </div>
                </div>

            </div>
        </template>

        <!-- ── EDITORS ── -->
        <template v-if="activeTab === 'editors'">
            <div v-if="editorsLoading" class="admin-loading">Loading editors…</div>
            <template v-else>
                <div class="admin-toolbar">
                    <span style="font-size:0.8rem;opacity:0.55;">This order is exactly what visitors see under “List Editors” — use ▲ / ▼ to arrange it.</span>
                    <span v-if="editorsOrderSaving" style="font-size:0.78rem;opacity:0.55;margin-left:auto;">Saving order…</span>
                    <span v-else-if="editorsOrderSaved" style="font-size:0.78rem;color:#10b981;margin-left:auto;">Order saved!</span>
                </div>
                <div v-if="!editors.length" class="admin-empty">No editors found. Make sure the Worker and DB are updated.</div>
                <table v-else class="admin-table">
                    <thead>
                        <tr>
                            <th class="admin-th admin-th--pos">#</th>
                            <th class="admin-th" style="width:5rem;">Order</th>
                            <th class="admin-th">Name</th>
                            <th class="admin-th admin-th--type">Role</th>
                            <th class="admin-th">Link</th>
                            <th class="admin-th" style="width:4.5rem;"></th>
                            <th class="admin-th" style="width:4.5rem;"></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(ed, i) in editors" :key="ed.name" class="admin-row">
                            <td class="admin-td admin-td--pos">{{ i + 1 }}</td>
                            <td class="admin-td admin-td--action" style="white-space:nowrap;">
                                <button class="admin-btn admin-btn--move" :disabled="i === 0 || editorsOrderSaving" @click="moveEditor(i, -1)" title="Move up">▲</button>
                                <button class="admin-btn admin-btn--move" :disabled="i === editors.length - 1 || editorsOrderSaving" @click="moveEditor(i, 1)" title="Move down">▼</button>
                            </td>
                            <td class="admin-td" style="font-weight:600;">{{ ed.name }}</td>
                            <td class="admin-td">
                                <span class="admin-badge admin-badge--main">{{ ed.role || 'mod' }}</span>
                            </td>
                            <td class="admin-td" style="font-size:0.78rem;opacity:0.55;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ ed.link || '—' }}</td>
                            <td class="admin-td admin-td--action">
                                <button class="admin-btn admin-btn--move" @click="openEditEditor(ed)">Edit</button>
                            </td>
                            <td class="admin-td admin-td--action">
                                <button class="admin-btn admin-btn--delete" @click="deleteEditor(ed)">Delete</button>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <div class="admin-card" style="margin-top:1.5rem;">
                    <div class="admin-card-title">Add Editor</div>
                    <div class="admin-edit-row">
                        <div class="admin-edit-group">
                            <label>Name</label>
                            <input v-model="newEditor.name" type="text" placeholder="Display name" />
                        </div>
                        <div class="admin-edit-group">
                            <label>Role</label>
                            <select v-model="newEditor.role" class="admin-select">
                                <option v-for="r in roleOptions" :key="r" :value="r">{{ r }}</option>
                            </select>
                        </div>
                    </div>
                    <div class="admin-edit-group">
                        <label>Profile Link</label>
                        <input v-model="newEditor.link" type="url" placeholder="https://youtube.com/@..." />
                    </div>
                    <div class="admin-edit-group">
                        <label>API Key</label>
                        <div style="display:flex;gap:0.5rem;">
                            <input v-model="newEditor.key" type="text" placeholder="Click Generate, then copy before saving" style="flex:1;font-family:monospace;font-size:0.78rem;" />
                            <button type="button" class="admin-btn admin-btn--move" @click="generateKey()">Generate</button>
                        </div>
                        <p style="font-size:0.7rem;opacity:0.4;margin:0.3rem 0 0;">Copy this key and give it privately to the editor — it won't be shown again after saving.</p>
                    </div>
                    <div style="margin-top:0.75rem;">
                        <button class="admin-btn admin-btn--move" :disabled="editorSubmitting" @click="addEditor()">{{ editorSubmitting ? 'Adding…' : 'Add Editor' }}</button>
                    </div>
                </div>
            </template>
        </template>

        <!-- ── PENDING ── -->
        <template v-if="activeTab === 'pending'">
            <div v-if="pendingLoading" class="admin-loading">Loading pending entries…</div>
            <template v-else>
                <div class="admin-card" style="margin-bottom:1.5rem;">
                    <div class="admin-card-title">Add Pending Entry</div>
                    <div class="admin-edit-group">
                        <label>Level Name</label>
                        <input v-model="newPending.name" type="text" placeholder="Level name" />
                    </div>
                    <div class="admin-edit-row">
                        <div class="admin-edit-group">
                            <label>Section</label>
                            <select v-model="newPending.section" class="admin-select">
                                <option value="placement">Pending Placement</option>
                                <option value="movement">Pending Movement</option>
                                <option value="indefinite">Pending Indefinitely</option>
                            </select>
                        </div>
                        <div v-if="newPending.section === 'movement'" class="admin-edit-group">
                            <label>Direction</label>
                            <select v-model="newPending.direction" class="admin-select">
                                <option value="up">Up</option>
                                <option value="down">Down</option>
                            </select>
                        </div>
                        <div v-else class="admin-edit-group">
                            <label>Position Icon</label>
                            <select v-model="newPending.tier" class="admin-select">
                                <option v-for="t in placementTiers" :key="t" :value="t">{{ t === '?' ? '? (unknown)' : t }}</option>
                            </select>
                        </div>
                    </div>
                    <div class="admin-edit-group">
                        <label>Link (optional)</label>
                        <input v-model="newPending.link" type="url" placeholder="https://youtu.be/..." />
                    </div>
                    <div style="margin-top:0.75rem;">
                        <button class="admin-btn admin-btn--move" :disabled="pendingSubmitting" @click="addPending()">{{ pendingSubmitting ? 'Adding…' : 'Add Entry' }}</button>
                    </div>
                </div>
                <div v-if="!pendingEntries.length" class="admin-empty">No pending entries yet — add one above.</div>
                <table v-else class="admin-table">
                    <thead>
                        <tr>
                            <th class="admin-th" style="width:6rem;">Icon</th>
                            <th class="admin-th">Name</th>
                            <th class="admin-th admin-th--type">Section</th>
                            <th class="admin-th" style="width:4.5rem;"></th>
                            <th class="admin-th" style="width:4.5rem;"></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="p in sortedPending" :key="p.id" class="admin-row">
                            <td class="admin-td">
                                <img v-if="pendingSectionOf(p) === 'movement'" :src="'/assets/move-' + ((p.placement || '').toLowerCase() === 'up' ? 'up' : 'down') + '.svg'" alt="" style="width:1.3rem;height:1.3rem;" />
                                <img v-else :src="'/assets/' + (p.placement === '?' ? 'question' : p.placement) + '.svg'" alt="" style="width:1.3rem;height:1.3rem;" />
                            </td>
                            <td class="admin-td" style="font-weight:600;">
                                <a v-if="p.link" :href="p.link" target="_blank" style="text-decoration:underline;">{{ p.name }}</a>
                                <span v-else>{{ p.name }}</span>
                            </td>
                            <td class="admin-td">
                                <span class="admin-badge admin-badge--main">{{ sectionLabel(pendingSectionOf(p)) }}</span>
                            </td>
                            <td class="admin-td admin-td--action">
                                <button class="admin-btn admin-btn--move" @click="openEditPending(p)">Edit</button>
                            </td>
                            <td class="admin-td admin-td--action">
                                <button class="admin-btn admin-btn--delete" @click="deletePending(p)">Delete</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </template>
        </template>

        <!-- ── RECENT CHANGES ── -->
        <template v-if="activeTab === 'changes'">
            <div class="admin-toolbar">
                <span style="font-size:0.8rem;opacity:0.55;">
                    The “Recent Changes” feed on the home page. Lines sharing a date are grouped
                    together; top to bottom here is top to bottom on the site.
                </span>
                <span v-if="changesOrderSaving" style="font-size:0.78rem;opacity:0.55;margin-left:auto;">Saving order…</span>
                <span v-else-if="changesOrderSaved" style="font-size:0.78rem;color:#10b981;margin-left:auto;">Order saved!</span>
            </div>

            <div v-if="changesLoading" class="admin-loading">Loading recent changes…</div>
            <template v-else>
                <div class="admin-card" style="margin-bottom:1.5rem;">
                    <div class="admin-card-title">Add Change</div>
                    <div class="admin-edit-row">
                        <div class="admin-edit-group">
                            <label>Date</label>
                            <input v-model="newChange.date" type="text" placeholder="e.g. April 18, 2026" />
                        </div>
                        <div class="admin-edit-group">
                            <label>Pick a date (fills the field, past dates included)</label>
                            <input :value="newChangeDatePicker" type="date" @input="pickChangeDate($event, newChange)" />
                        </div>
                        <div class="admin-edit-group">
                            <label>Position</label>
                            <select v-model="newChange.position" class="admin-select">
                                <option value="top">Top of the feed</option>
                                <option value="bottom">Bottom of the feed</option>
                            </select>
                        </div>
                    </div>
                    <div class="admin-edit-group">
                        <label>Change</label>
                        <input v-model="newChange.change" type="text" placeholder="**Level** has been placed at #12, above **A** and below **B**" />
                        <p style="font-size:0.7rem;opacity:0.4;margin:0.3rem 0 0;">
                            Wrap level names in **double asterisks** to bold them, exactly like the existing feed.
                        </p>
                    </div>
                    <div v-if="newChange.change" class="admin-edit-group">
                        <label>Preview</label>
                        <div style="font-size:0.82rem;" v-html="formatChange(newChange.change)"></div>
                    </div>
                    <div style="margin-top:0.75rem;">
                        <button class="admin-btn admin-btn--move" :disabled="changesSubmitting" @click="addChange()">{{ changesSubmitting ? 'Adding…' : 'Add Change' }}</button>
                    </div>
                </div>
                <div v-if="!changes.length" class="admin-empty">
                    No changes recorded yet. Add the first one above — backdated entries are fine,
                    just type the date you want.
                </div>
                <table v-else class="admin-table">
                    <thead>
                        <tr>
                            <th class="admin-th admin-th--pos">#</th>
                            <th class="admin-th" style="width:5rem;">Order</th>
                            <th class="admin-th" style="width:10rem;">Date</th>
                            <th class="admin-th">Change</th>
                            <th class="admin-th" style="width:4.5rem;"></th>
                            <th class="admin-th" style="width:4.5rem;"></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(c, i) in changes" :key="c.id" class="admin-row">
                            <td class="admin-td admin-td--pos">{{ i + 1 }}</td>
                            <td class="admin-td admin-td--action" style="white-space:nowrap;">
                                <button class="admin-btn admin-btn--move" :disabled="i === 0 || changesOrderSaving" @click="moveChange(i, -1)" title="Move up">▲</button>
                                <button class="admin-btn admin-btn--move" :disabled="i === changes.length - 1 || changesOrderSaving" @click="moveChange(i, 1)" title="Move down">▼</button>
                            </td>
                            <td class="admin-td" style="font-weight:600;white-space:nowrap;">{{ c.date }}</td>
                            <td class="admin-td" style="font-size:0.8rem;" v-html="formatChange(c.change)"></td>
                            <td class="admin-td admin-td--action">
                                <button class="admin-btn admin-btn--move" @click="openEditChange(c)">Edit</button>
                            </td>
                            <td class="admin-td admin-td--action">
                                <button class="admin-btn admin-btn--delete" @click="deleteChange(c)">Delete</button>
                            </td>
                        </tr>
                    </tbody>
                </table>

            </template>
        </template>

        <!-- ── AUDIT LOG ── -->
        <template v-if="activeTab === 'audit'">
            <div class="admin-toolbar">
                <span style="font-size:0.8rem;opacity:0.55;">Last 100 operations, newest first.</span>
                <button class="admin-btn admin-btn--move" @click="loadAuditLog()" :disabled="auditLoading" style="margin-left:auto;">{{ auditLoading ? 'Loading…' : 'Refresh' }}</button>
            </div>
            <div v-if="auditLoading" class="admin-loading">Loading audit log…</div>
            <div v-else-if="!auditLog.length" class="admin-empty">No entries yet. The audit_log table may need to be created — see setup guide.</div>
            <table v-else class="admin-table">
                <thead>
                    <tr>
                        <th class="admin-th" style="width:11rem;">Time (UTC)</th>
                        <th class="admin-th" style="width:7rem;">Editor</th>
                        <th class="admin-th" style="width:8rem;">Action</th>
                        <th class="admin-th">Target</th>
                        <th class="admin-th">Details</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="entry in auditLog" :key="entry.id" class="admin-row">
                        <td class="admin-td admin-td--pos" style="font-size:0.72rem;white-space:nowrap;opacity:0.55;">{{ entry.timestamp }}</td>
                        <td class="admin-td" style="font-size:0.8rem;font-weight:600;">{{ entry.editor_name }}</td>
                        <td class="admin-td"><span class="admin-badge admin-badge--main" style="font-size:0.58rem;">{{ entry.action }}</span></td>
                        <td class="admin-td" style="font-size:0.8rem;">{{ entry.target }}</td>
                        <td class="admin-td" style="font-size:0.72rem;opacity:0.5;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ entry.details }}</td>
                    </tr>
                </tbody>
            </table>
        </template>

        <Footer />
    </div>

    <!-- ── LEVEL EDIT MODAL ── -->
    <div v-if="editLevel" class="admin-edit-overlay" @click.self="closeEdit()">
        <div class="admin-edit-modal">
            <div class="admin-edit-header">
                <h2 class="admin-edit-title">{{ editIsNew ? 'Add Level' : 'Edit Level' }}</h2>
                <button class="admin-edit-close" @click="closeEdit()">&times;</button>
            </div>
            <form class="admin-edit-form" @submit.prevent="saveEdit()">
                <p v-if="editIsNew" style="font-size:0.75rem;opacity:0.45;margin:0 0 0.25rem;">
                    Every field can be left blank — only a name (or a path) is needed.
                </p>
                <div v-if="editIsNew" class="admin-edit-row">
                    <div class="admin-edit-group">
                        <label>Position in list (1 = top)</label>
                        <input v-model.number="editInsertAt" type="number" min="1" :max="levels.length + 1" />
                        <p style="font-size:0.7rem;opacity:0.4;margin:0.3rem 0 0;">Levels at and below this position shift down.</p>
                    </div>
                    <div class="admin-edit-group">
                        <label>Path (unique key)</label>
                        <input :value="editPath" @input="editPath = $event.target.value; editPathTouched = true" type="text" placeholder="auto-filled from the name" />
                        <p style="font-size:0.7rem;margin:0.3rem 0 0;" :style="pathTaken ? 'color:#ef4444;opacity:1;' : 'opacity:0.4;'">
                            {{ pathTaken ? 'A level with this path already exists — saving would overwrite it.' : 'Fills itself in from the name; only change it if two levels share a name.' }}
                        </p>
                    </div>
                </div>
                <div class="admin-edit-group">
                    <label>Level Name</label>
                    <input v-model="editLevel.name" type="text" />
                </div>
                <div class="admin-edit-group">
                    <label>Author</label>
                    <input v-model="editLevel.author" type="text" />
                </div>
                <div class="admin-edit-group">
                    <label>Creators (comma separated)</label>
                    <input v-model="editCreatorsStr" type="text" placeholder="Creator 1, Creator 2" />
                </div>
                <div class="admin-edit-group">
                    <label>Verifier</label>
                    <input v-model="editLevel.verifier" type="text" />
                </div>
                <div class="admin-edit-group">
                    <label>Verification Link</label>
                    <input v-model="editLevel.verification" type="url" placeholder="https://youtu.be/..." />
                </div>
                <div class="admin-edit-group">
                    <label>Showcase Link</label>
                    <input v-model="editLevel.showcase" type="url" placeholder="https://youtu.be/..." />
                </div>
                <div class="admin-edit-group">
                    <label>Thumbnail Link</label>
                    <input v-model="editLevel.thumbnail" type="url" placeholder="https://i.ytimg.com/vi/..." />
                </div>
                <div class="admin-edit-group">
                    <label>Frame Windows Counter Link</label>
                    <input v-model="editLevel.frameCounter" type="url" placeholder="https://youtu.be/..." />
                </div>
                <div class="admin-edit-group">
                    <label>Level ID</label>
                    <input v-model="editLevel.id" type="text" placeholder="private or level ID" />
                </div>
                <div class="admin-edit-group">
                    <label>Last Update (DD.MM.YYYY)</label>
                    <input v-model="editLevel.lastUpd" type="text" placeholder="DD.MM.YYYY" />
                </div>
                <div class="admin-edit-row">
                    <div class="admin-edit-group">
                        <label>Length (sec)</label>
                        <input v-model.number="editLevel.length" type="number" min="0" />
                    </div>
                    <div class="admin-edit-group">
                        <label>% to Qualify</label>
                        <input v-model.number="editLevel.percentToQualify" type="number" min="0" max="100" />
                    </div>
                    <div class="admin-edit-group">
                        <label>% Finished</label>
                        <input v-model.number="editLevel.percentFinished" type="number" min="0" max="100" />
                    </div>
                    <div class="admin-edit-group">
                        <label>Rating</label>
                        <input v-model.number="editLevel.rating" type="number" min="1" />
                    </div>
                </div>
                <div class="admin-edit-checks">
                    <label><input type="checkbox" v-model="editLevel.isVerified" /> Verified</label>
                    <label><input type="checkbox" v-model="editLevel.isMain" /> Main List</label>
                    <label><input type="checkbox" v-model="editLevel.isFuture" /> Future List</label>
                    <label><input type="checkbox" v-model="editLevel.benchmark" /> Benchmark</label>
                </div>
                <div class="admin-edit-group">
                    <label>Tags</label>
                    <div class="admin-edit-tags">
                        <label v-for="tag in availableTags" :key="tag">
                            <input type="checkbox" :value="tag" v-model="editLevel.tags" />
                            {{ tag }}
                        </label>
                    </div>
                </div>
                <div class="admin-edit-group">
                    <div class="admin-edit-subheader">
                        <label>Records</label>
                        <button type="button" class="admin-btn admin-btn--move" @click="editAddRecord()">+ Add</button>
                    </div>
                    <div v-for="(rec, i) in editLevel.records" :key="i" class="admin-edit-record">
                        <input v-model="rec.user" placeholder="User" />
                        <input v-model="rec.link" placeholder="Link" />
                        <input v-model.number="rec.percent" type="number" placeholder="%" class="admin-edit-record--sm" />
                        <input v-model.number="rec.hz" type="number" placeholder="Hz" class="admin-edit-record--sm" />
                        <button type="button" class="admin-btn admin-btn--delete" @click="editRemoveRecord(i)">X</button>
                    </div>
                    <p v-if="!editLevel.records.length" class="admin-edit-empty">No records.</p>
                </div>
                <div class="admin-edit-group">
                    <div class="admin-edit-subheader">
                        <label>Runs</label>
                        <button type="button" class="admin-btn admin-btn--move" @click="editAddRun()">+ Add</button>
                    </div>
                    <div v-for="(run, i) in editLevel.run" :key="i" class="admin-edit-record">
                        <input v-model="run.user" placeholder="User" />
                        <input v-model="run.link" placeholder="Link" />
                        <input v-model="run.percent" placeholder="e.g. 50-100" class="admin-edit-record--md" />
                        <input v-model.number="run.hz" type="number" placeholder="Hz" class="admin-edit-record--sm" />
                        <button type="button" class="admin-btn admin-btn--delete" @click="editRemoveRun(i)">X</button>
                    </div>
                    <p v-if="!editLevel.run.length" class="admin-edit-empty">No runs.</p>
                </div>
            </form>
            <div class="admin-edit-footer">
                <button class="admin-btn admin-btn--move" :disabled="editSubmitting || (editIsNew && pathTaken)" @click="saveEdit()">
                    {{ editSubmitting ? 'Saving…' : (editIsNew ? 'Create Level' : 'Save Changes') }}
                </button>
                <button type="button" class="admin-btn" @click="closeEdit()">Cancel</button>
            </div>
        </div>
    </div>

    <!-- ── EDITOR EDIT MODAL ── -->
    <div v-if="editEditor" class="admin-edit-overlay" @click.self="editEditor = null">
        <div class="admin-edit-modal" style="max-width:420px;">
            <div class="admin-edit-header">
                <h2 class="admin-edit-title">Edit Editor</h2>
                <button class="admin-edit-close" @click="editEditor = null">&times;</button>
            </div>
            <div class="admin-edit-form">
                <div class="admin-edit-group">
                    <label>Name</label>
                    <input v-model="editEditor.name" type="text" placeholder="Display name" />
                    <p style="font-size:0.7rem;opacity:0.4;margin:0.3rem 0 0;">
                        Renaming is safe: the editor keeps their existing API key, role, link and
                        position in the list — nothing they have filled in is reset.
                    </p>
                </div>
                <div class="admin-edit-group">
                    <label>Role</label>
                    <select v-model="editEditor.role" class="admin-select">
                        <option v-for="r in roleOptions" :key="r" :value="r">{{ r }}</option>
                    </select>
                </div>
                <div class="admin-edit-group">
                    <label>Profile Link</label>
                    <input v-model="editEditor.link" type="url" placeholder="https://youtube.com/@..." />
                </div>
            </div>
            <div class="admin-edit-footer">
                <button class="admin-btn admin-btn--move" :disabled="editorSubmitting" @click="saveEditEditor()">{{ editorSubmitting ? 'Saving…' : 'Save' }}</button>
                <button class="admin-btn" @click="editEditor = null">Cancel</button>
            </div>
        </div>
    </div>

    <!-- ── RECENT CHANGE EDIT MODAL ── -->
    <div v-if="editChange" class="admin-edit-overlay" @click.self="editChange = null">
        <div class="admin-edit-modal" style="max-width:560px;">
            <div class="admin-edit-header">
                <h2 class="admin-edit-title">Edit Change</h2>
                <button class="admin-edit-close" @click="editChange = null">&times;</button>
            </div>
            <div class="admin-edit-form">
                <div class="admin-edit-row">
                    <div class="admin-edit-group">
                        <label>Date</label>
                        <input v-model="editChange.date" type="text" placeholder="e.g. April 18, 2026" />
                    </div>
                    <div class="admin-edit-group">
                        <label>Pick a date</label>
                        <input :value="editChangeDatePicker" type="date" @input="pickChangeDate($event, editChange)" />
                    </div>
                </div>
                <div class="admin-edit-group">
                    <label>Change</label>
                    <input v-model="editChange.change" type="text" />
                </div>
                <div class="admin-edit-group">
                    <label>Preview</label>
                    <div style="font-size:0.82rem;" v-html="formatChange(editChange.change)"></div>
                </div>
            </div>
            <div class="admin-edit-footer">
                <button class="admin-btn admin-btn--move" :disabled="changesSubmitting" @click="saveEditChange()">{{ changesSubmitting ? 'Saving…' : 'Save' }}</button>
                <button class="admin-btn" @click="editChange = null">Cancel</button>
            </div>
        </div>
    </div>

    <!-- ── PENDING EDIT MODAL ── -->
    <div v-if="editPending" class="admin-edit-overlay" @click.self="editPending = null">
        <div class="admin-edit-modal">
            <div class="admin-edit-header">
                <h2 class="admin-edit-title">Edit Pending Entry</h2>
                <button class="admin-edit-close" @click="editPending = null">&times;</button>
            </div>
            <div class="admin-edit-form">
                <div class="admin-edit-group">
                    <label>Level Name</label>
                    <input v-model="editPending.name" type="text" />
                </div>
                <div class="admin-edit-row">
                    <div class="admin-edit-group">
                        <label>Section</label>
                        <select v-model="editPending.section" class="admin-select">
                            <option value="placement">Pending Placement</option>
                            <option value="movement">Pending Movement</option>
                            <option value="indefinite">Pending Indefinitely</option>
                        </select>
                    </div>
                    <div v-if="editPending.section === 'movement'" class="admin-edit-group">
                        <label>Direction</label>
                        <select v-model="editPending.direction" class="admin-select">
                            <option value="up">Up</option>
                            <option value="down">Down</option>
                        </select>
                    </div>
                    <div v-else class="admin-edit-group">
                        <label>Position Icon</label>
                        <select v-model="editPending.tier" class="admin-select">
                            <option v-for="t in placementTiers" :key="t" :value="t">{{ t === '?' ? '? (unknown)' : t }}</option>
                        </select>
                    </div>
                </div>
                <div class="admin-edit-group">
                    <label>Link (optional)</label>
                    <input v-model="editPending.link" type="url" placeholder="https://youtu.be/..." />
                </div>
            </div>
            <div class="admin-edit-footer">
                <button class="admin-btn admin-btn--move" :disabled="pendingSubmitting" @click="saveEditPending()">{{ pendingSubmitting ? 'Saving…' : 'Save' }}</button>
                <button class="admin-btn" @click="editPending = null">Cancel</button>
            </div>
        </div>
    </div>
</main>
    `,
    data: () => ({
        store,
        activeTab: 'levels',
        // Levels
        levels: [],
        search: '',
        loading: false,
        editLevel: null,
        editCreatorsStr: '',
        editSubmitting: false,
        // Creating and editing share one modal; these only apply when creating.
        editIsNew: false,
        editInsertAt: 1,
        levelNotice: '',
        editPath: '',
        editPathTouched: false,
        availableTags: AVAILABLE_TAGS,
        // Events
        eventsLoaded: false,
        lotm: emptyLotm(),
        ctv: emptyCtv(),
        eventsSaving: null,
        eventsSaved: null,
        // Editors
        editors: [],
        editorsLoaded: false,
        editorsLoading: false,
        editEditor: null,
        newEditor: { name: '', key: '', role: 'mod', link: '' },
        editorSubmitting: false,
        editorsOrderSaving: false,
        editorsOrderSaved: false,
        roleOptions: ROLE_OPTIONS,
        // Recent Changes
        changes: [],
        changesLoaded: false,
        changesLoading: false,
        editChange: null,
        newChange: emptyChange(),
        changesSubmitting: false,
        changesOrderSaving: false,
        changesOrderSaved: false,
        // Pending
        pendingEntries: [],
        pendingLoaded: false,
        pendingLoading: false,
        editPending: null,
        newPending: emptyPending(),
        pendingSubmitting: false,
        placementTiers: PLACEMENT_TIERS,
        // Audit Log
        auditLog: [],
        auditLoading: false,
        auditLoaded: false,
    }),
    computed: {
        filteredLevels() {
            if (!this.search.trim()) return this.levels;
            const q = this.search.toLowerCase();
            return this.levels.filter(l =>
                l.name?.toLowerCase().includes(q) || l.author?.toLowerCase().includes(q)
            );
        },
        // Warn before a "new" level silently overwrites an existing one: PUT
        // /api/levels updates when the path already exists.
        pathTaken() {
            if (!this.editIsNew) return false;
            const path = (this.editPath || '').trim();
            return !!path && this.levels.some(l => l.path === path);
        },
        newChangeDatePicker() { return changeDateToInput(this.newChange.date); },
        editChangeDatePicker() { return this.editChange ? changeDateToInput(this.editChange.date) : ''; },
        sortedPending() {
            const order = { placement: 0, movement: 1, indefinite: 2 };
            const val = (p) => p === '?' ? 999999 : (parseInt(p) || 999999);
            return [...this.pendingEntries].sort((a, b) => {
                const sa = pendingSectionOf(a), sb = pendingSectionOf(b);
                if (order[sa] !== order[sb]) return order[sa] - order[sb];
                return val(a.placement) - val(b.placement) || (a.name || '').localeCompare(b.name || '');
            });
        },
    },
    watch: {
        'editLevel.name'(val) {
            if (this.editIsNew && !this.editPathTouched) this.editPath = slugify(val);
        },
        'store.authKey'(val) {
            if (val) this.loadLevels();
        },
        activeTab(tab) {
            if (tab === 'events' && !this.eventsLoaded) this.loadEvents();
            if (tab === 'editors' && !this.editorsLoaded) this.loadEditors();
            if (tab === 'pending' && !this.pendingLoaded) this.loadPending();
            if (tab === 'changes' && !this.changesLoaded) this.loadChanges();
            if (tab === 'audit' && !this.auditLoaded) this.loadAuditLog();
        },
    },
    async mounted() {
        if (store.authKey) this.loadLevels();
    },
    methods: {
        // ── LEVELS ──
        async loadLevels() {
            this.loading = true;
            try {
                const res = await fetch(`${API}/api/list`);
                const data = await res.json();
                this.levels = data.map((l, i) => ({ ...l, _rank: i + 1, _newPos: i + 1, _moving: false, _deleting: false }));
            } catch (e) {
                alert(requestFailed(e));
            }
            this.loading = false;
        },
        async moveLevel(level) {
            const newPos = level._newPos;
            if (!newPos || newPos < 1 || newPos > this.levels.length || newPos === level._rank) return;
            level._moving = true;
            try {
                const res = await fetch(`${API}/api/levels/move`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${store.authKey}` },
                    body: JSON.stringify({ path: level.path, newPosition: newPos }),
                });
                if (res.ok) {
                    await this.loadLevels();
                } else {
                    alert(await errorText(res, 'Failed to move level.'));
                    level._moving = false;
                }
            } catch (e) {
                alert(requestFailed(e));
                level._moving = false;
            }
        },
        async deleteLevel(level) {
            if (!confirm(`Delete "${level.name}"? This cannot be undone.`)) return;
            level._deleting = true;
            try {
                const res = await fetch(`${API}/api/levels/${encodeURIComponent(level.path)}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${store.authKey}` },
                });
                if (res.ok) {
                    this.levels = this.levels.filter(l => l.path !== level.path);
                    this.levels.forEach((l, i) => { l._rank = i + 1; l._newPos = i + 1; });
                } else {
                    alert(await errorText(res, 'Failed to delete level.'));
                    level._deleting = false;
                }
            } catch (e) {
                alert(requestFailed(e));
                level._deleting = false;
            }
        },
        openNewLevel() {
            this.editLevel = emptyLevel();
            this.editCreatorsStr = '';
            this.editIsNew = true;
            // Default to the bottom of the list — safer than the top, which would
            // shift every level down if someone saves by accident.
            this.editInsertAt = this.levels.length + 1;
            this.editPath = '';
            this.editPathTouched = false;
            this.editSubmitting = false;
        },
        openEdit(level) {
            this.editLevel = JSON.parse(JSON.stringify(level));
            this.editLevel.records = (this.editLevel.records || []).filter(r => r.user !== 'none');
            this.editLevel.run = (this.editLevel.run || []).filter(r => r.user !== 'none');
            this.editLevel.tags = this.editLevel.tags || [];
            this.editCreatorsStr = (this.editLevel.creators || []).join(', ');
            this.editIsNew = false;
            this.editPath = level.path;
            this.editPathTouched = false;
            this.editSubmitting = false;
        },
        closeEdit() {
            this.editLevel = null;
            this.editCreatorsStr = '';
            this.editIsNew = false;
            this.editPath = '';
            this.editPathTouched = false;
            this.editSubmitting = false;
        },
        editAddRecord() { this.editLevel.records.push({ user: '', link: '', percent: 0, hz: 0 }); },
        editRemoveRecord(i) { this.editLevel.records.splice(i, 1); },
        editAddRun() { this.editLevel.run.push({ user: '', link: '', percent: '', hz: 240 }); },
        editRemoveRun(i) { this.editLevel.run.splice(i, 1); },
        // Turns the modal's working copy into an API payload. Every field may be
        // blank: blanks fall back to the defaults a level needs to render, rather
        // than being written as '' or NaN.
        buildLevelPayload() {
            const { _rank, _newPos, _moving, _deleting, ...data } = this.editLevel;
            data.creators = this.editCreatorsStr.split(',').map(s => s.trim()).filter(s => s);
            data.name = (data.name || '').trim();
            if (!data.thumbnail) data.thumbnail = null;
            if (!data.frameCounter) data.frameCounter = null;
            data.length = numOr(data.length, 0);
            data.percentToQualify = numOr(data.percentToQualify, 1);
            data.percentFinished = numOr(data.percentFinished, 0);
            data.rating = numOr(data.rating, 1);
            if (!data.id) data.id = 'private';
            if (!isNaN(Number(data.id))) data.id = Number(data.id);
            if (!data.lastUpd) data.lastUpd = todayStamp();
            data.tags = data.tags || [];
            // Drop half-filled rows someone added and left empty, then re-add the
            // sentinel the frontend uses to mean "no records".
            data.records = (data.records || []).filter(r => (r.user || '').trim());
            data.run = (data.run || []).filter(r => (r.user || '').trim());
            if (!data.records.length) data.records.push({ user: 'none', link: '', percent: 0, hz: 0 });
            if (!data.run.length) data.run.push({ user: 'none', link: '', percent: '0', hz: 0 });
            return data;
        },
        async saveEdit() {
            const data = this.buildLevelPayload();
            let insertAt = this.editLevel._rank;

            if (this.editIsNew) {
                const path = (this.editPath || '').trim() || slugify(data.name);
                if (!path) {
                    alert('Give the level a name, or set the Path field yourself.\n\n' +
                          'The path is the unique key the list is stored under, so it cannot be empty.');
                    return;
                }
                // PUT /api/levels updates when the path exists — without this guard a
                // new level with a duplicate name would silently overwrite the old one.
                if (this.levels.some(l => l.path === path)) {
                    alert(`A level with the path "${path}" already exists.\n\n` +
                          'Change the Path field, or edit that level instead.');
                    return;
                }
                data.path = path;
                insertAt = Math.min(Math.max(1, numOr(this.editInsertAt, 1)), this.levels.length + 1);
            }

            this.editSubmitting = true;
            try {
                const res = await fetch(`${API}/api/levels`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${store.authKey}` },
                    body: JSON.stringify({ ...data, insertAt }),
                });
                if (res.ok) {
                    const wasNew = this.editIsNew;
                    const name = data.name || data.path;
                    this.closeEdit();
                    await this.loadLevels();
                    if (wasNew) {
                        this.levelNotice = `Added "${name}" at position ${insertAt}.`;
                        setTimeout(() => { this.levelNotice = ''; }, 4000);
                    }
                } else {
                    alert(await errorText(res, 'Failed to save.'));
                }
            } catch (e) {
                alert(requestFailed(e));
            }
            this.editSubmitting = false;
        },

        // ── EVENTS ──
        async loadEvents() {
            try {
                const [lm, lv] = await Promise.all([
                    fetch(`${API}/api/level-month`).then(r => r.json()).catch(() => null),
                    fetch(`${API}/api/level-verif`).then(r => r.json()).catch(() => null),
                ]);
                if (lm) this.lotm = {
                    ...emptyLotm(), ...lm,
                    record: { ...emptyLotm().record, ...(lm.record || {}) },
                    run: { ...emptyLotm().run, ...(lm.run || {}) },
                };
                if (lv) this.ctv = {
                    ...emptyCtv(), ...lv,
                    record: { ...emptyCtv().record, ...(lv.record || {}) },
                    run: { ...emptyCtv().run, ...(lv.run || {}) },
                };
            } catch { /* ignore */ }
            this.eventsLoaded = true;
        },
        async saveLotm() {
            this.eventsSaving = 'lotm';
            try {
                const res = await fetch(`${API}/api/config`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${store.authKey}` },
                    body: JSON.stringify({ levelMonth: this.lotm }),
                });
                if (res.ok) {
                    this.eventsSaved = 'lotm';
                    setTimeout(() => { if (this.eventsSaved === 'lotm') this.eventsSaved = null; }, 2500);
                } else { alert(await errorText(res, 'Failed to save.')); }
            } catch (e) { alert(requestFailed(e)); }
            this.eventsSaving = null;
        },
        async saveCtv() {
            this.eventsSaving = 'ctv';
            try {
                const res = await fetch(`${API}/api/config`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${store.authKey}` },
                    body: JSON.stringify({ levelVerif: this.ctv }),
                });
                if (res.ok) {
                    this.eventsSaved = 'ctv';
                    setTimeout(() => { if (this.eventsSaved === 'ctv') this.eventsSaved = null; }, 2500);
                } else { alert(await errorText(res, 'Failed to save.')); }
            } catch (e) { alert(requestFailed(e)); }
            this.eventsSaving = null;
        },

        // ── EDITORS ──
        async loadEditors() {
            this.editorsLoading = true;
            try {
                const res = await fetch(`${API}/api/editors`);
                this.editors = await res.json();
            } catch (e) { alert(requestFailed(e)); }
            this.editorsLoading = false;
            this.editorsLoaded = true;
        },
        // Move one editor up (-1) or down (+1) and persist the whole order.
        // The site renders editors in exactly this order — never alphabetically.
        async moveEditor(i, delta) {
            const j = i + delta;
            if (j < 0 || j >= this.editors.length) return;
            const next = [...this.editors];
            [next[i], next[j]] = [next[j], next[i]];
            const previous = this.editors;
            this.editors = next;
            this.editorsOrderSaving = true;
            this.editorsOrderSaved = false;
            try {
                const res = await fetch(`${API}/api/editors/reorder`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${store.authKey}` },
                    body: JSON.stringify({ names: next.map(e => e.name) }),
                });
                if (res.ok) {
                    this.editorsOrderSaved = true;
                    setTimeout(() => { this.editorsOrderSaved = false; }, 2000);
                } else {
                    this.editors = previous;
                    alert(await errorText(res, 'Failed to save the editor order.'));
                }
            } catch (e) {
                this.editors = previous;
                alert(requestFailed(e));
            }
            this.editorsOrderSaving = false;
        },
        openEditEditor(ed) {
            // Keep the original name around: it's the key the API matches on, so a
            // rename has to send both the old and the new one.
            this.editEditor = { ...ed, originalName: ed.name };
            this.editorSubmitting = false;
        },
        async saveEditEditor() {
            const newName = (this.editEditor.name || '').trim();
            if (!newName) { alert('Name is required.'); return; }
            const oldName = this.editEditor.originalName;
            this.editorSubmitting = true;
            try {
                const res = await fetch(`${API}/api/editors`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${store.authKey}` },
                    body: JSON.stringify({
                        name: oldName,
                        newName,
                        role: this.editEditor.role,
                        link: this.editEditor.link,
                    }),
                });
                if (res.ok) {
                    const i = this.editors.findIndex(e => e.name === oldName);
                    if (i !== -1) {
                        // Update in place so the editor keeps their position in the list.
                        this.editors[i] = {
                            ...this.editors[i],
                            name: newName,
                            role: this.editEditor.role,
                            link: this.editEditor.link,
                        };
                    }
                    this.editEditor = null;
                } else { alert(await errorText(res, 'Failed to save editor.')); }
            } catch (e) { alert(requestFailed(e)); }
            this.editorSubmitting = false;
        },
        async deleteEditor(ed) {
            if (!confirm(`Remove "${ed.name}"? This revokes their API access immediately.`)) return;
            try {
                const res = await fetch(`${API}/api/editors/${encodeURIComponent(ed.name)}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${store.authKey}` },
                });
                if (res.ok) {
                    this.editors = this.editors.filter(e => e.name !== ed.name);
                } else { alert(await errorText(res, 'Failed to delete editor.')); }
            } catch (e) { alert(requestFailed(e)); }
        },
        generateKey() {
            const arr = new Uint8Array(32);
            crypto.getRandomValues(arr);
            this.newEditor.key = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
        },
        async addEditor() {
            if (!this.newEditor.name || !this.newEditor.key) { alert('Name and key are required.'); return; }
            this.editorSubmitting = true;
            try {
                const res = await fetch(`${API}/api/admin/add-key`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${store.authKey}` },
                    body: JSON.stringify({ name: this.newEditor.name, key: this.newEditor.key, role: this.newEditor.role, link: this.newEditor.link }),
                });
                if (res.ok) {
                    await this.loadEditors();
                    this.newEditor = { name: '', key: '', role: 'mod', link: '' };
                } else {
                    alert(await errorText(res, 'Failed to add editor.'));
                }
            } catch (e) { alert(requestFailed(e)); }
            this.editorSubmitting = false;
        },

        // ── PENDING ──
        pendingSectionOf(p) { return pendingSectionOf(p); },
        sectionLabel(section) {
            return { placement: 'Placement', movement: 'Movement', indefinite: 'Indefinitely' }[section] || section;
        },
        // Turn the form's {section, tier, direction} into the API's {placement, indefinite}
        pendingBody(f) {
            const body = { name: (f.name || '').trim(), link: (f.link || '').trim() };
            if (f.section === 'movement') {
                body.placement = f.direction;
                body.indefinite = 0;
            } else {
                body.placement = f.tier;
                body.indefinite = f.section === 'indefinite' ? 1 : 0;
            }
            return body;
        },
        async loadPending() {
            this.pendingLoading = true;
            try {
                const res = await fetch(`${API}/api/pending`);
                this.pendingEntries = await res.json();
            } catch (e) { alert(requestFailed(e)); }
            this.pendingLoading = false;
            this.pendingLoaded = true;
        },
        openEditPending(p) {
            const section = pendingSectionOf(p);
            this.editPending = {
                id: p.id,
                name: p.name || '',
                section,
                tier: section === 'movement' ? '?' : (p.placement || '?'),
                direction: section === 'movement' ? ((p.placement || 'up').toLowerCase()) : 'up',
                link: p.link || '',
            };
            this.pendingSubmitting = false;
        },
        async addPending() {
            if (!this.newPending.name.trim()) { alert('Level name is required.'); return; }
            this.pendingSubmitting = true;
            try {
                const res = await fetch(`${API}/api/admin/pending`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${store.authKey}` },
                    body: JSON.stringify(this.pendingBody(this.newPending)),
                });
                if (res.ok) {
                    await this.loadPending();
                    this.newPending = emptyPending();
                } else {
                    alert(await errorText(res, 'Failed to add entry.'));
                }
            } catch (e) { alert(requestFailed(e)); }
            this.pendingSubmitting = false;
        },
        async saveEditPending() {
            if (!this.editPending.name.trim()) { alert('Level name is required.'); return; }
            this.pendingSubmitting = true;
            try {
                const res = await fetch(`${API}/api/admin/pending`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${store.authKey}` },
                    body: JSON.stringify({ id: this.editPending.id, ...this.pendingBody(this.editPending) }),
                });
                if (res.ok) {
                    await this.loadPending();
                    this.editPending = null;
                } else { alert(await errorText(res, 'Failed to save entry.')); }
            } catch (e) { alert(requestFailed(e)); }
            this.pendingSubmitting = false;
        },
        async deletePending(p) {
            if (!confirm(`Remove "${p.name}" from the Pending List?`)) return;
            try {
                const res = await fetch(`${API}/api/pending/${p.id}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${store.authKey}` },
                });
                if (res.ok) {
                    this.pendingEntries = this.pendingEntries.filter(e => e.id !== p.id);
                } else { alert(await errorText(res, 'Failed to delete entry.')); }
            } catch (e) { alert(requestFailed(e)); }
        },

        // ── RECENT CHANGES ──
        // Same **bold** rendering the home page and mobile home use, so the admin
        // preview matches what visitors will see.
        formatChange(text) {
            const html = (text || '')
                .split(/(\*\*[^*]+\*\*)/)
                .map(part => part.startsWith('**') && part.endsWith('**')
                    ? `<strong>${escapeHtml(part.slice(2, -2))}</strong>`
                    : part ? `<span class="dim">${escapeHtml(part)}</span>` : '')
                .join('');
            return `<span class="dim">— </span>${html}`;
        },
        // The <input type="date"> is only a helper: it writes a formatted date into
        // the free-text field, which stays the source of truth.
        pickChangeDate(event, target) {
            const formatted = inputToChangeDate(event.target.value);
            if (formatted) target.date = formatted;
        },
        async loadChanges() {
            this.changesLoading = true;
            try {
                const res = await fetch(`${API}/api/admin/changes`, {
                    headers: { Authorization: `Bearer ${store.authKey}` },
                });
                if (res.ok) this.changes = await res.json();
                else alert(await errorText(res, 'Failed to load recent changes.'));
            } catch (e) { alert(requestFailed(e)); }
            this.changesLoading = false;
            this.changesLoaded = true;
        },
        async addChange() {
            const date = (this.newChange.date || '').trim();
            const change = (this.newChange.change || '').trim();
            if (!date || !change) { alert('Date and change text are both required.'); return; }
            this.changesSubmitting = true;
            try {
                const res = await fetch(`${API}/api/admin/changes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${store.authKey}` },
                    body: JSON.stringify({ date, change, position: this.newChange.position }),
                });
                if (res.ok) {
                    await this.loadChanges();
                    // Keep the date and position: adding several lines for one day is
                    // the common case.
                    this.newChange = { ...emptyChange(), date, position: this.newChange.position };
                } else { alert(await errorText(res, 'Failed to add change.')); }
            } catch (e) { alert(requestFailed(e)); }
            this.changesSubmitting = false;
        },
        openEditChange(c) {
            this.editChange = { id: c.id, date: c.date || '', change: c.change || '' };
            this.changesSubmitting = false;
        },
        async saveEditChange() {
            const date = (this.editChange.date || '').trim();
            const change = (this.editChange.change || '').trim();
            if (!date || !change) { alert('Date and change text are both required.'); return; }
            this.changesSubmitting = true;
            try {
                const res = await fetch(`${API}/api/admin/changes`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${store.authKey}` },
                    body: JSON.stringify({ id: this.editChange.id, date, change }),
                });
                if (res.ok) {
                    await this.loadChanges();
                    this.editChange = null;
                } else { alert(await errorText(res, 'Failed to save change.')); }
            } catch (e) { alert(requestFailed(e)); }
            this.changesSubmitting = false;
        },
        async deleteChange(c) {
            if (!confirm(`Remove this change from ${c.date}?\n\n${c.change}`)) return;
            try {
                const res = await fetch(`${API}/api/admin/changes/${c.id}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${store.authKey}` },
                });
                if (res.ok) this.changes = this.changes.filter(x => x.id !== c.id);
                else alert(await errorText(res, 'Failed to delete change.'));
            } catch (e) { alert(requestFailed(e)); }
        },
        // Move one line up (-1) or down (+1) and persist the whole order. Lines with
        // the same date group together on the site, so this also moves whole days
        // around once their lines are adjacent.
        async moveChange(i, delta) {
            const j = i + delta;
            if (j < 0 || j >= this.changes.length) return;
            const next = [...this.changes];
            [next[i], next[j]] = [next[j], next[i]];
            const previous = this.changes;
            this.changes = next;
            this.changesOrderSaving = true;
            this.changesOrderSaved = false;
            try {
                const res = await fetch(`${API}/api/admin/changes/reorder`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${store.authKey}` },
                    body: JSON.stringify({ ids: next.map(c => c.id) }),
                });
                if (res.ok) {
                    this.changesOrderSaved = true;
                    setTimeout(() => { this.changesOrderSaved = false; }, 2000);
                } else {
                    this.changes = previous;
                    alert(await errorText(res, 'Failed to save the change order.'));
                }
            } catch (e) {
                this.changes = previous;
                alert(requestFailed(e));
            }
            this.changesOrderSaving = false;
        },

        // ── AUDIT LOG ──
        async loadAuditLog() {
            this.auditLoading = true;
            try {
                const res = await fetch(`${API}/api/audit-log`, {
                    headers: { Authorization: `Bearer ${store.authKey}` },
                });
                this.auditLog = await res.json();
            } catch (e) { alert(requestFailed(e)); }
            this.auditLoading = false;
            this.auditLoaded = true;
        },
    },
};
