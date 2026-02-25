// service-worker.js - v2.5.0 (ИСПРАВЛЕННАЯ)
const CACHE_NAME = 'workout-diary-v2.5.0';
const CACHE_PREFIX = 'workout-diary';

// Базовые файлы для кэширования
const INITIAL_CACHE = [
  './',                                // Текущий каталог
  './index.html',                      // Явный HTML
  './manifest.json',
  './privacy.html',
  './service-worker.js',
  './maskable_icon_x192.png',
  './maskable_icon_x512.png'
];

// 1. УСТАНОВКА
self.addEventListener('install', event => {
  console.log('[SW] Установка:', CACHE_NAME);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Кэширование начальных файлов');
        return cache.addAll(INITIAL_CACHE);
      })
      .then(() => {
        console.log('[SW] Принудительная активация');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Ошибка при кэшировании:', error);
      })
  );
});

// 2. АКТИВАЦИЯ
self.addEventListener('activate', event => {
  console.log('[SW] Активация новой версии');
  
  event.waitUntil(
    Promise.all([
      // Очистка старых кэшей
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(name => {
            if (name !== CACHE_NAME && name.startsWith(CACHE_PREFIX)) {
              console.log('[SW] Удаление старого кэша:', name);
              return caches.delete(name);
            }
          })
        );
      }),
      // Немедленный захват контроля над всеми клиентами
      self.clients.claim()
    ]).then(() => {
      console.log('[SW] Готов к работе');
    })
  );
});

// 3. ОБРАБОТКА ЗАПРОСОВ
self.addEventListener('fetch', event => {
  const { request } = event;
  
  // Пропускаем всё, кроме GET
  if (request.method !== 'GET') return;

  // Обработка навигационных запросов (главная страница)
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Сначала пробуем сеть
          const networkResponse = await fetch(request);
          
          // Если успешно, кэшируем и возвращаем
          if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, networkResponse.clone());
            console.log('[SW] Навигация: загружено из сети и закэшировано');
            return networkResponse;
          }
        } catch (error) {
          console.log('[SW] Сеть недоступна, ищем в кэше');
        }

        // Если сеть не работает, ищем в кэше
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
          console.log('[SW] Навигация: загружено из кэша');
          return cachedResponse;
        }

        // Если ничего нет, пробуем найти корневой index.html
        const rootCached = await caches.match('./index.html') || 
                          await caches.match('/workout-diary/index.html') ||
                          await caches.match('/index.html');
        
        if (rootCached) {
          console.log('[SW] Навигация: загружено корневое index.html из кэша');
          return rootCached;
        }

        // Совсем ничего нет - показываем заглушку
        console.log('[SW] Офлайн: страница не найдена');
        return new Response(
          `<!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <title>Дневник тренировок</title>
              <style>
                body { font-family: system-ui; text-align: center; padding: 2rem; }
                .offline { color: #666; }
              </style>
            </head>
            <body>
              <h3>📱 Дневник тренировок</h3>
              <p class="offline">Вы в офлайн-режиме</p>
              <p>Для обновления данных подключитесь к интернету</p>
            </body>
          </html>`,
          { 
            headers: { 
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'no-cache'
            } 
          }
        );
      })()
    );
    return;
  }

  // Обработка статических ресурсов
  event.respondWith(
    (async () => {
      // Сначала проверяем кэш
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }

      // Если нет в кэше, пробуем сеть
      try {
        const networkResponse = await fetch(request);
        
        if (networkResponse && networkResponse.status === 200) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
      } catch (error) {
        // Для ресурсов, которые не удалось загрузить
        console.log('[SW] Ресурс не найден:', request.url);
        return new Response('', { status: 404 });
      }
    })()
  );
});