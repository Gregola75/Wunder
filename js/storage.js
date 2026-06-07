/*
 * storage.js — Persistencia local del progreso del álbum.
 *
 * Guarda en localStorage del navegador:
 *   - counts:  { stickerId: cantidad }  (0 = falta, 1 = tengo, 2+ = repetidas)
 *   - names:   { stickerId: nombrePersonalizado }  (renombrar jugadores)
 *
 * Todo vive en el dispositivo del usuario. Cuando añadamos cuentas y
 * trueque entre usuarios (fase 2) este módulo sincronizará con el servidor.
 */

(function () {
  "use strict";

  const KEY = "wunder.album.wc2026.v1";

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { counts: {}, names: {} };
      const data = JSON.parse(raw);
      return { counts: data.counts || {}, names: data.names || {} };
    } catch (e) {
      console.warn("No se pudo leer el progreso guardado:", e);
      return { counts: {}, names: {} };
    }
  }

  let state = load();

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("No se pudo guardar el progreso:", e);
    }
  }

  const Store = {
    // --- cantidades ---
    getCount: function (id) {
      return state.counts[id] || 0;
    },
    setCount: function (id, value) {
      const v = Math.max(0, value | 0);
      if (v === 0) {
        delete state.counts[id];
      } else {
        state.counts[id] = v;
      }
      persist();
      return v;
    },
    increment: function (id) {
      return this.setCount(id, this.getCount(id) + 1);
    },
    decrement: function (id) {
      return this.setCount(id, this.getCount(id) - 1);
    },

    // --- nombres personalizados ---
    getName: function (id, fallback) {
      return state.names[id] || fallback;
    },
    setName: function (id, name) {
      const clean = (name || "").trim();
      if (clean) {
        state.names[id] = clean;
      } else {
        delete state.names[id];
      }
      persist();
    },

    // --- utilidades ---
    reset: function () {
      state = { counts: {}, names: {} };
      persist();
    },
    exportData: function () {
      return JSON.stringify(state, null, 2);
    },
    importData: function (json) {
      const data = JSON.parse(json);
      state = { counts: data.counts || {}, names: data.names || {} };
      persist();
    },
  };

  window.Store = Store;
})();
