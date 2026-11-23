/* ==========================================
   SERVICE WORKER - KASSAKU OFFLINE CACHE
   ========================================== */
const CACHE_NAME = 'kassaku-cache-v1';

// Daftar file inti yang disimpan agar bisa dibuka offline
const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// 1. Tahap Install: simpan aset inti ke cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS);
    })
  );
  // Aktifkan service worker baru lebih cepat
  self.skipWaiting();
});

// 2. Tahap Activate: hapus cache versi lama jika nama CACHE_NAME diubah
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((oldCache) => caches.delete(oldCache))
      );
    })
  );
  self.clients.claim();
});

// 3. Tahap Fetch: ambil dari cache dulu, lalu fallback ke jaringan (network)
self.addEventListener('fetch', (event) => {
  // Hanya tangani request GET dari origin yang sama
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          // Simpan salinan file baru ke cache jika respons valid
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === 'basic'
          ) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Jika offline dan halaman diminta, kembalikan index.html dari cache
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('Konten tidak tersedia secara offline.', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
    })
  );
});
