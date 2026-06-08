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
      const priceVal = isVenta && lst.price != null ? lst.price : "";
      const cond = (lst && lst.cond) || 1;

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
    // Si ya tenemos las ofertas en caché, solo re-filtramos (sin recargar).
    if (marketRows) { host.innerHTML = marketHTML(marketRows); return; }
    host.innerHTML = '<div class="empty">Cargando mercado… ⏳</div>';
    window.Cloud.fetchMarket().then(function (rows) {
      marketRows = rows || [];
      if (currentTab === "market") host.innerHTML = marketHTML(marketRows);
    }).catch(function () {
      host.innerHTML = '<div class="empty">No se pudo cargar el mercado. ¿Creaste la tabla en Supabase? Revisa también tu internet.</div>';
    });
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
        '<div class="mc-flag">' + flagFor(s) + '</div>' +
        '<div class="mc-code">' + s.codeLabel + '</div>' +
        '<div class="mc-mode mkt-mode-' + o.mode + '">' + mode + '</div>' +
      '</div>'
    );
  }

  function marketHTML(rows) {
    // Agrupamos por usuario: una tarjeta por persona con sus cromos en oferta.
    const users = [];
    rows.forEach(function (row) {
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
        items.push({ s: s, code: code, mode: mode, price: info.price, spare: info.spare || 1, missing: missing, cond: info.cond || 1 });
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
      html +=
        '<div class="ucard">' +
          '<div class="ucard-head">' +
            '<div class="ucard-id">👤 ' + escapeHTML(row.display_name || "Coleccionista") +
              (u.needCount ? ' <span class="ucard-need">🎯 ' + u.needCount + ' te faltan</span>' : "") + '</div>' +
            contactBtnHTML(row.contact) +
          '</div>' +
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
    const s = codeIndex[code];
    const label = s ? s.codeLabel : code;
    let what;
    if (mode === "venta") what = "comprar" + (priceStr ? " (" + priceStr + ")" : "");
    else what = (cond > 1) ? ("cambiar (te pide " + cond + " a cambio)") : "cambiar (trato simple)";
    if (!window.confirm("¿Proponer " + what + " " + label + " a " + oname + "?\n\nSe le avisará y, si acepta, veréis vuestros contactos para cerrar el trato.")) return;
    window.Cloud.createTrade({
      toUser: oid, toName: oname, toContact: ocontact,
      code: code, mode: mode, price: priceStr ? Number(priceStr) : null, cond: cond,
    }).then(function () {
      window.alert("¡Propuesta enviada! La verás en la pestaña 🤝 Tratos.");
    }).catch(function () {
      window.alert("No se pudo enviar la propuesta. ¿Creaste la tabla 'trades' en Supabase?");
    });
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

  function renderTrades() {
    const host = el("#content");
    if (!window.Cloud || !window.Cloud.fetchTrades || !window.Cloud.isOnline()) {
      host.innerHTML = '<div class="empty">Inicia sesión para ver tus tratos. ☁️</div>'; return;
    }
    host.innerHTML = '<div class="empty">Cargando tratos… ⏳</div>';
    window.Cloud.fetchTrades().then(function (rows) {
      host.innerHTML = tradesHTML(rows || []);
      refreshTradesBadge();
    }).catch(function () {
      host.innerHTML = '<div class="empty">No se pudieron cargar los tratos. ¿Creaste la tabla "trades" en Supabase?</div>';
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
        actions = '<div class="tr-actions">' + chatBtn + '<button class="tr-btn ok" data-trade="' + t.id + '" data-action="completar">Marcar completado</button></div>';
      } else if (t.status === "completada") {
        actions = '<div class="tr-actions">' + chatBtn + '</div>';
      }
      const statusChip = '<span class="tr-status st-' + t.status + '">' + t.status + '</span>';
      return '<div class="tr-card">' +
        '<div class="tr-top"><div class="tr-code">' + L.where + '</div>' +
          '<div class="tr-info"><div class="tr-name">' + L.name + '</div>' +
            '<div class="tr-sub">' + (role === "recibido" ? ("De " + escapeHTML(otherName)) : ("Para " + escapeHTML(otherName))) + ' · ' + L.modo + '</div></div>' +
          statusChip + '</div>' + contacts + actions + '</div>';
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

  function chatActionsHTML(role, status) {
    if (status === "pendiente" && role === "recibido") {
      return '<button class="tr-btn ok" data-cact="aceptar">✅ Cerrar trato (apartar)</button>' +
             '<button class="tr-btn no" data-cact="rechazar">✕ Rechazar</button>';
    }
    if (status === "pendiente" && role === "enviado") {
      return '<div class="chat-note">Esperando que el dueño cierre el trato contigo.</div>' +
             '<button class="tr-btn" data-cact="cancelar">Cancelar propuesta</button>';
    }
    if (status === "aceptada") {
      return '<div class="chat-note">✅ Trato apartado. Coordinad la entrega por aquí y marcad completado.</div>' +
             '<button class="tr-btn ok" data-cact="completar">Marcar completado</button>';
    }
    return "";
  }

  function openChat(tradeId, otherId, otherName, ctx, role, status) {
    if (!window.Cloud || !window.Cloud.fetchMessages || !window.Cloud.isOnline()) {
      window.alert("Inicia sesión para chatear."); return;
    }
    chatState = { tradeId: tradeId, otherId: otherId, msgs: [], channel: null, poll: null };
    el("#chat-title").textContent = "💬 " + (otherName || "Trato");
    const sub = el("#chat-sub"); if (sub) sub.textContent = ctx || "";
    const acts = el("#chat-actions"); if (acts) acts.innerHTML = chatActionsHTML(role, status);
    el("#chat-msgs").innerHTML = '<div class="empty sm">Cargando…</div>';
    el("#chat-input").value = "";
    el("#chat").hidden = false;
    markChatSeen();

    function merge(arr) {
      arr.forEach(function (m) { if (!chatState.msgs.some(function (x) { return x.id === m.id; })) chatState.msgs.push(m); });
      chatState.msgs.sort(function (a, b) { return (a.created_at || "").localeCompare(b.created_at || ""); });
      renderChatMsgs();
    }
    chatState.merge = merge;

    window.Cloud.fetchMessages(tradeId).then(function (list) {
      if (!chatState) return; chatState.msgs = []; merge(list || []);
    }).catch(function () {
      el("#chat-msgs").innerHTML = '<div class="empty sm">No se pudo cargar el chat. ¿Creaste la tabla "messages" en Supabase?</div>';
    });
    chatState.channel = window.Cloud.subscribeMessages(tradeId, function (m) { if (chatState) chatState.merge([m]); });
    chatState.poll = setInterval(function () {
      window.Cloud.fetchMessages(tradeId).then(function (list) { if (chatState) chatState.merge(list || []); }).catch(function () {});
    }, 4000);
  }
  function renderChatMsgs() {
    const me = window.Cloud.myId ? window.Cloud.myId() : null;
    const host = el("#chat-msgs");
    if (!chatState || !chatState.msgs.length) { host.innerHTML = '<div class="empty sm">Aún no hay mensajes. ¡Escribe el primero para negociar! 💬</div>'; return; }
    host.innerHTML = chatState.msgs.map(function (m) {
      const mine = m.from_user === me;
      return '<div class="bubble ' + (mine ? "me" : "them") + '">' + escapeHTML(m.text) + '</div>';
    }).join("");
    host.scrollTop = host.scrollHeight;
  }
  function closeChat() {
    if (chatState) {
      if (chatState.channel) window.Cloud.unsubscribe(chatState.channel);
      if (chatState.poll) clearInterval(chatState.poll);
    }
    chatState = null;
    el("#chat").hidden = true;
    markChatSeen();
    refreshTradesBadge();
  }
  function sendChat() {
    if (!chatState) return;
    const inp = el("#chat-input");
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
        if (currentTab === "market") marketRows = null;
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
      if (e.target.closest("[data-mkt-refresh]")) { marketRows = null; renderMarket(); return; }
      if (e.target.closest("[data-mkt-missing]")) { mktOnlyMissing = !mktOnlyMissing; renderMarket(); return; }
      const mModeBtn = e.target.closest("[data-mkt-mode]");
      if (mModeBtn) { mktMode = mModeBtn.getAttribute("data-mkt-mode"); renderMarket(); return; }

      // Proponer trato desde el Mercado (tocar un mini-cromo de otra persona)
      const offerEl = e.target.closest(".mc-offer[data-code]");
      if (offerEl && currentTab === "market") { proposeTradeFromEl(offerEl); return; }

      // Chat de un trato
      const chatBtn = e.target.closest("[data-chat]");
      if (chatBtn) {
        openChat(chatBtn.getAttribute("data-chat"), chatBtn.getAttribute("data-other"),
          chatBtn.getAttribute("data-othername"), chatBtn.getAttribute("data-ctx"),
          chatBtn.getAttribute("data-role"), chatBtn.getAttribute("data-status"));
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
      // Anuncios de cambio / venta (en la pestaña Repes)
      if (e.target.classList.contains("btn-cambio")) {
        const cur = Store.getListing(id);
        Store.setListing(id, cur && cur.type === "cambio" ? null : "cambio");
        render();
        return;
      }
      if (e.target.classList.contains("btn-venta")) {
        const cur = Store.getListing(id);
        Store.setListing(id, cur && cur.type === "venta" ? null : "venta", cur ? cur.price : null);
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

    // Chat
    const chatForm = el("#chat-form");
    if (chatForm) chatForm.addEventListener("submit", function (e) { e.preventDefault(); sendChat(); });
    const chatCloseBtn = el("#chat-close");
    if (chatCloseBtn) chatCloseBtn.addEventListener("click", closeChat);
    const chatActs = el("#chat-actions");
    if (chatActs) chatActs.addEventListener("click", function (e) {
      const b = e.target.closest("[data-cact]");
      if (!b || !chatState) return;
      const tid = chatState.tradeId;
      handleTradeAction(tid, b.getAttribute("data-cact"));
      closeChat();
      currentTab = "trades";
      render();
    });

    // Aviso de propuestas/mensajes nuevos cada 30s mientras la app está abierta.
    setInterval(function () { if (window.Cloud && window.Cloud.isOnline && window.Cloud.isOnline()) refreshTradesBadge(); }, 30000);

    // Cambiar contraseña / exportar PDF
    const bcp = el("#btn-change-pass");
    if (bcp) bcp.addEventListener("click", changePassword);
    const bpdf = el("#btn-export-pdf");
    if (bpdf) bpdf.addEventListener("click", exportPDF);

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

  // Exporta un PDF imprimible (faltan + repes) de la colección activa.
  function exportPDF() {
    const st = stats();
    const meta = (A.meta && A.meta.badge) || "Swalbum";
    const date = new Date().toLocaleDateString();

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

    const html =
      '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Swalbum · ' + escapeHTML(meta) + '</title>' +
      '<style>body{font-family:Arial,Helvetica,sans-serif;color:#111;padding:22px;}h1{margin:0 0 2px;font-size:20px;}' +
      'h2{border-bottom:2px solid #333;padding-bottom:4px;margin:22px 0 8px;font-size:16px;}h3{margin:10px 0 2px;font-size:13px;}' +
      'p{margin:0 0 6px;font-size:12px;line-height:1.5;}.sum{color:#444;font-size:13px;margin-bottom:6px;}</style></head><body>' +
      '<h1>Swalbum · ' + escapeHTML(meta) + '</h1>' +
      '<div class="sum">' + escapeHTML(date) + ' &nbsp;·&nbsp; Tengo ' + st.owned + ' &nbsp;·&nbsp; Faltan ' + st.missing + ' &nbsp;·&nbsp; Repes ' + st.dupes + '</div>' +
      '<h2>🔍 Me faltan</h2>' + missingHTML() +
      '<h2>🔁 Mis repetidas</h2>' + repesHTML() +
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

  // Exponemos render() y el contador de tratos para que la nube los refresque.
  window.WunderApp = { render: render, refreshTradesBadge: refreshTradesBadge };

  // ---------- Inicio ----------
  document.addEventListener("DOMContentLoaded", function () {
    wireEvents();
    buildFlagbar();
    applyCollectionMeta();
    render();
    setupHeaderToggle();
    setupCollections();
  });
})();
