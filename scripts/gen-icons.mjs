// Renders the app icons (original star-fairy art) to PNG with the preinstalled Chromium.
// Usage: node scripts/gen-icons.mjs   (needs the `playwright` package available)
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
let pw;
try {
  pw = require('playwright');
} catch {
  pw = require('/opt/node22/lib/node_modules/playwright');
}
const svg = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs><radialGradient id="g" cx="50%" cy="100%" r="90%"><stop offset="0" stop-color="#3d4a86"/><stop offset="1" stop-color="#23305E"/></radialGradient></defs>
<rect width="512" height="512" fill="url(#g)"/>
<g transform="translate(256 ${256 + pad * 0.1}) scale(${(1 - pad / 512) * 2.1})">
<circle r="92" fill="#FFD166" opacity=".18"/>
<path d="M0 -84 L20 -28 L80 -26 L32 10 L50 68 L0 34 L-50 68 L-32 10 L-80 -26 L-20 -28 Z" fill="#FFD166" stroke="#FFD166" stroke-width="18" stroke-linejoin="round"/>
<ellipse cx="-17" cy="2" rx="7" ry="10" fill="#1B1B2F"/><ellipse cx="17" cy="2" rx="7" ry="10" fill="#1B1B2F"/>
<path d="M-10 20 Q0 29 10 20" stroke="#1B1B2F" stroke-width="5" fill="none" stroke-linecap="round"/>
<ellipse cx="-32" cy="18" rx="8" ry="5" fill="#FF8FAB"/><ellipse cx="32" cy="18" rx="8" ry="5" fill="#FF8FAB"/>
</g>
<g fill="#fff"><circle cx="80" cy="90" r="6"/><circle cx="430" cy="120" r="5"/><circle cx="420" cy="420" r="4"/><circle cx="90" cy="410" r="5"/></g>
</svg>`;
const browser = await pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage();
for (const [name, size, pad] of [
  ['icon-192', 192, 40],
  ['icon-512', 512, 40],
  ['apple-touch-icon', 180, 40],
  ['maskable-512', 512, 140],
]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0">${svg(pad).replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`,
  );
  writeFileSync(`public/icons/${name}.png`, await page.screenshot({ type: 'png' }));
  console.log('icon', name);
}
await browser.close();
