/*
 * cloud.js — Cuentas y sincronización en la nube (Supabase).
 *
 * Filosofía: "offline-first". La app SIEMPRE funciona en local (localStorage).
 * Si inicias sesión, tu álbum se sincroniza con la nube y lo puedes ver en
 * cualquier dispositivo. Si no hay internet o no has entrado, todo sigue
 * funcionando igual que antes.
 *
 * Sincronización:
 *   - Al entrar: descargamos tu álbum de la nube y lo FUSIONAMOS con el local
 *     (en las cantidades nos quedamos con el mayor, así nunca pierdes cromos).
 *   - Al cambiar algo: subimos el estado a la nube (con un pequeño retardo
 *     para no saturar).
 *
 * Guardamos todo el estado en una fila por usuario (tabla "albums", columna
 * "data" de tipo jsonb). Es simple y robusto para esta fase.
 */
(function () {
  "use strict";

  var cfg = window.WUNDER_CONFIG || {};
  if (!window.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
    console.warn("Supabase no disponible: la app funciona en modo local.");
    // Aun así dejamos un Cloud "vacío" para que storage.js no falle.
    window.Cloud = { onLocalChange: function () {}, isOnline: function () { return false; } };
    return;
  }

  var sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  var session = null;
  var pushTimer = null;
  var statusText = "local";

  // ---------- utilidades ----------
  function box() { return document.getElementById("account-box"); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
  }
  function setStatus(t) {
    statusText = t;
    var a = document.getElementById("acc-status");
    if (a) a.textContent = "Estado: " + t;
    var f = document.getElementById("cloud-status");
    if (f) f.textContent = session ? "☁️ " + t : "";
  }
  function msg(t, isErr) {
    var m = document.getElementById("acc-msg");
    if (m) { m.textContent = t; m.className = "acc-msg" + (isErr ? " err" : ""); }
  }

  // ---------- pintar el bloque de cuenta dentro del menú ----------
  function render() {
    var b = box();
    if (!b) return;
    if (session && session.user) {
      b.innerHTML =
        '<div class="acc-title">☁️ Tu cuenta</div>' +
        '<div class="acc-email">' + esc(session.user.email || "") + '</div>' +
        '<div class="acc-status" id="acc-status">Estado: ' + esc(statusText) + '</div>' +
        '<button id="acc-signout" class="sheet-close">Cerrar sesión</button>';
      document.getElementById("acc-signout").addEventListener("click", signOut);
    } else {
      b.innerHTML =
        '<div class="acc-title">☁️ Cuenta y nube</div>' +
        '<p class="acc-help">Entra para guardar tu álbum en la nube y verlo en cualquier dispositivo.</p>' +
        '<input id="acc-email" type="email" placeholder="Tu email" autocomplete="email" />' +
        '<input id="acc-pass" type="password" placeholder="Contraseña (mín. 6)" autocomplete="current-password" />' +
        '<div class="acc-actions">' +
          '<button id="acc-login" class="acc-primary">Entrar</button>' +
          '<button id="acc-signup">Crear cuenta</button>' +
        '</div>' +
        '<div class="acc-msg" id="acc-msg"></div>';
      document.getElementById("acc-login").addEventListener("click", function () { doAuth("in"); });
      document.getElementById("acc-signup").addEventListener("click", function () { doAuth("up"); });
    }
  }

  function traduce(m) {
    m = m || "";
    if (/Invalid login/i.test(m)) return "Email o contraseña incorrectos.";
    if (/already registered|already been registered/i.test(m)) return "Ese email ya tiene cuenta. Pulsa Entrar.";
    if (/at least 6|Password should be/i.test(m)) return "La contraseña debe tener al menos 6 caracteres.";
    if (/Email not confirmed/i.test(m)) return "Tienes que confirmar tu email antes de entrar (mira tu correo).";
    return m;
  }

  function doAuth(mode) {
    var emEl = document.getElementById("acc-email");
    var pwEl = document.getElementById("acc-pass");
    var email = (emEl && emEl.value || "").trim();
    var pass = (pwEl && pwEl.value || "");
    if (!email || !pass) { msg("Escribe tu email y contraseña.", true); return; }
    msg(mode === "up" ? "Creando cuenta…" : "Entrando…");
    var p = mode === "up"
      ? sb.auth.signUp({ email: email, password: pass })
      : sb.auth.signInWithPassword({ email: email, password: pass });
    p.then(function (res) {
      if (res.error) { msg(traduce(res.error.message), true); return; }
      // Si no hay sesión pero sí usuario => falta confirmar el email.
      if (!res.data.session && res.data.user) {
        msg("Cuenta creada. Revisa tu email para confirmar y luego pulsa Entrar.", false);
        return;
      }
      // Con sesión: onAuthStateChange hará el resto (fusionar y sincronizar).
    }).catch(function () { msg("No se pudo conectar. Revisa tu internet.", true); });
  }

  function signOut() { sb.auth.signOut(); }

  // ---------- sincronización ----------
  function localState() {
    try { return JSON.parse(window.Store.exportData()); }
    catch (e) { return { counts: {}, names: {}, listings: {}, settings: {} }; }
  }

  function mergeStates(local, cloud) {
    local = local || {}; cloud = cloud || {};
    var out = { counts: {}, names: {}, listings: {}, settings: {} };
    var codes = {};
    Object.keys(local.counts || {}).forEach(function (k) { codes[k] = 1; });
    Object.keys(cloud.counts || {}).forEach(function (k) { codes[k] = 1; });
    Object.keys(codes).forEach(function (k) {
      out.counts[k] = Math.max((local.counts || {})[k] || 0, (cloud.counts || {})[k] || 0);
    });
    // En nombres/anuncios/ajustes: lo local manda sobre lo de la nube.
    out.names = Object.assign({}, cloud.names || {}, local.names || {});
    out.listings = Object.assign({}, cloud.listings || {}, local.listings || {});
    out.settings = Object.assign({}, cloud.settings || {}, local.settings || {});
    return out;
  }

  function refreshUI() {
    if (window.WunderApp && window.WunderApp.render) window.WunderApp.render();
    var contact = document.getElementById("contact-input");
    if (contact) contact.value = window.Store.getSetting("contact", "");
  }

  function pullMergePush() {
    if (!session) return;
    setStatus("sincronizando…");
    sb.from("albums").select("data").eq("user_id", session.user.id).maybeSingle()
      .then(function (res) {
        if (res.error) { setStatus("error al sincronizar"); console.warn(res.error); return; }
        var cloud = res.data && res.data.data ? res.data.data : null;
        var merged = mergeStates(localState(), cloud);
        window.Store.importData(JSON.stringify(merged));
        refreshUI();
        push(true); // sube el estado fusionado de inmediato
      })
      .catch(function (e) { setStatus("sin conexión"); console.warn(e); });
  }

  function push(immediate) {
    if (!session) return;
    if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; }
    function doIt() {
      var st = localState();
      var row = {
        user_id: session.user.id,
        data: st,
        contact: (st.settings && st.settings.contact) || null,
        updated_at: new Date().toISOString(),
      };
      setStatus("guardando…");
      sb.from("albums").upsert(row).then(function (res) {
        setStatus(res.error ? "error al guardar" : "guardado ✓");
        if (res.error) console.warn(res.error);
      });
    }
    if (immediate) doIt(); else pushTimer = setTimeout(doIt, 1500);
  }

  // API que usa storage.js para avisar de cambios locales.
  window.Cloud = {
    onLocalChange: function () { if (session) push(false); },
    isOnline: function () { return !!session; },
  };

  // ---------- arranque y cambios de sesión ----------
  sb.auth.onAuthStateChange(function (event, sess) {
    session = sess;
    render();
    if (event === "SIGNED_IN") { pullMergePush(); }
    else if (event === "SIGNED_OUT") { setStatus("local"); }
  });

  document.addEventListener("DOMContentLoaded", function () {
    sb.auth.getSession().then(function (r) {
      session = r.data.session;
      render();
      if (session) pullMergePush(); else setStatus("local");
    });
  });
})();
