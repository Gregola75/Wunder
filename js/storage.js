/*
 * storage.js — Persistencia local del progreso del álbum (a prueba de balas).
 *
 * Guarda en localStorage usando el CÓDIGO PANINI de cada cromo (ARG10, FWC1,
 * 00, CC1...) en lugar de la posición. Así, aunque cambie la estructura del
 * álbum, tus marcas nunca se desalinean.
 *
 *   - counts:   { code: cantidad }   (0 = falta, 1 = tengo, 2+ = repetidas)
 *   - names:    { code: nombre }     (renombrar cromos)
 *   - listings: { code: { type, price } }  (type: "cambio" | "venta")
 *   - settings: { contact, ... }     (datos del usuario, p. ej. contacto)
 *
 * Migra automáticamente los datos antiguos (guardados por posición sNN) sin
 * borrarlos: conserva la versión vieja como respaldo.
 */

(function () {
  "use strict";

  // El progreso se guarda POR USUARIO y por colección: cada cuenta tiene su
  // propio "cajón" en el dispositivo, para que en un mismo móvil dos correos
  // distintos NO compartan los cromos. Al entrar, manda la nube de ESA cuenta.
  const ACTIVE = (window.COLLECTIONS && window.COLLECTIONS.active) || "wc2026";
  let CURRENT_UID = null;
  let KEY = null;

  function empty() {
    return { counts: {}, names: {}, listings: {}, settings: {} };
  }

  // Traduce un id de cromo (s5) a su código Panini (ARG10). Si ya es un
  // código, lo devuelve tal cual.
  function codeFor(idOrCode) {
    const A = window.ALBUM;
    if (A && A.byId[idOrCode]) return A.byId[idOrCode].code;
    return idOrCode;
  }

  function read(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn("No se pudo leer", key, e);
      return null;
    }
  }

  function normalize(obj) {
    return Object.assign(empty(), obj || {}, {
      counts: (obj && obj.counts) || {},
      names: (obj && obj.names) || {},
      listings: (obj && obj.listings) || {},
      settings: (obj && obj.settings) || {},
    });
  }

  // Estado vacío hasta que un usuario inicie sesión (Cloud llama a useUser).
  let state = empty();

  function persist() {
    if (!KEY) return; // sin usuario activo no guardamos en el dispositivo
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("No se pudo guardar el progreso:", e);
    }
    // Si hay sesión en la nube, avisa para subir el cambio (offline-first).
    try { if (window.Cloud && window.Cloud.onLocalChange) window.Cloud.onLocalChange(); }
    catch (e) {}
  }

  const Store = {
    // Cambia el usuario activo: carga su cajón propio (o vacío si no hay sesión).
    useUser: function (uid) {
      CURRENT_UID = uid || null;
      KEY = CURRENT_UID ? ("swalbum.u_" + CURRENT_UID + "." + ACTIVE + ".v2") : null;
      state = KEY ? normalize(read(KEY)) : empty();
      return state;
    },

    // --- cantidades ---
    getCount: function (id) {
      return state.counts[codeFor(id)] || 0;
    },
    setCount: function (id, value) {
      const code = codeFor(id);
      const v = Math.max(0, value | 0);
      if (v === 0) delete state.counts[code];
      else state.counts[code] = v;
      // Si ya no hay repetidas, retira el anuncio de cambio/venta.
      if (v < 2 && state.listings[code]) delete state.listings[code];
      persist();
      return v;
    },
    increment: function (id) { return this.setCount(id, this.getCount(id) + 1); },
    decrement: function (id) { return this.setCount(id, this.getCount(id) - 1); },

    // --- nombres personalizados ---
    getName: function (id, fallback) {
      return state.names[codeFor(id)] || fallback;
    },
    setName: function (id, name) {
      const code = codeFor(id);
      const clean = (name || "").trim();
      if (clean) state.names[code] = clean;
      else delete state.names[code];
      persist();
    },

    // --- anuncios de cambio / venta ---
    getListing: function (id) {
      return state.listings[codeFor(id)] || null;
    },
    setListing: function (id, type, price, cond) {
      const code = codeFor(id);
      if (!type) {
        delete state.listings[code];
      } else {
        const prev = state.listings[code] || {};
        const p = price == null || price === "" ? null : Math.max(0, Number(price) || 0);
        // cond = condición del cambio: 1 = trato simple (1x1), 2..6 = pide N a cambio.
        let c = cond == null ? (prev.cond || 1) : Math.max(1, Math.min(6, cond | 0));
        state.listings[code] = { type: type, price: p, cond: c };
      }
      persist();
    },

    // --- ajustes del usuario (contacto, etc.) ---
    getSetting: function (key, fallback) {
      return state.settings[key] != null ? state.settings[key] : fallback;
    },
    setSetting: function (key, value) {
      if (value == null || value === "") delete state.settings[key];
      else state.settings[key] = value;
      persist();
    },

    // --- utilidades ---
    reset: function () { state = empty(); persist(); },
    exportData: function () { return JSON.stringify(state, null, 2); },
    importData: function (json) {
      const data = JSON.parse(json);
      state = Object.assign(empty(), {
        counts: data.counts || {},
        names: data.names || {},
        listings: data.listings || {},
        settings: data.settings || {},
      });
      persist();
    },
  };

  window.Store = Store;
})();
