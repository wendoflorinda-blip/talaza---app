/* TALAZA PWA: cache restrito a ficheiros estáticos da aplicação.
   Nunca guardar em cache APIs, autenticação, Supabase, pagamentos ou conteúdo privado. */
const CACHE_VERSION = 'talaza-static-v1';
const OFFLINE_URL = '/offline.html';
const STATIC_PREFIX = '/_next/static/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll([OFFLINE_URL, '/icons/talaza-icon.svg']))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('talaza-static-') && key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/') || url.pathname.startsWith('/rest/') || url.pathname.startsWith('/storage/')) return;

  if (url.pathname.startsWith(STATIC_PREFIX)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
        }
        return response;
      }))
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
  }
});
