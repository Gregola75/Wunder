/*
 * cloud.js — Cuentas, login obligatorio y sincronización en la nube (Supabase).
 *
 * - Para usar la app hay que entrar (pantalla de bienvenida #welcome).
 * - Al entrar, descargamos tu álbum y lo FUSIONAMOS con lo local (en las
 *   cantidades nos quedamos con el mayor, así nunca pierdes cromos).
 * - Al cambiar algo, subimos el estado a la nube con un pequeño retardo.
 *
 * Si Supabase no está disponible (sin internet al cargar la librería), la app
 * NO se bloquea: funciona en modo local como antes (red de seguridad).
 */
(function () {
  "use strict";

  var cfg = window.WUNDER_CONFIG || {};
  if (!window.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
    console.warn("Supabase no disponible: la app funciona en modo local (sin candado).");
    window.Cloud = { onLocalChange: function () {}, isOnline: function () { return false; } };
    return; // No bloqueamos: la pantalla de bienvenida queda oculta.
  }

  var sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  var session = null;
  var pushTimer = null;
  var statusText = "local";

  // Colección activa + cachés por-colección (la nube guarda un mapa por álbum).
  var ACTIVE = (window.COLLECTIONS && window.COLLECTIONS.active) || "wc2026";
  var cloudAlbums = {};   // { collectionId: state }
  var marketMine = {};    // { collectionId: { code: {mode,price,spare} } }

  // La nube antes guardaba el estado "plano" (solo wc2026). Lo convertimos a mapa.
  function albumsMap(data) {
    if (!data || typeof data !== "object") return {};
    if (data.counts || data.names || data.listings || data.settings) return { wc2026: data };
    return data;
  }
  function marketMap(listings) {
    if (!listings || typeof listings !== "object") return {};
    var keys = Object.keys(listings);
    if (!keys.length) return {};
    var first = listings[keys[0]];
    if (first && (first.mode !== undefined || first.price !== undefined || first.spare !== undefined)) {
      return { wc2026: listings }; // formato antiguo (plano) = wc2026
    }
    return listings;
  }

  // ---------- utilidades ----------
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
  function msg(p, t, isErr) {
    var m = document.getElementById(p + "-msg");
    if (m) { m.textContent = t; m.className = "acc-msg" + (isErr ? " err" : ""); }
  }

  // Formulario de entrar / crear cuenta reutilizable (prefijo de ids).
  function authFormHTML(p) {
    return (
      '<input id="' + p + '-email" type="email" placeholder="Tu email" autocomplete="email" />' +
      '<input id="' + p + '-pass" type="password" placeholder="Contraseña (mín. 6)" autocomplete="current-password" />' +
      '<div class="acc-actions">' +
        '<button class="acc-primary" data-auth="in" data-p="' + p + '">Entrar</button>' +
        '<button data-auth="up" data-p="' + p + '">Crear cuenta</button>' +
      '</div>' +
      '<div class="acc-msg" id="' + p + '-msg"></div>'
    );
  }

  // ---------- pantalla de bienvenida (candado) ----------
  function renderWelcome() {
    var host = document.getElementById("welcome-auth");
    if (!host || session) return;
    host.innerHTML = authFormHTML("w");
  }

  // ---------- bloque de cuenta dentro del menú de opciones ----------
  function renderAccountBox() {
    var b = document.getElementById("account-box");
    if (!b) return;
    if (session && session.user) {
      b.innerHTML =
        '<div class="acc-title">☁️ Tu cuenta</div>' +
        '<div class="acc-email">' + esc(session.user.email || "") + '</div>' +
        '<div class="acc-status" id="acc-status">Estado: ' + esc(statusText) + '</div>' +
        '<button id="acc-signout" class="sheet-close">Cerrar sesión</button>';
      // Conexión directa (la hoja de opciones frena los clics globales).
      var so = document.getElementById("acc-signout");
      if (so) so.addEventListener("click", signOut);
    } else {
      b.innerHTML = '<div class="acc-help">No has iniciado sesión.</div>';
    }
  }

  // ---------- candado: mostrar app sólo si hay sesión ----------
  function applyGate() {
    var w = document.getElementById("welcome");
    if (session) {
      if (w) w.hidden = true;
      document.body.classList.remove("locked");
    } else {
      if (w) w.hidden = false;
      document.body.classList.add("locked");
      renderWelcome();
    }
  }

  function traduce(m) {
    m = m || "";
    if (/Invalid login/i.test(m)) return "Email o contraseña incorrectos.";
    if (/already registered|already been registered/i.test(m)) return "Ese email ya tiene cuenta. Pulsa Entrar.";
    if (/at least 6|Password should be/i.test(m)) return "La contraseña debe tener al menos 6 caracteres.";
    if (/Email not confirmed/i.test(m)) return "Tienes que confirmar tu email antes de entrar (mira tu correo).";
    if (/valid email|invalid format/i.test(m)) return "Escribe un email válido.";
    return m;
  }

  function doAuth(p, mode) {
    var emEl = document.getElementById(p + "-email");
    var pwEl = document.getElementById(p + "-pass");
    var email = (emEl && emEl.value || "").trim();
    var pass = (pwEl && pwEl.value || "");
    if (!email || !pass) { msg(p, "Escribe tu email y contraseña.", true); return; }
    msg(p, mode === "up" ? "Creando cuenta…" : "Entrando…");
    var prom = mode === "up"
      ? sb.auth.signUp({ email: email, password: pass })
      : sb.auth.signInWithPassword({ email: email, password: pass });
    prom.then(function (res) {
      if (res.error) { msg(p, traduce(res.error.message), true); return; }
      if (!res.data.session && res.data.user) {
        msg(p, "Cuenta creada. Revisa tu email para confirmar y luego pulsa Entrar.", false);
        return;
      }
      // Con sesión: onAuthStateChange quita el candado y sincroniza.
    }).catch(function () { msg(p, "No se pudo conectar. Revisa tu internet.", true); });
  }

  function signOut() {
    var bd = document.getElementById("menu-backdrop");
    if (bd) bd.hidden = true; // cierra el menú para que no tape la bienvenida
    sb.auth.signOut();
  }

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
    // Traemos mi álbum (mapa por colección) y mi fila de mercado (para conservar
    // las ofertas de otras colecciones al republicar).
    sb.from("albums").select("data").eq("user_id", session.user.id).maybeSingle()
      .then(function (res) {
        if (res.error) { console.warn(res.error); throw res.error; } // no seguimos: evitamos sobrescribir
        cloudAlbums = albumsMap(res.data && res.data.data);
        var merged = mergeStates(localState(), cloudAlbums[ACTIVE] || null);
        window.Store.importData(JSON.stringify(merged));
        refreshUI();
        // Cargamos mi mercado actual (todas las colecciones) antes de republicar.
        return sb.from("market").select("listings").eq("user_id", session.user.id).maybeSingle();
      })
      .then(function (mres) {
        if (mres && !mres.error) marketMine = marketMap(mres.data && mres.data.listings);
        push(true);
      })
      .catch(function (e) { setStatus("sin conexión"); console.warn(e); });
  }

  function push(immediate) {
    if (!session) return;
    if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; }
    function doIt() {
      var st = localState();
      cloudAlbums[ACTIVE] = st; // actualizamos solo la colección activa
      var row = {
        user_id: session.user.id,
        data: cloudAlbums,
        contact: (st.settings && st.settings.contact) || null,
        updated_at: new Date().toISOString(),
      };
      setStatus("guardando…");
      sb.from("albums").upsert(row).then(function (res) {
        setStatus(res.error ? "error al guardar" : "guardado ✓");
        if (res.error) console.warn(res.error);
      });
      // Además, publicamos en el MERCADO (repes ofrecidas + contacto).
      publishMarket(st);
    }
    if (immediate) doIt(); else pushTimer = setTimeout(doIt, 1500);
  }

  // Construye lo que se hace público: solo las repes marcadas como cambio/venta.
  function buildPublic(state) {
    state = state || {};
    var counts = state.counts || {}, listings = state.listings || {};
    var out = {};
    Object.keys(listings).forEach(function (code) {
      var spare = (counts[code] || 0) - 1;
      if (spare >= 1) {
        var l = listings[code] || {};
        out[code] = { mode: l.type || "cambio", price: (l.price == null ? null : l.price), spare: spare };
      }
    });
    return out;
  }

  function displayName() {
    var email = (session && session.user && session.user.email) || "";
    return email.split("@")[0] || "Coleccionista";
  }

  function publishMarket(st) {
    if (!session) return;
    marketMine[ACTIVE] = buildPublic(st); // ofertas de la colección activa
    var mrow = {
      user_id: session.user.id,
      display_name: displayName(),
      contact: (st.settings && st.settings.contact) || null,
      listings: marketMine,
      updated_at: new Date().toISOString(),
    };
    sb.from("market").upsert(mrow).then(function (res) {
      // Si la tabla aún no existe, no rompemos nada: solo avisamos en consola.
      if (res.error) console.warn("Mercado no disponible aún:", res.error.message);
    });
  }

  window.Cloud = {
    onLocalChange: function () { if (session) push(false); },
    isOnline: function () { return !!session; },
    myId: function () { return session && session.user ? session.user.id : null; },
    // Devuelve las ofertas de una fila de mercado para la colección activa.
    listingsFor: function (row) { return marketMap(row && row.listings)[ACTIVE] || {}; },
    // Lee las ofertas del resto de usuarios (no las tuyas).
    fetchMarket: function () {
      if (!session) return Promise.resolve([]);
      return sb.from("market")
        .select("user_id,display_name,contact,listings,updated_at")
        .neq("user_id", session.user.id)
        .then(function (res) {
          if (res.error) { console.warn(res.error); throw res.error; }
          return res.data || [];
        });
    },
  };

  // ---------- eventos (delegación, una sola vez) ----------
  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest("[data-auth]");
    if (btn) { doAuth(btn.getAttribute("data-p"), btn.getAttribute("data-auth")); return; }
    if (e.target && e.target.id === "acc-signout") { signOut(); }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    var t = e.target;
    if (t && /-(email|pass)$/.test(t.id || "")) {
      doAuth(t.id.replace(/-(email|pass)$/, ""), "in");
    }
  });

  // ---------- arranque y cambios de sesión ----------
  sb.auth.onAuthStateChange(function (event, sess) {
    session = sess;
    applyGate();
    renderAccountBox();
    if (event === "SIGNED_IN") pullMergePush();
    else if (event === "SIGNED_OUT") setStatus("local");
  });

  // Bloqueamos de inmediato hasta saber si hay sesión (evita ver la app un instante).
  document.body.classList.add("locked");
  sb.auth.getSession().then(function (r) {
    session = r.data.session;
    applyGate();
    renderAccountBox();
    if (session) pullMergePush(); else setStatus("local");
  });
})();
