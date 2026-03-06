import { round, score } from './score.js';

/**
 * YOUR GOOGLE SHEET ID
 */
const spreadsheetId = "1jwBvS09EtK31B8uPRKMuCSTS-ghJYfRuVqfit1p_a7Q";

const dir = '/data';

export async function fetchList() {
    console.log("Loading Sheet via Script Injection...");
    
    return new Promise((resolve, reject) => {
        
        window.google_sheet_callback = function(json) {
            try {
                const rows = json.table.rows;
                
                const list = rows.map(r => {
                    const c = r.c; 
                    const v = (idx) => (c[idx] && c[idx].v !== null) ? c[idx].v : '';

                    const hasRecord = v(11) !== '';
                    const hasRun = v(22) !== '';

                    return {
                        id: v(1),
                        name: v(2),
                        thumbnail: v(3),
                        author: v(4),
                        creators: splitArray(v(5)),
                        verifier: v(6),
                        isVerified: (v(7) === true || String(v(7)).toLowerCase() === "true"),
                        verification: v(8),
                        showcase: v(9),
                        percentToQualify: Number(v(10)) || 0,
                        records: hasRecord ? [{
                            user: v(11),
                            link: v(12),
                            percent: Number(v(13)),
                            hz: Number(v(14))
                        }] : [
                            { user: "none", link: "", percent: 0, hz: 0 }
                        ],
                        length: Number(v(15)) || 0,
                        rating: Number(v(16)) || 1,
                        percentFinished: Number(v(17)) || 0,
                        lastUpd: v(18),
                        isMain: (v(19) === true || String(v(19)).toLowerCase() === "true"),
                        isFuture: (v(20) === true || String(v(20)).toLowerCase() === "true"),
                        tags: splitArray(v(21)),
                        run: hasRun ? [{
                            user: v(22),
                            link: v(23),
                            percent: v(24),
                            hz: Number(v(25))
                        }] : [
                            { user: "none", link: "", percent: "0", hz: 0 }
                        ]
                    };
                });

                // --- FIX: Filter out the header row ---
                // We remove any row where the name is literally "name" or id is "id"
                const cleanList = list.filter(level => 
                    level.name !== 'name' && 
                    level.id !== 'id' &&
                    level.name !== '' // Also remove completely empty rows
                );

                // Process Ranks
                let currentLevelRank = 1;
                const result = cleanList.map((level) => {
                    if (level.isVerified) {
                        level.rankNum = "—";
                    } else {
                        level.rankNum = "#" + currentLevelRank;
                        currentLevelRank++;
                    }
                    return [level, null];
                });

                const scriptTag = document.getElementById('sheet-loader');
                if (scriptTag) document.body.removeChild(scriptTag);
                
                resolve(result);

            } catch (err) {
                console.error("Error parsing sheet data:", err);
                resolve(null);
            }
        };

        const script = document.createElement('script');
        script.id = 'sheet-loader';
        script.src = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=responseHandler:google_sheet_callback`;
        script.onerror = () => {
            console.error("Failed to load Google Sheet script.");
            resolve(null);
        };
        document.body.appendChild(script);
    });
}

// --- Helpers ---

function splitArray(val) {
    if (!val) return [];
    const str = String(val); 
    return str.split(',').map(item => item.trim()).filter(i => i);
}

// --- Existing functions ---

export async function fetchEditors() {
    try {
        const editorsResults = await fetch(`${dir}/_editors.json`);
        const editors = await editorsResults.json();
        return editors;
    } catch { return null; }
}

export async function fetchUnlisted() {
    try {
        const unlistedResults = await fetch(`${dir}/_unlisted.json`);
        const unlisted = await unlistedResults.json();
        return unlisted;
    } catch { return null; }
}

export async function fetchPending() {
    try {
        const pendingResults = await fetch(`${dir}/_pending.json`);
        const pending = await pendingResults.json();
        return pending;
    } catch { return null; }
}

export async function fetchUnlistedPairs() {
    const unlisted = await fetchUnlisted();
    if (unlisted === null) return null;
    var pairs = [];
    var pair = [];
    for (var i=0; i<unlisted.length; i++){
        if (i%2===1){
            pair = [unlisted[i-1], unlisted[i]];
            pairs.push(pair);
          }
        if (i === unlisted.length-1 && unlisted.length%2===1){
            pair = [unlisted[i], null];
            pairs.push(pair);
        }
    }
    return pairs;
}

export async function fetchLeaderboard() {
    const list = await fetchList();
    return [ [], [] ]; 
}