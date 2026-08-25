// Renders the real mobile shell markup + mobile.css in a phone viewport and checks
// that the blank space above .mob-footer is exactly two level rows tall, on both a
// one-result page and a full list.
//
// Requires playwright in the directory you run from:  npm i playwright
// Run:  node css/mobile-footer.test.mjs
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('./pages/mobile.css', import.meta.url), 'utf8');

const page = (rows) => `
<style>html,body{margin:0;height:100%}
:root{--color-background:#fff;--color-on-background:#111;--color-primary:#36c;--color-on-primary:#fff}
${css}</style>
<div class="mob" style="height:100vh">
  <header class="mob-topbar"><span>ULL</span></header>
  <div class="mob-content">
    <div class="mob-list">
      ${Array.from({ length: rows }, (_, i) => `<div style="height:64px;border-bottom:1px solid #eee">level ${i + 1}</div>`).join('')}
    </div>
    <div class="mob-footer"><h3>Upcoming Levels List</h3><p>footer</p></div>
  </div>
</div>`;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();

let pass = 0, fail = 0;
const check = (label, cond, extra = '') => {
  cond ? (pass++, console.log(`  ok   ${label}`)) : (fail++, console.log(`  FAIL ${label} ${extra}`));
};

for (const rows of [1, 3]) {
  await p.setContent(page(rows));
  const m = await p.evaluate(() => {
    const f = document.querySelector('.mob-footer').getBoundingClientRect();
    const list = document.querySelector('.mob-list').getBoundingClientRect();
    return { footerBottom: f.bottom, footerTop: f.top, listBottom: list.bottom, vh: innerHeight,
             scrollH: document.querySelector('.mob-content').scrollHeight,
             clientH: document.querySelector('.mob-content').clientHeight };
  });
  console.log(`\n${rows} level(s) — viewport ${m.vh}px:`);
  // 2 level rows = 2 x 4.2rem = 8.4rem = 134.4px at the 16px root size.
  check('gap above the footer is exactly 2 level rows',
    Math.abs((m.footerTop - m.listBottom) - 134.4) < 1, `gap=${(m.footerTop - m.listBottom).toFixed(1)}`);
}

// Long page: footer must follow content, not float.
await p.setContent(page(30));
const long = await p.evaluate(() => {
  const c = document.querySelector('.mob-content');
  const f = document.querySelector('.mob-footer').getBoundingClientRect();
  const list = document.querySelector('.mob-list').getBoundingClientRect();
  return { gap: f.top - list.bottom, scrolls: c.scrollHeight > c.clientHeight,
           listH: list.height, rows: 30 };
});
console.log('\n30 levels:');
check('the same 2-row gap is still there on a long page', Math.abs(long.gap - 134.4) < 1, `gap=${long.gap.toFixed(1)}`);
check('content scrolls', long.scrolls);
check('all rows keep full height (nothing squashed)', Math.abs(long.listH - 30 * 65) < 5, `listH=${long.listH}`);

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
