import { store } from "../main.js";

export default {
    template: `
        <main class="page-list">
            <div class="list-container surface" style="grid-column: 1 / -1;">
                <div class="content" style="padding: 2rem; max-width: 100%;">
                    <h1 class="type-headline-lg">Level JSON Generator</h1>
                    <br>
                    <p class="type-body">Fill in the details below to generate a JSON file for the level. Refer to the guide for specific formatting rules.</p>
                    
                    <form @submit.prevent="generateJson" class="generator-form">
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
                            <label>Password (ID)</label>
                             <input v-model="level.id" type="text" placeholder="private or level ID" />
                            <small class="typeBody" style="font-size: 0.8em; opacity: 0.7;">Use "private" (with quotes) or a number (without quotes).</small>
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

                        <!-- Validation Errors -->
                        <div v-if="errors.length" class="errors" style="background: rgba(255, 0, 0, 0.1); padding: 10px; border-radius: 5px;">
                            <p v-for="err in errors" :key="err" class="error" style="color: #ff5555; margin: 0;">{{ err }}</p>
                        </div>

                        <div style="margin-top: 1rem; display: flex; align-items: center; gap: 1rem;">
                            <button class="btn" type="submit">Download JSON</button>
                            <span class="type-body" style="font-size: 0.9em; opacity: 0.8;">Preview: {{ filename }}</span>
                        </div>
                    </form>
                </div>
            </div>
            <component :is="'style'">
                .generator-form {
                    display: flex; 
                    flex-direction: column; 
                    gap: 1.5rem; 
                    margin-top: 2rem;
                    width: 100%;
                    font-family: "Lexend Deca", sans-serif;
                }
                .generator-form .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .generator-form label {
                    font-family: "Lexend Deca", sans-serif;
                }
                .generator-form input[type="text"],
                .generator-form input[type="url"],
                .generator-form input[type="number"] {
                    width: 100%;
                    padding: 0.8rem;
                    border-radius: 4px;
                    border: 1px solid rgba(255,255,255,0.1);
                    background: rgba(255,255,255,0.05);
                    color: inherit;
                    box-sizing: border-box;
                    font-family: "Lexend Deca", sans-serif;
                }
                .generator-form input:focus {
                    outline: 2px solid var(--color-primary);
                    background: rgba(255,255,255,0.1);
                }
            </component>
        </main>
    `,
    computed: {
        filename() {
            return (this.level.name.toLowerCase().replace(/[^a-z0-9]/g, " ").trim().replace(/\s+/g, "_") || "level") + ".json";
        }
    },
    data() {
        return {
            store,
            level: {
                id: "private",
                name: "",
                author: "",
                creators: [],
                verifier: "",
                isVerified: false,
                verification: "",
                showcase: "",
                lastUpd: "",
                percentToQualify: 0,
                records: [
                    {
                        "user": "none",
                        "link": "",
                        "percent": 0,
                        "hz": 0
                    }
                ],
                run: [
                    {
                        "user": "none",
                        "link": "",
                        "percent": "0",
                        "hz": 0
                    }
                ],
                length: 0,
                rating: 1,
                percentFinished: 100,
                isMain: true,
                isFuture: true,
                tags: []
            },
            creatorsStr: "",
            errors: [],
            availableTags: [
                "Public", "Finished", "Verifying", "Layout", "Unrated", "Rated",
                "Medium", "Long", "XL", "XXL", "NC", "Remake", "NONG", "Quality"
            ]
        };
    },
    watch: {
        creatorsStr(val) {
            this.level.creators = val.split(',').map(s => s.trim()).filter(s => s);
        }
    },
    methods: {
        generateJson() {
            this.errors = [];

            // Format Data
            const data = { ...this.level };

            // Set lastUpd to today if empty
            if (!data.lastUpd) {
                const today = new Date();
                const dd = String(today.getDate()).padStart(2, '0');
                const mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
                const yyyy = today.getFullYear();
                data.lastUpd = `${dd}.${mm}.${yyyy}`;
            }

            // Ensure numbers are numbers
            data.length = Number(data.length);
            data.percentToQualify = Number(data.percentToQualify);
            data.percentFinished = Number(data.percentFinished);

            // Handle ID: if it's a number string, convert to number, else keep string
            if (!isNaN(Number(data.id))) {
                data.id = Number(data.id);
            }

            // Create file blob
            const jsonStr = JSON.stringify(data, null, 4);
            const blob = new Blob([jsonStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);

            // Trigger download
            const a = document.createElement("a");
            a.href = url;
            // naming convention matches the guide/existing files
            a.download = `${data.name.toLowerCase().replace(/[^a-z0-9]/g, " ").trim().replace(/\s+/g, "_") || "level"}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }
};
