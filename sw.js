const CACHE_NAME = 'ponto-pwa-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './supabaseClient.js',
  './db.js',
  './app.js',
  './manifest.json',
  'https://unpkg.com/lucide@latest',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Ignora requisições de API de gravação diretamente se online ou tenta network-first
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Atualiza o cache se for GET bem sucedido
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
