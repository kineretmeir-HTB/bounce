// שומר עותק של קבצי האפליקציה בטלפון, כדי שתיפתח גם בלי אינטרנט.
// כשיש אינטרנט - מוריד ברקע גרסה מעודכנת, שתופיע בפתיחה הבאה.
const CACHE = 'nitzahon-v2';
const FILES = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'db.js',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  '../fonts/fonts.css',
  '../fonts/heebo-hebrew-wght-normal.woff2',
  '../fonts/heebo-latin-wght-normal.woff2',
  '../fonts/frank-ruhl-libre-hebrew-700-normal.woff2',
  '../fonts/frank-ruhl-libre-latin-700-normal.woff2',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('nitzahon-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(e.request, { ignoreSearch: true });
      const network = fetch(e.request)
        .then(res => { if (res.ok) cache.put(e.request, res.clone()); return res; })
        .catch(() => cached);
      return cached || network;
    })
  );
});
