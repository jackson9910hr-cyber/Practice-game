import { defineConfig, type Plugin } from 'vite';
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

/** Strict CSP for production builds (dev needs websockets for HMR). No network access at all. */
const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; worker-src 'self' blob:; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'";

function csp(): Plugin {
  return {
    name: 'csp',
    apply: 'build',
    transformIndexHtml: (html) =>
      html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
      ),
  };
}

/**
 * Tiny service worker generator: precaches every emitted file so the whole game works offline
 * after the first visit. A new version only activates on the next launch (never mid-play).
 */
function serviceWorker(): Plugin {
  let outDir = 'dist';
  return {
    name: 'sw',
    apply: 'build',
    configResolved(c) {
      outDir = c.build.outDir;
    },
    generateBundle(_o, bundle) {
      // the WebGPU renderer is never used (preference: webgl) → don't precache it
      const files = Object.keys(bundle).filter((f) => !f.endsWith('.map') && !/WebGPU/.test(f));
      (this as unknown as { _files: string[] })._files = files;
    },
    closeBundle() {
      const files: string[] = (this as unknown as { _files?: string[] })._files ?? [];
      const statics = [
        'manifest.webmanifest',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/apple-touch-icon.png',
        'icons/maskable-512.png',
      ];
      const all = ['./', ...files.map((f) => `./${f}`), ...statics.map((f) => `./${f}`)];
      const version = Date.now().toString(36);
      // voice recordings live in their own cache, keyed by their content: a deploy that doesn't
      // change audio doesn't re-download ~5 MB of it
      const audio = listFiles(join(outDir, 'audio')).map((f) => `./audio/${f}`);
      const audioKey = createHash('sha1')
        .update(audio.map((f) => `${f}:${statSync(join(outDir, f)).size}`).join('|'))
        .digest('hex')
        .slice(0, 10);
      const sw = `/* generated at build time */
const CACHE = 'starlight-${version}';
const FILES = ${JSON.stringify(all)};
const AUDIO_CACHE = 'starlight-audio-${audioKey}';
const AUDIO = ${JSON.stringify(audio)};
self.addEventListener('install', (e) => {
  // activate right away; the running page keeps its already-loaded code, the next launch gets the new one
    e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(FILES))
      .then(() => caches.open(AUDIO_CACHE))
      .then(async (c) => {
        // voices: best effort, in small batches, skipping what is already cached
        for (let i = 0; i < AUDIO.length; i += 40) {
          const batch = [];
          for (const f of AUDIO.slice(i, i + 40)) if (!(await c.match(f))) batch.push(c.add(f).catch(() => undefined));
          await Promise.all(batch);
        }
      })
      .then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', (e) => {
    e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== AUDIO_CACHE).map((k) => caches.delete(k)))));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) =>
      hit || fetch(e.request).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return res;
      }).catch(() => (e.request.mode === 'navigate' ? caches.match('./') : Response.error()))
    )
  );
});
`;
      writeFileSync(join(outDir, 'sw.js'), sw);
    },
  };
}

/** All files under a directory, as paths relative to it. */
function listFiles(dir: string, prefix = ''): string[] {
  let out: string[] = [];
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const n of entries) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) out = out.concat(listFiles(p, `${prefix}${n}/`));
    else out.push(`${prefix}${n}`);
  }
  return out;
}

export default defineConfig({
  base: './',
  plugins: [csp(), serviceWorker()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 900,
  },
  server: { host: true },
});
