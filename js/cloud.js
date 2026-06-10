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
  var wantsMine = {};     // { collectionId: [codes que me faltan] }

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
      var av = document.getElementById("profile-avatar");
      if (av) av.textContent = (displayName().charAt(0) || "U").toUpperCase();
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
    var pn = document.getElementById("profile-name");
    if (pn) pn.value = window.Store.getSetting("name", "");
    var av = document.getElementById("profile-avatar");
    if (av) av.textContent = (displayName().charAt(0) || "U").toUpperCase();
    if (window.WunderApp && window.WunderApp.refreshTradesBadge) window.WunderApp.refreshTradesBadge();
    if (window.WunderApp && window.WunderApp.refreshFriendsBadge) window.WunderApp.refreshFriendsBadge();
    if (window.WunderApp && window.WunderApp.syncPrivacy) window.WunderApp.syncPrivacy();
  }

  function pullMergePush() {
    if (!session) return;
    // Cargamos el cajón LOCAL de ESTE usuario (no el del que usó antes el móvil).
    if (window.Store && window.Store.useUser) window.Store.useUser(session.user.id);
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
        return sb.from("market").select("listings,wants").eq("user_id", session.user.id).maybeSingle();
      })
      .then(function (mres) {
        if (mres && !mres.error) {
          marketMine = marketMap(mres.data && mres.data.listings);
          var w = mres.data && mres.data.wants;
          wantsMine = (w && typeof w === "object" && !Array.isArray(w)) ? w : {};
        }
        push(true);
        refreshLocked(); // oculta del mercado lo reservado en tratos aceptados
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

  // Cromos RESERVADOS (comprometidos en un trato aceptado): no se publican en
  // el mercado para que otros no los pidan estando ya cerrados. { coll: {code:1} }
  var lockedByColl = {};

  // Construye lo que se hace público: solo las repes marcadas como cambio/venta,
  // excluyendo las que están reservadas en un trato aceptado.
  function buildPublic(state) {
    state = state || {};
    var counts = state.counts || {}, listings = state.listings || {};
    var locked = lockedByColl[ACTIVE] || {};
    var out = {};
    Object.keys(listings).forEach(function (code) {
      if (locked[code]) return; // reservado: no se ofrece a otros
      var spare = (counts[code] || 0) - 1;
      if (spare >= 1) {
        var l = listings[code] || {};
        out[code] = { mode: l.type || "cambio", price: (l.price == null ? null : l.price), spare: spare, cond: l.cond || 1, photo: l.photo || null };
      }
    });
    return out;
  }

  // Recalcula los cromos reservados a partir de MIS tratos aceptados y
  // republica el mercado (oculta los comprometidos).
  function refreshLocked() {
    if (!session) return Promise.resolve();
    var uid = session.user.id;
    return sb.from("trades").select("collection,status,from_user,to_user,code,want,offer")
      .or("from_user.eq." + uid + ",to_user.eq." + uid).eq("status", "aceptada")
      .then(function (res) {
        if (res.error) throw res.error;
        var map = {};
        (res.data || []).forEach(function (t) {
          var coll = t.collection || "wc2026";
          var wants = (t.want && t.want.length) ? t.want : (t.code ? [t.code] : []);
          var give = (t.to_user === uid) ? wants : (t.from_user === uid ? (t.offer || []) : []);
          if (!map[coll]) map[coll] = {};
          give.forEach(function (c) { map[coll][c] = 1; });
        });
        lockedByColl = map;
        publishMarket(localState()); // republica sin los reservados
      }).catch(function (e) { console.warn("refreshLocked", e); });
  }

  // Lista de códigos que ME FALTAN (count 0) en la colección activa, para que
  // quien quiera un cromo mío vea qué ofrecerme a cambio.
  function buildWants(state) {
    var counts = (state && state.counts) || {};
    var out = [];
    var A = window.ALBUM;
    if (A && A.stickers) {
      A.stickers.forEach(function (s) { if ((counts[s.code] || 0) === 0) out.push(s.code); });
    }
    return out;
  }

  function displayName() {
    var n = (window.Store && window.Store.getSetting) ? (window.Store.getSetting("name", "") || "") : "";
    if (n) return n;
    var email = (session && session.user && session.user.email) || "";
    return email.split("@")[0] || "Coleccionista";
  }

  function publishMarket(st) {
    if (!session) return;
    // Privacidad: "privado" no publica nada; "todos"/"amigos" publican las repes
    // (en "amigos", solo tus amigos las verán — filtrado al leer el mercado).
    var privacy = (st.settings && st.settings.privacy) || "todos";
    marketMine[ACTIVE] = (privacy === "privado") ? {} : buildPublic(st);
    wantsMine[ACTIVE] = buildWants(st);
    var mrow = {
      user_id: session.user.id,
      display_name: displayName(),
      contact: (st.settings && st.settings.contact) || null,
      listings: marketMine,
      wants: wantsMine,
      privacy: privacy,
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
    // Cambia la contraseña del usuario logueado.
    changePassword: function (newPass) {
      if (!session) return Promise.reject(new Error("Sin sesión"));
      return sb.auth.updateUser({ password: newPass }).then(function (res) {
        if (res.error) throw res.error;
        return true;
      });
    },
    // Devuelve las ofertas de una fila de mercado para la colección activa.
    listingsFor: function (row) { return marketMap(row && row.listings)[ACTIVE] || {}; },
    // Devuelve los códigos que le faltan a ese usuario en la colección activa.
    wantsFor: function (row) {
      var w = row && row.wants;
      if (!w || typeof w !== "object") return [];
      return w[ACTIVE] || [];
    },
    // Lee las ofertas del resto de usuarios (no las tuyas).
    fetchMarket: function () {
      if (!session) return Promise.resolve([]);
      return sb.from("market")
        .select("user_id,display_name,contact,listings,wants,updated_at,privacy")
        .neq("user_id", session.user.id)
        .then(function (res) {
          if (res.error) { console.warn(res.error); throw res.error; }
          return res.data || [];
        });
    },
    // ---- Foto del estado del cromo (Supabase Storage) ----
    // Sube una imagen al bucket "cromos" en tu carpeta (uid) y devuelve su URL pública.
    uploadCromoPhoto: function (code, blob, contentType) {
      if (!session) return Promise.reject(new Error("Sin sesión"));
      if (!sb.storage) return Promise.reject(new Error("Storage no disponible"));
      var safe = String(code).replace(/[^A-Za-z0-9_-]/g, "");
      var path = session.user.id + "/" + ACTIVE + "/" + safe + "-" + Date.now() + ".jpg";
      return sb.storage.from("cromos").upload(path, blob, {
        upsert: true, contentType: contentType || "image/jpeg", cacheControl: "3600",
      }).then(function (res) {
        if (res.error) throw res.error;
        var pub = sb.storage.from("cromos").getPublicUrl(path);
        return (pub && pub.data && pub.data.publicUrl) || null;
      });
    },
    // ---- Tratos (transacciones) ----
    createTrade: function (t) {
      if (!session) return Promise.reject(new Error("Sin sesión"));
      var contact = (window.Store && window.Store.getSetting) ? (window.Store.getSetting("contact", "") || null) : null;
      // "want" = lista de cromos que pides (uno o varios). "code" = el primero,
      // para compatibilidad con la vista antigua.
      var wantArr = (t.want && t.want.length) ? t.want : (t.code ? [t.code] : []);
      var row = {
        from_user: session.user.id, to_user: t.toUser,
        collection: ACTIVE, code: wantArr[0] || t.code || null, mode: t.mode || "cambio",
        want: (wantArr.length ? wantArr : null),
        note: (t.note ? String(t.note).slice(0, 300) : null),
        price: (t.price == null ? null : t.price), cond: (t.cond == null ? 1 : t.cond),
        offer: (t.offer && t.offer.length ? t.offer : null),
        from_name: displayName(), from_contact: contact,
        to_name: t.toName || null, to_contact: t.toContact || null,
        status: "pendiente",
      };
      return sb.from("trades").insert(row).then(function (res) { if (res.error) throw res.error; return true; });
    },
    fetchTrades: function () {
      if (!session) return Promise.resolve([]);
      var uid = session.user.id;
      return sb.from("trades").select("*")
        .or("from_user.eq." + uid + ",to_user.eq." + uid)
        .order("updated_at", { ascending: false })
        .then(function (res) { if (res.error) { console.warn(res.error); throw res.error; } return res.data || []; });
    },
    setTradeStatus: function (id, status) {
      if (!session) return Promise.reject(new Error("Sin sesión"));
      return sb.from("trades").update({ status: status, updated_at: new Date().toISOString() }).eq("id", id)
        .then(function (res) { if (res.error) throw res.error; refreshLocked(); return true; });
    },
    // Recalcula y publica los cromos reservados (tratos aceptados).
    refreshLocked: function () { return refreshLocked(); },
    pendingTradesCount: function () {
      if (!session) return Promise.resolve(0);
      return sb.from("trades").select("id", { count: "exact", head: true })
        .eq("to_user", session.user.id).eq("status", "pendiente")
        .then(function (res) { return res.count || 0; }).catch(function () { return 0; });
    },
    // ---- Chat por trato ----
    fetchMessages: function (tradeId) {
      if (!session) return Promise.resolve([]);
      return sb.from("messages").select("*").eq("trade_id", tradeId)
        .order("created_at", { ascending: true })
        .then(function (res) { if (res.error) { console.warn(res.error); throw res.error; } return res.data || []; });
    },
    sendMessage: function (tradeId, toUser, text) {
      if (!session) return Promise.reject(new Error("Sin sesión"));
      return sb.from("messages").insert({ trade_id: tradeId, from_user: session.user.id, to_user: toUser, text: text })
        .then(function (res) { if (res.error) throw res.error; return true; });
    },
    subscribeMessages: function (tradeId, cb) {
      if (!sb.channel) return null;
      try {
        var ch = sb.channel("msg-" + tradeId).on("postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: "trade_id=eq." + tradeId },
          function (p) { cb(p.new); }).subscribe();
        return ch;
      } catch (e) { return null; }
    },
    unsubscribe: function (ch) { if (ch && sb.removeChannel) try { sb.removeChannel(ch); } catch (e) {} },
    unreadCount: function (since) {
      if (!session) return Promise.resolve(0);
      return sb.from("messages").select("id", { count: "exact", head: true })
        .eq("to_user", session.user.id).gt("created_at", since || "1970-01-01")
        .then(function (res) { return res.count || 0; }).catch(function () { return 0; });
    },
    // ---- Amigos ----
    fetchFriends: function () {
      if (!session) return Promise.resolve([]);
      var uid = session.user.id;
      return sb.from("friends").select("*").or("requester.eq." + uid + ",addressee.eq." + uid)
        .then(function (res) { if (res.error) { console.warn(res.error); throw res.error; } return res.data || []; });
    },
    sendFriendRequest: function (toUser, toName) {
      if (!session) return Promise.reject(new Error("Sin sesión"));
      var me = session.user.id;
      if (toUser === me) return Promise.reject(new Error("Eres tú"));
      // Antes de crear nada, miramos si YA hay una relación entre los dos
      // (en cualquier dirección) para no duplicar solicitudes.
      return sb.from("friends").select("*")
        .or("and(requester.eq." + me + ",addressee.eq." + toUser + ")," +
            "and(requester.eq." + toUser + ",addressee.eq." + me + ")")
        .then(function (res) {
          if (res.error) throw res.error;
          var rows = res.data || [];
          if (rows.length) {
            var ex = rows[0];
            if (ex.status === "aceptada") return "ya"; // ya sois amigos
            // Si ME la enviaron a mí y sigue pendiente, la acepto: nos hacemos amigos.
            if (ex.addressee === me && ex.status === "pendiente") {
              return sb.from("friends").update({ status: "aceptada", updated_at: new Date().toISOString() }).eq("id", ex.id)
                .then(function (r) { if (r.error) throw r.error; return "aceptada"; });
            }
            return "pendiente"; // ya la envié yo y sigue pendiente
          }
          return sb.from("friends").insert({
            requester: me, requester_name: displayName(),
            addressee: toUser, addressee_name: toName || null, status: "pendiente",
          }).then(function (r) { if (r.error) throw r.error; return "enviada"; });
        });
    },
    setFriendStatus: function (id, status) {
      if (!session) return Promise.reject(new Error("Sin sesión"));
      return sb.from("friends").update({ status: status, updated_at: new Date().toISOString() }).eq("id", id)
        .then(function (res) { if (res.error) throw res.error; return true; });
    },
    deleteFriend: function (id) {
      if (!session) return Promise.reject(new Error("Sin sesión"));
      return sb.from("friends").delete().eq("id", id)
        .then(function (res) { if (res.error) throw res.error; return true; });
    },
    pendingFriendsCount: function () {
      if (!session) return Promise.resolve(0);
      return sb.from("friends").select("id", { count: "exact", head: true })
        .eq("addressee", session.user.id).eq("status", "pendiente")
        .then(function (res) { return res.count || 0; }).catch(function () { return 0; });
    },
  };

  // ---------- bandeja en tiempo real (avisos al instante) ----------
  // Escuchamos los tratos y mensajes dirigidos A MÍ y avisamos sin recargar.
  var inboxChannels = [];
  function unsubscribeInbox() {
    inboxChannels.forEach(function (ch) { try { if (sb.removeChannel) sb.removeChannel(ch); } catch (e) {} });
    inboxChannels = [];
  }
  function onInbox(type, row) {
    if (window.WunderApp && window.WunderApp.notifyInbox) {
      try { window.WunderApp.notifyInbox(type, row); } catch (e) {}
    }
  }
  function subscribeInbox() {
    unsubscribeInbox();
    if (!session || !sb.channel) return;
    var uid = session.user.id;
    try {
      var t = sb.channel("inbox-trades-" + uid).on("postgres_changes",
        { event: "INSERT", schema: "public", table: "trades", filter: "to_user=eq." + uid },
        function (p) { onInbox("trade", p.new); }).subscribe();
      inboxChannels.push(t);
      var m = sb.channel("inbox-msgs-" + uid).on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: "to_user=eq." + uid },
        function (p) { onInbox("message", p.new); }).subscribe();
      inboxChannels.push(m);
    } catch (e) { console.warn("Realtime no disponible:", e); }
  }

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
    if (event === "SIGNED_IN") { pullMergePush(); subscribeInbox(); }
    else if (event === "SIGNED_OUT") {
      // Al salir, vaciamos el estado para que el siguiente usuario no herede nada.
      unsubscribeInbox();
      if (window.Store && window.Store.useUser) window.Store.useUser(null);
      cloudAlbums = {}; marketMine = {};
      refreshUI();
      setStatus("local");
    }
  });

  // Bloqueamos de inmediato hasta saber si hay sesión (evita ver la app un instante).
  document.body.classList.add("locked");
  sb.auth.getSession().then(function (r) {
    session = r.data.session;
    applyGate();
    renderAccountBox();
    if (session) { pullMergePush(); subscribeInbox(); } else setStatus("local");
  });
})();
