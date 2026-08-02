// Service Worker — Lentse Plas Temperatuur Tracker
const CACHE = 'lentse-plas-v20260802b';  // Update dit bij elke deploy
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/hammerjs@2.0.8/hammer.min.js',
  'https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom@2.0.1/dist/chartjs-plugin-zoom.min.js',
];

// Install: cache bestanden en meteen activeren (nieuwe versie direct actief,
// zodat gebruikers niet op een oude cache blijven hangen)
self.addEventListener('install', ev => {
  ev.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
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

  // Altijd netwerk, NOOIT cachen — API's én de dagelijkse databestanden.
  // water-temp.json / temp-history.json moeten altijd vers zijn, anders toont
  // de app een oude (gecachte) temperatuur die afwijkt van de site.
  if (
    url.includes('water-temp.json') ||
    url.includes('temp-history.json') ||
    url.includes('api.open-meteo.com') ||
    url.includes('googleapis.com') ||
    url.includes('firebaseio.com') ||
    url.includes('gstatic.com/firebasejs') ||
    url.includes('waterwebservices.rijkswaterstaat.nl') ||
    url.includes('ddapi20-waterwebservices.rijkswaterstaat.nl') ||
    url.includes('waterinfo.rws.nl')
  ) {
    ev.respondWith(fetch(ev.request));
    return;
  }

  // Network-first voor eigen bestanden (alleen GET)
  if (url.includes(self.location.origin) || url.startsWith('./')) {
    if (ev.request.method !== 'GET') return;
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

  // Cache-first voor externe resources (Chart.js CDN) — alleen GET
  if (ev.request.method !== 'GET') return;
  ev.respondWith(
    caches.match(ev.request).then(cached => {
      if (cached) return cached;
      return fetch(ev.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(ev.request, clone));
        }
        return response;
      });
    })
  );
});
