// service-worker.js - исправленная версия
const CACHE_NAME = 'workout-diary-v2.4.3'; // ОБНОВЛЕНО: Увеличиваем версию после правок

// Список файлов для предварительного кэширования
// ОБНОВЛЕНО: Исправлен и дополнен список в соответствии со структурой проекта
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './privacy.html',
  './service-worker.js',
  './maskable_icon_x192.png',
  './maskable_icon_x512.png'
  // ПРИМЕЧАНИЕ: Добавьте сюда ваши CSS/JS файлы, если они появятся в проекте.
  // Например: './app.js', './styles.css'
];

// Установка
self.addEventListener('install', event => {
  // ИСПРАВЛЕНО: Добавлен event.waitUntil() для гарантии кэширования.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Открыт кэш:', CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[SW] Все важные файлы закэшированы');
        return self.skipWaiting(); // Активируем немедленно, но только после кэширования
      })
  );
  console.log('Service Worker: Установлен');
});

// Активация
self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      // Очищаем старые кэши
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('Удаляем старый кэш:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Немедленно контролируем клиенты
      self.clients.claim()
    ])
  );
  console.log('Service Worker: Активирован');
});

// Стратегия: Network First, затем Cache
self.addEventListener('fetch', event => {
  // Пропускаем не-GET запросы
  if (event.request.method !== 'GET') return;

  // Особенно важное правило для index.html
  if (event.request.url.includes('index.html') || 
      event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Клонируем для кэша
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => {
          // При ошибке сети - из кэша
          // ИСПРАВЛЕНО: Используем './' как резерв для навигационных запросов
          return caches.match('./');
        })
    );
    return;
  }

  // Для остальных файлов: сначала кэш, потом сеть
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request)
          .then(response => {
            // Кэшируем только успешные ответы
            if (response.status === 200) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, responseToCache));
            }
            return response;
          })
          .catch(() => {
            // Для CSS/JS возвращаем заглушку
            if (event.request.url.includes('.css')) {
              return new Response('/* Офлайн */', {
                headers: { 'Content-Type': 'text/css' }
              });
            }
            if (event.request.url.includes('.js')) {
              return new Response('// Офлайн', {
                headers: { 'Content-Type': 'application/javascript' }
              });
            }
            return new Response('Офлайн');
          });
      })
  );
});