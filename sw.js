/**
 * Service Worker — Pose Detection App
 * Estrategia: cache-first para assets CDN; network-first para el propio index.html.
 * Tras la primera carga con conexión, la app funciona offline.
 */

const CACHE = 'pose-v2';

// Assets estáticos que se pre-cachean en el install
const PRE_CACHE = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/pose.js',
];

// ── Install: pre-cachear assets conocidos ──
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRE_CACHE))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: limpiar caches antiguas ──
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first (incluyendo assets dinámicos de MediaPipe) ──
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;

      return fetch(e.request).then(response => {
        // Cachear respuestas válidas (opaque = CDN cross-origin sin CORS)
        if (response && (response.status === 200 || response.type === 'opaque')) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // Sin conexión y sin caché: respuesta de error legible
        return new Response(
          JSON.stringify({ error: 'Sin conexión y recurso no cacheado' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      });
    })
  );
});
