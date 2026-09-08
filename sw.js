const CACHE_NAME = 'dakheel-v17';
const PRECACHE_URLS = [
  'index.html',
  'manifest.json',
  'auth-sync.js',
  'assets/icons/icon.svg',
  'assets/fonts/Qw3cZQlNHiblL3jPlNFOG-AMCmR8.woff2',
  'assets/fonts/Qw3cZQlNHiblL3jPn9FOG-AMCmR8.woff2',
  'assets/fonts/Qw3cZQlNHiblL3jPkdFOG-AMCg.woff2',
  'assets/fonts/Iura6YBj_oCad4k1nzSBC5xLhLFw4Q.woff2',
  'assets/fonts/Iura6YBj_oCad4k1nzGBC5xLhLE.woff2',
  'assets/fonts/Iurf6YBj_oCad4k1l8KiHrRpiZtK6GwN9w.woff2',
  'assets/fonts/Iurf6YBj_oCad4k1l8KiHrFpiZtK6Gw.woff2',
  'assets/fonts/Iurf6YBj_oCad4k1l4qkHrRpiZtK6GwN9w.woff2',
  'assets/fonts/Iurf6YBj_oCad4k1l4qkHrFpiZtK6Gw.woff2',
  'assets/fonts/Iurf6YBj_oCad4k1l7KmHrRpiZtK6GwN9w.woff2',
  'assets/fonts/Iurf6YBj_oCad4k1l7KmHrFpiZtK6Gw.woff2'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isShellAsset(url) {
  const p = url.pathname;
  return p === '/' || p.endsWith('/index.html') || p.endsWith('/auth-sync.js') || p.endsWith('/sw.js') || p.endsWith('/manifest.json');
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }
  // Network-first for app shell so content/auth updates are not stuck on old SW caches
  if (isShellAsset(url)) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
