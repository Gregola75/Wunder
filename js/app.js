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

    // Selecciones por grupo
    A.groups.forEach(function (g) {
      const groupTeams = A.teams.filter(function (t) { return t.group === g; });
      let teamsHTML = "";
      groupTeams.forEach(function (team) {
        const cells = team.stickerIds.map(function (id) { return A.byId[id]; });
        const teamMatches = matchesQuery(team.name) || matchesQuery(team.code);
        const visible = teamMatches ? cells : cells.filter(function (s) { return stickerMatches(s); });
        if (visible.length === 0) return;
        const owned = teamProgress(team);
        const col = (!query && !expanded.has(team.id)) ? " collapsed" : "";
        teamsHTML +=
          '<section class="page collapsible' + col + '" data-team="' + team.id + '" data-key="' + team.id + '">' +
            '<div class="page-head">' +
              '<div class="page-title"><span class="page-emoji">' + team.flag + '</span> ' +
                team.name + ' <small>Grupo ' + team.group + '</small></div>' +
              '<div class="page-right"><span class="page-prog">' + owned + "/20</span><span class=\"page-chev\">▸</span></div>" +
            '</div>' +
            '<div class="grid">' + visible.map(cellHTML).join("") + '</div>' +
          '</section>';
      });
      if (teamsHTML) {
        html += '<div class="group-label">Grupo ' + g + '</div>' + teamsHTML;
      }
    });

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
    el("#extra-prog").textContent = "🥤 Extras Coca-Cola: " + st.ownedExtra + " / " + st.extrasTotal;

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

    // Menú: exportar / importar / reiniciar
    el("#btn-export").addEventListener("click", exportData);
    el("#btn-import").addEventListener("click", function () { el("#import-file").click(); });
    el("#import-file").addEventListener("change", importData);
    el("#btn-reset").addEventListener("click", function () {
      if (window.confirm("¿Seguro que quieres borrar TODO tu progreso? Esto no se puede deshacer.")) {
        Store.reset();
        render();
      }
    });
  }

  function exportData() {
    const blob = new Blob([Store.exportData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mi-album-mundial-2026.json";
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
        Store.importData(reader.result);
        render();
        window.alert("Progreso importado correctamente. ✔");
      } catch (err) {
        window.alert("No se pudo leer el archivo. Asegúrate de que sea un respaldo válido.");
      }
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
    allSectionKeys.push("extras");
    let html = '<button class="flagchip flagchip-special" data-goto="__top" title="Inicio">⭐</button>';
    A.groups.forEach(function (g) {
      html += '<span class="flagbar-sep">' + g + '</span>';
      A.teams.filter(function (t) { return t.group === g; }).forEach(function (t) {
        html += '<button class="flagchip" data-goto="' + t.id + '" title="' + escapeHTML(t.name) + '">' + t.flag + '</button>';
      });
    });
    html += '<button class="flagchip flagchip-special" data-goto="__extras" title="Extras Coca-Cola">🥤</button>';
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

  // Exponemos render() para que la nube refresque la pantalla tras sincronizar.
  window.WunderApp = { render: render };

  // ---------- Inicio ----------
  document.addEventListener("DOMContentLoaded", function () {
    wireEvents();
    buildFlagbar();
    render();
    setupHeaderToggle();
  });
})();
