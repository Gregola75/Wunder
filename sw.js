/*
 * sw.js — Service Worker de Swalbum (PWA instalable + caché).
 *
 * Estrategia "network-first" para lo propio: siempre intenta la versión más
 * nueva (evita quedarse con código viejo) y, si no hay internet, sirve lo
 * cacheado. Los recursos de terceros (Supabase, CDN, fuentes) no se interceptan.
 */
var CACHE = "swalbum-cache-v1";
var SHELL = ["./", "./index.html", "./manifest.json", "./assets/logo/swalbum-mark.png"];

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
  if (url.origin !== self.location.origin) return; // no tocar terceros (Supabase/CDN/fuentes)
  e.respondWith(
    fetch(req).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(req, copy); });
      return res;
    }).catch(function () {
      return caches.match(req).then(function (r) { return r || caches.match("./index.html"); });
    })
  );
});
