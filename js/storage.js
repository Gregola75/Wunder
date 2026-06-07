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

  const KEY = "wunder.album.wc2026.v2";     // nuevo formato (por código)
  const OLD_KEY = "wunder.album.wc2026.v1"; // formato viejo (por posición)

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

  // Convierte datos viejos (claves sNN por posición) a claves por código.
  function migrateOld(old) {
    const A = window.ALBUM;
    const out = empty();
    if (!A) return out;
    function conv(obj, dest) {
      Object.keys(obj || {}).forEach(function (id) {
        const st = A.byId[id];
        const code = st ? st.code : id; // si no se encuentra, deja la clave
        dest[code] = obj[id];
      });
    }
    conv(old.counts, out.counts);
    conv(old.names, out.names);
    return out;
  }

  function load() {
    const current = read(KEY);
    if (current) {
      return Object.assign(empty(), current, {
        counts: current.counts || {},
        names: current.names || {},
        listings: current.listings || {},
        settings: current.settings || {},
      });
    }
    // No hay datos nuevos: ¿hay datos viejos que migrar?
    const old = read(OLD_KEY);
    if (old && (old.counts || old.names)) {
      const migrated = migrateOld(old);
      try { localStorage.setItem(KEY, JSON.stringify(migrated)); } catch (e) {}
      // OJO: NO borramos OLD_KEY; queda como respaldo de seguridad.
      console.info("Datos migrados al nuevo formato (por código). Respaldo viejo conservado.");
      return migrated;
    }
    return empty();
  }

  let state = load();

  function persist() {
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
    setListing: function (id, type, price) {
      const code = codeFor(id);
      if (!type) {
        delete state.listings[code];
      } else {
        const p = price == null || price === "" ? null : Math.max(0, Number(price) || 0);
        state.listings[code] = { type: type, price: p };
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
