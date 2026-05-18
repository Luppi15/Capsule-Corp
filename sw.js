const CACHE = 'capsule-corp-v1';

const ASSETS = [
  '/Capsule-Corp/',
  '/Capsule-Corp/index.html',
  '/Capsule-Corp/style.css',
  '/Capsule-Corp/script.js',
  '/Capsule-Corp/manifest.json',
  '/Capsule-Corp/favicon.ico',
  '/Capsule-Corp/icons/icon-48x48.png',
  '/Capsule-Corp/icons/icon-72x72.png',
  '/Capsule-Corp/icons/icon-96x96.png',
  '/Capsule-Corp/icons/icon-128x128.png',
  '/Capsule-Corp/icons/icon-192x192.png',
  '/Capsule-Corp/icons/icon-256x256.png',
  '/Capsule-Corp/icons/icon-384x384.png',
  '/Capsule-Corp/icons/icon-512x512.png',
  'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,600;9..144,800&family=JetBrains+Mono:wght@400;500;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
];

// Instala e pré-carrega os assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Remove caches antigas
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Cache-first: serve do cache, atualiza em background
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Não intercepta chamadas à API de tradução (precisam de rede)
  if (url.includes('mymemory.translated.net')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const networkFetch = fetch(e.request).then(response => {
        if (e.request.method === 'GET' && response.status === 200) {
          caches.open(CACHE).then(c => c.put(e.request, response.clone()));
        }
        return response;
      }).catch(() => null);

      return cached || networkFetch || (
        e.request.mode === 'navigate'
          ? caches.match('/Capsule-Corp/index.html')
          : new Response('Offline', { status: 503 })
      );
    })
  );
});
