// Automated play-through smoke test in Chromium (dev server). Speech is stubbed to be instant.
// Usage: node scripts/smoke.mjs [baseUrl] [outDir]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
let pw;
try {
  pw = require('playwright');
} catch {
  pw = require('/opt/node22/lib/node_modules/playwright');
}
const base = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? 'shots';
mkdirSync(out, { recursive: true });
const viewports = { phone: { width: 390, height: 844 }, ipad: { width: 1180, height: 820 } };
const vp = viewports[process.env.VP ?? 'phone'];
const browser = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('console: ' + m.text());
});
await page.addInitScript(() => {
  // instant fake speech so flows run fast
  const synth = window.speechSynthesis;
  if (synth) {
    synth.speak = (u) => setTimeout(() => u.onend && u.onend(new Event('end')), 30);
    synth.cancel = () => {};
  }
});
await page.goto(base);
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/00-boot.png` });
await page.click('#start', { force: true });
const shot = async (name, wait = 1500) => {
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${out}/${name}.png` });
};
await shot('01-arrival-a', 2500);
await shot('02-arrival-b', 6000);
// wait for arrival to finish (goes to hub)
for (let i = 0; i < 120; i++) {
  const met = await page.evaluate(() => window.__sg?.store.save.today?.friendMet);
  if (met) break;
  await page.waitForTimeout(1000);
}
await shot('03-hub', 2500);
const info = await page.evaluate(() => ({
  day: window.__sg.store.save.playDay,
  stations: window.__sg.store.save.today.stations,
}));
console.log(JSON.stringify(info));
// open each station of the plan and screenshot
for (const [i, st] of info.stations.entries()) {
  await page.evaluate(([i, st]) => window.__sg.nav.station(i, st), [i, st]);
  await shot(`04-station-${i}-${st.game ?? st.kind}`, 3500);
}
await page.evaluate(() => window.__sg.nav.codex());
await shot('05-codex', 2000);
await page.evaluate(() => window.__sg.nav.goodnight('done'));
await shot('06-goodnight', 4000);
console.log(errors.length ? errors.join('\n') : 'NO ERRORS');
await browser.close();
