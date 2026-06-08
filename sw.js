/*
 * sw.js — AUTODESTRUCTIVO.
 * Estábamos teniendo problemas de caché "pegada". Este service worker se
 * desregistra a sí mismo, borra todas las cachés y recarga las pestañas para
 * que SIEMPRE se cargue la versión más nueva desde la red. Sin caché.
 */
self.addEventListener("install", function () { self.skipWaiting(); });

self.addEventListener("activate", function (e) {
  e.waitUntil((async function () {
    try { await self.registration.unregister(); } catch (err) {}
    try {
      var keys = await caches.keys();
      await Promise.all(keys.map(function (k) { return caches.delete(k); }));
    } catch (err) {}
    try {
      var cs = await self.clients.matchAll({ type: "window" });
      cs.forEach(function (c) { try { c.navigate(c.url); } catch (e2) {} });
    } catch (err) {}
  })());
});

self.addEventListener("fetch", function () { /* passthrough: siempre red */ });
