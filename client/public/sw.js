// Service Worker для PWA
// Версия кэша - обновляйте при изменении стратегии кэширования
const CACHE_VERSION = 'v4'; // Защита заголовков вкладок от подмены
const CACHE_NAME = `odonta-ai-${CACHE_VERSION}`;

// Ресурсы для предварительного кэширования при установке
const PRECACHE_RESOURCES = [
  '/',
  '/index.html',
  '/favicon.png',
  '/OdontaLogo.svg'
];

// Событие установки Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker установлен');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Предварительное кэширование ресурсов');
        // Кэшируем только критичные ресурсы, остальное будет кэшироваться по требованию
        return cache.addAll(PRECACHE_RESOURCES.filter(Boolean));
      })
      .then(() => {
        // Принудительно активируем новый Service Worker
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Ошибка при предварительном кэшировании:', error);
      })
  );
});

// Событие активации Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker активирован');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        // Удаляем старые кэши
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Удаление старого кэша:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        // Берем контроль над всеми клиентами
        return self.clients.claim();
      })
  );
});

// Функция проверки, является ли запрос внешним API запросом
function isExternalApiRequest(url) {
  try {
    const urlObj = new URL(url);
    const currentOrigin = self.location.origin;
    
    // Если запрос идет на другой домен - это внешний API
    if (urlObj.origin !== currentOrigin) {
      // Проверяем, что это не статический ресурс
      const isStatic = urlObj.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp|mp3|mp4|wav)$/);
      // Проверяем, что это не внешний шрифт или другой статический ресурс
      const isExternalStatic = urlObj.hostname.includes('fonts.googleapis.com') || 
                               urlObj.hostname.includes('fonts.gstatic.com') ||
                               urlObj.hostname.includes('telegram.org');
      
      // Если это внешний API (не статический ресурс), пропускаем мимо Service Worker
      return !isStatic && !isExternalStatic;
    }
    
    // Для запросов на тот же домен проверяем путь
    return urlObj.pathname.startsWith('/api/');
  } catch {
    return false;
  }
}

// Функция проверки, является ли запрос статическим ресурсом
function isStaticResource(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp|mp3|mp4|wav)$/);
  } catch {
    return false;
  }
}

// Функция проверки, является ли запрос HTML страницей
function isHtmlRequest(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname === '/' || 
           urlObj.pathname.endsWith('.html') || 
           (!urlObj.pathname.includes('.') && !isExternalApiRequest(url));
  } catch {
    return false;
  }
}

// Стратегия кэширования: Network First с fallback на кэш
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    // Кэшируем успешные ответы
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Сетевой запрос не удался, пробуем кэш:', request.url);
    
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Если это HTML запрос и нет в кэше, возвращаем index.html для SPA
    if (isHtmlRequest(request.url)) {
      const indexResponse = await cache.match('/index.html');
      if (indexResponse) {
        return indexResponse;
      }
    }
    
    throw error;
  }
}

// Стратегия кэширования: Cache First (для статики)
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Ошибка загрузки ресурса:', request.url, error);
    throw error;
  }
}

// Событие перехвата запросов
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // ВАЖНО: Полностью пропускаем внешние API запросы мимо Service Worker
  // Это необходимо для корректной работы CORS и избежания проблем с таймаутами
  if (isExternalApiRequest(request.url)) {
    // Не перехватываем запрос, позволяем браузеру обработать его напрямую
    return;
  }
  
  // Для статических ресурсов используем Cache First
  if (isStaticResource(request.url)) {
    event.respondWith(cacheFirst(request, CACHE_NAME));
    return;
  }
  
  // Для HTML и навигационных запросов используем Network First
  if (isHtmlRequest(request.url) || request.mode === 'navigate') {
    event.respondWith(networkFirst(request, CACHE_NAME));
    return;
  }
  
  // Для остальных запросов используем Network First
  event.respondWith(networkFirst(request, CACHE_NAME));
});

// Обработка сообщений от клиента
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    const urls = event.data.urls || [];
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(urls);
      })
    );
  }
});

