import { round, score } from './score.js';

/**
 * Path to directory containing `_list.json` and all levels
 */
const dir = '/data';

export async function fetchList() {
    const listResult = await fetch(`${dir}/_list.json`);
    try {
        const list = await listResult.json();
        return await Promise.all(
            list.map(async (path, rank) => {
                const levelResult = await fetch(`${dir}/${path}.json`);
                try {
                    const level = await levelResult.json();
                    return [
                        {
                            ...level,
                            path,
                            records: level.records.sort(
                                (a, b) => b.percent - a.percent,
                            ),
                        },
                        null,
                    ];
                } catch {
                    console.error(`Failed to load level #${rank + 1} ${path}.`);
                    return [null, path];
                }
            }),
        );
    } catch {
        console.error(`Failed to load list.`);
        return null;
    }
}

export async function fetchEditors() {
    try {
        const editorsResults = await fetch(`${dir}/_editors.json`);
        const editors = await editorsResults.json();
        return editors;
    } catch {
        return null;
    }
}

export async function fetchUnlisted() {
    try {
        const unlistedResults = await fetch(`${dir}/_unlisted.json`);
        const unlisted = await unlistedResults.json();
        return unlisted;
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

        // Verification
        const scoreE = Math.floor(Math.sqrt(level.percentFinished)*level.rating*level.rating*Math.sqrt(level.length)*Math.sqrt(level.rating)*90/1000*3.141592356/Math.E*1000)/1000
        const author = Object.keys(scoreMap).find(
            (u) => u.toLowerCase() === level.author.toLowerCase(),
        ) || level.author;
        scoreMap[author] ??= {
            totalScore: 0,
            created: []
        };
        scoreMap[author].created.push({
            rank: rank + 1,
            level: level.name,
            score: scoreE,
            link: level.showcase
        });
        scoreMap[author].totalScore += scoreE

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
        //
        //     progressed.push({
        //         rank: rank + 1,
        //         level: level.name,
        //         percent: record.percent,
        //         score: score(rank + 1, record.percent, level.percentToQualify),
        //         link: record.link,
        //     });
        //});
    });

    //Wrap in extra Object containing the user and total score
    const res = Object.entries(scoreMap).map(([user, scores]) => {
      scores.user = user;
      return scores;
        // const { verified, completed, progressed } = scores;
        // const total = [verified, completed, progressed]
        //     .flat()
        //     .reduce((prev, cur) => prev + cur.score, 0);
        //
        // return {
        //     user,
        //     total: round(total),
        //     ...scores,
        // };
    });
    for (var i in res) console.log(res[i])
    var sortFunce = function(a,b) { return b.totalScore-a.totalScore }
    // Sort by total score
    return [res.sort(sortFunce), errs]
}
