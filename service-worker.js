// service-worker.js - Финальная версия 2.4.9 (ГАРАНТИРОВАННО РАБОЧАЯ)
const CACHE_NAME = 'workout-diary-v2.4.9';

// Критически важные файлы, кэшируемые при УСТАНОВКЕ
const INITIAL_CACHE = [
  '/workout-diary/',                      // Главная страница
  '/workout-diary/index.html',            // Явный путь к HTML
  '/workout-diary/manifest.json',         // Манифест
  '/workout-diary/privacy.html',          // Политика
  '/workout-diary/service-worker.js',     // Сам воркер
  '/workout-diary/maskable_icon_x192.png', // Иконка 192x192
  '/workout-diary/maskable_icon_x512.png'  // Иконка 512x512
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

// 3. СТРАТЕГИЯ FETCH: Только нужное, без лишней сложности
self.addEventListener('fetch', event => {
  // Пропускаем не-GET запросы
  if (event.request.method !== 'GET') return;

  // ГЛАВНАЯ СТРАНИЦА — самое важное
  if (event.request.mode === 'navigate') {
    event.respondWith(
      // Пробуем взять из кэша по точному ключу
      caches.match('/workout-diary/')
        .then(cachedResponse => {
          if (cachedResponse) {
            console.log('[SW] Главная страница загружена из кэша');
            return cachedResponse;
          }

          // Если в кэше нет — пробуем сеть
          return fetch(event.request)
            .then(networkResponse => {
              // Сохраняем в кэш на будущее
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
              return networkResponse;
            })
            .catch(() => {
              // Если нет ни кэша, ни сети — показываем информативную заглушку
              console.log('[SW] Офлайн: страница не найдена в кэше');
              return new Response(
                '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Офлайн</title></head><body>' +
                '<h3>Дневник тренировок</h3>' +
                '<p>Работает в офлайн-режиме. Для обновления данных требуется интернет.</p>' +
                '</body></html>',
                { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
              );
            });
        })
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
