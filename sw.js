// Offline-Speicher der App. Neue Version = neuer Name, alte Speicher werden gelöscht.
const CACHE = 'weltreise-6426f93a51';
const FILES = ["./","manifest.webmanifest","icon-192.png","icon-512.png"]; // dazu index.html als './'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (request.mode === 'navigate') {
    // Seite: erst aus dem Internet (neue Version), ohne Internet aus dem Speicher.
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((c) => c.put('./', copy));
          }
          return response;
        })
        .catch(() => caches.match('./')),
    );
    return;
  }
  event.respondWith(caches.match(request).then((hit) => hit || fetch(request)));
});
