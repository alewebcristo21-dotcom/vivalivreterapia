const CACHE_NAME = 'vivalivreterapias-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/mentora',
  '/mentora.html',
  '/guia',
  '/guia.html'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => 
      caches.match(event.request).then(response => response || caches.match('/index.html'))
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});
