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

// The audit log is read a page at a time; 100 is what the endpoint used to
// return in total, and is a comfortable screenful.
const AUDIT_PAGE = 100;

// The actions the worker writes, for the filter. Anything it starts writing
// later still shows in the table — this list only fills the dropdown.
const AUDIT_ACTIONS = [
    'INSERT', 'UPDATE', 'DELETE', 'MOVE',
    'RESTORE', 'UNDO', 'SNAPSHOT',
    'PENDING_ADD', 'PENDING_EDIT', 'PENDING_UPDATE', 'PENDING_DELETE',
    'CHANGE_ADD', 'CHANGE_EDIT', 'CHANGE_DELETE', 'CHANGE_REORDER',
    'EDITOR_ADD', 'EDITOR_UPDATE', 'EDITOR_DELETE', 'EDITOR_REORDER',
    'CONFIG_UPDATE',
];

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
            <button class="admin-tab" :class="{ active: activeTab === 'snapshots' }" @click="activeTab = 'snapshots'">Snapshots</button>
        </div>

        <!-- ── LEVELS ── -->
        <template v-if="activeTab === 'levels'">
            <div class="admin-toolbar">
                <button class="admin-btn admin-btn--new" @click="openNewLevel()">+ New Level</button>
                <label class="search-field admin-search">
                    <span class="info-mag" aria-hidden="true"></span>
                    <input v-model="search" class="search-new" placeholder="Search by name or author…" />
                </label>
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
                <label class="search-field admin-search">
                    <span class="info-mag" aria-hidden="true"></span>
                    <input v-model="auditFilterText" class="search-new" placeholder="Filter by editor or action…" @keydown.enter="applyAuditFilter()" />
                </label>
                <select class="admin-select" v-model="auditAction" @change="applyAuditFilter()">
                    <option value="">All actions</option>
                    <option v-for="a in AUDIT_ACTIONS" :key="a" :value="a">{{ a }}</option>
                </select>
                <span class="admin-count">{{ auditShownLabel }}</span>
                <button class="admin-btn admin-btn--move" @click="loadAuditLog()" :disabled="auditLoading" style="margin-left:auto;">{{ auditLoading ? 'Loading…' : 'Refresh' }}</button>
            </div>

            <!-- Who did how much, over the same window the panel names. This is
                 a count of audit lines, so a level edited twice counts twice. -->
            <div class="admin-card admin-activity">
                <div class="admin-card-title">Activity, last {{ activity.days }} days</div>
                <div v-if="!activity.editors.length" class="admin-note" style="padding:0.5rem 0 0;">Nothing logged in this window.</div>
                <div v-else class="admin-activity__grid">
                    <button v-for="row in activity.editors" :key="row.editor_name" type="button"
                            class="admin-activity__cell" :class="{ 'is-on': auditEditor === row.editor_name }"
                            @click="filterByEditor(row.editor_name)">
                        <span class="admin-activity__n">{{ row.changes }}</span>
                        <span class="admin-activity__who">{{ row.editor_name || 'unknown' }}</span>
                        <span class="admin-activity__sub">
                            {{ row.deletions ? row.deletions + ' deletion' + (row.deletions === 1 ? '' : 's') : 'no deletions' }}
                        </span>
                    </button>
                </div>
            </div>

            <div v-if="auditLoading && !auditLog.length" class="admin-loading">Loading audit log…</div>
            <div v-else-if="!auditLog.length" class="admin-empty">
                {{ auditEditor || auditAction ? 'Nothing matches that filter.' : 'No entries yet. The audit_log table may need to be created — see setup guide.' }}
            </div>
            <table v-else class="admin-table">
                <thead>
                    <tr>
                        <th class="admin-th" style="width:11rem;">Time (UTC)</th>
                        <th class="admin-th" style="width:8rem;">Editor</th>
                        <th class="admin-th" style="width:9rem;">Action</th>
                        <th class="admin-th">Target</th>
                        <th class="admin-th">Details</th>
                        <th class="admin-th admin-th--action" style="width:7rem;">Undo</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="entry in auditLog" :key="entry.id" class="admin-row" :class="{ 'is-undone': entry.undone_at }">
                        <td class="admin-td admin-td--pos" style="font-size:0.72rem;white-space:nowrap;opacity:0.55;">{{ entry.timestamp }}</td>
                        <td class="admin-td" style="font-size:0.8rem;font-weight:600;">{{ entry.editor_name }}</td>
                        <td class="admin-td"><span class="admin-badge admin-badge--main" style="font-size:0.58rem;">{{ entry.action }}</span></td>
                        <td class="admin-td" style="font-size:0.8rem;">{{ entry.target }}</td>
                        <td class="admin-td" style="font-size:0.72rem;opacity:0.5;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ entry.details }}</td>
                        <td class="admin-td admin-td--move">
                            <button v-if="entry.undoable" class="admin-btn admin-btn--move" style="font-size:0.68rem;"
                                    :disabled="undoing === entry.id" @click="undoDeletion(entry)">
                                {{ undoing === entry.id ? '…' : 'Put back' }}
                            </button>
                            <span v-else-if="entry.undone_at" style="font-size:0.66rem;opacity:0.45;">undone</span>
                        </td>
                    </tr>
                </tbody>
            </table>

            <div v-if="auditHasMore" class="admin-more">
                <button class="admin-btn admin-btn--move" :disabled="auditLoading" @click="loadMoreAudit()">
                    {{ auditLoading ? 'Loading…' : 'Load ' + auditPageSize + ' older' }}
                </button>
            </div>
            <p v-else-if="auditLog.length" class="admin-note" style="text-align:center;">
                That is the whole log — {{ auditTotal.toLocaleString() }} operation{{ auditTotal === 1 ? '' : 's' }}, back to the beginning.
            </p>
        </template>

        <template v-if="activeTab === 'snapshots'">
            <div class="admin-toolbar">
                <span style="font-size:0.8rem;opacity:0.55;">{{ snapshotsRetention }}</span>
                <button class="admin-btn admin-btn--new" @click="takeSnapshot()" :disabled="snapshotBusy">Take one now</button>
                <button class="admin-btn admin-btn--move" @click="loadSnapshots()" :disabled="snapshotsLoading" style="margin-left:auto;">{{ snapshotsLoading ? 'Loading…' : 'Refresh' }}</button>
            </div>

            <div v-if="snapshotsLoading && !snapshots.length" class="admin-loading">Loading snapshots…</div>
            <div v-else-if="snapshotsMissing" class="admin-empty">
                The snapshots table does not exist yet. Run <code>scripts/schema-migrations.sql</code> on the D1 database.
            </div>
            <div v-else-if="!snapshots.length" class="admin-empty">
                No snapshots yet. One is taken automatically before the first edit of each day.
            </div>
            <table v-else class="admin-table">
                <thead>
                    <tr>
                        <th class="admin-th" style="width:12rem;">Taken (UTC)</th>
                        <th class="admin-th" style="width:7rem;">Stands for</th>
                        <th class="admin-th">What it is</th>
                        <th class="admin-th" style="width:7rem;">Levels</th>
                        <th class="admin-th" style="width:7rem;">Size</th>
                        <th class="admin-th admin-th--action" style="width:8rem;">Restore</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="snap in snapshots" :key="snap.id" class="admin-row">
                        <td class="admin-td admin-td--pos" style="font-size:0.72rem;white-space:nowrap;opacity:0.6;">{{ snap.taken_at.replace('T', ' ').slice(0, 19) }}</td>
                        <td class="admin-td" style="font-size:0.78rem;font-weight:600;">{{ snap.day }}</td>
                        <td class="admin-td" style="font-size:0.78rem;">
                            <span class="admin-badge" :class="snapshotBadge(snap.kind)" style="font-size:0.56rem;margin-right:0.5rem;">{{ snap.kind }}</span>
                            {{ snap.label }}
                        </td>
                        <td class="admin-td" style="font-size:0.78rem;font-variant-numeric:tabular-nums;">{{ snap.levels_count }}</td>
                        <td class="admin-td" style="font-size:0.72rem;opacity:0.5;font-variant-numeric:tabular-nums;">{{ kb(snap.stored_bytes) }}</td>
                        <td class="admin-td admin-td--move">
                            <button class="admin-btn admin-btn--delete" style="font-size:0.68rem;"
                                    :disabled="snapshotBusy" @click="restoreSnapshot(snap)">
                                {{ restoring === snap.id ? '…' : 'Restore' }}
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
            <p v-if="snapshots.length" class="admin-note">
                Restoring puts back the levels, the pending list, the recent-changes feed and the two event picks.
                It never touches editors or API keys. The live list is snapshotted first, so a restore can always be
                undone by restoring the &ldquo;before restoring to…&rdquo; point it leaves behind.
            </p>
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
                    <input v-model="editLevel.thumbnail" type="url" placeholder="YouTube link or image URL" />
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
        // Audit Log — the whole thing, a page at a time.
        auditLog: [],
        auditLoading: false,
        auditLoaded: false,
        auditTotal: 0,
        auditHasMore: false,
        auditPageSize: AUDIT_PAGE,
        auditFilterText: '',
        auditEditor: '',
        auditAction: '',
        activity: { days: 30, editors: [] },
        undoing: 0,
        AUDIT_ACTIONS,
        // Snapshots
        snapshots: [],
        snapshotsLoading: false,
        snapshotsLoaded: false,
        snapshotsMissing: false,
        snapshotsRetention: '',
        snapshotBusy: false,
        restoring: 0,
    }),
    computed: {
        // "showing 100 of 4,312", or what the filter narrowed it to.
        auditShownLabel() {
            if (!this.auditTotal) return '';
            const shown = this.auditLog.length;
            const of = this.auditTotal.toLocaleString();
            const scope = this.auditEditor || this.auditAction ? ' matching' : '';
            return shown >= this.auditTotal ? `${of}${scope} operation${this.auditTotal === 1 ? '' : 's'}`
                : `showing ${shown.toLocaleString()} of ${of}${scope}`;
        },
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
            // These two are read every time they are opened, not once. They are
            // logs of what just happened, and they carry buttons that act on
            // rows — a stale one offers an undo for something already undone.
            if (tab === 'audit') this.loadAuditLog();
            if (tab === 'snapshots') this.loadSnapshots();
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
        // A page at a time, newest first, continuing from the last id seen. The
        // endpoint used to hand back a hard LIMIT 100 with no way past it, so
        // anything older than the last hundred operations was unreachable.
        auditQuery(before) {
            const q = new URLSearchParams({ limit: String(AUDIT_PAGE) });
            if (before) q.set('before', String(before));
            if (this.auditEditor) q.set('editor', this.auditEditor);
            if (this.auditAction) q.set('action', this.auditAction);
            return q.toString();
        },
        async fetchAuditPage(before) {
            const res = await fetch(`${API}/api/audit-log?${this.auditQuery(before)}`, {
                headers: { Authorization: `Bearer ${store.authKey}` },
            });
            const body = await res.json();
            if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
            // A worker deployed before this change answers with a bare array.
            return Array.isArray(body)
                ? { entries: body, total: body.length, hasMore: false }
                : body;
        },
        async loadAuditLog() {
            this.auditLoading = true;
            try {
                const page = await this.fetchAuditPage(0);
                this.auditLog = page.entries;
                this.auditTotal = page.total;
                this.auditHasMore = page.hasMore;
                await this.loadActivity();
            } catch (e) { alert(requestFailed(e)); }
            this.auditLoading = false;
            this.auditLoaded = true;
        },
        async loadMoreAudit() {
            if (!this.auditLog.length) return this.loadAuditLog();
            this.auditLoading = true;
            try {
                const page = await this.fetchAuditPage(this.auditLog[this.auditLog.length - 1].id);
                this.auditLog = this.auditLog.concat(page.entries);
                this.auditTotal = page.total;
                this.auditHasMore = page.hasMore;
            } catch (e) { alert(requestFailed(e)); }
            this.auditLoading = false;
        },
        // One field for both filters: a name the activity panel knows is an
        // editor, anything matching an action is an action.
        applyAuditFilter() {
            const text = this.auditFilterText.trim();
            const asAction = AUDIT_ACTIONS.find((a) => a.toLowerCase() === text.toLowerCase());
            if (asAction) { this.auditAction = asAction; this.auditEditor = ''; }
            else { this.auditEditor = text; }
            this.loadAuditLog();
        },
        filterByEditor(name) {
            this.auditEditor = this.auditEditor === name ? '' : name;
            this.auditFilterText = this.auditEditor;
            this.loadAuditLog();
        },
        async loadActivity() {
            try {
                const res = await fetch(`${API}/api/admin/activity`, {
                    headers: { Authorization: `Bearer ${store.authKey}` },
                });
                const body = await res.json();
                if (res.ok && body && Array.isArray(body.editors)) this.activity = body;
            } catch { /* the log is still readable without it */ }
        },
        async undoDeletion(entry) {
            const what = entry.action === 'EDITOR_DELETE'
                ? `Put "${entry.target}" back as an editor? This restores their API key as well as their name.`
                : `Put "${entry.target}" back?`;
            if (!confirm(what)) return;
            this.undoing = entry.id;
            try {
                const res = await fetch(`${API}/api/admin/audit-log/${entry.id}/undo`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${store.authKey}`, 'Content-Type': 'application/json' },
                    body: '{}',
                });
                const body = await res.json();
                if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
                // The list the undo touched is now stale in the panel.
                this.loaded = false; this.pendingLoaded = false;
                this.changesLoaded = false; this.editorsLoaded = false;
                await this.loadAuditLog();
            } catch (e) { alert(requestFailed(e)); }
            this.undoing = 0;
        },

        // ── SNAPSHOTS ──
        kb(bytes) {
            if (!bytes) return '—';
            return bytes < 1024 ? `${bytes} B` : `${Math.round(bytes / 1024).toLocaleString()} KB`;
        },
        snapshotBadge(kind) {
            return kind === 'restore' ? 'admin-badge--verified'
                : kind === 'manual' ? 'admin-badge--future' : 'admin-badge--main';
        },
        async loadSnapshots() {
            this.snapshotsLoading = true;
            try {
                const res = await fetch(`${API}/api/admin/snapshots`, {
                    headers: { Authorization: `Bearer ${store.authKey}` },
                });
                const body = await res.json();
                if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
                this.snapshots = body.snapshots || [];
                this.snapshotsRetention = body.retention || '';
                this.snapshotsMissing = !!body.missing;
            } catch (e) { alert(requestFailed(e)); }
            this.snapshotsLoading = false;
            this.snapshotsLoaded = true;
        },
        async takeSnapshot() {
            const label = prompt('Label this snapshot (optional):', '');
            if (label === null) return;
            this.snapshotBusy = true;
            try {
                const res = await fetch(`${API}/api/admin/snapshots`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${store.authKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ label }),
                });
                const body = await res.json();
                if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
                await this.loadSnapshots();
            } catch (e) { alert(requestFailed(e)); }
            this.snapshotBusy = false;
        },
        async restoreSnapshot(snap) {
            const msg = `Put the list back to how it stood on ${snap.day}?\n\n`
                + `${snap.levels_count} levels, plus the pending list, the recent-changes feed and the event picks.\n`
                + 'Editors and API keys are not touched.\n\n'
                + 'What is live now is snapshotted first, so this can be undone.';
            if (!confirm(msg)) return;
            this.snapshotBusy = true;
            this.restoring = snap.id;
            try {
                const res = await fetch(`${API}/api/admin/snapshots/${snap.id}/restore`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${store.authKey}`, 'Content-Type': 'application/json' },
                    body: '{}',
                });
                const body = await res.json();
                if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
                alert(`Restored ${body.levels} levels, ${body.pending} pending entries and ${body.changes} change lines.`);
                // Everything the panel holds came from before the restore.
                this.loaded = false; this.pendingLoaded = false;
                this.changesLoaded = false; this.eventsLoaded = false;
                this.auditLoaded = false;
                await this.loadSnapshots();
            } catch (e) { alert(requestFailed(e)); }
            this.restoring = 0;
            this.snapshotBusy = false;
        },
    },
};
