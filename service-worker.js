// service-worker.js - v2.6.0 (ПОЛНАЯ ОФЛАЙН-ПОДДЕРЖКА + ОБНОВЛЕНИЯ)
const CACHE_NAME = 'workout-diary-v2.6.0';
const CACHE_PREFIX = 'workout-diary';

// Критически важные файлы с АБСОЛЮТНЫМИ путями
const INITIAL_CACHE = [
  '/workout-diary/',
  '/workout-diary/index.html',
  '/workout-diary/manifest.json',
  '/workout-diary/privacy.html',
  '/workout-diary/service-worker.js',
  '/workout-diary/maskable_icon_x192.png',
  '/workout-diary/maskable_icon_x512.png',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// 1. УСТАНОВКА: Кэшируем все файлы
self.addEventListener('install', event => {
  console.log('[SW] Установка версии:', CACHE_NAME);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Кэширование начальных файлов');
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

// 2. АКТИВАЦИЯ: Очищаем старые кэши и уведомляем клиенты
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
      // Уведомляем все клиенты о новой версии
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME });
        });
      });
    })
  );
});

// 3. ОБРАБОТЧИК СООБЩЕНИЙ (для обновления из главного потока)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CHECK_FOR_UPDATES') {
    console.log('[SW] Получен запрос на проверку обновлений');
    // Принудительно пропускаем ожидание и активируем новую версию
    self.skipWaiting();
    // Уведомляем клиент о наличии обновления
    event.source.postMessage({ type: 'UPDATE_AVAILABLE', version: CACHE_NAME });
  }
});

// 4. СТРАТЕГИЯ FETCH: Умное кэширование с обновлением
self.addEventListener('fetch', event => {
  const { request } = event;
  
  // Пропускаем не-GET запросы
  if (request.method !== 'GET') return;

  // Обработка навигационных запросов (главная страница)
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // ПРОВЕРКА ИНТЕРНЕТА: пробуем сеть
          const networkResponse = await fetch(request);
          
          // Если есть интернет и ответ успешный — обновляем кэш
          if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, networkResponse.clone());
            console.log('[SW] Навигация: обновлено из сети');
            return networkResponse;
          }
        } catch (error) {
          console.log('[SW] Нет интернета, берём из кэша');
        }

        // Если сеть недоступна — берём из кэша
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
              <title>Дневник тренировок - Офлайн</title>
              <style>
                body { 
                  font-family: system-ui, -apple-system, sans-serif; 
                  text-align: center; 
                  padding: 2rem;
                  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                  color: #f0f0f0;
                  min-height: 100vh;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                }
                .offline-card {
                  background: rgba(255,255,255,0.1);
                  border-radius: 20px;
                  padding: 2rem;
                  max-width: 300px;
                  backdrop-filter: blur(10px);
                }
                .icon {
                  font-size: 4rem;
                  margin-bottom: 1rem;
                }
                .offline-title {
                  color: #ffd166;
                  margin: 1rem 0;
                }
                .offline-text {
                  color: #90e0ef;
                  margin: 1rem 0;
                  font-size: 0.9rem;
                }
                .retry-btn {
                  background: #9d4edd;
                  color: white;
                  border: none;
                  padding: 10px 20px;
                  border-radius: 30px;
                  font-size: 1rem;
                  margin-top: 1rem;
                  cursor: pointer;
                }
              </style>
            </head>
            <body>
              <div class="offline-card">
                <div class="icon">📱</div>
                <h2 class="offline-title">Мой Дневник Тренировок</h2>
                <p class="offline-text">Вы в офлайн-режиме</p>
                <p style="font-size: 0.8rem; opacity: 0.7;">Сохранённые тренировки доступны</p>
                <button class="retry-btn" onclick="location.reload()">⟳ Попробовать снова</button>
              </div>
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

  // ВСЕ ОСТАЛЬНЫЕ ФАЙЛЫ (иконки, стили, скрипты, API)
  event.respondWith(
    (async () => {
      // Сначала проверяем кэш (быстрый ответ)
      const cachedResponse = await caches.match(request);
      
      // Если есть в кэше, возвращаем, но параллельно обновляем (если есть сеть)
      if (cachedResponse) {
        // Фоновое обновление кэша (stale-while-revalidate)
        fetch(request)
          .then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, networkResponse.clone());
                console.log('[SW] Фоновое обновление:', request.url);
              });
            }
          })
          .catch(() => {
            // Сеть недоступна, ничего не делаем
          });
        
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
        
        // Возвращаем заглушку для изображений
        if (request.url.match(/\.(png|jpg|jpeg|svg|ico)$/)) {
          return new Response('', { status: 404 });
        }
        
        return new Response('', { status: 404 });
      }
    })()
  );
});