// Screenshots every game mode on a given viewport (dev server). Usage: VP=phone node scripts/gallery.mjs URL OUT
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
const viewports = {
  phone: { width: 390, height: 844 },
  ipad: { width: 1180, height: 820 },
  phoneland: { width: 844, height: 390 },
};
const vpName = process.env.VP ?? 'phone';
const browser = await pw.chromium.launch();
const ctx = await browser.newContext({ viewport: viewports[vpName], deviceScaleFactor: 1, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text());
});
await page.addInitScript(() => {
  const s = window.speechSynthesis;
  if (s) {
    s.speak = (u) => setTimeout(() => u.onend && u.onend(new Event('end')), 20);
    s.cancel = () => {};
  }
});
await page.goto(base);
await page.click('#start', { force: true });
await page.waitForFunction(() => window.__sg?.simulateTo, null, { timeout: 20000 });
await page.waitForTimeout(1500);
const cases = (
  process.env.CASES ??
  'word-garden:1@3,word-garden:2@6,word-garden:3@12,word-garden:4@26,sound-butterfly:1@8,sound-butterfly:2@12,sound-butterfly:3@18,sound-butterfly:4@26,hangul-pieces:1@3,hangul-pieces:2@10,hangul-pieces:3@20,number-fireflies:1@9,number-fireflies:2@13,number-fireflies:3@18,number-fireflies:4@24,pattern-path:1@6,pattern-path:2@12,pattern-path:3@15,pattern-path:4@20,ant-path:1@16,ant-path:2@20,ant-path:3@23,sentence-train:1@3,sentence-train:2@14,sentence-train:3@20,sentence-train:4@27,chant:0@7,medley:0@27,hub:0@9,codex:0@12,finale:0@30'
).split(',');
for (const c of cases) {
  const [gm, day] = c.split('@');
  const [game, mode] = gm.split(':');
  await page.evaluate(
    ([game, mode, day]) => {
      const sg = window.__sg;
      sg.simulateTo(Number(day));
      if (game === 'hub') return sg.nav.hub();
      if (game === 'codex') return sg.nav.codex();
      const kinds = { chant: 'chant', medley: 'medley', finale: 'finale' };
      const plan = kinds[game]
        ? { kind: kinds[game], mode: 0 }
        : { kind: 'english', game, mode: Number(mode) };
      return sg.play(plan, 0);
    },
    [game, mode, day],
  );
  await page.waitForTimeout(Number(process.env.WAIT ?? 2600));
  await page.screenshot({ path: `${out}/${vpName}-${game}-${mode}-d${day}.png` });
}
console.log(errors.length ? [...new Set(errors)].join('\n') : 'NO ERRORS');
await browser.close();
