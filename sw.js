// SaySee Service Worker - minimal, network first, never caches blank pages
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
    .then(() => self.clients.claim())
  );
});
// Network only - never serve from cache so app always loads fresh
self.addEventListener('fetch', e => {
  e.respondWith(fetch(e.request));
});
