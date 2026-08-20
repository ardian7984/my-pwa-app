/* =====================================================================
   PENTING: naikkan angka versi di bawah ini SETIAP KALI Anda deploy
   perubahan kode ke GitHub. Ini yang memicu HP pengguna membuang cache
   lama dan mengambil file baru.
   ===================================================================== */
const CACHE_NAME = 'aplikasi-rt-cache-v10';

const APP_SHELL = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // File dari luar (CDN/font/library) biarkan lewat jaringan normal browser.
  if (new URL(req.url).origin !== self.location.origin) return;

  const isPageRequest =
    req.mode === 'navigate' ||
    req.url.endsWith('/index.html') ||
    req.url.endsWith('/');

  if (isPageRequest) {
    // NETWORK-FIRST: selalu coba ambil versi terbaru dari server dulu.
    // Kalau offline / gagal, baru pakai salinan dari cache.
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match('./index.html'))
        )
    );
    return;
  }

  // CACHE-FIRST untuk aset statis (ikon, manifest) + update cache di background.
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// Dipakai oleh index.html untuk memaksa SW baru langsung aktif.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
