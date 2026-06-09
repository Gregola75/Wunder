/*
 * sw.js — Service Worker de Swalbum (instalable + SIEMPRE fresco).
 *
 * - Navegaciones (HTML): siempre a la red sin caché (no-store) → nunca código viejo.
 * - Resto (js/css/imágenes con ?v=): network-first; si no hay internet, sirve la
 *   última copia cacheada (modo offline). Los recursos de terceros no se tocan.
 * - Al activarse una versión nueva, borra cachés antiguas.
 */
var CACHE = "swalbum-v54";
var SHELL = ["./", "./index.html", "./manifest.json",
  "./assets/logo/swalbum-mark.png", "./assets/logo/swalbum-lockup.png"];

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL).catch(function () {}); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // terceros (Supabase/CDN/fuentes): no tocar
  var isNav = req.mode === "navigate";
  e.respondWith(
    fetch(isNav ? new Request(req.url, { cache: "no-store" }) : req).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(req, copy); });
      return res;
    }).catch(function () {
      return caches.match(req).then(function (r) { return r || caches.match("./index.html"); });
    })
  );
});
