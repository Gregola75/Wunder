/*
 * sw.js — Service Worker de Swalbum.
 *
 * Modo "siempre fresco": NO cachea (deja pasar a la red) para evitar quedarse
 * con versiones viejas. Mantiene la app instalable (PWA) y, al activarse una
 * versión nueva, borra cachés antiguas y recarga (controllerchange en la app).
 */
self.addEventListener("install", function () { self.skipWaiting(); });

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

// Sin respondWith: el navegador hace la petición normal (siempre a la red).
self.addEventListener("fetch", function () {});
