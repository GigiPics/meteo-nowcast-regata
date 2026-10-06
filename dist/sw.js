// SailWeather service worker — NETWORK-FIRST (per non restare bloccati su versioni vecchie).
// Prova sempre la rete; usa la cache solo come fallback offline. Così ogni deploy
// arriva subito, ma l'app resta usabile senza connessione in campo.
// Tieni allineato con APP_VERSION in index.html: cambiando il nome della cache
// il vecchio contenuto viene eliminato all'activate e il deploy arriva pulito.
const CACHE = 'sailweather-45.26-live-sources';
const SHELL = ['./', 'index.html', 'venues.json', 'manifest.json', 'icon.svg', 'currwind.js', 'auto-currwind.js', 'auto-forecast.js', 'compact-layout.css'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Non intercettare API meteo/marea/Claude né tile mappa: sempre rete diretta.
  if (url.origin !== self.location.origin || e.request.method !== 'GET' ||
      url.pathname.startsWith('/api/') ||
      /open-meteo\.com|anthropic\.com|nominatim|tile\.openstreetmap|tiles\.openseamap|tides4fishing|worldtides/.test(url.host + url.pathname)) {
    return;
  }
  // Asset dell'app: network-first, aggiorna la cache; fallback alla cache se offline.
  e.respondWith(
    fetch(e.request).then(res => {
      if (res && res.status === 200) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match(e.request).then(c => c || caches.match('index.html')))
  );
});
