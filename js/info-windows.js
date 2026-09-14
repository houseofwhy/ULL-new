// The parts of /information that are neither prose nor markup: which windows
// exist, how many things are behind each, and the one search index over all of
// them.
//
// Both surfaces read this file — the desktop page (js/pages/Information.js) and
// the phone (js/pages/mobile/MobileInfo.js) — so the two cannot disagree about
// what a window is called, how many questions are in the FAQ, or what the
// search field finds. The prose itself stays in js/_guidelines.js and
// js/_info.js, which are edited by people who are not editing components.

import { guidelinesData } from './_guidelines.js';
import {
    navigationData, faqData, apiData, coloringLegend, pendingLegend,
} from './_info.js';

// The key is also the ?open= value, so a window is a URL and a rule can be
// linked to.
export const WINDOWS = ['about', 'faq', 'navigation', 'guidelines', 'reference', 'staff', 'api'];

// The guidelines as one ordered run, each section carrying the group it is in.
export const flatSections = guidelinesData.flatMap((group) =>
    group.sections.map((section) => ({ ...section, group: group.group })));

// Every count on the page is the length of the array behind it, so a face
// cannot claim a size the content does not have.
export const sectionCount = flatSections.length;
export const faqCount = faqData.reduce((n, group) => n + group.questions.length, 0);
export const pageCount = navigationData.reduce((n, group) => n + group.pages.length, 0);
export const markCount = coloringLegend.length + pendingLegend.length;
export const endpointCount = apiData.endpoints.length;

export const WINDOW_TITLES = {
    about: 'What this list is',
    faq: 'FAQ',
    navigation: 'What is on each page',
    guidelines: 'Guidelines',
    reference: 'What the marks mean',
    staff: 'Staff & contact',
    api: 'API documentation',
};

export const WINDOW_EYEBROWS = {
    about: 'Start here',
    faq: `Answers · ${faqCount} questions`,
    navigation: `Navigation · ${pageCount} pages`,
    guidelines: 'The rules',
    reference: `Reference · ${markCount} marks`,
    staff: 'Who to talk to',
    api: `Build on it · ${endpointCount} endpoints`,
};

export const roleIconMap = {
    owner: 'crown',
    admin: 'user-gear',
    seniormod: 'user-shield',
    mod: 'user-lock',
    dev: 'code',
};

export const roleLabelMap = {
    owner: 'List Leader',
    admin: 'Admin',
    seniormod: 'Elder Mod',
    mod: 'Mod',
    dev: 'Dev',
};

export function roleLabel(role) { return roleLabelMap[role] || role; }

// Search runs over prose that is authored as HTML. Strip it once per string
// rather than on every keystroke.
const plainCache = new Map();
function plain(html) {
    let text = plainCache.get(html);
    if (text === undefined) {
        text = String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
        plainCache.set(html, text);
    }
    return text;
}

// One index over everything on the page, so the field in the hero means what it
// says rather than searching the guidelines alone. A hit names the window it
// lives in (`kind`), which is what the page opens.
export function searchInformation(query, limit = 12) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return [];
    const hits = [];
    for (const section of flatSections) {
        if (section.title.toLowerCase().includes(q) || plain(section.content).includes(q)) {
            hits.push({ kind: 'guidelines', where: section.group, label: section.title, section: section.id });
        }
    }
    for (const group of faqData) {
        for (const item of group.questions) {
            if (item.q.toLowerCase().includes(q) || plain(item.a).includes(q)) {
                hits.push({ kind: 'faq', where: 'FAQ · ' + group.group, label: item.q });
            }
        }
    }
    for (const group of navigationData) {
        for (const page of group.pages) {
            if (page.name.toLowerCase().includes(q) || page.desc.toLowerCase().includes(q)) {
                hits.push({ kind: 'navigation', where: 'Page', label: page.name, sub: page.path || page.to });
            }
        }
    }
    for (const row of apiData.endpoints) {
        if (row.path.toLowerCase().includes(q) || row.returns.toLowerCase().includes(q)) {
            hits.push({ kind: 'api', where: 'Endpoint', label: row.path, sub: row.returns });
        }
    }
    for (const row of apiData.fields) {
        if (row.name.toLowerCase().includes(q) || row.meaning.toLowerCase().includes(q)) {
            hits.push({ kind: 'api', where: 'Level field', label: row.name, sub: row.meaning });
        }
    }
    for (const row of coloringLegend) {
        if (row.label.toLowerCase().includes(q) || row.meaning.toLowerCase().includes(q)) {
            hits.push({ kind: 'reference', where: 'Level colouring', label: row.label, sub: row.meaning });
        }
    }
    for (const row of pendingLegend) {
        if (row.label.toLowerCase().includes(q)) {
            hits.push({ kind: 'reference', where: 'Pending icon', label: row.label });
        }
    }
    return hits.slice(0, limit);
}
