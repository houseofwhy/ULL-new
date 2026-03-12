import { store } from '../main.js';
import { embed, filtersList } from '../util.js';

export function getLevelNameStyle(level, isSelected) {
    if (!level) return {};
    const dark = !store.dark;
    if (level.tags?.includes('Unrated')) {
        const c = isSelected ? (dark ? '#dddddd' : '#888888') : (dark ? '#bbbbbb' : '#666666');
        return { color: c, fontWeight: level.isVerified ? 'bold' : 'normal' };
    }
    if (level.tags?.includes('Rated')) return { color: dark ? '#ffffff' : '#000000', fontWeight: level.isVerified ? 'bold' : 'normal' };
    if (level.isVerified) {
        const c = isSelected ? (dark ? '#ffffff' : '#000000') : '#bbbbbb';
        return { color: c, fontWeight: 'bold' };
    }
    const rP = Math.max(0, ...((level.records || []).map(r => Number(r.percent) || 0)));
    const runP = Math.max(0, ...((level.run || []).map(r => {
        const p = String(r.percent).split('-').map(Number);
        return (p.length === 2 && !isNaN(p[0]) && !isNaN(p[1])) ? Math.abs(p[1] - p[0]) : 0;
    })));
    const vP = Math.max(rP, runP);
    const pf = level.percentFinished ?? 0;
    let color;
    if (pf === 100 && vP >= 60) color = dark ? (isSelected ? '#ff9999' : '#ff5555') : (isSelected ? '#cc7a7a' : '#cc4444');
    else if (pf === 100 && vP >= 30) color = dark ? (isSelected ? '#ffaa66' : '#ff6622') : (isSelected ? '#cc8851' : '#cc511b');
    else if (pf === 100) color = dark ? (isSelected ? '#ffcc77' : '#ffaa44') : (isSelected ? '#cca35f' : '#cc8836');
    else if (pf >= 70) color = dark ? (isSelected ? '#ffff77' : '#ffee55') : (isSelected ? '#cccc5f' : '#ccbe44');
    else if (pf >= 30) color = dark ? (isSelected ? '#88ff88' : '#55ee55') : (isSelected ? '#6ccc6c' : '#44be44');
    else if (pf >= 1) color = dark ? (isSelected ? '#66ffff' : '#33dddd') : (isSelected ? '#51cccc' : '#28b0b0');
    else color = dark ? (isSelected ? '#88bbff' : '#5599ff') : (isSelected ? '#6c95cc' : '#447acc');
    return { color, fontWeight: 'normal' };
}

export function getThumbnail(level) {
    if (!level) return '';
    if (level.thumbnail) return level.thumbnail;
    const x = (url) => {
        if (!url) return '';
        const m = url.match(/.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=)([^#&?]*).*/);
        return m ? `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg` : '';
    };
    return x(level.verification) || x(level.showcase) || '';
}

export function isOldLevel(level) {
    if (!level?.lastUpd) return false;
    const p = level.lastUpd.split('.');
    if (p.length !== 3) return false;
    const d = new Date(+p[2], +p[1] - 1, +p[0]);
    const ago = new Date(); ago.setFullYear(ago.getFullYear() - 1);
    return d < ago;
}

export function applyFiltersToList(list, filters, search) {
    if (!list) return;
    const active = filters.filter(f => f.active && !f.separator);
    const q = (search || '').toLowerCase().trim();
    list.forEach(item => {
        const level = item[0];
        if (!level) return;
        const matchSearch = !q || level.name.toLowerCase().includes(q);
        let matchTags = true;
        if (active.length) {
            for (const f of active) {
                if (!level.tags?.includes(f.key)) { matchTags = false; break; }
            }
        }
        level.isHidden = !(matchSearch && matchTags);
    });
}

export function makeFiltersListCopy() {
    return filtersList.map(f => ({ ...f }));
}
