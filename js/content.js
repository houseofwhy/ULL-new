import { round, score } from './score.js';

const api = 'https://d1-wrkr.ullteam.workers.dev';

export async function fetchList() {
    try {
        const res = await fetch(`${api}/api/list`);
        const levels = await res.json();
        var currentLevelRank = 1;
        const result = levels.map((level) => {
            level.records = (level.records || []).sort((a, b) => b.percent - a.percent);
            return [level, null];
        });
        for (var i = 0; i < result.length; i++) {
            if (result[i][0].isVerified) {
                result[i][0].rankNum = "— ";
            } else {
                result[i][0].rankNum = "#" + currentLevelRank;
                currentLevelRank++;
            }
        }
        return result;
    } catch {
        console.error('Failed to load list.');
        return null;
    }
}

export async function fetchEditors() {
    try {
        const res = await fetch(`${api}/api/editors`);
        return await res.json();
    } catch {
        return null;
    }
}

export async function fetchUnlisted() {
    return null;
}

export async function fetchPending() {
    try {
        const res = await fetch(`${api}/api/pending`);
        return await res.json();
    } catch {
        return null;
    }
}

export async function fetchRecentChanges() {
    try {
        const res = await fetch(`${api}/api/recent-changes`);
        return await res.json();
    } catch {
        return [];
    }
}

export async function fetchLevelMonth() {
    try {
        const res = await fetch(`${api}/api/level-month`);
        return await res.json();
    } catch {
        return null;
    }
}

export async function fetchLevelVerif() {
    try {
        const res = await fetch(`${api}/api/level-verif`);
        return await res.json();
    } catch {
        return null;
    }
}

export async function fetchUnlistedPairs() {
    const unlisted = await fetchUnlisted();
    if (unlisted === null){
        return null;
    }
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

    const scoreMap = {};
    const errs = [];
    list.forEach(([level, err], rank) => {
        if (err) {
            errs.push(err);
            return;
        }

        // // Verification
        // const verifier = Object.keys(scoreMap).find(
        //     (u) => u.toLowerCase() === level.verifier.toLowerCase(),
        // ) || level.verifier;
        // scoreMap[verifier] ??= {
        //     verified: [],
        //     completed: [],
        //     progressed: [],
        // };
        // const { verified } = scoreMap[verifier];
        // verified.push({
        //     rank: rank + 1,
        //     level: level.name,
        //     score: score(rank + 1, 100, level.percentToQualify),
        //     link: level.verification,
        // });

        // // Records
        // level.records.forEach((record) => {
        //     const user = Object.keys(scoreMap).find(
        //         (u) => u.toLowerCase() === record.user.toLowerCase(),
        //     ) || record.user;
        //     scoreMap[user] ??= {
        //         verified: [],
        //         completed: [],
        //         progressed: [],
        //     };
        //     const { completed, progressed } = scoreMap[user];
        //     if (record.percent === 100) {
        //         completed.push({
        //             rank: rank + 1,
        //             level: level.name,
        //             score: score(rank + 1, 100, level.percentToQualify),
        //             link: record.link,
        //         });
        //         return;
        //     }

        //     progressed.push({
        //         rank: rank + 1,
        //         level: level.name,
        //         percent: record.percent,
        //         score: score(rank + 1, record.percent, level.percentToQualify),
        //         link: record.link,
        //     });
        // });
    });

    // Wrap in extra Object containing the user and total score
    const res = Object.entries(scoreMap).map(([user, scores]) => {
        const { verified, completed, progressed } = scores;
        const total = [verified, completed, progressed]
            .flat()
            .reduce((prev, cur) => prev + cur.score, 0);

        return {
            user,
            total: round(total),
            ...scores,
        };
    });

    // Sort by total score
    return [res.sort((a, b) => b.total - a.total), errs];
}


// export async function fetchLeaderboard() {
//     const list = await fetchList();

//     const scoreMap = {};
//     const errs = [];
//     list.forEach(([level, err], rank) => {
//         if (err) {
//             errs.push(err);
//             return;
//         }

//         // Creator Leaderboard
//         // const scoreE = Math.floor(Math.sqrt(level.percentFinished)*level.rating*level.rating*Math.sqrt(level.length)*Math.sqrt(level.rating)*45/1000*3.141592356/Math.E*1000)/1000
//         // const author = Object.keys(scoreMap).find(
//         //     (u) => u.toLowerCase() === level.author.toLowerCase(),
//         // ) || level.author;
//         // scoreMap[author] ??= {
//         //     totalScore: 0,
//         //     created: []
//         // };
//         // scoreMap[author].created.push({
//         //     rank: rank + 1,
//         //     level: level.name,
//         //     score: scoreE,
//         //     link: level.showcase
//         // });
//         // scoreMap[author].totalScore += scoreE

//         // Records
//         level.records.forEach((record) => {
//             const user = Object.keys(scoreMap).find(
//                 (u) => u.toLowerCase() === record.user.toLowerCase(),
//             ) || record.user;
//             scoreMap[user] ??= {
//                 verified: [],
//                 completed: [],
//                 progressed: [],
//             };
//             const { completed, progressed } = scoreMap[user];
//             if (record.percent === 100) {
//                 completed.push({
//                     rank: rank + 1,
//                     level: level.name,
//                     score: score(rank + 1, 100, level.percentToQualify),
//                     link: record.link,
//                 });
//                 return;
//             }
        
//             progressed.push({
//                 rank: rank + 1,
//                 level: level.name,
//                 percent: record.percent,
//                 score: score(rank + 1, record.percent, level.percentToQualify),
//                 link: record.link,
//             });
//         });
//     });

//     //Wrap in extra Object containing the user and total score
//     const res = Object.entries(scoreMap).map(([user, scores]) => {
//       scores.user = user;
//       return scores;
//         // const { verified, completed, progressed } = scores;
//         // const total = [verified, completed, progressed]
//         //     .flat()
//         //     .reduce((prev, cur) => prev + cur.score, 0);
//         //
//         // return {
//         //     user,
//         //     total: round(total),
//         //     ...scores,
//         // };
//     });
//     for (var i in res) console.log(res[i])
//     var sortFunce = function(a,b) { return b.totalScore-a.totalScore }
//     // Sort by total score
//     return [res.sort(sortFunce), errs]
// }
