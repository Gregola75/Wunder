/*
 * app.js — Interfaz del álbum (móvil + PC).
 *
 * Pestañas:
 *   - Álbum:  réplica del álbum por secciones, grupos y selecciones.
 *   - Faltan: lista de los cromos que aún no tienes.
 *   - Repes:  lista de repetidas (para cambiar / vender) con cantidad sobrante.
 *
 * Interacción de cada cromo:
 *   - Toca el cromo  -> suma 1 (falta → tengo → repetida → ...).
 *   - Botón "−"      -> resta 1.
 *   - Botón "✎"      -> renombrar (p. ej. poner el nombre real del jugador).
 */

(function () {
  "use strict";

  const A = window.ALBUM;
  const Store = window.Store;

  let currentTab = "album";
  let query = "";

  // Secciones plegables: guardamos qué selecciones están ABIERTAS (por defecto
  // todas cerradas = álbum limpio tipo lista). Persiste entre re-dibujos.
  const expanded = new Set();
  let allSectionKeys = []; // se llena en buildFlagbar()

  // Índice rápido por código Panini (ARG7 -> cromo), para el Mercado.
  const codeIndex = {};
  A.stickers.forEach(function (s) { codeIndex[s.code] = s; });

  // Filtros del Mercado.
  let mktOnlyMissing = true;  // solo mostrar lo que me falta
  let mktMode = "all";        // all | cambio | venta
  let marketRows = null;      // caché de ofertas (para no recargar al filtrar)
  let marketFriends = null;   // caché de amigos (para filtrar y mostrar estado)

  // Doble toque para marcar por primera vez (evita marcar cromos sin querer).
  let armedId = null;     // cromo "preparado" esperando el segundo toque
  let armedEl = null;     // su elemento en pantalla
  let armTimer = null;    // temporizador para desarmar solo
  const ARM_MS = 2000;    // ventana para el segundo toque

  function clearArm() {
    if (armTimer) { clearTimeout(armTimer); armTimer = null; }
    if (armedEl) {
      armedEl.classList.remove("arming");
      const se = armedEl.querySelector(".cromo-state");
      if (se) se.innerHTML = '<span class="st-no">Me falta</span>';
    }
    armedEl = null;
    armedId = null;
  }

  const el = function (sel) { return document.querySelector(sel); };

  // ---------- Estadísticas ----------
  function stats() {
    let ownedBase = 0, missingBase = 0, dupes = 0, ownedExtra = 0;
    A.stickers.forEach(function (s) {
      const c = Store.getCount(s.id);
      if (s.extra) {
        if (c >= 1) ownedExtra += 1;
      } else {
        if (c >= 1) ownedBase += 1; else missingBase += 1;
      }
      if (c >= 2) dupes += c - 1; // repetidas de todo (incluye extras)
    });
    return {
      owned: ownedBase, missing: missingBase, dupes: dupes,
      ownedExtra: ownedExtra, total: A.total, extrasTotal: A.extrasTotal,
    };
  }

  function teamProgress(team) {
    let owned = 0;
    team.stickerIds.forEach(function (id) { if (Store.getCount(id) >= 1) owned += 1; });
    return owned;
  }

  // ---------- Utilidades ----------
  function nameOf(s) { return Store.getName(s.id, s.name); }

  function roleTag(s) {
    if (s.role === "badge") return "Escudo";
    if (s.role === "team_photo") return "Plantilla";
    if (s.role === "special") return "Especial";
    return "Jugador";
  }

  function matchesQuery(text) {
    if (!query) return true;
    return text.toLowerCase().indexOf(query) !== -1;
  }

  // Coincide por nombre o por código Panini (acepta "ARG7" y "ARG 7").
  function stickerMatches(s) {
    if (!query) return true;
    const q = query.replace(/\s+/g, "");
    if (s.code.toLowerCase().indexOf(q) !== -1) return true;
    return matchesQuery(nameOf(s));
  }

  // ---------- Render de un cromo (estilo cromo premium) ----------
  const teamFlag = A.teams.reduce(function (m, t) { m[t.id] = t.flag; return m; }, {});

  function flagFor(s) {
    if (s.flag) return s.flag;                 // Coca-Cola trae bandera de país
    if (s.teamId) return teamFlag[s.teamId] || "⚽";
    if (s.section === "museum") return "🏆";    // leyendas / campeones
    return "✨";                                // apertura
  }

  function cellHTML(s) {
    const c = Store.getCount(s.id);
    const owned = c >= 1;
    const dup = Math.max(0, c - 1);
    const cls = ["cell", "cromo", owned ? "owned" : "missing"];
    if (dup > 0) cls.push("dupe");
    if (s.foil) cls.push("foil");
    if (s.extra) cls.push("extra");

    return (
      '<div class="' + cls.join(" ") + '" data-id="' + s.id + '">' +
        (dup > 0 ? '<div class="cromo-dup">x' + dup + '</div>' : "") +
        '<div class="cromo-actions">' +
          '<button class="mini btn-rename" title="Renombrar">✎</button>' +
          (owned ? '<button class="mini btn-dec" title="Quitar una">−</button>' : "") +
        '</div>' +
        '<div class="cromo-code"><span>' + s.codeLabel + '</span>' + (s.foil ? '<span class="foil-dot">✦</span>' : "") + '</div>' +
        '<div class="cromo-face"><span class="cromo-flag">' + flagFor(s) + '</span></div>' +
        '<div class="cromo-name">' + escapeHTML(nameOf(s)) + '</div>' +
        (s.sub ? '<div class="cromo-sub">' + escapeHTML(s.sub) + '</div>' : "") +
        '<div class="cromo-state">' + (owned ? '<span class="st-ok">✓ La tengo</span>' : '<span class="st-no">Me falta</span>') + '</div>' +
      '</div>'
    );
  }

  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
  }

  // ---------- Render: pestaña Álbum ----------
  function renderAlbum() {
    let html = "";

    // Botón para abrir/cerrar todas las secciones (no aparece al buscar).
    if (!query && allSectionKeys.length) {
      const allOpen = allSectionKeys.every(function (k) { return expanded.has(k); });
      html +=
        '<div class="album-tools">' +
          '<button class="tool-btn" data-expandall>' +
            (allOpen ? "▸ Plegar todo" : "▾ Expandir todo") +
          '</button>' +
        '</div>';
    }

    // Secciones especiales
    A.sections.forEach(function (sec) {
      const cells = sec.stickerIds.map(function (id) { return A.byId[id]; });
      const visible = cells.filter(function (s) { return stickerMatches(s) || matchesQuery(sec.title); });
      if (visible.length === 0) return;
      const owned = cells.filter(function (s) { return Store.getCount(s.id) >= 1; }).length;
      const col = (!query && !expanded.has(sec.key)) ? " collapsed" : "";
      html +=
        '<section class="page collapsible' + col + '" data-key="' + sec.key + '" data-sec="' + sec.key + '">' +
          '<div class="page-head">' +
            '<div class="page-title"><span class="page-emoji">⭐</span> ' + sec.title +
              ' <small>' + sec.subtitle + '</small></div>' +
            '<div class="page-right"><span class="page-prog">' + owned + "/" + cells.length + '</span><span class="page-chev">▸</span></div>' +
          '</div>' +
          '<div class="grid">' + visible.map(cellHTML).join("") + '</div>' +
        '</section>';
    });

    // Equipos / clubes. Los Mundiales van por grupos; otras colecciones (clubes) van en lista.
    function teamSectionHTML(team) {
      const cells = team.stickerIds.map(function (id) { return A.byId[id]; });
      const teamMatches = matchesQuery(team.name) || matchesQuery(team.code);
      const visible = teamMatches ? cells : cells.filter(function (s) { return stickerMatches(s); });
      if (visible.length === 0) return "";
      const owned = teamProgress(team);
      const col = (!query && !expanded.has(team.id)) ? " collapsed" : "";
      const sub = (A.groups.length && team.group) ? (' <small>Grupo ' + team.group + '</small>') : "";
      return '<section class="page collapsible' + col + '" data-team="' + team.id + '" data-key="' + team.id + '">' +
          '<div class="page-head">' +
            '<div class="page-title"><span class="page-emoji">' + team.flag + '</span> ' + escapeHTML(team.name) + sub + '</div>' +
            '<div class="page-right"><span class="page-prog">' + owned + "/" + cells.length + '</span><span class="page-chev">▸</span></div>' +
          '</div>' +
          '<div class="grid">' + visible.map(cellHTML).join("") + '</div>' +
        '</section>';
    }

    if (A.groups.length) {
      A.groups.forEach(function (g) {
        const groupTeams = A.teams.filter(function (t) { return t.group === g; });
        let teamsHTML = "";
        groupTeams.forEach(function (team) { teamsHTML += teamSectionHTML(team); });
        if (teamsHTML) html += '<div class="group-label">Grupo ' + g + '</div>' + teamsHTML;
      });
    } else {
      A.teams.forEach(function (team) { html += teamSectionHTML(team); });
    }

    // Extras Coca-Cola
    const ex = A.extraSection;
    const exCells = ex.stickerIds.map(function (id) { return A.byId[id]; });
    const exVisible = exCells.filter(function (s) { return stickerMatches(s) || matchesQuery(ex.title); });
    if (exVisible.length) {
      const exOwned = exCells.filter(function (s) { return Store.getCount(s.id) >= 1; }).length;
      const exCol = (!query && !expanded.has("extras")) ? " collapsed" : "";
      html +=
        '<div class="group-label">Extras</div>' +
        '<section class="page extra-page collapsible' + exCol + '" id="sec-extras" data-key="extras" data-sec="extras">' +
          '<div class="page-head">' +
            '<div class="page-title"><span class="page-emoji">🥤</span> ' + ex.title +
              ' <small>' + ex.subtitle + '</small></div>' +
            '<div class="page-right"><span class="page-prog">' + exOwned + "/" + exCells.length + '</span><span class="page-chev">▸</span></div>' +
          '</div>' +
          '<div class="grid">' + exVisible.map(cellHTML).join("") + '</div>' +
        '</section>';
    }

    if (!html) html = '<div class="empty">No se encontraron cromos para "' + escapeHTML(query) + '".</div>';
    el("#content").innerHTML = html;
  }

  // ---------- Render: pestaña Faltan ----------
  function renderMissing() {
    let html = "";
    let totalMissing = 0;

    function block(title, emoji, cells) {
      const missing = cells.filter(function (s) {
        return Store.getCount(s.id) === 0 && (stickerMatches(s) || matchesQuery(title));
      });
      if (missing.length === 0) return "";
      totalMissing += missing.length;
      return (
        '<section class="page">' +
          '<div class="page-head"><div class="page-title"><span class="page-emoji">' + emoji + '</span> ' +
            title + '</div><div class="page-prog">Faltan ' + missing.length + '</div></div>' +
          '<div class="grid">' + missing.map(cellHTML).join("") + '</div>' +
        '</section>'
      );
    }

    A.sections.forEach(function (sec) {
      html += block(sec.title, "⭐", sec.stickerIds.map(function (id) { return A.byId[id]; }));
    });
    A.teams.forEach(function (team) {
      html += block(team.name + " (Grupo " + team.group + ")", team.flag, team.stickerIds.map(function (id) { return A.byId[id]; }));
    });
    html += block(A.extraSection.title, "🥤", A.extraSection.stickerIds.map(function (id) { return A.byId[id]; }));

    if (!html) {
      html = '<div class="empty">🎉 ¡No te falta ninguna! Álbum completo o sin resultados para tu búsqueda.</div>';
    } else {
      html = '<div class="list-summary">Te faltan <b>' + totalMissing + '</b> cromos.</div>' + html;
    }
    el("#content").innerHTML = html;
  }

  // ---------- Render: pestaña Repes ----------
  function renderDuplicates() {
    const rows = [];
    let totalSpare = 0;
    A.stickers.forEach(function (s) {
      const c = Store.getCount(s.id);
      const spare = c - 1;
      if (spare >= 1 && stickerMatches(s)) {
        rows.push({ s: s, spare: spare });
        totalSpare += spare;
      }
    });

    if (rows.length === 0) {
      el("#content").innerHTML = '<div class="empty">No tienes repetidas todavía. Cuando una llegue a 2+ aparecerá aquí para cambiar o vender. 🔁</div>';
      return;
    }

    let totalValue = 0;
    rows.forEach(function (r) { totalValue += (r.s.value || 1) * r.spare; });

    let html = '<div class="list-summary">Tienes <b>' + totalSpare + '</b> repetidos para cambiar / vender (' +
      rows.length + ' distintos) · Valor estimado: <b>' + totalValue + ' pts</b></div>';
    html += '<div class="dup-list">';
    rows.forEach(function (r) {
      const s = r.s;
      const team = s.teamId ? A.teams.find(function (t) { return t.id === s.teamId; }) : null;
      let where;
      if (team) where = team.flag + " " + team.name + " · Grupo " + team.group;
      else if (s.extra) where = "🥤 Coca-Cola" + (s.sub ? " · " + s.sub : "");
      else where = "Especial";

      const lst = Store.getListing(s.id);
      const isCambio = lst && lst.type === "cambio";
      const isVenta = lst && lst.type === "venta";
      const isListed = isCambio || isVenta;
      const priceVal = isVenta && lst.price != null ? lst.price : "";
      const cond = (lst && lst.cond) || 1;
      const photo = lst && lst.photo;

      function photoRow() {
        const thumb = photo
          ? '<img class="ph-thumb" src="' + escapeHTML(photo) + '" alt="foto del cromo" data-photo="' + escapeHTML(photo) + '" />'
          : '<span class="ph-empty">📷</span>';
        return '<div class="photo-row">' + thumb +
          '<label class="ph-btn">' + (photo ? "Cambiar foto" : "📷 Añadir foto del estado") +
            '<input type="file" accept="image/*" capture="environment" class="ph-input" hidden /></label>' +
          (photo ? '<button class="ph-del" data-photodel="1" title="Quitar foto">✕</button>' : "") +
          '</div>';
      }

      function condBtns() {
        let out = '<div class="cond-row"><span class="cond-lbl">Condición del cambio:</span>';
        [["1", "1x1"], ["2", "x2"], ["3", "x3"], ["4", "x4"], ["5", "x5"], ["6", "x6"]].forEach(function (c) {
          out += '<button class="cond-btn' + (cond === Number(c[0]) ? " active" : "") + '" data-cond="' + c[0] + '">' + c[1] + '</button>';
        });
        return out + '</div>';
      }

      html +=
        '<div class="dup-row" data-id="' + s.id + '">' +
          '<div class="dup-top">' +
            '<div class="dup-no">' + s.codeLabel + '</div>' +
            '<div class="dup-info"><div class="dup-name">' + escapeHTML(nameOf(s)) + ' ' + rarityChip(s) + '</div>' +
              '<div class="dup-where">' + escapeHTML(where) + ' · ' + roleTag(s) + ' · Valor ' + (s.value || 1) + ' pts</div></div>' +
            '<div class="dup-count"><button class="mini btn-dec">−</button>' +
              '<span class="dup-x">x' + r.spare + '</span>' +
              '<button class="mini btn-inc">+</button></div>' +
          '</div>' +
          '<div class="listing-row">' +
            '<button class="lst-btn btn-cambio' + (isCambio ? " active" : "") + '">🔁 Cambio</button>' +
            '<button class="lst-btn btn-venta' + (isVenta ? " active" : "") + '">💲 Venta</button>' +
            (isVenta ? '<input class="price-input" type="number" min="0" inputmode="decimal" placeholder="Precio" value="' + priceVal + '" />' : "") +
          '</div>' +
          (isCambio ? condBtns() : "") +
          (isListed ? photoRow() : "") +
        '</div>';
    });
    html += '</div>';
    el("#content").innerHTML = html;
  }

  function rarityChip(s) {
    if (s.rarity === "ultra") return '<span class="rar rar-ultra">💎 Ultra</span>';
    if (s.rarity === "rara") return '<span class="rar rar-rara">✦ Rara</span>';
    return '<span class="rar rar-comun">Común</span>';
  }

  // ---------- Render: pestaña Mercado ----------
  function renderMarket() {
    const host = el("#content");
    if (!window.Cloud || !window.Cloud.fetchMarket || !window.Cloud.isOnline()) {
      host.innerHTML = '<div class="empty">El mercado necesita que inicies sesión y haya conexión. ☁️</div>';
      return;
    }
    // Si ya tenemos ofertas y amigos en caché, solo re-filtramos (sin recargar).
    if (marketRows && marketFriends) { host.innerHTML = marketHTML(marketRows, marketFriends); return; }
    host.innerHTML = '<div class="empty">Cargando mercado… ⏳</div>';
    Promise.all([
      marketRows ? Promise.resolve(marketRows) : window.Cloud.fetchMarket(),
      (window.Cloud.fetchFriends ? window.Cloud.fetchFriends() : Promise.resolve([])),
    ]).then(function (res) {
      marketRows = res[0] || [];
      marketFriends = computeFriends(res[1] || []);
      if (currentTab === "market") host.innerHTML = marketHTML(marketRows, marketFriends);
    }).catch(function () {
      host.innerHTML = '<div class="empty">No se pudo cargar el mercado. ¿Creaste la tabla en Supabase? Revisa también tu internet.</div>';
    });
  }

  function computeFriends(rows) {
    const me = window.Cloud.myId ? window.Cloud.myId() : null;
    const friendIds = new Set(), relatedIds = new Set();
    (rows || []).forEach(function (f) {
      const other = f.requester === me ? f.addressee : f.requester;
      relatedIds.add(other);
      if (f.status === "aceptada") friendIds.add(other);
    });
    return { friendIds: friendIds, relatedIds: relatedIds, rows: rows || [] };
  }

  // Botón grande de contacto (WhatsApp / email / texto).
  function contactBtnHTML(contact) {
    const c = (contact || "").trim();
    if (!c) return '<span class="ucard-nocontact">sin contacto</span>';
    const digits = c.replace(/[^\d]/g, "");
    if (/^\+?[\d\s\-()]{7,}$/.test(c) && digits.length >= 7) {
      return '<a class="ucard-contact wa" href="https://wa.me/' + digits + '" target="_blank" rel="noopener">💬 Contactar</a>';
    }
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c)) {
      return '<a class="ucard-contact" href="mailto:' + encodeURIComponent(c) + '">✉️ Contactar</a>';
    }
    return '<span class="ucard-contact plain">💬 ' + escapeHTML(c) + '</span>';
  }

  // Mini-cromo para el mercado (banderita + código + modo/precio). Tocarlo
  // propone un trato al dueño (owner).
  function miniCromo(o, owner) {
    const s = o.s;
    const mode = o.mode === "venta"
      ? ("💲" + (o.price != null ? o.price : ""))
      : ("🔁" + (o.cond > 1 ? "x" + o.cond : ""));
    const own = owner || {};
    return (
      '<div class="mc mc-offer' + (o.missing ? " need" : "") + '" title="Tocar para proponer · ' + escapeHTML(nameOf(s)) + '"' +
        ' data-code="' + escapeHTML(o.code) + '" data-mode="' + escapeHTML(o.mode) + '"' +
        ' data-price="' + (o.price != null ? escapeHTML(String(o.price)) : "") + '"' +
        ' data-cond="' + (o.cond || 1) + '"' +
        ' data-oid="' + escapeHTML(own.user_id || "") + '"' +
        ' data-oname="' + escapeHTML(own.display_name || "Coleccionista") + '"' +
        ' data-ocontact="' + escapeHTML(own.contact || "") + '">' +
        (o.missing ? '<span class="mc-need">te falta</span>' : "") +
        (o.photo ? '<button class="mc-photo" data-photo="' + escapeHTML(o.photo) + '" title="Ver foto del estado">📷</button>' : "") +
        '<div class="mc-flag">' + flagFor(s) + '</div>' +
        '<div class="mc-code">' + s.codeLabel + '</div>' +
        '<div class="mc-mode mkt-mode-' + o.mode + '">' + mode + '</div>' +
      '</div>'
    );
  }

  function marketHTML(rows, fr) {
    fr = fr || { friendIds: new Set(), relatedIds: new Set() };
    // Agrupamos por usuario: una tarjeta por persona con sus cromos en oferta.
    const users = [];
    rows.forEach(function (row) {
      // Privacidad "solo amigos": si no eres su amigo, no ves sus repes.
      if (row.privacy === "amigos" && !fr.friendIds.has(row.user_id)) return;
      const listings = (window.Cloud && window.Cloud.listingsFor) ? window.Cloud.listingsFor(row) : (row.listings || {});
      const items = [];
      let needCount = 0;
      Object.keys(listings).forEach(function (code) {
        const s = codeIndex[code];
        if (!s) return;
        const info = listings[code] || {};
        const mode = info.mode || "cambio";
        const missing = Store.getCount(code) === 0;
        if (mktMode !== "all" && mode !== mktMode) return;
        if (mktOnlyMissing && !missing) return;
        if (query) {
          const team = s.teamId ? A.teams.find(function (t) { return t.id === s.teamId; }) : null;
          const hay = (code + " " + nameOf(s) + " " + (team ? team.name : "") + " " + (row.display_name || "")).toLowerCase();
          if (hay.indexOf(query) === -1) return;
        }
        if (missing) needCount += 1;
        items.push({ s: s, code: code, mode: mode, price: info.price, spare: info.spare || 1, missing: missing, cond: info.cond || 1, photo: info.photo || null });
      });
      if (items.length === 0) return;
      items.sort(function (a, b) { if (a.missing !== b.missing) return a.missing ? -1 : 1; return a.code.localeCompare(b.code); });
      users.push({ row: row, items: items, needCount: needCount });
    });
    // Primero quien tiene más cromos que te faltan.
    users.sort(function (a, b) {
      if (a.needCount !== b.needCount) return b.needCount - a.needCount;
      return (a.row.display_name || "").localeCompare(b.row.display_name || "");
    });

    const tools =
      '<div class="mkt-tools">' +
        '<button class="mkt-fbtn' + (mktOnlyMissing ? " active" : "") + '" data-mkt-missing>🎯 Lo que me falta</button>' +
        '<button class="mkt-fbtn' + (mktMode === "all" ? " active" : "") + '" data-mkt-mode="all">Todo</button>' +
        '<button class="mkt-fbtn' + (mktMode === "cambio" ? " active" : "") + '" data-mkt-mode="cambio">🔁 Cambio</button>' +
        '<button class="mkt-fbtn' + (mktMode === "venta" ? " active" : "") + '" data-mkt-mode="venta">💲 Venta</button>' +
        '<button class="mkt-fbtn mkt-refresh" data-mkt-refresh title="Actualizar">↻</button>' +
      '</div>';

    if (rows.length === 0) {
      return tools + '<div class="empty">Aún no hay ofertas de otros coleccionistas.<br><br>¡Comparte <b>Swalbum</b> con tus amigos para empezar a intercambiar! 🤝</div>';
    }
    if (users.length === 0) {
      return tools + '<div class="empty">No hay ofertas con estos filtros.<br>Prueba a desactivar <b>🎯 Lo que me falta</b> o cambiar de modo.</div>';
    }

    const totalNeed = users.reduce(function (n, u) { return n + u.needCount; }, 0);
    let html = tools;
    html += '<div class="mkt-hero">' +
      (totalNeed
        ? '🎯 <b>' + totalNeed + '</b> cromos que te faltan están disponibles, en <b>' + users.length + '</b> coleccionista(s)'
        : 'Hay <b>' + users.length + '</b> coleccionista(s) con ofertas') +
      '</div>';
    users.forEach(function (u) {
      const row = u.row;
      let friendBit;
      if (fr.friendIds.has(row.user_id)) friendBit = '<span class="friend-chip ok">👥 Amigo</span>';
      else if (fr.relatedIds.has(row.user_id)) friendBit = '<span class="friend-chip pend">⏳ Pendiente</span>';
      else friendBit = '<button class="friend-add" data-addfriend="' + escapeHTML(row.user_id || "") + '" data-name="' + escapeHTML(row.display_name || "") + '">👥 Añadir amigo</button>';
      html +=
        '<div class="ucard">' +
          '<div class="ucard-head">' +
            '<div class="ucard-id">👤 ' + escapeHTML(row.display_name || "Coleccionista") +
              (u.needCount ? ' <span class="ucard-need">🎯 ' + u.needCount + ' te faltan</span>' : "") + '</div>' +
            contactBtnHTML(row.contact) +
          '</div>' +
          '<div class="ucard-sub">' + friendBit + '</div>' +
          '<div class="mc-grid">' + u.items.map(function (it) { return miniCromo(it, row); }).join("") + '</div>' +
        '</div>';
    });
    return html;
  }

  // ---------- Tratos (transacciones) ----------
  function proposeTradeFromEl(mc) {
    if (!window.Cloud || !window.Cloud.createTrade || !window.Cloud.isOnline()) {
      window.alert("Inicia sesión para proponer un trato."); return;
    }
    const code = mc.getAttribute("data-code");
    const mode = mc.getAttribute("data-mode");
    const priceStr = mc.getAttribute("data-price");
    const cond = Number(mc.getAttribute("data-cond")) || 1;
    const oid = mc.getAttribute("data-oid");
    const oname = mc.getAttribute("data-oname");
    const ocontact = mc.getAttribute("data-ocontact");
    if (!oid) { window.alert("No se pudo identificar al usuario."); return; }
    // Venta: confirmación directa (es comprar). Cambio: eliges qué le ofreces.
    if (mode === "venta") {
      const s = codeIndex[code];
      const label = s ? s.codeLabel : code;
      if (!window.confirm("¿Proponer comprar " + label + (priceStr ? " (" + priceStr + ")" : "") + " a " + oname +
        "?\n\nSe le avisará y, si acepta, veréis vuestros contactos para cerrar el trato.")) return;
      sendTrade({ toUser: oid, toName: oname, toContact: ocontact, code: code, mode: "venta", price: priceStr ? Number(priceStr) : null, cond: 1 });
      return;
    }
    openTradePicker({ code: code, cond: cond, oid: oid, oname: oname, ocontact: ocontact });
  }

  function sendTrade(payload) {
    return window.Cloud.createTrade(payload).then(function () {
      window.alert("¡Propuesta enviada! La verás en la pestaña 🤝 Tratos.");
    }).catch(function () {
      window.alert("No se pudo enviar la propuesta. ¿Actualizaste las tablas en Supabase?");
    });
  }

  // Selector: para un CAMBIO, eliges de tus repes los cromos que le faltan a la
  // otra persona (le ofreces lo que necesita). Hasta "cond" cromos.
  function openTradePicker(t) {
    const row = (marketRows || []).find(function (r) { return r.user_id === t.oid; });
    const wants = (window.Cloud.wantsFor ? window.Cloud.wantsFor(row) : []) || [];
    // Cromos que le faltan a ÉL y de los que YO tengo repetidos (≥2).
    const offerable = wants.filter(function (c) { return Store.getCount(c) >= 2 && codeIndex[c]; });
    const want = codeIndex[t.code];
    const wantLabel = want ? (flagFor(want) + " " + want.codeLabel + " · " + nameOf(want)) : t.code;
    const N = t.cond || 1;
    const sel = new Set();

    let box = document.getElementById("trade-picker");
    if (!box) {
      box = document.createElement("div");
      box.id = "trade-picker"; box.className = "picker"; box.hidden = true;
      document.body.appendChild(box);
      box.addEventListener("click", function (e) {
        const ctx = box._ctx; if (!ctx) return;
        if (e.target.closest("[data-pickclose]")) { box.hidden = true; return; }
        const pc = e.target.closest("[data-pick]");
        if (pc) {
          const c = pc.getAttribute("data-pick");
          if (ctx.sel.has(c)) ctx.sel.delete(c);
          else if (ctx.sel.size < ctx.N) ctx.sel.add(c);
          ctx.draw();
          return;
        }
        if (e.target.closest("[data-picksend]")) {
          const offer = Array.from(ctx.sel);
          if (ctx.offerable.length && offer.length === 0) { window.alert("Elige al menos un cromo que le ofreces."); return; }
          box.hidden = true;
          sendTrade({ toUser: ctx.t.oid, toName: ctx.t.oname, toContact: ctx.t.ocontact, code: ctx.t.code, mode: "cambio", price: null, cond: ctx.N, offer: offer });
          return;
        }
      });
    }

    function itemsHTML() {
      if (!offerable.length) {
        return '<div class="empty">Ahora mismo no tienes repes que le falten a <b>' + escapeHTML(t.oname) + '</b>.<br><br>' +
          'Puedes proponer igualmente y poneros de acuerdo por el chat. 💬</div>';
      }
      return '<div class="pick-grid">' + offerable.map(function (c) {
        const s = codeIndex[c];
        return '<button class="pick-cell' + (sel.has(c) ? " on" : "") + '" data-pick="' + escapeHTML(c) + '">' +
          '<span class="pk-flag">' + flagFor(s) + '</span>' +
          '<span class="pk-code">' + s.codeLabel + '</span>' +
          '<span class="pk-name">' + escapeHTML(nameOf(s)) + '</span>' +
          '<span class="pk-spare">x' + (Store.getCount(c) - 1) + '</span>' +
        '</button>';
      }).join("") + '</div>';
    }
    function draw() {
      box.innerHTML =
        '<div class="picker-card">' +
          '<div class="picker-head"><h2>Propón tu cambio</h2><button class="coll-x" data-pickclose aria-label="Cerrar">✕</button></div>' +
          '<div class="picker-info">Quieres <b>' + escapeHTML(wantLabel) + '</b> de <b>' + escapeHTML(t.oname) + '</b>.<br>' +
            (N > 1 ? ('Te pide <b>' + N + '</b> cromos que le faltan. ') : 'Elige <b>1</b> cromo que le falte. ') +
            'Marca los que le ofreces a cambio:</div>' +
          itemsHTML() +
          '<div class="picker-foot">' +
            '<span class="pick-count">' + sel.size + ' / ' + N + ' elegidos</span>' +
            '<button class="picker-send" data-picksend' + (offerable.length && sel.size === 0 ? " disabled" : "") + '>Enviar propuesta</button>' +
          '</div>' +
        '</div>';
    }

    box._ctx = { t: t, sel: sel, N: N, offerable: offerable, draw: draw };
    draw();
    box.hidden = false;
  }

  function tradeLabel(t) {
    const s = codeIndex[t.code];
    const name = s ? (flagFor(s) + " " + nameOf(s)) : t.code;
    const where = s ? s.codeLabel : t.code;
    const modo = t.mode === "venta"
      ? ("💲 Venta" + (t.price != null ? " · " + t.price : ""))
      : ("🔁 Cambio · " + (t.cond > 1 ? "pide x" + t.cond : "simple"));
    return { name: escapeHTML(name), where: escapeHTML(where), modo: modo };
  }

  function contactLine(label, contact) {
    const c = (contact || "").trim();
    if (!c) return '<div class="tr-contact">' + label + ': <i>sin contacto</i></div>';
    return '<div class="tr-contact">' + label + ': ' + contactBtnHTML(c) + '</div>';
  }

  // Caché de los últimos tratos cargados (para actuar al pulsar un botón).
  let tradeRows = [];

  // ---- Actualizar el álbum cuando un cambio se COMPLETA ----
  // Cada usuario aplica SU lado: recibe (+1, sale de Faltan) y entrega (−1 repe).
  function appliedKey() {
    const id = window.Cloud && window.Cloud.myId ? window.Cloud.myId() : null;
    return id ? ("swalbum.applied." + id) : null;
  }
  function getApplied() {
    try { return JSON.parse(localStorage.getItem(appliedKey()) || "[]"); } catch (e) { return []; }
  }
  function markApplied(id) {
    const k = appliedKey(); if (!k) return;
    const a = getApplied();
    if (a.indexOf(id) === -1) { a.push(id); try { localStorage.setItem(k, JSON.stringify(a)); } catch (e) {} }
  }

  // Calcula, desde MI punto de vista, qué cromos recibo (+1) y cuáles entrego (−1).
  function applyTradeToInventory(t) {
    const me = window.Cloud.myId ? window.Cloud.myId() : null;
    if (!me) return false;
    let received = [], given = [];
    const offer = t.offer || [];
    if (t.mode === "venta") {
      if (t.from_user === me) received = [t.code];      // compré: recibo el cromo
      else if (t.to_user === me) given = [t.code];       // vendí: lo entrego
    } else { // cambio
      if (t.from_user === me) { received = [t.code]; given = offer.slice(); }   // propuse: recibo el cromo y doy mi oferta
      else if (t.to_user === me) { received = offer.slice(); given = [t.code]; } // dueño: recibo la oferta y doy mi cromo
    }
    received.forEach(function (c) { if (codeIndex[c]) Store.increment(c); });   // lo recibo (sale de Faltan / suma)
    given.forEach(function (c) { if (codeIndex[c]) Store.decrement(c); });      // lo entrego (−1 de mis repes)
    return true;
  }

  // Aplica todas las completadas que aún no se hayan aplicado en este dispositivo.
  function applyCompletedTrades(rows) {
    let n = 0;
    (rows || []).forEach(function (t) {
      if (t.status === "completada" && getApplied().indexOf(t.id) === -1) {
        applyTradeToInventory(t); markApplied(t.id); n += 1;
      }
    });
    return n;
  }

  function renderTrades() {
    closeChat(); // limpia cualquier chat en línea abierto antes de re-dibujar
    const host = el("#content");
    if (!window.Cloud || !window.Cloud.fetchTrades || !window.Cloud.isOnline()) {
      host.innerHTML = '<div class="empty">Inicia sesión para ver tus tratos. ☁️</div>'; return;
    }
    host.innerHTML = '<div class="empty">Cargando tratos… ⏳</div>';
    window.Cloud.fetchTrades().then(function (rows) {
      rows = rows || [];
      tradeRows = rows;
      // Si alguna parte ya completó un cambio, actualizamos el álbum (una sola vez).
      const applied = applyCompletedTrades(rows);
      try {
        host.innerHTML = tradesHTML(rows);
      } catch (err) {
        host.innerHTML = '<div class="empty">⚠️ Error al dibujar los tratos:<br><br><small>' +
          escapeHTML(String((err && err.message) || err)) + '</small></div>';
        console.error("tradesHTML", err);
      }
      refreshTradesBadge();
      if (applied > 0) showToast("✅ Álbum actualizado por un cambio completado");
    }).catch(function (e) {
      host.innerHTML = '<div class="empty">No se pudieron cargar los tratos.<br><br><small>' +
        escapeHTML(String((e && e.message) || e)) + '</small><br><br>¿Creaste la tabla "trades" en Supabase?</div>';
      console.error("fetchTrades", e);
    });
  }

  function tradesHTML(rows) {
    const me = window.Cloud.myId ? window.Cloud.myId() : null;
    const recibidos = [], enviados = [], historial = [];
    rows.forEach(function (t) {
      const mine = t.from_user === me;
      if (t.status === "pendiente") { (mine ? enviados : recibidos).push(t); }
      else historial.push(t);
    });

    function card(t, role) {
      const L = tradeLabel(t);
      const otherName = role === "recibido" ? (t.from_name || "Alguien") : (t.to_name || "Coleccionista");
      const otherId = (t.from_user === me) ? t.to_user : t.from_user;
      const ctx = L.where + " · " + L.modo;
      const chatBtn = '<button class="tr-btn chat" data-chat="' + t.id + '" data-other="' + escapeHTML(otherId || "") + '" data-othername="' + escapeHTML(otherName) + '" data-ctx="' + escapeHTML(ctx) + '" data-role="' + role + '" data-status="' + t.status + '">💬 Chat</button>';
      let actions = "", contacts = "";
      if (t.status === "pendiente" && role === "recibido") {
        actions = '<div class="tr-actions">' + chatBtn +
          '<button class="tr-btn ok" data-trade="' + t.id + '" data-action="aceptar">✓ Aceptar</button>' +
          '<button class="tr-btn no" data-trade="' + t.id + '" data-action="rechazar">✕ Rechazar</button></div>';
      } else if (t.status === "pendiente" && role === "enviado") {
        actions = '<div class="tr-actions">' + chatBtn + '<button class="tr-btn" data-trade="' + t.id + '" data-action="cancelar">Cancelar</button></div>';
      } else if (t.status === "aceptada") {
        // Ambas partes ven los contactos para cerrar el trato.
        contacts = contactLine("Tú", role === "recibido" ? t.to_contact : t.from_contact) +
                   contactLine(escapeHTML(otherName), role === "recibido" ? t.from_contact : t.to_contact);
        actions = '<div class="tr-actions">' + chatBtn +
          '<button class="tr-btn ok" data-trade="' + t.id + '" data-action="completar">✓ Marcar completado</button>' +
          '<button class="tr-btn no" data-trade="' + t.id + '" data-action="cancelar">✕ Cancelar trato</button></div>';
      } else if (t.status === "completada") {
        actions = '<div class="tr-actions">' + chatBtn + '</div>';
      }
      const statusChip = '<span class="tr-status st-' + t.status + '">' + t.status + '</span>';
      // Cromos que se ofrecen a cambio (los que le faltan al dueño del cromo).
      let offer = "";
      if (t.offer && t.offer.length) {
        const lbl = role === "recibido" ? "Te ofrece a cambio" : "Le ofreces";
        const chips = t.offer.map(function (c) {
          const s = codeIndex[c];
          return '<span class="off-chip">' + (s ? (flagFor(s) + " " + s.codeLabel) : escapeHTML(c)) + '</span>';
        }).join(" ");
        offer = '<div class="tr-offer">🎁 ' + lbl + ': ' + chips + '</div>';
      }
      return '<div class="tr-card">' +
        '<div class="tr-top"><div class="tr-code">' + L.where + '</div>' +
          '<div class="tr-info"><div class="tr-name">' + L.name + '</div>' +
            '<div class="tr-sub">' + (role === "recibido" ? ("De " + escapeHTML(otherName)) : ("Para " + escapeHTML(otherName))) + ' · ' + L.modo + '</div></div>' +
          statusChip + '</div>' + offer + contacts + actions +
        '<div class="tr-chat" data-chatbox="' + t.id + '" hidden></div>' +
        '</div>';
    }

    let html = "";
    html += '<div class="tr-sec-title">📥 Recibidos</div>';
    html += recibidos.length ? recibidos.map(function (t) { return card(t, "recibido"); }).join("") : '<div class="empty sm">Sin propuestas nuevas.</div>';
    html += '<div class="tr-sec-title">📤 Enviados</div>';
    html += enviados.length ? enviados.map(function (t) { return card(t, "enviado"); }).join("") : '<div class="empty sm">No has propuesto nada aún. Ve al 🛒 Mercado y toca un cromo para proponer.</div>';
    html += '<div class="tr-sec-title">✅ Historial</div>';
    html += historial.length ? historial.map(function (t) { return card(t, t.from_user === me ? "enviado" : "recibido"); }).join("") : '<div class="empty sm">Aún no hay tratos cerrados.</div>';
    return html;
  }

  function handleTradeAction(id, action) {
    const map = { aceptar: "aceptada", rechazar: "rechazada", completar: "completada", cancelar: "cancelada" };
    const status = map[action];
    if (!status || !window.Cloud || !window.Cloud.setTradeStatus) return;

    // Al COMPLETAR: confirmamos y actualizamos el álbum (recibes / entregas).
    if (action === "completar") {
      const t = tradeRows.find(function (x) { return x.id === id; });
      const me = window.Cloud.myId ? window.Cloud.myId() : null;
      let resumen = "";
      if (t) {
        const offer = t.offer || [];
        let received = [], given = [];
        if (t.mode === "venta") {
          if (t.from_user === me) received = [t.code]; else given = [t.code];
        } else {
          if (t.from_user === me) { received = [t.code]; given = offer.slice(); }
          else { received = offer.slice(); given = [t.code]; }
        }
        const lbl = function (c) { const s = codeIndex[c]; return s ? s.codeLabel : c; };
        if (received.length) resumen += "\n✅ Recibes: " + received.map(lbl).join(", ");
        if (given.length) resumen += "\n📤 Entregas: " + given.map(lbl).join(", ");
      }
      if (!window.confirm("¿Confirmas que ya hicisteis el intercambio?" + resumen +
        "\n\nSe actualizará tu álbum automáticamente.")) return;
      window.Cloud.setTradeStatus(id, status).then(function () {
        if (t && getApplied().indexOf(id) === -1) { applyTradeToInventory(t); markApplied(id); }
        renderTrades();
      }).catch(function () { window.alert("No se pudo actualizar el trato."); });
      return;
    }

    // Al CANCELAR/RECHAZAR un trato (aún no completado): confirmamos. No toca el
    // álbum porque aceptar no descuenta nada — todo sigue disponible como estaba.
    if (action === "cancelar" || action === "rechazar") {
      const verbo = action === "rechazar" ? "rechazar" : "cancelar";
      if (!window.confirm("¿Seguro que quieres " + verbo + " este trato?\n\n" +
        "No se descuenta nada: los cromos siguen disponibles para otros tratos.")) return;
      window.Cloud.setTradeStatus(id, status).then(function () { renderTrades(); })
        .catch(function () { window.alert("No se pudo actualizar el trato."); });
      return;
    }

    window.Cloud.setTradeStatus(id, status).then(function () { renderTrades(); })
      .catch(function () { window.alert("No se pudo actualizar el trato."); });
  }

  // ---------- Chat de negociación ----------
  let chatState = null;

  // Marca de "mensajes vistos" (por usuario) para el contador de no leídos.
  function chatSeenKey() {
    const id = window.Cloud && window.Cloud.myId ? window.Cloud.myId() : null;
    return id ? ("swalbum.chatseen." + id) : null;
  }
  function markChatSeen() {
    const k = chatSeenKey();
    if (k) { try { localStorage.setItem(k, new Date().toISOString()); } catch (e) {} }
  }
  function getChatSeen() {
    const k = chatSeenKey();
    try { return (k && localStorage.getItem(k)) || "1970-01-01"; } catch (e) { return "1970-01-01"; }
  }

  function closeChat() {
    if (chatState) {
      if (chatState.channel) window.Cloud.unsubscribe(chatState.channel);
      if (chatState.poll) clearInterval(chatState.poll);
    }
    chatState = null;
    document.querySelectorAll("[data-chatbox]").forEach(function (b) { b.hidden = true; b.innerHTML = ""; });
    markChatSeen();
    refreshTradesBadge();
  }

  // Abre/cierra el chat EN LÍNEA dentro del propio trato (sin ventanas).
  function toggleInlineChat(tradeId, otherId) {
    const box = document.querySelector('[data-chatbox="' + tradeId + '"]');
    if (!box) return;
    const wasOpen = chatState && chatState.tradeId === tradeId && !box.hidden;
    closeChat(); // cierra cualquier chat abierto y limpia
    if (wasOpen) return; // si tocaste el que estaba abierto, solo cerrar
    if (!window.Cloud || !window.Cloud.fetchMessages || !window.Cloud.isOnline()) {
      window.alert("Inicia sesión para chatear."); return;
    }
    box.hidden = false;
    box.innerHTML =
      '<div class="trc-msgs"><div class="empty sm">Cargando…</div></div>' +
      '<form class="trc-form"><input class="trc-input" type="text" placeholder="Escribe un mensaje…" maxlength="500" autocomplete="off" /><button type="submit">Enviar</button></form>';
    chatState = { tradeId: tradeId, otherId: otherId, msgs: [], channel: null, poll: null, box: box };
    markChatSeen();

    chatState.merge = function (arr) {
      arr.forEach(function (m) { if (!chatState.msgs.some(function (x) { return x.id === m.id; })) chatState.msgs.push(m); });
      chatState.msgs.sort(function (a, b) { return (a.created_at || "").localeCompare(b.created_at || ""); });
      renderInlineMsgs();
    };

    window.Cloud.fetchMessages(tradeId).then(function (list) {
      if (!chatState || chatState.tradeId !== tradeId) return;
      chatState.msgs = []; chatState.merge(list || []);
    }).catch(function () {
      const m = box.querySelector(".trc-msgs"); if (m) m.innerHTML = '<div class="empty sm">No se pudo cargar el chat. ¿Creaste la tabla "messages" en Supabase?</div>';
    });
    chatState.channel = window.Cloud.subscribeMessages(tradeId, function (m) { if (chatState && chatState.tradeId === tradeId) chatState.merge([m]); });
    chatState.poll = setInterval(function () {
      window.Cloud.fetchMessages(tradeId).then(function (list) { if (chatState && chatState.tradeId === tradeId) chatState.merge(list || []); }).catch(function () {});
    }, 4000);

    const form = box.querySelector(".trc-form");
    if (form) form.addEventListener("submit", function (e) { e.preventDefault(); sendInlineChat(); });
    const inp = box.querySelector(".trc-input"); if (inp) inp.focus();
  }

  function renderInlineMsgs() {
    if (!chatState || !chatState.box) return;
    const me = window.Cloud.myId ? window.Cloud.myId() : null;
    const host = chatState.box.querySelector(".trc-msgs");
    if (!host) return;
    if (!chatState.msgs.length) { host.innerHTML = '<div class="empty sm">Aún no hay mensajes. ¡Escribe el primero para negociar! 💬</div>'; return; }
    host.innerHTML = chatState.msgs.map(function (m) {
      const mine = m.from_user === me;
      return '<div class="bubble ' + (mine ? "me" : "them") + '">' + escapeHTML(m.text) + '</div>';
    }).join("");
    host.scrollTop = host.scrollHeight;
  }

  function sendInlineChat() {
    if (!chatState || !chatState.box) return;
    const inp = chatState.box.querySelector(".trc-input");
    const t = (inp.value || "").trim();
    if (!t) return;
    inp.value = "";
    window.Cloud.sendMessage(chatState.tradeId, chatState.otherId, t).then(function () {
      window.Cloud.fetchMessages(chatState.tradeId).then(function (list) { if (chatState) chatState.merge(list || []); });
    }).catch(function () { window.alert("No se pudo enviar el mensaje."); });
  }

  function refreshTradesBadge() {
    if (!window.Cloud || !window.Cloud.pendingTradesCount) return;
    Promise.all([
      window.Cloud.pendingTradesCount(),
      window.Cloud.unreadCount ? window.Cloud.unreadCount(getChatSeen()) : Promise.resolve(0),
    ]).then(function (res) {
      const n = (res[0] || 0) + (res[1] || 0);
      const b = el("#trades-badge");
      if (!b) return;
      if (n > 0) { b.textContent = n; b.hidden = false; } else { b.hidden = true; }
    });
  }

  // ---------- Amigos ----------
  function sendFriendRequestFromEl(btn) {
    if (!window.Cloud || !window.Cloud.sendFriendRequest || !window.Cloud.isOnline()) {
      window.alert("Inicia sesión para añadir amigos."); return;
    }
    const uid = btn.getAttribute("data-addfriend");
    const name = btn.getAttribute("data-name") || "Coleccionista";
    if (!uid) return;
    if (!window.confirm("¿Enviar solicitud de amistad a " + name + "?")) return;
    btn.disabled = true; btn.textContent = "⏳ Enviando…";
    window.Cloud.sendFriendRequest(uid, name).then(function () {
      btn.outerHTML = '<span class="friend-chip pend">⏳ Pendiente</span>';
      // Refrescamos la caché de amigos para que se mantenga al re-filtrar.
      marketFriends = null;
      refreshFriendsBadge();
    }).catch(function (e) {
      btn.disabled = false; btn.textContent = "👥 Añadir amigo";
      const m = String((e && e.message) || e);
      if (/duplicate|unique/i.test(m)) window.alert("Ya tienes una solicitud o amistad con esta persona.");
      else window.alert("No se pudo enviar la solicitud. ¿Creaste la tabla 'friends' en Supabase?");
    });
  }

  function openFriends() {
    const overlay = el("#friends");
    const body = el("#friends-body");
    if (!overlay || !body) return;
    overlay.hidden = false;
    body.innerHTML = '<div class="empty">Cargando amigos… ⏳</div>';
    if (!window.Cloud || !window.Cloud.fetchFriends || !window.Cloud.isOnline()) {
      body.innerHTML = '<div class="empty">Inicia sesión para ver tus amigos. ☁️</div>'; return;
    }
    window.Cloud.fetchFriends().then(function (rows) {
      body.innerHTML = friendsHTML(rows || []);
    }).catch(function () {
      body.innerHTML = '<div class="empty">No se pudieron cargar los amigos. ¿Creaste la tabla "friends" en Supabase?</div>';
    });
  }

  function friendsHTML(rows) {
    const me = window.Cloud.myId ? window.Cloud.myId() : null;
    const recibidas = [], enviadas = [], amigos = [];
    rows.forEach(function (f) {
      if (f.status === "aceptada") amigos.push(f);
      else if (f.status === "pendiente") { (f.addressee === me ? recibidas : enviadas).push(f); }
    });

    function nameOfOther(f) {
      return (f.requester === me) ? (f.addressee_name || "Coleccionista") : (f.requester_name || "Coleccionista");
    }

    function reqCard(f) {
      return '<div class="fr-card">' +
        '<div class="fr-name">👤 ' + escapeHTML(f.requester_name || "Coleccionista") + '</div>' +
        '<div class="fr-actions">' +
          '<button class="tr-btn ok" data-friend="' + f.id + '" data-faction="aceptar">✓ Aceptar</button>' +
          '<button class="tr-btn no" data-friend="' + f.id + '" data-faction="rechazar">✕ Rechazar</button>' +
        '</div></div>';
    }
    function sentCard(f) {
      return '<div class="fr-card">' +
        '<div class="fr-name">👤 ' + escapeHTML(f.addressee_name || "Coleccionista") + ' <span class="friend-chip pend">⏳ Pendiente</span></div>' +
        '<div class="fr-actions"><button class="tr-btn" data-friend="' + f.id + '" data-faction="cancelar">Cancelar</button></div>' +
        '</div>';
    }
    function friendCard(f) {
      return '<div class="fr-card">' +
        '<div class="fr-name">👤 ' + escapeHTML(nameOfOther(f)) + ' <span class="friend-chip ok">👥 Amigo</span></div>' +
        '<div class="fr-actions"><button class="tr-btn no" data-friend="' + f.id + '" data-faction="eliminar">Eliminar</button></div>' +
        '</div>';
    }

    let html = "";
    html += '<div class="tr-sec-title">📥 Solicitudes recibidas</div>';
    html += recibidas.length ? recibidas.map(reqCard).join("") : '<div class="empty sm">Sin solicitudes nuevas.</div>';
    html += '<div class="tr-sec-title">👥 Mis amigos</div>';
    html += amigos.length ? amigos.map(friendCard).join("") : '<div class="empty sm">Aún no tienes amigos. Añade desde el 🛒 Mercado.</div>';
    html += '<div class="tr-sec-title">📤 Solicitudes enviadas</div>';
    html += enviadas.length ? enviadas.map(sentCard).join("") : '<div class="empty sm">No has enviado ninguna solicitud.</div>';
    return html;
  }

  function handleFriendAction(id, action) {
    if (!window.Cloud) return;
    let prom;
    if (action === "aceptar") prom = window.Cloud.setFriendStatus(id, "aceptada");
    else if (action === "rechazar" || action === "cancelar" || action === "eliminar") prom = window.Cloud.deleteFriend(id);
    else return;
    prom.then(function () {
      marketFriends = null; // la próxima vista del mercado se recalcula
      openFriends();        // re-dibuja la lista de amigos
      refreshFriendsBadge();
    }).catch(function () { window.alert("No se pudo actualizar."); });
  }

  function refreshFriendsBadge() {
    if (!window.Cloud || !window.Cloud.pendingFriendsCount) return;
    window.Cloud.pendingFriendsCount().then(function (n) {
      const b = el("#friends-badge");
      if (!b) return;
      if (n > 0) { b.textContent = n; b.hidden = false; } else { b.hidden = true; }
    });
  }

  // ---------- Avisos en tiempo real ----------
  // Banner ligero arriba; al tocarlo, te lleva a Tratos. Se quita solo.
  function showToast(text, onClick) {
    let host = document.getElementById("toasts");
    if (!host) {
      host = document.createElement("div");
      host.id = "toasts"; host.className = "toasts";
      document.body.appendChild(host);
    }
    const t = document.createElement("button");
    t.className = "toast";
    t.innerHTML = escapeHTML(text);
    t.addEventListener("click", function () {
      if (onClick) onClick();
      if (t.parentNode) t.parentNode.removeChild(t);
    });
    host.appendChild(t);
    setTimeout(function () { t.classList.add("show"); }, 20);
    setTimeout(function () {
      t.classList.remove("show");
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 300);
    }, 7000);
  }

  // Aviso del sistema (cuando la pestaña no está visible y diste permiso).
  function maybeSystemNotify(text) {
    try {
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      if (!document.hidden) return; // si la estás mirando, basta el banner
      const n = new Notification("Swalbum", { body: text, icon: "assets/logo/icon-192.png", tag: "swalbum-inbox" });
      n.onclick = function () { window.focus(); n.close(); };
    } catch (e) {}
  }

  function goToTrades() {
    if (el("#settings")) el("#settings").hidden = true;
    if (el("#friends")) el("#friends").hidden = true;
    currentTab = "trades";
    window.scrollTo(0, 0);
    render();
  }

  // Llamado por la nube (Realtime) al llegar un trato o mensaje dirigido a mí.
  function notifyInbox(type, row) {
    refreshTradesBadge(); // el contador sube al instante
    // Si ya tienes abierto el chat de ese trato, no hace falta avisar.
    if (type === "message" && chatState && chatState.tradeId === row.trade_id) return;
    let text;
    if (type === "trade") {
      const s = codeIndex[row.code];
      const label = s ? s.codeLabel : (row.code || "");
      text = "🤝 " + (row.from_name || "Alguien") + " te propone un trato · " + label;
    } else {
      const snippet = (row.text || "").slice(0, 70);
      text = "💬 Nuevo mensaje: " + snippet;
    }
    showToast(text, goToTrades);
    maybeSystemNotify(text);
  }

  // Pide permiso para los avisos del sistema (botón en Configuración).
  function enableNotifications() {
    if (!("Notification" in window)) {
      window.alert("Tu navegador no admite avisos del sistema. Aun así verás los avisos dentro de la app.");
      return;
    }
    Notification.requestPermission().then(function (perm) {
      syncNotifyBtn();
      if (perm === "granted") window.alert("¡Avisos activados! 🔔 Te avisaremos de tratos y mensajes nuevos.");
      else if (perm === "denied") window.alert("Has bloqueado los avisos. Puedes reactivarlos en los ajustes del navegador.");
    });
  }

  function syncNotifyBtn() {
    const b = el("#btn-notify");
    if (!b) return;
    if (!("Notification" in window)) { b.hidden = true; return; }
    if (Notification.permission === "granted") { b.textContent = "🔔 Avisos activados ✓"; b.disabled = true; }
    else if (Notification.permission === "denied") { b.textContent = "🔕 Avisos bloqueados (revisa el navegador)"; b.disabled = true; }
    else { b.textContent = "🔔 Activar avisos en este dispositivo"; b.disabled = false; }
  }

  // ---------- Foto del estado del cromo ----------
  // Reduce la imagen (máx. 1000px, JPEG) para subir rápido y ahorrar espacio.
  function compressImage(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () {
        const img = new Image();
        img.onload = function () {
          const max = 1000;
          let w = img.width, h = img.height;
          if (w > h && w > max) { h = Math.round(h * max / w); w = max; }
          else if (h >= w && h > max) { w = Math.round(w * max / h); h = max; }
          const canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          canvas.toBlob(function (blob) {
            if (blob) resolve(blob); else reject(new Error("No se pudo procesar la imagen"));
          }, "image/jpeg", 0.72);
        };
        img.onerror = function () { reject(new Error("Imagen no válida")); };
        img.src = reader.result;
      };
      reader.onerror = function () { reject(new Error("No se pudo leer el archivo")); };
      reader.readAsDataURL(file);
    });
  }

  function handlePhotoPick(input, id) {
    const file = input.files && input.files[0];
    if (!file) return;
    if (!window.Cloud || !window.Cloud.uploadCromoPhoto || !window.Cloud.isOnline()) {
      window.alert("Inicia sesión y conéctate para subir fotos."); input.value = ""; return;
    }
    const s = A.byId[id];
    const code = s ? s.code : id;
    const row = input.closest(".dup-row");
    const lbl = input.closest(".ph-btn");
    if (lbl) lbl.classList.add("loading");
    const old = lbl ? lbl.textContent : "";
    if (lbl) lbl.firstChild && (lbl.firstChild.textContent = "Subiendo… ⏳");
    compressImage(file).then(function (blob) {
      return window.Cloud.uploadCromoPhoto(code, blob, "image/jpeg");
    }).then(function (url) {
      if (!url) throw new Error("sin url");
      Store.setListingPhoto(id, url); // dispara la sincronización al mercado
      render();
    }).catch(function (e) {
      if (lbl) { lbl.classList.remove("loading"); lbl.firstChild && (lbl.firstChild.textContent = old); }
      const m = String((e && e.message) || e);
      if (/bucket|not found|does not exist/i.test(m)) window.alert("Falta crear el bucket 'cromos' en Supabase Storage. Sigue el paso que te indico.");
      else window.alert("No se pudo subir la foto. Inténtalo de nuevo.");
      console.warn("uploadCromoPhoto", e);
    });
    input.value = "";
  }

  function openLightbox(url) {
    if (!url) return;
    let lb = document.getElementById("lightbox");
    if (!lb) {
      lb = document.createElement("div");
      lb.id = "lightbox"; lb.className = "lightbox";
      lb.addEventListener("click", function () { lb.hidden = true; lb.innerHTML = ""; });
      document.body.appendChild(lb);
    }
    lb.innerHTML = '<img src="' + escapeHTML(url) + '" alt="foto del cromo" />';
    lb.hidden = false;
  }

  // ---------- Render principal ----------
  function render() {
    // cualquier re-dibujo cancela un "doble toque" a medias
    armedId = null; armedEl = null;
    if (armTimer) { clearTimeout(armTimer); armTimer = null; }

    // estadísticas de cabecera
    const st = stats();
    const pct = Math.round((st.owned / st.total) * 100);
    el("#stat-owned").textContent = st.owned;
    el("#stat-missing").textContent = st.missing;
    el("#stat-dupes").textContent = st.dupes;
    el("#progress-fill").style.width = pct + "%";
    el("#progress-big").textContent = pct + "%";
    el("#progress-count").textContent = st.owned + " / " + st.total + " cromos";
    el("#extra-prog").textContent = "📦 " + A.extraSection.title + ": " + st.ownedExtra + " / " + st.extrasTotal;

    // pestaña activa
    document.querySelectorAll(".tab").forEach(function (t) {
      t.classList.toggle("active", t.dataset.tab === currentTab);
    });

    // El atajo de banderas sólo tiene sentido en el Álbum y sin búsqueda activa.
    const fb = el("#flagbar");
    if (fb) fb.hidden = currentTab !== "album" || !!query;

    try {
      if (currentTab === "album") renderAlbum();
      else if (currentTab === "missing") renderMissing();
      else if (currentTab === "market") renderMarket();
      else if (currentTab === "trades") renderTrades();
      else renderDuplicates();
    } catch (err) {
      // Nunca dejar la pantalla en blanco: mostrar el error para diagnosticar.
      el("#content").innerHTML =
        '<div class="empty">Ups, ocurrió un error al dibujar los cromos.<br><br>' +
        '<small>' + escapeHTML(String(err && err.message || err)) + '</small><br><br>' +
        'Prueba a recargar la página.</div>';
      console.error(err);
    }
  }

  // ---------- Acciones sobre cromos ----------
  function handleRename(s) {
    const actual = nameOf(s);
    const nuevo = window.prompt("Nuevo nombre para el cromo " + s.codeLabel + ":", actual);
    if (nuevo === null) return; // cancelado
    Store.setName(s.id, nuevo);
    render();
  }

  // ---------- Eventos (delegación) ----------
  function wireEvents() {
    // Pestañas
    document.querySelectorAll(".tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        currentTab = tab.dataset.tab;
        // Al entrar al Mercado, pedimos datos frescos.
        if (currentTab === "market") { marketRows = null; marketFriends = null; }
        window.scrollTo(0, 0);
        render();
      });
    });

    // Búsqueda
    el("#search").addEventListener("input", function (e) {
      query = e.target.value.trim().toLowerCase();
      render();
    });

    // Clicks en el contenido (delegación)
    el("#content").addEventListener("click", function (e) {
      // Botón "Expandir / Plegar todo"
      if (e.target.closest("[data-expandall]")) {
        const allOpen = allSectionKeys.every(function (k) { return expanded.has(k); });
        expanded.clear();
        if (!allOpen) allSectionKeys.forEach(function (k) { expanded.add(k); });
        render();
        return;
      }
      // Plegar / desplegar una sección al tocar su encabezado
      const head = e.target.closest(".page-head");
      if (head) {
        const pg = head.closest(".page");
        if (pg && pg.classList.contains("collapsible")) toggleSection(pg);
        return;
      }
      // Filtros del Mercado
      if (e.target.closest("[data-mkt-refresh]")) { marketRows = null; marketFriends = null; renderMarket(); return; }
      if (e.target.closest("[data-mkt-missing]")) { mktOnlyMissing = !mktOnlyMissing; renderMarket(); return; }
      const mModeBtn = e.target.closest("[data-mkt-mode]");
      if (mModeBtn) { mktMode = mModeBtn.getAttribute("data-mkt-mode"); renderMarket(); return; }

      // Ver una foto del estado del cromo a tamaño grande (repes o mercado)
      const phView = e.target.closest("[data-photo]");
      if (phView) { openLightbox(phView.getAttribute("data-photo")); return; }
      // Quitar la foto de una repe
      const phDel = e.target.closest("[data-photodel]");
      if (phDel) {
        const dr = phDel.closest(".dup-row");
        if (dr) { Store.setListingPhoto(dr.dataset.id, null); render(); }
        return;
      }

      // Añadir amigo desde el Mercado
      const addFr = e.target.closest("[data-addfriend]");
      if (addFr) { sendFriendRequestFromEl(addFr); return; }

      // Proponer trato desde el Mercado (tocar un mini-cromo de otra persona)
      const offerEl = e.target.closest(".mc-offer[data-code]");
      if (offerEl && currentTab === "market") { proposeTradeFromEl(offerEl); return; }

      // Chat de un trato (se despliega dentro del propio trato)
      const chatBtn = e.target.closest("[data-chat]");
      if (chatBtn) {
        toggleInlineChat(chatBtn.getAttribute("data-chat"), chatBtn.getAttribute("data-other"));
        return;
      }

      // Acciones de Tratos (aceptar / rechazar / completar / cancelar)
      const trBtn = e.target.closest("[data-trade]");
      if (trBtn) { handleTradeAction(trBtn.getAttribute("data-trade"), trBtn.getAttribute("data-action")); return; }

      const cell = e.target.closest(".cell");
      const row = e.target.closest(".dup-row");
      const host = cell || row;
      if (!host) return;
      const id = host.dataset.id;
      const s = A.byId[id];
      if (!s) return;

      if (e.target.classList.contains("btn-rename")) {
        handleRename(s);
        return;
      }
      if (e.target.classList.contains("btn-dec")) {
        Store.decrement(id);
        render();
        return;
      }
      if (e.target.classList.contains("btn-inc")) {
        Store.increment(id);
        render();
        return;
      }
      // Anuncios de cambio / venta (en la pestaña Repes). Una repe siempre está
      // en Cambio (por defecto) o en Venta: se elige entre las dos, sin "apagar".
      if (e.target.classList.contains("btn-cambio")) {
        Store.setListing(id, "cambio");
        render();
        return;
      }
      if (e.target.classList.contains("btn-venta")) {
        const cur = Store.getListing(id);
        Store.setListing(id, "venta", cur ? cur.price : null);
        render();
        return;
      }
      // Condición del cambio (1x1, x2..x6)
      if (e.target.classList.contains("cond-btn")) {
        const c = Number(e.target.getAttribute("data-cond")) || 1;
        Store.setListing(id, "cambio", null, c);
        render();
        return;
      }
      // Click en el cuerpo del cromo (vista álbum / faltan).
      if (cell) {
        const count = Store.getCount(id);
        if (count === 0) {
          // PRIMERA vez: pedimos doble toque para no marcar sin querer.
          if (armedId === id) {
            // segundo toque a tiempo -> marcar
            armedId = null; armedEl = null;
            if (armTimer) { clearTimeout(armTimer); armTimer = null; }
            Store.increment(id);
            render();
          } else {
            // primer toque -> "preparar" el cromo y avisar
            clearArm();
            armedId = id; armedEl = cell;
            cell.classList.add("arming");
            const se = cell.querySelector(".cromo-state");
            if (se) se.innerHTML = '<span class="st-arm">Toca otra vez ✓</span>';
            armTimer = setTimeout(clearArm, ARM_MS);
          }
        } else {
          // Ya la tienes: un toque suma una repetida.
          Store.increment(id);
          render();
        }
      }
    });

    // Precio de venta (sin re-render para no perder el foco al escribir)
    el("#content").addEventListener("input", function (e) {
      if (!e.target.classList.contains("price-input")) return;
      const row = e.target.closest(".dup-row");
      if (!row) return;
      Store.setListing(row.dataset.id, "venta", e.target.value);
    });

    // Selección de foto del estado del cromo (pestaña Repes)
    el("#content").addEventListener("change", function (e) {
      if (!e.target.classList.contains("ph-input")) return;
      const row = e.target.closest(".dup-row");
      if (row) handlePhotoPick(e.target, row.dataset.id);
    });

    // Contacto del usuario (para cambios/ventas)
    const contact = el("#contact-input");
    if (contact) {
      contact.value = Store.getSetting("contact", "");
      contact.addEventListener("input", function () { Store.setSetting("contact", contact.value.trim()); });
    }

    // Nombre visible (perfil / mercado) + avatar con la inicial
    const pname = el("#profile-name");
    if (pname) {
      pname.value = Store.getSetting("name", "");
      pname.addEventListener("input", function () {
        Store.setSetting("name", pname.value.trim());
        const av = el("#profile-avatar");
        if (av) av.textContent = (pname.value.trim().charAt(0) || "U").toUpperCase();
      });
    }

    // Privacidad de las repes en el mercado
    function syncPriv() {
      const cur = Store.getSetting("privacy", "todos");
      document.querySelectorAll(".priv-btn").forEach(function (b) {
        b.classList.toggle("active", b.getAttribute("data-priv") === cur);
      });
    }
    document.querySelectorAll(".priv-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        if (b.disabled) return;
        Store.setSetting("privacy", b.getAttribute("data-priv"));
        syncPriv();
      });
    });
    syncPriv();
    window.WunderApp = window.WunderApp || {};
    window.WunderApp.syncPrivacy = syncPriv;

    // Avisos del sistema (permiso)
    const bnotify = el("#btn-notify");
    if (bnotify) bnotify.addEventListener("click", enableNotifications);
    syncNotifyBtn();

    // Amigos: abrir/cerrar la pantalla + acciones (aceptar/rechazar/eliminar).
    const bfr = el("#btn-friends");
    if (bfr) bfr.addEventListener("click", function () { el("#settings").hidden = true; openFriends(); });
    const frClose = el("#friends-close");
    if (frClose) frClose.addEventListener("click", function () { el("#friends").hidden = true; });
    const frBody = el("#friends-body");
    if (frBody) frBody.addEventListener("click", function (e) {
      const fb = e.target.closest("[data-friend]");
      if (fb) handleFriendAction(fb.getAttribute("data-friend"), fb.getAttribute("data-faction"));
    });

    // Aviso de propuestas/mensajes nuevos cada 30s mientras la app está abierta.
    setInterval(function () {
      if (window.Cloud && window.Cloud.isOnline && window.Cloud.isOnline()) { refreshTradesBadge(); refreshFriendsBadge(); }
    }, 30000);

    // Cambiar contraseña / exportar PDF
    const bcp = el("#btn-change-pass");
    if (bcp) bcp.addEventListener("click", changePassword);
    const bpdfM = el("#btn-pdf-missing");
    if (bpdfM) bpdfM.addEventListener("click", function () { exportPDF("missing"); });
    const bpdfR = el("#btn-pdf-repes");
    if (bpdfR) bpdfR.addEventListener("click", function () { exportPDF("repes"); });

    // Listas: exportar / importar / reiniciar (esta colección)
    el("#btn-export").addEventListener("click", exportData);
    el("#btn-import").addEventListener("click", function () { el("#import-file").click(); });
    el("#import-file").addEventListener("change", importData);
    el("#btn-reset").addEventListener("click", function () {
      const name = (A.meta && A.meta.badge) || "este álbum";
      if (window.confirm("Vas a REINICIAR " + name + ".\n\nSe borrará tu progreso de ESTA colección (no cierra tu cuenta ni afecta a otras colecciones).\n\n¿Seguro?")) {
        Store.reset();
        render();
        window.alert("Álbum reiniciado.");
      }
    });
  }

  function changePassword() {
    if (!window.Cloud || !window.Cloud.isOnline() || !window.Cloud.changePassword) {
      window.alert("Inicia sesión para cambiar la contraseña.");
      return;
    }
    const p1 = window.prompt("Nueva contraseña (mínimo 6 caracteres):");
    if (p1 == null) return;
    if (p1.length < 6) { window.alert("La contraseña debe tener al menos 6 caracteres."); return; }
    const p2 = window.prompt("Repite la nueva contraseña:");
    if (p2 == null) return;
    if (p1 !== p2) { window.alert("Las contraseñas no coinciden."); return; }
    window.Cloud.changePassword(p1)
      .then(function () { window.alert("Contraseña cambiada correctamente. ✔"); })
      .catch(function (e) { window.alert("No se pudo cambiar la contraseña. " + ((e && e.message) || "")); });
  }

  // Exporta un PDF imprimible de la colección activa.
  // which: "missing" = solo lo que falta · "repes" = solo repetidas · (vacío) = ambas.
  function exportPDF(which) {
    const st = stats();
    const meta = (A.meta && A.meta.badge) || "Swalbum";
    const date = new Date().toLocaleDateString();
    const showMissing = which !== "repes";
    const showRepes = which !== "missing";

    function missingHTML() {
      let out = "";
      function block(title, cells) {
        const miss = cells.filter(function (s) { return Store.getCount(s.id) === 0; });
        if (miss.length) out += "<h3>" + escapeHTML(title) + " (" + miss.length + ")</h3><p>" +
          miss.map(function (s) { return escapeHTML(s.codeLabel); }).join(", ") + "</p>";
      }
      A.sections.forEach(function (sec) { block(sec.title, sec.stickerIds.map(function (id) { return A.byId[id]; })); });
      A.teams.forEach(function (t) { block((t.flag ? t.flag + " " : "") + t.name, t.stickerIds.map(function (id) { return A.byId[id]; })); });
      if (A.extraSection && A.extraSection.stickerIds.length) block(A.extraSection.title, A.extraSection.stickerIds.map(function (id) { return A.byId[id]; }));
      return out || "<p>¡No te falta ninguno! 🎉</p>";
    }
    function repesHTML() {
      const rows = [];
      A.stickers.forEach(function (s) {
        const sp = Store.getCount(s.id) - 1;
        if (sp >= 1) rows.push(escapeHTML(s.codeLabel + " · " + nameOf(s)) + " <b>x" + sp + "</b>");
      });
      return rows.length ? "<p>" + rows.join("<br>") + "</p>" : "<p>Sin repetidas.</p>";
    }

    const title = "Swalbum · " + meta + (showMissing && showRepes ? "" : (showMissing ? " · Me faltan" : " · Mis repetidas"));
    const html =
      '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>' + escapeHTML(title) + '</title>' +
      '<style>body{font-family:Arial,Helvetica,sans-serif;color:#111;padding:22px;}h1{margin:0 0 2px;font-size:20px;}' +
      'h2{border-bottom:2px solid #333;padding-bottom:4px;margin:22px 0 8px;font-size:16px;}h3{margin:10px 0 2px;font-size:13px;}' +
      'p{margin:0 0 6px;font-size:12px;line-height:1.5;}.sum{color:#444;font-size:13px;margin-bottom:6px;}</style></head><body>' +
      '<h1>' + escapeHTML(title) + '</h1>' +
      '<div class="sum">' + escapeHTML(date) + ' &nbsp;·&nbsp; Tengo ' + st.owned + ' &nbsp;·&nbsp; Faltan ' + st.missing + ' &nbsp;·&nbsp; Repes ' + st.dupes + '</div>' +
      (showMissing ? ('<h2>🔍 Me faltan</h2>' + missingHTML()) : "") +
      (showRepes ? ('<h2>🔁 Mis repetidas</h2>' + repesHTML()) : "") +
      '</body></html>';

    const w = window.open("", "_blank");
    if (!w) { window.alert("Permite las ventanas emergentes para exportar/imprimir el PDF."); return; }
    w.document.open(); w.document.write(html); w.document.close(); w.focus();
    setTimeout(function () { try { w.print(); } catch (e) {} }, 400);
  }

  function exportData() {
    const active = (window.COLLECTIONS && window.COLLECTIONS.active) || "album";
    const blob = new Blob([Store.exportData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "swalbum-respaldo-" + active + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const data = JSON.parse(reader.result);
        if (!data || typeof data !== "object" || (!data.counts && !data.names && !data.listings && !data.settings)) {
          throw new Error("formato no reconocido");
        }
        Store.importData(reader.result);
        // Refresca el contacto y la pantalla.
        const contact = el("#contact-input");
        if (contact) contact.value = Store.getSetting("contact", "");
        render();
        window.alert("Respaldo importado correctamente. ✔");
      } catch (err) {
        window.alert("No se pudo leer el archivo. Asegúrate de elegir un respaldo de Swalbum (.json).");
      }
    };
    reader.onerror = function () {
      window.alert("No se pudo abrir el archivo. Inténtalo de nuevo.");
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // Abre / cierra una sección (sin re-dibujar todo).
  function toggleSection(pageEl) {
    const key = pageEl.getAttribute("data-key");
    if (!key) return;
    if (expanded.has(key)) { expanded.delete(key); pageEl.classList.add("collapsed"); }
    else { expanded.add(key); pageEl.classList.remove("collapsed"); }
  }

  // ---------- Atajo de banderas ----------
  // Una tira de banderas (por grupos) para saltar directo a cada selección.
  function buildFlagbar() {
    const bar = el("#flagbar");
    if (!bar) return;
    // Lista de todas las secciones plegables (para "Expandir/Plegar todo").
    allSectionKeys = [];
    A.sections.forEach(function (s) { allSectionKeys.push(s.key); });
    A.teams.forEach(function (t) { allSectionKeys.push(t.id); });
    if (A.extraSection && A.extraSection.stickerIds.length) allSectionKeys.push("extras");
    let html = '<button class="flagchip flagchip-special" data-goto="__top" title="Inicio">⭐</button>';
    if (A.groups.length) {
      // Mundiales: banderas agrupadas por grupo.
      A.groups.forEach(function (g) {
        html += '<span class="flagbar-sep">' + g + '</span>';
        A.teams.filter(function (t) { return t.group === g; }).forEach(function (t) {
          html += '<button class="flagchip" data-goto="' + t.id + '" title="' + escapeHTML(t.name) + '">' + t.flag + '</button>';
        });
      });
    } else {
      // Clubes (Adrenalyn): atajo por código de club (texto).
      A.teams.forEach(function (t) {
        html += '<button class="flagchip flagchip-code" data-goto="' + t.id + '" title="' + escapeHTML(t.name) + '">' + escapeHTML(t.code) + '</button>';
      });
    }
    if (A.extraSection && A.extraSection.stickerIds.length) {
      html += '<button class="flagchip flagchip-special" data-goto="__extras" title="' + escapeHTML(A.extraSection.title) + '">📦</button>';
    }
    bar.innerHTML = html;
    bar.addEventListener("click", function (e) {
      const b = e.target.closest("[data-goto]");
      if (b) gotoTarget(b.getAttribute("data-goto"));
    });
  }

  // Desplaza hasta una selección (o inicio / extras), con margen por la cabecera.
  function gotoTarget(key) {
    // Si estábamos buscando o en otra pestaña, volvemos al álbum limpio.
    let needRender = false;
    if (query) { query = ""; const s = el("#search"); if (s) s.value = ""; needRender = true; }
    if (currentTab !== "album") { currentTab = "album"; needRender = true; }
    // Abrimos la sección destino (salvo "inicio").
    if (key !== "__top") expanded.add(key === "__extras" ? "extras" : key);
    if (needRender) render();

    if (key === "__top") { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    const target = key === "__extras"
      ? document.getElementById("sec-extras")
      : document.querySelector('.page[data-team="' + key + '"]');
    if (!target) return;
    target.classList.remove("collapsed"); // por si no hubo re-dibujo
    const header = document.querySelector(".app-header");
    const off = (document.body.classList.contains("header-collapsed") || !header) ? 8 : header.offsetHeight + 8;
    const top = target.getBoundingClientRect().top + (window.scrollY || window.pageYOffset) - off;
    window.scrollTo({ top: top, behavior: "smooth" });
  }

  // ---------- Colecciones (familias → ediciones) ----------
  function setupCollections() {
    const C = window.COLLECTIONS;
    const btn = document.getElementById("collection-btn");
    const overlay = document.getElementById("collections");
    const body = document.getElementById("coll-body");
    const close = document.getElementById("coll-close");
    if (!C || !btn || !overlay || !body) return;

    // Etiqueta del botón con la colección activa.
    const act = C.find(C.active);
    const label = document.getElementById("coll-active-label");
    if (label && act) label.textContent = act.emoji + " " + act.title;

    function renderList() {
      let html = "";
      C.families.forEach(function (f) {
        html += '<div class="coll-fam">' + f.emoji + " " + escapeHTML(f.name) + "</div>";
        f.editions.forEach(function (e) {
          const isActive = e.id === C.active;
          const ready = e.status === "ready";
          const chip = isActive
            ? '<span class="ci-chip active">✓ Activa</span>'
            : (ready ? '<span class="ci-chip ready">Disponible</span>' : '<span class="ci-chip soon">Próximamente</span>');
          html +=
            '<button class="coll-item' + (ready ? "" : " is-soon") + (isActive ? " is-active" : "") + '" data-coll="' + e.id + '" data-ready="' + (ready ? "1" : "0") + '">' +
              '<span class="ci-text"><span class="ci-title">' + escapeHTML(e.title) + '</span>' +
                '<span class="ci-sub">' + escapeHTML(e.sub) + '</span></span>' +
              chip +
            '</button>';
        });
      });
      html += '<p class="coll-note">¿Echas en falta una colección? Dínosla y la añadimos. 🙌</p>';
      body.innerHTML = html;
    }

    function open() { renderList(); overlay.hidden = false; }
    function hide() { overlay.hidden = true; }

    btn.addEventListener("click", open);
    close.addEventListener("click", hide);
    body.addEventListener("click", function (e) {
      const it = e.target.closest("[data-coll]");
      if (!it) return;
      const id = it.getAttribute("data-coll");
      const ready = it.getAttribute("data-ready") === "1";
      if (!ready) {
        it.classList.add("shake");
        setTimeout(function () { it.classList.remove("shake"); }, 500);
        return; // "Próximamente": aún no disponible
      }
      if (id === C.active) { hide(); return; }
      C.setActive(id);
      location.reload(); // recarga con la colección elegida
    });
  }

  // ---------- Cabecera plegable (con botón) ----------
  // Un botón flotante esconde/muestra la cabecera cuando TÚ quieras, para
  // ganar espacio sin movimientos automáticos que despisten al deslizar.
  function setupHeaderToggle() {
    const fab = document.getElementById("header-toggle");
    if (!fab) return;
    function sync() {
      const collapsed = document.body.classList.contains("header-collapsed");
      fab.textContent = collapsed ? "▾" : "▴";
      fab.title = collapsed ? "Mostrar la barra superior" : "Ocultar la barra superior";
    }
    fab.addEventListener("click", function () {
      document.body.classList.toggle("header-collapsed");
      sync();
    });
    sync();
  }

  // Cabecera según la colección activa (badge, anfitriones, nº de cromos).
  function applyCollectionMeta() {
    const meta = A.meta || {};
    const sub = document.querySelector(".brand-sub");
    if (sub) sub.innerHTML = '<span class="brand-badge">' + escapeHTML(meta.badge || "") + '</span> ' +
      (meta.hosts || "") + ' · ' + A.total + ' cromos';
    const ep = el("#extra-prog");
    if (ep) ep.style.display = (A.extrasTotal > 0) ? "" : "none";
  }

  // Exponemos funciones para la nube y para botones inline.
  window.WunderApp = { render: render, refreshTradesBadge: refreshTradesBadge, refreshFriendsBadge: refreshFriendsBadge, closeChat: closeChat, notifyInbox: notifyInbox };

  // ---------- Inicio ----------
  document.addEventListener("DOMContentLoaded", function () {
    wireEvents();
    buildFlagbar();
    applyCollectionMeta();
    render();
    setupHeaderToggle();
    setupCollections();
    refreshFriendsBadge();
  });
})();
