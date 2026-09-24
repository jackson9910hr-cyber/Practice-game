// Builds a contact sheet PNG from a folder of screenshots. Usage: node scripts/contact-sheet.mjs DIR OUT.png [cols] [filter]
import { createRequire } from 'node:module';
import { readdirSync, readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
let pw;
try {
  pw = require('playwright');
} catch {
  pw = require('/opt/node22/lib/node_modules/playwright');
}
const [dir, out, cols = '6', filter = ''] = process.argv.slice(2);
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.png') && f.includes(filter))
  .sort();
const imgs = files
  .map(
    (f) =>
      `<figure><img src="data:image/png;base64,${readFileSync(`${dir}/${f}`).toString('base64')}"><figcaption>${f}</figcaption></figure>`,
  )
  .join('');
const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1800, height: 1000 } });
await page.setContent(
  `<style>body{margin:0;background:#111;color:#eee;font:12px sans-serif;display:grid;grid-template-columns:repeat(${cols},1fr);gap:6px;padding:6px}img{width:100%}figure{margin:0}</style>${imgs}`,
);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
