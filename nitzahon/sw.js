// הכתובת הזו הועברה ל-../nitzahonot/ - ה-service worker הזה מוחק את עצמו ואת העותק הישן
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => /^nitzahon-v\d+$/.test(k)).map(k => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(c => c.navigate('../nitzahonot/'));
  })());
});
