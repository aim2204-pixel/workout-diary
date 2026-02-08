// service-worker.js - версия 2.4.4 с исправлением для обновления в офлайне
const CACHE_NAME = 'workout-diary-v2.4.4';

// Список файлов для предварительного кэширования
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './privacy.html',
  './service-worker.js',
  './maskable_icon_x192.png',
  './maskable_icon_x512.png'
  // ПРИМЕЧАНИЕ: Добавьте сюда ваши CSS/JS файлы, если они появятся в проекте.
];

// Установка
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Открыт кэш:', CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[SW] Все важные файлы закэшированы');
        return self.skipWaiting();
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

  // Особенно важное правило для index.html и навигационных запросов
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
          // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Ищем в кэше по нескольким ключам
          console.log('[SW] Офлайн. Ищу в кэше для:', event.request.url);
          
          // 1. Сначала пробуем найти по полному URL запроса
          return caches.match(event.request.url)
            .then(response => {
              if (response) {
                console.log('[SW] Найдено по полному URL');
                return response;
              }
              
              // 2. Если не нашли, пробуем по ключу './' (корень)
              return caches.match('./');
            })
            .then(response => {
              if (response) {
                console.log('[SW] Найдено по ключу "./"');
                return response;
              }
              
              // 3. Если всё ещё не нашли, пробуем по явному имени файла
              return caches.match('./index.html');
            })
            .then(response => {
              if (response) {
                console.log('[SW] Найдено по "./index.html"');
                return response;
              }
              
              // 4. Если ничего не помогло, возвращаем запасную страницу
              console.log('[SW] Страница не найдена в кэше');
              return new Response(
                '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Режим офлайн</title></head><body><h1>Режим офлайн</h1><p>Приложение загружено в офлайн-режиме. Для доступа к полному функционалу требуется подключение к интернету.</p></body></html>',
                {
                  headers: { 'Content-Type': 'text/html; charset=utf-8' }
                }
              );
            });
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
            return new Response('Режим офлайн');
          });
      })
  );
});