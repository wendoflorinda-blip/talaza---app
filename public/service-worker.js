/* TALAZA PWA: cache apenas recursos estáticos públicos. */
const CACHE_NAME = 'talaza-static-v3';
const APP_SHELL = ['/offline.html','/manifest.json','/icons/talaza-192.png','/icons/talaza-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('talaza-static-') && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/') || url.pathname.startsWith('/rest/') || url.pathname.startsWith('/storage/')) return;
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response && response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
      return response;
    })));
    return;
  }
  if (request.mode === 'navigate') event.respondWith(fetch(request).catch(() => caches.match('/offline.html')));
});
