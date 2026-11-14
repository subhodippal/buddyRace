// Service worker: makes বাডি রেস installable and playable offline.
// Everything the game needs is cached on the first visit (voice clips included). Files are served from the cache
// straight away and refreshed in the background, so a new version shows up on the next launch.
// Bump VERSION when files are removed or renamed, to clear out the old cache.
const VERSION = 'buddyrace-v15';
const CORE = [
  './', 'index.html', 'manifest.webmanifest', 'noslangs.comment.json', 'slangs.comment.json', 'texts.json', 'css/style.css', 'vendor/three.module.js',
  'js/main.js', 'js/audio.js', 'js/input.js', 'js/intro.js', 'js/levels.js', 'js/models.js', 'js/net.js',
  'js/stories.js', 'js/texts.js', 'js/track.js', 'js/voicekey.js', 'js/world.js', 'js/kolkata.js', 'js/sky.js',
  'audio/other/bell1.mp3', 'audio/other/bell2.mp3', 'audio/other/dog1.mp3', 'audio/other/dog2.mp3', 'audio/other/dog3.mp3', 'audio/other/cow1.mp3', 'audio/other/cow2.mp3', 'audio/other/goat1.mp3', 'audio/other/goat2.mp3', 'audio/other/goat3.mp3', 'audio/other/goat4.mp3',
  'audio/voice/index.json',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-192.png', 'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png', 'icons/favicon-32.png', 'icons/favicon-64.png',
];
const FONTS = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(CORE);
    // every voice clip listed in the index (about 1–2 MB), so comments are heard offline too
    try {
      const idx = await (await fetch('audio/voice/index.json', { cache: 'no-cache' })).json();
      const clips = (idx.clips || []).map(c => `audio/voice/${c.f}`);
      await Promise.allSettled([...new Set(clips)].map(u => cache.add(u)));
    } catch (err) { /* clips are also cached as they play */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const same = url.origin === location.origin;
  if (same && /\/lan(\/|$)/.test(url.pathname)) return;          // Wi-Fi room relay: always live
  if (!same && !FONTS.test(req.url)) return;                        // PeerJS etc.: straight to the network
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(req, { ignoreSearch: same && req.mode === 'navigate' });
    const fresh = fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(fresh); return hit; }                   // instant from cache, refreshed for next time
    const res = await fresh;
    if (res) return res;
    if (req.mode === 'navigate') return (await cache.match('index.html')) || Response.error();
    return Response.error();
  })());
});
