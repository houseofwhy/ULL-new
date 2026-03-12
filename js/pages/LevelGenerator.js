import { store } from '../main.js';
import Sidebar from './Sidebar.js';
import SettingsModal from './SettingsModal.js';

export default {
    components: { Sidebar, SettingsModal },
    data() {
        return {
            store,
            showSettings: false,
            level: {
                id: "private", name: "", author: "", creators: [], verifier: "",
                isVerified: false, verification: "", showcase: "", lastUpd: "",
                percentToQualify: 1, records: [], run: [], length: 0, rating: 1,
                percentFinished: 100, isMain: true, isFuture: true, tags: [], thumbnail: "",
            },
            creatorsStr: "", errors: [],
            availableTags: ["Public","Finished","Verifying","Layout","Unrated","Rated","Medium","Long","XL","XXL","NC","Remake","NONG","Quality","2p"],
        };
    },
    computed: {
        filename() {
            return (this.level.name.toLowerCase().replace(/[^a-z0-9]/g,' ').trim().replace(/\s+/g,'_')||'level')+'.json';
        },
    },
    watch: {
        creatorsStr(val) { this.level.creators = val.split(',').map(s=>s.trim()).filter(s=>s); },
    },
    methods: {
        addRecord() { this.level.records.push({user:'',link:'',percent:0,hz:0}); },
        removeRecord(i) { this.level.records.splice(i,1); },
        addRun() { this.level.run.push({user:'',link:'',percent:'',hz:240}); },
        removeRun(i) { this.level.run.splice(i,1); },
        generateJson() {
            this.errors = [];
            const data = {...this.level};
            if (!data.lastUpd) {
                const t=new Date(), dd=String(t.getDate()).padStart(2,'0'), mm=String(t.getMonth()+1).padStart(2,'0');
                data.lastUpd = `${dd}.${mm}.${t.getFullYear()}`;
            }
            data.length=Number(data.length); data.percentToQualify=Number(data.percentToQualify); data.percentFinished=Number(data.percentFinished);
            if (!isNaN(Number(data.id))) data.id=Number(data.id);
            if (!data.records.length) data.records.push({user:'none',link:'',percent:0,hz:0});
            if (!data.run.length) data.run.push({user:'none',link:'',percent:'0',hz:0});
            if (!data.thumbnail) delete data.thumbnail;
            const blob=new Blob([JSON.stringify(data,null,4)],{type:'application/json'});
            const url=URL.createObjectURL(blob);
            const a=document.createElement('a'); a.href=url;
            a.download=(data.name.toLowerCase().replace(/[^a-z0-9]/g,' ').trim().replace(/\s+/g,'_')||'level')+'.json';
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        },
    },
    template: `
    <div class="pc-shell" :class="{ dark: store.dark }">
        <Sidebar @open-settings="showSettings = true" />
        <div class="pc-page" style="overflow-y:auto;">
            <div style="padding:2rem;max-width:860px;">
                <h1 style="font-family:'Lexend Deca',sans-serif;font-size:28px;font-weight:700;margin-bottom:1.5rem;">Level JSON Generator</h1>
                <p style="font-family:'Lexend Deca',sans-serif;font-size:14px;opacity:0.6;margin-bottom:2rem;">Fill in the details below to generate a JSON file for the level.</p>
                <form @submit.prevent="generateJson" style="display:flex;flex-direction:column;gap:1.25rem;font-family:'Lexend Deca',sans-serif;">
                    <div style="display:flex;flex-direction:column;gap:0.4rem;"><label style="font-size:12px;font-weight:700;text-transform:uppercase;opacity:0.5;">Level Name</label><input v-model="level.name" type="text" placeholder="Level Name" required style="padding:0.6rem 0.8rem;border-radius:0.35rem;border:1.5px solid rgba(128,128,128,0.22);background:rgba(128,128,128,0.07);color:inherit;font-family:inherit;font-size:14px;outline:none;" /></div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                        <div style="display:flex;flex-direction:column;gap:0.4rem;"><label style="font-size:12px;font-weight:700;text-transform:uppercase;opacity:0.5;">Author</label><input v-model="level.author" type="text" style="padding:0.6rem 0.8rem;border-radius:0.35rem;border:1.5px solid rgba(128,128,128,0.22);background:rgba(128,128,128,0.07);color:inherit;font-family:inherit;font-size:14px;outline:none;" /></div>
                        <div style="display:flex;flex-direction:column;gap:0.4rem;"><label style="font-size:12px;font-weight:700;text-transform:uppercase;opacity:0.5;">Verifier</label><input v-model="level.verifier" type="text" style="padding:0.6rem 0.8rem;border-radius:0.35rem;border:1.5px solid rgba(128,128,128,0.22);background:rgba(128,128,128,0.07);color:inherit;font-family:inherit;font-size:14px;outline:none;" /></div>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:0.4rem;"><label style="font-size:12px;font-weight:700;text-transform:uppercase;opacity:0.5;">Creators (comma separated)</label><input v-model="creatorsStr" type="text" style="padding:0.6rem 0.8rem;border-radius:0.35rem;border:1.5px solid rgba(128,128,128,0.22);background:rgba(128,128,128,0.07);color:inherit;font-family:inherit;font-size:14px;outline:none;" /></div>
                    <div style="display:flex;flex-direction:column;gap:0.4rem;"><label style="font-size:12px;font-weight:700;text-transform:uppercase;opacity:0.5;">Verification Link</label><input v-model="level.verification" type="url" style="padding:0.6rem 0.8rem;border-radius:0.35rem;border:1.5px solid rgba(128,128,128,0.22);background:rgba(128,128,128,0.07);color:inherit;font-family:inherit;font-size:14px;outline:none;" /></div>
                    <div style="display:flex;flex-direction:column;gap:0.4rem;"><label style="font-size:12px;font-weight:700;text-transform:uppercase;opacity:0.5;">Showcase Link</label><input v-model="level.showcase" type="url" style="padding:0.6rem 0.8rem;border-radius:0.35rem;border:1.5px solid rgba(128,128,128,0.22);background:rgba(128,128,128,0.07);color:inherit;font-family:inherit;font-size:14px;outline:none;" /></div>
                    <div style="display:flex;flex-direction:column;gap:0.4rem;"><label style="font-size:12px;font-weight:700;text-transform:uppercase;opacity:0.5;">Thumbnail Link</label><input v-model="level.thumbnail" type="url" style="padding:0.6rem 0.8rem;border-radius:0.35rem;border:1.5px solid rgba(128,128,128,0.22);background:rgba(128,128,128,0.07);color:inherit;font-family:inherit;font-size:14px;outline:none;" /></div>
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;">
                        <div style="display:flex;flex-direction:column;gap:0.4rem;"><label style="font-size:12px;font-weight:700;text-transform:uppercase;opacity:0.5;">Length (s)</label><input v-model.number="level.length" type="number" min="0" style="padding:0.6rem 0.8rem;border-radius:0.35rem;border:1.5px solid rgba(128,128,128,0.22);background:rgba(128,128,128,0.07);color:inherit;font-family:inherit;font-size:14px;outline:none;" /></div>
                        <div style="display:flex;flex-direction:column;gap:0.4rem;"><label style="font-size:12px;font-weight:700;text-transform:uppercase;opacity:0.5;">% to Qualify</label><input v-model.number="level.percentToQualify" type="number" min="0" max="100" style="padding:0.6rem 0.8rem;border-radius:0.35rem;border:1.5px solid rgba(128,128,128,0.22);background:rgba(128,128,128,0.07);color:inherit;font-family:inherit;font-size:14px;outline:none;" /></div>
                        <div style="display:flex;flex-direction:column;gap:0.4rem;"><label style="font-size:12px;font-weight:700;text-transform:uppercase;opacity:0.5;">% Finished</label><input v-model.number="level.percentFinished" type="number" min="0" max="100" style="padding:0.6rem 0.8rem;border-radius:0.35rem;border:1.5px solid rgba(128,128,128,0.22);background:rgba(128,128,128,0.07);color:inherit;font-family:inherit;font-size:14px;outline:none;" /></div>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                        <div style="display:flex;flex-direction:column;gap:0.4rem;"><label style="font-size:12px;font-weight:700;text-transform:uppercase;opacity:0.5;">Last Update (DD.MM.YYYY)</label><input v-model="level.lastUpd" type="text" placeholder="Leave empty for today" style="padding:0.6rem 0.8rem;border-radius:0.35rem;border:1.5px solid rgba(128,128,128,0.22);background:rgba(128,128,128,0.07);color:inherit;font-family:inherit;font-size:14px;outline:none;" /></div>
                        <div style="display:flex;flex-direction:column;gap:0.4rem;"><label style="font-size:12px;font-weight:700;text-transform:uppercase;opacity:0.5;">Password (ID)</label><input v-model="level.id" type="text" style="padding:0.6rem 0.8rem;border-radius:0.35rem;border:1.5px solid rgba(128,128,128,0.22);background:rgba(128,128,128,0.07);color:inherit;font-family:inherit;font-size:14px;outline:none;" /></div>
                    </div>
                    <div style="display:flex;gap:1.5rem;align-items:center;flex-wrap:wrap;">
                        <label style="display:flex;align-items:center;gap:0.5rem;font-size:14px;"><input type="checkbox" v-model="level.isVerified" /> Verified</label>
                        <label style="display:flex;align-items:center;gap:0.5rem;font-size:14px;"><input type="checkbox" v-model="level.isMain" /> Main List</label>
                        <label style="display:flex;align-items:center;gap:0.5rem;font-size:14px;"><input type="checkbox" v-model="level.isFuture" /> Future List</label>
                    </div>
                    <div>
                        <label style="font-size:12px;font-weight:700;text-transform:uppercase;opacity:0.5;display:block;margin-bottom:0.5rem;">Tags</label>
                        <div style="display:flex;flex-wrap:wrap;gap:0.5rem;">
                            <label v-for="tag in availableTags" :key="tag" style="display:inline-flex;align-items:center;gap:0.4rem;background:rgba(128,128,128,0.1);padding:0.3rem 0.65rem;border-radius:0.3rem;cursor:pointer;font-size:13.5px;">
                                <input type="checkbox" :value="tag" v-model="level.tags" /> {{ tag }}
                            </label>
                        </div>
                    </div>
                    <div v-if="errors.length" style="background:rgba(220,0,0,0.1);padding:0.75rem 1rem;border-radius:0.35rem;">
                        <p v-for="e in errors" :key="e" style="color:#ff5555;font-size:13.5px;">{{ e }}</p>
                    </div>
                    <div style="display:flex;align-items:center;gap:1rem;padding-top:0.5rem;">
                        <button type="submit" style="padding:0.65rem 1.5rem;border-radius:0.4rem;border:none;background:var(--color-primary);color:#fff;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;">Download JSON</button>
                        <span style="font-size:13px;opacity:0.5;">{{ filename }}</span>
                    </div>
                </form>
            </div>
        </div>
        <SettingsModal v-if="showSettings" @close="showSettings = false" />
    </div>`,
};
