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

  const el = function (sel) { return document.querySelector(sel); };

  // ---------- Estadísticas ----------
  function stats() {
    let owned = 0, missing = 0, dupes = 0;
    A.stickers.forEach(function (s) {
      const c = Store.getCount(s.id);
      if (c >= 1) owned += 1; else missing += 1;
      if (c >= 2) dupes += c - 1;
    });
    return { owned: owned, missing: missing, dupes: dupes, total: A.total };
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

  // ---------- Render de un cromo ----------
  function cellHTML(s) {
    const c = Store.getCount(s.id);
    const owned = c >= 1;
    const dup = Math.max(0, c - 1);
    const cls = ["cell"];
    if (owned) cls.push("owned");
    if (dup > 0) cls.push("dupe");
    if (s.foil) cls.push("foil");

    return (
      '<div class="' + cls.join(" ") + '" data-id="' + s.id + '">' +
        '<div class="cell-actions">' +
          '<button class="mini btn-rename" title="Renombrar">✎</button>' +
          (owned ? '<button class="mini btn-dec" title="Quitar una">−</button>' : "") +
        '</div>' +
        '<div class="cell-no">' + s.no + (s.foil ? ' <span class="foil-dot" title="Foil">✦</span>' : "") + '</div>' +
        '<div class="cell-name">' + escapeHTML(nameOf(s)) + '</div>' +
        '<div class="cell-status">' +
          (owned
            ? '<span class="chip ok">✓ Tengo</span>' + (dup > 0 ? ' <span class="chip dup">+' + dup + '</span>' : "")
            : '<span class="chip none">Falta</span>') +
        '</div>' +
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

    // Secciones especiales
    A.sections.forEach(function (sec) {
      const cells = sec.stickerIds.map(function (id) { return A.byId[id]; });
      const visible = cells.filter(function (s) { return matchesQuery(nameOf(s)) || matchesQuery(sec.title); });
      if (visible.length === 0) return;
      const owned = cells.filter(function (s) { return Store.getCount(s.id) >= 1; }).length;
      html +=
        '<section class="page">' +
          '<div class="page-head">' +
            '<div class="page-title"><span class="page-emoji">⭐</span> ' + sec.title +
              ' <small>' + sec.subtitle + '</small></div>' +
            '<div class="page-prog">' + owned + "/" + cells.length + '</div>' +
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
        const visible = teamMatches ? cells : cells.filter(function (s) { return matchesQuery(nameOf(s)); });
        if (visible.length === 0) return;
        const owned = teamProgress(team);
        teamsHTML +=
          '<section class="page" data-team="' + team.id + '">' +
            '<div class="page-head">' +
              '<div class="page-title"><span class="page-emoji">' + team.flag + '</span> ' +
                team.name + ' <small>Grupo ' + team.group + '</small></div>' +
              '<div class="page-prog">' + owned + "/20</div>" +
            '</div>' +
            '<div class="grid">' + visible.map(cellHTML).join("") + '</div>' +
          '</section>';
      });
      if (teamsHTML) {
        html += '<div class="group-label">Grupo ' + g + '</div>' + teamsHTML;
      }
    });

    if (!html) html = '<div class="empty">No se encontraron cromos para "' + escapeHTML(query) + '".</div>';
    el("#content").innerHTML = html;
  }

  // ---------- Render: pestaña Faltan ----------
  function renderMissing() {
    let html = "";
    let totalMissing = 0;

    function block(title, emoji, cells) {
      const missing = cells.filter(function (s) {
        return Store.getCount(s.id) === 0 && (matchesQuery(nameOf(s)) || matchesQuery(title));
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
      if (spare >= 1 && (matchesQuery(nameOf(s)))) {
        rows.push({ s: s, spare: spare });
        totalSpare += spare;
      }
    });

    if (rows.length === 0) {
      el("#content").innerHTML = '<div class="empty">No tienes repetidas todavía. Cuando una llegue a 2+ aparecerá aquí para cambiar o vender. 🔁</div>';
      return;
    }

    let html = '<div class="list-summary">Tienes <b>' + totalSpare + '</b> cromos repetidos para cambiar / vender (' + rows.length + ' distintos).</div>';
    html += '<div class="dup-list">';
    rows.forEach(function (r) {
      const s = r.s;
      const team = s.teamId ? A.teams.find(function (t) { return t.id === s.teamId; }) : null;
      const where = team ? (team.flag + " " + team.name + " · Grupo " + team.group) : "Especial";
      html +=
        '<div class="dup-row" data-id="' + s.id + '">' +
          '<div class="dup-no">' + s.no + '</div>' +
          '<div class="dup-info"><div class="dup-name">' + escapeHTML(nameOf(s)) + '</div>' +
            '<div class="dup-where">' + escapeHTML(where) + ' · ' + roleTag(s) + '</div></div>' +
          '<div class="dup-count"><button class="mini btn-dec">−</button>' +
            '<span class="dup-x">x' + r.spare + '</span>' +
            '<button class="mini btn-inc">+</button></div>' +
        '</div>';
    });
    html += '</div>';
    el("#content").innerHTML = html;
  }

  // ---------- Render principal ----------
  function render() {
    // estadísticas de cabecera
    const st = stats();
    const pct = Math.round((st.owned / st.total) * 100);
    el("#stat-owned").textContent = st.owned;
    el("#stat-missing").textContent = st.missing;
    el("#stat-dupes").textContent = st.dupes;
    el("#progress-fill").style.width = pct + "%";
    el("#progress-pct").textContent = pct + "% · " + st.owned + "/" + st.total;

    // pestaña activa
    document.querySelectorAll(".tab").forEach(function (t) {
      t.classList.toggle("active", t.dataset.tab === currentTab);
    });

    if (currentTab === "album") renderAlbum();
    else if (currentTab === "missing") renderMissing();
    else renderDuplicates();
  }

  // ---------- Acciones sobre cromos ----------
  function handleRename(s) {
    const actual = nameOf(s);
    const nuevo = window.prompt("Nuevo nombre para el cromo #" + s.no + ":", actual);
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
      // Click en el cuerpo del cromo (sólo en vista álbum / faltan) => sumar 1
      if (cell) {
        Store.increment(id);
        render();
      }
    });

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

  // ---------- Inicio ----------
  document.addEventListener("DOMContentLoaded", function () {
    wireEvents();
    render();
  });
})();
