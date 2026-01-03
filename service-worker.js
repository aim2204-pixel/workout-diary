// service-worker.js - исправленная версия для офлайн-работы
const CACHE_NAME = 'workout-diary-v2.2'; // Увеличили версию

// Список файлов для предварительного кэширования
const urlsToCache = [
  './',                    // Главная страница
  './index.html',          // HTML-файл
  './manifest.json',       // Манифест
  'https://cdn.jsdelivr.net/npm/chart.js',               // Внешняя библиотека
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css' // Шрифты
];

// Установка Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Кэшируем файлы для офлайн-работы');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Все файлы закэшированы');
        return self.skipWaiting(); // Активируем сразу
      })
  );
});

// Активация Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Удаляем старые версии кэша
          if (cacheName !== CACHE_NAME) {
            console.log('Удаляем старый кэш:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('Service Worker активирован');
      return self.clients.claim(); // Немедленно контролировать клиенты
    })
  );
});

// Обработка запросов (стратегия "Cache First")
self.addEventListener('fetch', event => {
  // Пропускаем запросы POST и к API
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Если есть в кэше - возвращаем из кэша
        if (cachedResponse) {
          return cachedResponse;
        }

        // Если нет в кэше - загружаем из сети
        return fetch(event.request)
          .then(networkResponse => {
            // Не кэшируем запросы к другим доменам (кроме необходимых)
            if (!event.request.url.startsWith(self.location.origin) &&
                !event.request.url.includes('cdn.jsdelivr.net') &&
                !event.request.url.includes('cdnjs.cloudflare.com')) {
              return networkResponse;
            }

            // Клонируем ответ для кэширования
            const responseToCache = networkResponse.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          })
          .catch(error => {
            console.log('Ошибка сети, возвращаем fallback:', error);
            
            // Для HTML-страниц возвращаем главную страницу из кэша
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('./index.html');
            }
            
            // Для других типов файлов можно вернуть заглушку
            return new Response('Нет соединения. Приложение работает в офлайн-режиме.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});
