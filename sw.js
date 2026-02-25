// Service Worker — Lentse Plas Temperatuur Tracker
const CACHE = 'lentse-plas-v4';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
];

// Install: cache alle bestanden + activeer direct
self.addEventListener('install', ev => {
  ev.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())  // wacht niet op oude tabs
  );
});

// Activate: verwijder oude caches + claim alle open tabs direct
self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())  // nieuwe SW neemt direct over
  );
});

// Na activeren: stuur alle open tabs een reload-signaal
self.addEventListener('activate', () => {
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    clients.forEach(client => client.postMessage({ type: 'SW_UPDATED' }));
  });
});

// Fetch: network-first voor app-bestanden zodat updates direct zichtbaar zijn
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

  // Network-first voor eigen bestanden (index.html, manifest.json)
  // → nieuwe versie komt altijd direct binnen
  // → bij geen internet valt het terug op de cache
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
