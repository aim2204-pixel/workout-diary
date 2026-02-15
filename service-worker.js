// service-worker.js - Финальная версия 2.4.7 (сначала кэш, потом сеть)
const CACHE_NAME = 'workout-diary-v2.4.7'; // Увеличил версию

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
      .then(() => self.skipWaiting()) // Немедленная активация
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
    }).then(() => self.clients.claim()) // Немедленный контроль над вкладками
  );
});

// 3. СТРАТЕГИЯ FETCH: Сначала кэш, потом сеть (для надёжной офлайн-работы)
self.addEventListener('fetch', event => {
  // Пропускаем не-GET запросы
  if (event.request.method !== 'GET') return;

  // А. ГЛАВНАЯ СТРАНИЦА (самое важное!)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      // ИСПРАВЛЕНО: Сначала проверяем КЭШ, потом сеть
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            // Если страница есть в кэше — отдаём её немедленно
            console.log('[SW] Навигация: отдаю из кэша');
            return cachedResponse;
          }

          // Если в кэше нет — идём в сеть
          console.log('[SW] Навигация: нет в кэше, иду в сеть');
          return fetch(event.request)
            .then(networkResponse => {
              // Клонируем и кэшируем на будущее
              if (networkResponse.ok) {
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME)
                  .then(cache => cache.put(event.request, responseClone));
              }
              return networkResponse;
            })
            .catch(() => {
              // Если сеть недоступна и кэша нет — показываем заглушку
              console.log('[SW] Навигация: сеть недоступна, заглушка');
              return new Response(
                '<h3>Дневник тренировок</h3><p>Вы офлайн. Подключитесь к интернету для обновления.</p>',
                { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
              );
            });
        })
    );
    return; // Завершаем обработку навигационных запросов
  }

  // Б. ВСЕ ОСТАЛЬНЫЕ ФАЙЛЫ (иконки, стили, скрипты)
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Если есть в кэше - отдаём сразу (быстро, работает офлайн)
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Если нет в кэше - пробуем сеть
        return fetch(event.request)
          .then(networkResponse => {
            // Успешный ответ из сети - кэшируем на будущее
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, responseClone));
            }
            return networkResponse;
          })
          .catch(() => {
            // Не удалось загрузить (офлайн для не-главных файлов)
            return new Response('', { status: 408 });
          });
      })
  );
});
