// service-worker.js - Финальная версия 2.4.6 (без кнопки обновлений)
const CACHE_NAME = 'workout-diary-v2.4.6';

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

// 3. СТРАТЕГИЯ FETCH: Умная, с приоритетом офлайн-работы
self.addEventListener('fetch', event => {
  // Пропускаем не-GET запросы
  if (event.request.method !== 'GET') return;

  // А. ГЛАВНАЯ СТРАНИЦА (самое важное!)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      // Стратегия: СЕТЬ с возвратом к КЭШУ (Stale-While-Revalidate)
      fetch(event.request)
        .then(networkResponse => {
          // УСПЕХ из сети: тихо обновляем кэш для будущих загрузок
          if (networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, responseClone));
          }
          // Отдаём СВЕЖИЙ ответ из сети пользователю
          return networkResponse;
        })
        .catch(() => {
          // ПРОВАЛ сети: ищем в кэше по всем возможным ключам
          console.log('[SW] Офлайн. Поиск главной страницы...');
          
          // Варианты ключей для поиска (от наиболее к наименее вероятному)
          const possibleKeys = [
            event.request.url,                     // Полный URL запроса
            self.location.origin + '/workout-diary/', // Абсолютный путь
            './',                                  // Относительный корень
            './index.html'                         // Явное имя файла
          ];
          
          // Последовательно проверяем каждый ключ
          const findInCache = (index) => {
            if (index >= possibleKeys.length) {
              // Ничего не нашли - показываем минимальную офлайн-страницу
              return new Response(
                '<h3>Дневник тренировок</h3><p>Работает в офлайн-режиме. Для обновления данных требуется интернет.</p>',
                { headers: {'Content-Type': 'text/html; charset=utf-8'} }
              );
            }
            
            return caches.match(possibleKeys[index])
              .then(response => response || findInCache(index + 1));
          };
          
          return findInCache(0);
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
            // Можно вернуть заглушку или просто ошибку
            return new Response('', { status: 408 });
          });
      })
  );
});
