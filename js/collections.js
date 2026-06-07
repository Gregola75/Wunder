/*
 * collections.js — Catálogo de colecciones (familias → ediciones).
 *
 * Swalbum es multi-colección: cada FAMILIA (Copa del Mundo, La Liga, …) tiene
 * varias EDICIONES (subcolecciones), p. ej. Mundial 2010, 2014, 2018…
 * El usuario ACTIVA una edición y toda la app trabaja sobre ella.
 *
 * Estado de cada edición:
 *   - "ready" : datos cargados y verificados (jugable).
 *   - "soon"  : próximamente (la añadiremos con checklist de fuentes fiables).
 *
 * Por ahora solo "wc2026" está lista. Las demás aparecen como "Próximamente".
 */
(function () {
  "use strict";

  var KEY = "swalbum.active";

  var families = [
    {
      id: "worldcup", name: "Copa del Mundo", emoji: "🌍",
      editions: [
        { id: "wc2026", title: "Mundial 2026", sub: "Canadá · EE.UU. · México", status: "ready" },
        { id: "wc2022", title: "Mundial 2022", sub: "Catar", status: "soon" },
        { id: "wc2018", title: "Mundial 2018", sub: "Rusia", status: "soon" },
        { id: "wc2014", title: "Mundial 2014", sub: "Brasil", status: "soon" },
        { id: "wc2010", title: "Mundial 2010", sub: "Sudáfrica", status: "soon" },
      ],
    },
    {
      id: "laliga", name: "La Liga", emoji: "🇪🇸",
      editions: [
        { id: "laliga-este", title: "La Liga Este / Panini", sub: "Temporada actual", status: "soon" },
      ],
    },
    {
      id: "adrenalyn", name: "Adrenalyn XL", emoji: "⚡",
      editions: [
        { id: "adrenalyn", title: "Adrenalyn XL", sub: "Liga · Champions · Mundial", status: "soon" },
      ],
    },
    {
      id: "megacracks", name: "Mega Cracks", emoji: "⭐",
      editions: [
        { id: "megacracks", title: "Mega Cracks", sub: "Liga española", status: "soon" },
      ],
    },
    {
      id: "champions", name: "Champions League", emoji: "🏆",
      editions: [
        { id: "champions", title: "Champions League", sub: "UEFA", status: "soon" },
      ],
    },
  ];

  function all() {
    var out = [];
    families.forEach(function (f) {
      f.editions.forEach(function (e) {
        out.push({ id: e.id, title: e.title, sub: e.sub, status: e.status, family: f.name, familyId: f.id, emoji: f.emoji });
      });
    });
    return out;
  }
  function find(id) {
    var list = all();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  var active = null;
  try { active = localStorage.getItem(KEY); } catch (e) {}
  if (!active || !find(active) || find(active).status !== "ready") active = "wc2026";

  window.COLLECTIONS = {
    families: families,
    active: active,
    all: all,
    find: find,
    setActive: function (id) {
      window.COLLECTIONS.active = id;
      try { localStorage.setItem(KEY, id); } catch (e) {}
    },
  };
})();
