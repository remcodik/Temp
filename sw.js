// Service Worker — Lentse Plas Temperatuur Tracker
const CACHE = 'lentse-plas-__CACHE_VER__';  // Ingevuld door CI/CD bij elke deploy
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
];

// Install: cache bestanden — wacht op signaal van app voor activatie
self.addEventListener('install', ev => {
  ev.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
    // Geen skipWaiting() — gebruiker kiest zelf wanneer hij bijwerkt
  );
});

// Activate: verwijder oude caches
self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// App stuurt SKIP_WAITING bericht → nieuwe versie activeren
self.addEventListener('message', ev => {
  if (ev.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// Fetch: network-first voor app-bestanden, cache-first voor CDN
self.addEventListener('fetch', ev => {
  const url = ev.request.url;

  // Altijd netwerk voor Open-Meteo API
  if (url.includes('api.open-meteo.com')) {
    ev.respondWith(
      fetch(ev.request).catch(() =>
        new Response(JSON.stringify({ error: 'offline' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // Network-first voor eigen bestanden
  if (url.includes(self.location.origin) || url.startsWith('./')) {
    ev.respondWith(
      fetch(ev.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE).then(c => c.put(ev.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(ev.request).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Cache-first voor externe resources (Chart.js CDN)
  ev.respondWith(
    caches.match(ev.request).then(cached => {
      if (cached) return cached;
      return fetch(ev.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(ev.request, clone));
        }
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
