// Thumbnail resolution and how far anyone has got: node js/util.test.mjs
//
// Editors paste whatever YouTube hands them into the admin panel's thumbnail
// field. Everything that is not already an image URL has to be turned into one.

import {
    thumbnailUrl, youtubeThumbnail, levelThumbnail, getYoutubeIdFromUrl,
    verificationPercent, verificationLabel,
} from './util.js';

let failed = 0;
const is = (name, got, want) => {
    const pass = got === want;
    console.log(`  ${pass ? 'ok  ' : 'FAIL'}   ${name}${pass ? '' : `\n           got  ${JSON.stringify(got)}\n           want ${JSON.stringify(want)}`}`);
    if (!pass) failed++;
};

const ID = 'dQw4w9WgXcQ';
const IMG = `https://img.youtube.com/vi/${ID}/mqdefault.jpg`;

console.log('\n── a YouTube link in the thumbnail field becomes an image ──');
is('watch?v=', thumbnailUrl(`https://www.youtube.com/watch?v=${ID}`), IMG);
is('youtu.be', thumbnailUrl(`https://youtu.be/${ID}`), IMG);
is('youtu.be with ?si= tracking', thumbnailUrl(`https://youtu.be/${ID}?si=fuFHb4qvHg4Hszn7`), IMG);
is('watch?v= with extra params', thumbnailUrl(`https://www.youtube.com/watch?v=${ID}&t=42s`), IMG);
is('embed', thumbnailUrl(`https://www.youtube.com/embed/${ID}`), IMG);
is('shorts', thumbnailUrl(`https://www.youtube.com/shorts/${ID}`), IMG);
is('live', thumbnailUrl(`https://www.youtube.com/live/${ID}`), IMG);
is('surrounding whitespace', thumbnailUrl(`  https://youtu.be/${ID}  `), IMG);

console.log('\n── anything already an image is left alone ──');
is('i.ytimg.com', thumbnailUrl(`https://i.ytimg.com/vi/${ID}/maxresdefault.jpg`), `https://i.ytimg.com/vi/${ID}/maxresdefault.jpg`);
is('img.youtube.com', thumbnailUrl(IMG), IMG);
is('Imgur', thumbnailUrl('https://i.imgur.com/abc123.png'), 'https://i.imgur.com/abc123.png');
is('empty string', thumbnailUrl(''), '');
is('null', thumbnailUrl(null), '');
is('undefined', thumbnailUrl(undefined), '');
is('non-string', thumbnailUrl(42), '');

console.log('\n── youtubeThumbnail only accepts YouTube ──');
is('YouTube link', youtubeThumbnail(`https://youtu.be/${ID}`), IMG);
is('non-YouTube video host', youtubeThumbnail('https://www.bilibili.com/video/BV1xx'), '');
is('empty', youtubeThumbnail(''), '');

console.log('\n── levelThumbnail falls back the right way ──');
is('own thumbnail wins, converted', levelThumbnail({ thumbnail: `https://youtu.be/${ID}`, verification: 'https://youtu.be/otherVideoX' }), IMG);
is('own thumbnail wins, passed through', levelThumbnail({ thumbnail: 'https://i.imgur.com/a.png', verification: `https://youtu.be/${ID}` }), 'https://i.imgur.com/a.png');
is('falls back to verification', levelThumbnail({ thumbnail: '', verification: `https://www.youtube.com/watch?v=${ID}` }), IMG);
is('then to showcase', levelThumbnail({ showcase: `https://youtu.be/${ID}` }), IMG);
is('verification beats showcase', levelThumbnail({ verification: `https://youtu.be/${ID}`, showcase: 'https://youtu.be/showcaseVid' }), IMG);
is('non-YouTube verification gives nothing', levelThumbnail({ verification: 'https://www.bilibili.com/video/BV1xx' }), '');
is('no level', levelThumbnail(null), '');
is('bare level', levelThumbnail({}), '');

console.log('\n── id extraction is unchanged for embeds ──');
is('watch?v=', getYoutubeIdFromUrl(`https://www.youtube.com/watch?v=${ID}`), ID);
is('youtu.be', getYoutubeIdFromUrl(`https://youtu.be/${ID}`), ID);
is('not a video', getYoutubeIdFromUrl('https://example.com/page'), '');

console.log('\n── the furthest anyone has got is measured once and written twice ──');
// The number drives the meters and the Upcoming Levels order; the label is how
// it reads. A run is written as the span it covers, never as the points it is
// worth, because "28%" beside a level played from 72% to the end is a lie.
const RUN = { records: [{ user: 'dewbbs', percent: 20 }], run: [{ user: 'Chill Guy', percent: '72-100' }] };
const REC = { records: [{ user: 'Doggie', percent: 97 }], run: [{ user: 'Doggie', percent: '25-100' }] };
is('a run that reaches further is measured as its span', verificationPercent(RUN), 28);
is('and written as the span it covers', verificationLabel(RUN), '72-100%');
is('a record that reaches further is measured', verificationPercent(REC), 97);
is('and written as the figure it reached', verificationLabel(REC), '97%');
is('a record and a run reaching equally far read as the record',
    verificationLabel({ records: [{ user: 'a', percent: 40 }], run: [{ user: 'b', percent: '60-100' }] }), '40%');
is('a verified level is 100', verificationPercent({ isVerified: true }), 100);
is('and says so', verificationLabel({ isVerified: true }), '100%');
is('nothing yet measures zero', verificationPercent({ records: [{ user: 'none', percent: 0 }], run: [] }), 0);
is('and writes nothing, so the caller can say None', verificationLabel({ records: [{ user: 'none', percent: 0 }], run: [] }), '');
is('a run with no span is not a reading', verificationLabel({ records: [], run: [{ user: 'x', percent: '0' }] }), '');
is('no level', verificationLabel(null), '');

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
