// service-worker.js - исправленная версия
const CACHE_NAME = 'workout-diary-v2.1'; // ← ИЗМЕНИТЕ версию!

const urlsToCache = [
  './',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
  // УБЕРИТЕ index.html из предзагрузки!
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
  console.log('Service Worker установлен и закэшировал ресурсы');
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Удаляем старый кэш:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => self.clients.claim())
  );
  console.log('Service Worker активирован, старые кэши удалены');
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Для HTML-страниц всегда грузим из сети
        if (event.request.url.includes('index.html') || 
            event.request.headers.get('accept').includes('text/html')) {
          return fetch(event.request)
            .then(response => {
              // Кэшируем новую версию
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, responseClone));
              return response;
            })
            .catch(() => {
              // Если сеть недоступна, возвращаем из кэша
              return response || caches.match('./');
            });
        }
        
        // Для других ресурсов — из кэша или сети
        return response || fetch(event.request);
      })
  );
});
