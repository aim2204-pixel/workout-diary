// service-worker.js - v2.5.1 (ИСПРАВЛЕННЫЕ АБСОЛЮТНЫЕ ПУТИ)
const CACHE_NAME = 'workout-diary-v2.5.1';
const CACHE_PREFIX = 'workout-diary';

// Критически важные файлы с АБСОЛЮТНЫМИ путями
const INITIAL_CACHE = [
  '/workout-diary/',                       // Главная страница (корень)
  '/workout-diary/index.html',              // Явный HTML
  '/workout-diary/manifest.json',           // Манифест
  '/workout-diary/privacy.html',            // Политика
  '/workout-diary/service-worker.js',       // Сам воркер
  '/workout-diary/maskable_icon_x192.png',  // Иконка 192x192
  '/workout-diary/maskable_icon_x512.png'   // Иконка 512x512
];

// 1. УСТАНОВКА: Кэшируем начальный набор файлов
self.addEventListener('install', event => {
  console.log('[SW] Установка версии:', CACHE_NAME);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Кэширование начальных файлов');
        // Кэшируем каждый файл по отдельности с обработкой ошибок
        return Promise.allSettled(
          INITIAL_CACHE.map(url => {
            return cache.add(url).catch(error => {
              console.error('[SW] Ошибка кэширования:', url, error.message);
            });
          })
        );
      })
      .then(() => {
        console.log('[SW] Принудительная активация');
        return self.skipWaiting();
      })
  );
});

// 2. АКТИВАЦИЯ: Очищаем старые кэши
self.addEventListener('activate', event => {
  console.log('[SW] Активация новой версии');
  
  event.waitUntil(
    Promise.all([
      // Очистка старых кэшей
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(name => {
            if (name !== CACHE_NAME && name.startsWith(CACHE_PREFIX)) {
              console.log('[SW] Удаляем старый кэш:', name);
              return caches.delete(name);
            }
          })
        );
      }),
      // Немедленный захват контроля над всеми клиентами
      self.clients.claim()
    ]).then(() => {
      console.log('[SW] Готов к работе, кэш содержит:', CACHE_NAME);
    })
  );
});

// 3. СТРАТЕГИЯ FETCH: Сначала кэш, потом сеть
self.addEventListener('fetch', event => {
  const { request } = event;
  
  // Пропускаем не-GET запросы
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
        // Пробуем разные варианты пути для главной страницы
        const urlsToTry = [
          request.url,
          '/workout-diary/',
          '/workout-diary/index.html',
          './index.html'
        ];
        
        for (const url of urlsToTry) {
          const cachedResponse = await caches.match(url);
          if (cachedResponse) {
            console.log('[SW] Навигация: загружено из кэша по URL:', url);
            return cachedResponse;
          }
        }

        // Если ничего нет — показываем заглушку
        console.log('[SW] Офлайн: страница не найдена в кэше');
        return new Response(
          `<!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <title>Дневник тренировок</title>
              <style>
                body { 
                  font-family: system-ui, -apple-system, sans-serif; 
                  text-align: center; 
                  padding: 2rem;
                  background: #1a1a2e;
                  color: #f0f0f0;
                }
                .offline { 
                  color: #90e0ef; 
                  margin: 2rem 0;
                }
                .icon {
                  font-size: 4rem;
                  margin-bottom: 1rem;
                }
              </style>
            </head>
            <body>
              <div class="icon">📱</div>
              <h3>Мой Дневник Тренировок</h3>
              <p class="offline">Вы в офлайн-режиме</p>
              <p>Для обновления данных подключитесь к интернету</p>
              <p style="font-size: 0.8rem; margin-top: 2rem; opacity: 0.5;">Сохранённые тренировки доступны</p>
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

  // ВСЕ ОСТАЛЬНЫЕ ФАЙЛЫ (иконки, стили, скрипты)
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
        
        // Кэшируем только успешные ответы
        if (networkResponse && networkResponse.status === 200) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
      } catch (error) {
        // Для ресурсов, которые не удалось загрузить
        console.log('[SW] Ресурс не найден в офлайн:', request.url);
        return new Response('', { status: 404 });
      }
    })()
  );
});
