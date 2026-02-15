// service-worker.js - Финальная версия 2.4.8 (ПОЛНОСТЬЮ РАБОЧАЯ)
const CACHE_NAME = 'workout-diary-v2.4.8';

// Критически важные файлы, кэшируемые при УСТАНОВКЕ
const INITIAL_CACHE = [
  '/workout-diary/',                      // Главная страница
  '/workout-diary/index.html',            // Явный путь к HTML
  '/workout-diary/manifest.json',         // Манифест
  '/workout-diary/privacy.html',          // Политика
  '/workout-diary/service-worker.js',     // Сам воркер
  '/workout-diary/maskable_icon_x192.png', // Иконка 192x192
  '/workout-diary/maskable_icon_x512.png'  // Иконка 512x512
  // Сюда при необходимости добавьте свои CSS/JS файлы
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

// 3. СТРАТЕГИЯ FETCH: Сначала кэш, потом сеть
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // ГЛАВНАЯ СТРАНИЦА (НАВИГАЦИЯ)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      // Пробуем найти в кэше по ТРЁМ ключам
      caches.match('/workout-diary/')
        .then(r => r || caches.match('/workout-diary/index.html'))
        .then(r => r || caches.match(event.request))
        .then(cached => {
          if (cached) {
            console.log('[SW] Главная из кэша');
            return cached;
          }

          // Если в кэше нет — идём в сеть
          return fetch(event.request)
            .then(networkResponse => {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
              return networkResponse;
            })
            .catch(() => {
              // Если нет ни кэша, ни сети — показываем заглушку
              return new Response(
                '<h3>Дневник тренировок</h3><p>Вы офлайн. Подключитесь к интернету для обновления.</p>',
                { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
              );
            });
        })
    );
    return;
  }

  // ВСЕ ОСТАЛЬНЫЕ ФАЙЛЫ (стили, скрипты, иконки)
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) {
          console.log('[SW] Ресурс из кэша:', event.request.url);
          return cached;
        }

        return fetch(event.request)
          .then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            }
            return networkResponse;
          })
          .catch(() => new Response('', { status: 408 }));
      })
  );
});
