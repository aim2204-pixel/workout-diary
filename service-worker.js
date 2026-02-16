// service-worker.js - Версия 2.5.0 (ИСПРАВЛЕНА ПРОБЛЕМА ОФЛАЙН)
const CACHE_NAME = 'workout-diary-v2.5.0';

// Критически важные файлы, кэшируемые при УСТАНОВКЕ
const INITIAL_CACHE = [
  '/workout-diary/',
  '/workout-diary/index.html',
  '/workout-diary/manifest.json',
  '/workout-diary/privacy.html',
  '/workout-diary/service-worker.js',
  '/workout-diary/maskable_icon_x192.png',
  '/workout-diary/maskable_icon_x512.png'
];

// 1. УСТАНОВКА: Кэшируем начальный набор файлов
self.addEventListener('install', event => {
  console.log('[SW] Установка версии:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(INITIAL_CACHE))
      .then(() => self.skipWaiting())
  );
});

// 2. АКТИВАЦИЯ: Очищаем старые кэши
self.addEventListener('activate', event => {
  console.log('[SW] Активация новой версии');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) {
            console.log('[SW] Удаляем старый кэш:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. СТРАТЕГИЯ FETCH: Исправленная логика
self.addEventListener('fetch', event => {
  // Пропускаем не-GET запросы
  if (event.request.method !== 'GET') return;

  // ГЛАВНАЯ СТРАНИЦА — навигационные запросы
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {        // 🔧 ИСПРАВЛЕНИЕ #1: Сначала пробуем найти ЛЮБОЙ вариант страницы в кэше
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          console.log('[SW] Страница загружена из кэша (по URL запроса)');
          return cachedResponse;
        }

        // 🔧 ИСПРАВЛЕНИЕ #2: Пробуем альтернативные пути (для GitHub Pages)
        const fallbackPaths = [
          '/workout-diary/',
          '/workout-diary/index.html',
          '/index.html',
          '/'
        ];

        for (const path of fallbackPaths) {
          const fallback = await caches.match(path);
          if (fallback) {
            console.log('[SW] Страница загружена из кэша (fallback):', path);
            return fallback;
          }
        }

        // 🔧 ИСПРАВЛЕНИЕ #3: Если кэша нет — пробуем сеть
        try {
          const networkResponse = await fetch(event.request);
          // Сохраняем в кэш на будущее
          const responseClone = networkResponse.clone();
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, responseClone);
          return networkResponse;
        } catch (error) {
          // 🔧 ИСПРАВЛЕНИЕ #4: Показываем заглушку ТОЛЬКО если страницы нет в кэше ВООБЩЕ
          // Это значит пользователь зашёл впервые без интернета
          console.log('[SW] Офлайн: страница не найдена в кэше ВООБЩЕ');
          return new Response(
            `<!DOCTYPE html>
            <html lang="ru">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Офлайн</title>
              <style>
                body { font-family: system-ui, sans-serif; text-align: center; padding: 40px; background: #f5f5f5; }
                h1 { color: #333; }
                p { color: #666; }
                .btn { display: inline-block; padding: 12px 24px; background: #4CAF50; color: white; 
                       text-decoration: none; border-radius: 8px; margin-top: 20px; }
              </style>
            </head>            <body>
              <h1>📴 Нет соединения</h1>
              <p>Приложение не было загружено ранее.</p>
              <p>Подключитесь к интернету для первого запуска.</p>
              <a href="/" class="btn" onclick="location.reload()">Попробовать снова</a>
            </body>
            </html>`,
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        }
      })()
    );
    return;
  }

  // ВСЕ ОСТАЛЬНЫЕ ФАЙЛЫ (иконки, стили, скрипты)
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request)
          .then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
            }
            return networkResponse;
          })
          .catch(() => new Response('', { status: 408 }));
      })
  );
});