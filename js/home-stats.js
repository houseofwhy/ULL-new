// What the home page says about the list itself, on the desktop and on the
// phone: how much it holds, how long it has been running, and who uses it.
//
// It replaced a strip of five counts — tracked, main, future, verified,
// pending — which said the same thing five times and read as a dashboard on a
// page nobody arrives at to read a dashboard. Only the first of these three is
// data: it is the length of the list the page already has in memory. The other
// two are claims about the project, so they are written here as prose, beside
// the icon each is drawn with, rather than derived from something that cannot
// support them. The phone shows the first two; the desktop shows all three.
//
// The icons are single-colour strokes on a 16×16 grid, the same as the ones in
// the mobile shell, so they inherit the text colour and need no second file.

const ICONS = {
    // A stack of layers: what the list holds.
    levels: [
        'M8 2.2 13.5 5.2 8 8.2 2.5 5.2Z',
        'M2.5 8 8 11 13.5 8',
        'M2.5 10.6 8 13.6 13.5 10.6',
    ],
    // A clock: how long it has been running.
    years: [
        'M14.2 8A6.2 6.2 0 1 1 1.8 8a6.2 6.2 0 0 1 12.4 0Z',
        'M8 4.6V8l2.4 1.4',
    ],
    // A trophy: how many people use it.
    players: [
        'M4.8 2.8h6.4v3.1a3.2 3.2 0 0 1-6.4 0V2.8Z',
        'M4.8 3.8H3.2v.9a2.1 2.1 0 0 0 2 2.1',
        'M11.2 3.8h1.6v.9a2.1 2.1 0 0 1-2 2.1',
        'M8 9.1v2',
        'M5.6 13.2h4.8l-.6-2.1H6.2l-.6 2.1Z',
    ],
};

export function homeStats(levelCount) {
    return [
        { key: 'levels', value: levelCount ? String(levelCount) : '', label: 'levels total', paths: ICONS.levels },
        { key: 'years', value: '3+', label: 'years', paths: ICONS.years },
        { key: 'players', value: '1k+', label: 'users', paths: ICONS.players },
    ];
}
