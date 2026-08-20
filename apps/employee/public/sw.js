/**
 * Service Worker do Kairos Ponto (PWA).
 *
 * Estratégia:
 *  - Cache-first para assets estáticos e modelos de IA
 *  - Network-first para chamadas de API (com fallback pra IndexedDB queue)
 *  - Network-first para HTML (sempre tenta online, fallback pro shell)
 *
 * Versão: atualize este número quando mudar o cache.
 */
const CACHE_VERSION = 'kairos-ponto-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const MODEL_CACHE = `${CACHE_VERSION}-models`;

const STATIC_ASSETS = [
  '/',
  '/login',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// Install
self.addEventListener('install', (event) => {
  console.log('[SW] Installing');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {})),
  );
  self.skipWaiting();
});

// Activate
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

// Fetch
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora outras origens
  if (url.origin !== location.origin) return;

  // API: network-first, sem cache (sempre tenta fresh)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/api')) {
    event.respondWith(networkOnly(request));
    return;
  }

  // Modelos de IA: cache-first
  if (url.pathname.startsWith('/models/')) {
    event.respondWith(cacheFirst(MODEL_CACHE, request));
    return;
  }

  // Assets estáticos (build do Next): cache-first
  if (url.pathname.startsWith('/_next/') || url.pathname.match(/\.(js|css|woff|woff2|ttf|png|jpg|svg|ico)$/)) {
    event.respondWith(cacheFirst(STATIC_CACHE, request));
    return;
  }

  // HTML: network-first, fallback pro cache
  event.respondWith(networkFirst(STATIC_CACHE, request));
});

// --- Estratégias ---

async function cacheFirst(cacheName, request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, res.clone());
    }
    return res;
  } catch (err) {
    // Fallback: tenta no dynamic cache
    const dynamic = await caches.match(request);
    if (dynamic) return dynamic;
    throw err;
  }
}

async function networkFirst(cacheName, request) {
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, res.clone());
    }
    return res;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Fallback: shell offline
    if (request.mode === 'navigate') {
      return caches.match('/');
    }
    throw err;
  }
}

async function networkOnly(request) {
  return fetch(request);
}

// --- Background Sync (fallback se navegador suportar) ---

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-attendance') {
    console.log('[SW] Background sync: sync-attendance');
    event.waitUntil(notifyClientsToSync());
  }
});

async function notifyClientsToSync() {
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: 'SYNC_ATTENDANCE' });
  });
}

// --- Mensagens do app ---

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
