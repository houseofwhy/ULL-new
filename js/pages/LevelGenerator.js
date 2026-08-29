import { store } from '../main.js';
import AdminLogin from '../components/AdminLogin.js';

const API = 'https://d1-wrkr.ullteam.workers.dev';

export default {
    components: { AdminLogin },
    template: `
        <main class="page-list">
            <div class="list-container surface" style="grid-column: 1 / -1;">
                <div class="content" style="padding: 2rem; max-width: 100%;">

                    <AdminLogin v-if="!store.authKey" />

                    <template v-else>
                        <div class="admin-header" style="margin-bottom: 1.5rem;">
                            <h1 class="type-headline-lg">Level JSON Generator</h1>
                            <button class="admin-logout-btn" @click="store.authKey = ''">Log out</button>
                        </div>
                        <p class="type-body">Fill in the details below to add a level to the list.</p>

                        <form @submit.prevent="submitToList" class="generator-form">
                            <!-- Basic Info -->
                            <div class="form-group">
                                <label>Level Name (no quotes needed)</label>
                                <input v-model="level.name" type="text" placeholder="Level Name" required />
                            </div>

                            <div class="form-group">
                                <label>Author (Host's name)</label>
                                <input v-model="level.author" type="text" placeholder="Author" />
                            </div>

                            <div class="form-group">
                                <label>Creators (comma separated)</label>
                                <input v-model="creatorsStr" type="text" placeholder="Creator 1, Creator 2" />
                            </div>

                            <div class="form-group">
                                <label>Verifier</label>
                                <input v-model="level.verifier" type="text" placeholder="Verifier" />
                            </div>

                            <!-- URLs -->
                            <div class="form-group">
                                <label>Verification Link (YouTube) - Only if verified</label>
                                <input v-model="level.verification" type="url" placeholder="https://youtu.be/..." />
                            </div>

                            <div class="form-group">
                                <label>Showcase Link (YouTube) - Latest FULL preview</label>
                                <input v-model="level.showcase" type="url" placeholder="https://youtu.be/..." />
                            </div>

                            <div class="form-group">
                                <label>Thumbnail Link (YouTube video, YouTube thumbnail, or Imgur image)</label>
                                <input v-model="level.thumbnail" type="url" placeholder="YouTube link or image URL" />
                                <small class="typeBody" style="font-size: 0.8em; opacity: 0.7;">Optional.</small>
                            </div>

                            <div class="form-group">
                                <label>Frame Windows Counter Link (YouTube)</label>
                                <input v-model="level.frameCounter" type="url" placeholder="https://youtu.be/..." />
                                <small class="typeBody" style="font-size: 0.8em; opacity: 0.7;">Optional. Shows a 'Watch Here' link at the bottom of the level card.</small>
                            </div>

                            <!-- Stats -->
                            <div class="form-group row" style="display: flex; gap: 20px;">
                                <div style="flex: 1;">
                                    <label>Length (seconds)</label>
                                    <input v-model.number="level.length" type="number" min="0" />
                                </div>
                                <div style="flex: 1;">
                                    <label>Percent to Qualify (Current WR + 1)</label>
                                    <input v-model.number="level.percentToQualify" type="number" min="0" max="100" />
                                </div>
                                <div style="flex: 1;">
                                    <label>Percent Finished (0-100)</label>
                                    <input v-model.number="level.percentFinished" type="number" min="0" max="100" />
                                </div>
                            </div>

                            <div class="form-group">
                                <label>Last Update</label>
                                <input v-model="level.lastUpd" type="text" placeholder="DD.MM.YYYY" />
                                <small class="typeBody" style="font-size: 0.8em; opacity: 0.7;">Leave empty to use today's date.</small>
                            </div>

                            <div class="form-group">
                                <label>Level ID</label>
                                <input v-model="level.id" type="text" placeholder="private or level ID" />
                                <small class="typeBody" style="font-size: 0.8em; opacity: 0.7;">Use "private" (with quotes) or a number (without quotes).</small>
                            </div>

                            <!-- Position -->
                            <div class="form-group">
                                <label>Position in List (1 = top)</label>
                                <input v-model.number="insertAt" type="number" min="1" placeholder="e.g. 5" required />
                                <small class="typeBody" style="font-size: 0.8em; opacity: 0.7;">Levels below this position will shift down.</small>
                            </div>

                            <!-- Records -->
                            <div class="form-group">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <label>Records (from 0%)</label>
                                    <button type="button" @click="addRecord" class="btn" style="padding: 0.5rem 1rem; font-size: 0.8em; width: auto;">+ Add Record</button>
                                </div>
                                <div v-for="(rec, i) in level.records" :key="i" style="display: flex; gap: 10px; margin-top: 10px;">
                                    <input v-model="rec.user" placeholder="User" style="flex: 2" />
                                    <input v-model="rec.link" placeholder="Link" style="flex: 2" />
                                    <input v-model.number="rec.percent" type="number" placeholder="%" style="flex: 1" />
                                    <input v-model.number="rec.hz" type="number" placeholder="Hz" style="flex: 1" />
                                    <button type="button" @click="removeRecord(i)" class="btn" style="background: var(--color-error); padding: 0 1rem; width: auto;">X</button>
                                </div>
                                <p v-if="level.records.length === 0" class="type-body" style="font-size: 0.8em; opacity: 0.5; margin-top: 5px;">No records added.</p>
                            </div>

                            <!-- Runs -->
                            <div class="form-group">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <label>Runs</label>
                                    <button type="button" @click="addRun" class="btn" style="padding: 0.5rem 1rem; font-size: 0.8em; width: auto;">+ Add Run</button>
                                </div>
                                <div v-for="(run, i) in level.run" :key="i" style="display: flex; gap: 10px; margin-top: 10px;">
                                    <input v-model="run.user" placeholder="User" style="flex: 2" />
                                    <input v-model="run.link" placeholder="Link" style="flex: 2" />
                                    <input v-model="run.percent" placeholder="Run (e.g. 50-100)" style="flex: 1" />
                                    <input v-model.number="run.hz" type="number" placeholder="Hz" style="flex: 1" />
                                    <button type="button" @click="removeRun(i)" class="btn" style="background: var(--color-error); padding: 0 1rem; width: auto;">X</button>
                                </div>
                                <p v-if="level.run.length === 0" class="type-body" style="font-size: 0.8em; opacity: 0.5; margin-top: 5px;">No runs added.</p>
                            </div>

                            <!-- Checkboxes -->
                            <div class="form-group row" style="display: flex; gap: 20px; align-items: center;">
                                <label style="display: flex; align-items: center; gap: 5px;">
                                    <input type="checkbox" v-model="level.isVerified" /> Verified?
                                </label>
                                <label style="display: flex; align-items: center; gap: 5px;">
                                    <input type="checkbox" v-model="level.isMain" /> Main List?
                                </label>
                                <label style="display: flex; align-items: center; gap: 5px;">
                                    <input type="checkbox" v-model="level.isFuture" /> Future List?
                                </label>
                            </div>

                            <!-- Tags -->
                            <div class="form-group">
                                <label>Tags</label>
                                <div class="tags-container" style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 5px;">
                                    <label v-for="tag in availableTags" :key="tag" style="display: inline-flex; align-items: center; gap: 5px; background: rgba(0,0,0,0.2); padding: 5px 10px; border-radius: 5px; cursor: pointer;">
                                        <input type="checkbox" :value="tag" v-model="level.tags" />
                                        {{ tag }}
                                    </label>
                                </div>
                            </div>

                            <!-- Errors / Success -->
                            <div v-if="errors.length" class="errors" style="background: rgba(255,0,0,0.1); padding: 10px; border-radius: 5px;">
                                <p v-for="e in errors" :key="e" style="color: #ff5555; margin: 0;">{{ e }}</p>
                            </div>
                            <div v-if="success" style="background: rgba(0,200,0,0.1); padding: 10px; border-radius: 5px; color: #22c55e;">
                                Level added successfully at position {{ insertAt }}!
                            </div>

                            <div style="margin-top: 1rem; display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
                                <button class="btn" type="submit" :disabled="submitting">
                                    {{ submitting ? 'Submitting…' : 'Submit to List' }}
                                </button>
                                <button class="btn" type="button" @click="downloadJson" style="opacity: 0.6;">
                                    Download JSON (backup)
                                </button>
                            </div>
                        </form>
                    </template>

                </div>
            </div>
        </main>
    `,
    data() {
        return {
            store,
            insertAt: 1,
            submitting: false,
            success: false,
            errors: [],
            level: {
                id: 'private',
                name: '',
                author: '',
                creators: [],
                verifier: '',
                isVerified: false,
                verification: '',
                showcase: '',
                thumbnail: '',
                lastUpd: '',
                percentToQualify: 1,
                records: [],
                run: [],
                length: 0,
                rating: 1,
                percentFinished: 100,
                isMain: true,
                isFuture: true,
                tags: [],
                frameCounter: '',
            },
            creatorsStr: '',
            availableTags: [
                'Public', 'Finished', 'Layout', 'Unrated', 'Rated',
                'Medium', 'Long', 'XL', 'XXL', 'NC', 'Remake', 'NONG', 'Quality',
            ],
        };
    },
    watch: {
        creatorsStr(val) {
            this.level.creators = val.split(',').map(s => s.trim()).filter(s => s);
        },
    },
    methods: {
        addRecord() { this.level.records.push({ user: '', link: '', percent: 0, hz: 0 }); },
        removeRecord(i) { this.level.records.splice(i, 1); },
        addRun() { this.level.run.push({ user: '', link: '', percent: '', hz: 240 }); },
        removeRun(i) { this.level.run.splice(i, 1); },

        buildData() {
            const data = { ...this.level };
            if (!data.lastUpd) {
                const d = new Date();
                data.lastUpd = `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
            }
            if (!data.thumbnail) data.thumbnail = null;
            data.length = Number(data.length);
            data.percentToQualify = Number(data.percentToQualify);
            data.percentFinished = Number(data.percentFinished);
            if (!isNaN(Number(data.id))) data.id = Number(data.id);
            if (data.records.length === 0) data.records.push({ user: 'none', link: '', percent: 0, hz: 0 });
            if (data.run.length === 0) data.run.push({ user: 'none', link: '', percent: '0', hz: 0 });
            data.path = data.name.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim().replace(/\s+/g, '_') || 'level';
            return data;
        },

        async submitToList() {
            this.errors = [];
            this.success = false;
            if (!this.insertAt || this.insertAt < 1) {
                this.errors.push('Position must be at least 1.');
                return;
            }
            this.submitting = true;
            try {
                const data = this.buildData();
                const res = await fetch(`${API}/api/levels`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${store.authKey}`,
                    },
                    body: JSON.stringify({ ...data, insertAt: this.insertAt }),
                });
                if (res.ok) {
                    this.success = true;
                    this.resetForm();
                } else {
                    const body = await res.json().catch(() => ({}));
                    this.errors.push(body.error || 'Failed to submit. Check your connection.');
                }
            } catch (e) {
                // fetch() rejects only when no readable response came back — most often
                // the Worker throwing before it can attach CORS headers, not the user's
                // connection. Say which so the next person doesn't debug their Wi-Fi.
                this.errors.push(
                    'Could not reach the API — the request never completed. This is usually ' +
                    'the Worker erroring out (check its logs in the Cloudflare dashboard) ' +
                    `or a lost connection. Details: ${e && e.message ? e.message : e}`
                );
            }
            this.submitting = false;
        },

        downloadJson() {
            const data = this.buildData();
            const jsonStr = JSON.stringify(data, null, 4);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${data.path}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },

        resetForm() {
            this.level = {
                id: 'private', name: '', author: '', creators: [], verifier: '',
                isVerified: false, verification: '', showcase: '', thumbnail: '',
                lastUpd: '', percentToQualify: 1, records: [], run: [],
                length: 0, rating: 1, percentFinished: 100, isMain: true, isFuture: true, tags: [], frameCounter: '',
            };
            this.creatorsStr = '';
            this.insertAt = 1;
        },
    },
};
