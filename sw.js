// Offline-Speicher der App. Neue Version = neuer Name, alte Speicher werden gelöscht.
const CACHE = 'weltreise-ec856bbfca';
const WAIT_MS = 3000; // so lange wird bei schwachem Netz auf die neue Seite gewartet
const FILES = ["./","manifest.webmanifest","icon-192.png","icon-512.png"]; // dazu index.html als './'

self.addEventListener('install', (event) => {
  // cache: 'reload' umgeht den Browser-Zwischenspeicher, damit wirklich die neuen Dateien gespeichert werden.
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
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
    // Seite: erst aus dem Internet (neue Version). Ohne Internet, oder wenn es länger als 3 Sekunden dauert,
    // startet die gespeicherte Version. Die neue Seite wird dann im Hintergrund für das nächste Öffnen gespeichert.
    let saved = Promise.resolve();
    const network = fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        saved = caches.open(CACHE).then((c) => c.put('./', copy));
      }
      return response;
    });
    event.waitUntil(network.then(() => saved, () => {}));
    event.respondWith(
      new Promise((resolve) => {
        let answered = false;
        const answer = (r) => {
          if (!answered) {
            answered = true;
            resolve(r);
          }
        };
        const fromStore = () => caches.match('./');
        const timer = setTimeout(() => fromStore().then((hit) => hit && answer(hit)), WAIT_MS);
        network.then(
          (response) => {
            clearTimeout(timer);
            answer(response);
          },
          () => {
            clearTimeout(timer);
            fromStore().then((hit) => answer(hit || Response.error()));
          },
        );
      }),
    );
    return;
  }
  event.respondWith(caches.match(request).then((hit) => hit || fetch(request)));
});
