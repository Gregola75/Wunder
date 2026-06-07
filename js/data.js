/*
 * data.js — Estructura del álbum Panini Copa Mundial 2026
 *
 * Réplica de la estructura oficial:
 *   - 980 cromos en total (112 páginas).
 *   - Apertura: 9 cromos foil (logo, emblema, mascotas, balón, anfitriones...).
 *   - FIFA Museum: 11 cromos foil (leyendas / campeones históricos).
 *   - 48 selecciones x 20 cromos = 960 (escudo foil, foto de equipo, 18 jugadores).
 *
 * Numeración secuencial 1..980:
 *   1-9    -> Apertura
 *   10-20  -> FIFA Museum
 *   21-980 -> Selecciones (en orden de grupo A..L)
 *
 * Los nombres de jugadores vienen como plantillas editables ("Jugador 1"...),
 * porque las plantillas oficiales se confirman cerca del torneo. Puedes
 * renombrar cualquier cromo tocando dos veces su nombre dentro del álbum.
 */

(function () {
  "use strict";

  // ¿Qué colección está activa? Si es un Mundial anterior (2010-2022), se
  // construye con un builder simple (32 selecciones × 20). El Mundial 2026
  // (con Apertura, FIFA Museum y Coca-Cola) se construye más abajo igual que siempre.
  var ACTIVE = (window.COLLECTIONS && window.COLLECTIONS.active) || "wc2026";
  if (window.ADRENALYN && window.ADRENALYN[ACTIVE]) {
    buildClubCardSet(ACTIVE, window.ADRENALYN[ACTIVE]);
    return;
  }
  if (ACTIVE !== "wc2026" && window.WORLDCUPS && window.WORLDCUPS[ACTIVE]) {
    buildSimpleWorldCup(ACTIVE, window.WORLDCUPS[ACTIVE]);
    return;
  }

  // Builder para colecciones de CARTAS por club (Adrenalyn): base por club +
  // series especiales + extras (estadios). Sin grupos.
  function buildClubCardSet(id, cfg) {
    var stickers = [], teams = [], sections = [], no = 0;
    function add(s) { no += 1; s.no = no; s.id = "s" + no; stickers.push(s); return s; }

    // Base: cada club = escudo + N jugadores, numerados de forma correlativa.
    cfg.clubs.forEach(function (c) {
      var teamId = c[1];
      var team = { id: teamId, name: c[0], code: c[1], flag: "🛡️", group: "", stickerIds: [] };
      var st = add({ section: "team", teamId: teamId, role: "badge", name: "Escudo " + c[0], foil: true,
                     flag: "🛡️", code: String(no + 1), codeLabel: "#" + (no + 1) });
      team.stickerIds.push(st.id);
      for (var p = 1; p <= cfg.playersPerClub; p++) {
        st = add({ section: "team", teamId: teamId, role: "player", name: "Jugador " + p, foil: false,
                   flag: "🛡️", code: String(no + 1), codeLabel: "#" + (no + 1) });
        team.stickerIds.push(st.id);
      }
      teams.push(team);
    });

    // Series especiales.
    cfg.series.forEach(function (serie) {
      var key = serie[0], title = serie[1], sub = serie[2], count = serie[3];
      var ids = [];
      for (var i = 1; i <= count; i++) {
        var st = add({ section: key, role: "special", name: title + " " + i, foil: true,
                       code: String(no + 1), codeLabel: "#" + (no + 1) });
        ids.push(st.id);
      }
      sections.push({ key: key, title: title, subtitle: sub, stickerIds: ids });
    });

    // Extras (estadios BIS), fuera del total principal.
    var extraIds = [];
    var exTitle = cfg.extras[0], exCount = cfg.extras[1];
    for (var e = 1; e <= exCount; e++) {
      var stx = add({ section: "extra", role: "stadium", extra: true, name: "Estadio " + e,
                      flag: "🏟️", foil: true, code: "BIS" + e, codeLabel: "BIS " + e });
      extraIds.push(stx.id);
    }

    stickers.forEach(function (s) {
      if (s.extra) { s.rarity = "rara"; s.value = 5; }
      else if (s.foil) { s.rarity = "rara"; s.value = 3; }
      else { s.rarity = "comun"; s.value = 1; }
    });

    var baseCount = stickers.filter(function (s) { return !s.extra; }).length;
    window.ALBUM = {
      total: baseCount, extrasTotal: extraIds.length, totalAll: stickers.length,
      stickers: stickers, teams: teams, sections: sections,
      extraSection: { key: "extras", title: exTitle, subtitle: "", stickerIds: extraIds },
      groups: [], // sin grupos: clubes en lista
      byId: stickers.reduce(function (m, s) { m[s.id] = s; return m; }, {}),
      meta: cfg.meta,
    };
  }

  // Builder para Mundiales anteriores: selecciones (escudo + foto + N jugadores)
  // + secciones especiales (apertura, estadios…) según la distribución real.
  function buildSimpleWorldCup(id, cfg) {
    var stickers = [], teams = [], sections = [], no = 0;
    function add(s) { no += 1; s.no = no; s.id = "s" + no; stickers.push(s); return s; }
    var players = cfg.players || 17;

    Object.keys(cfg.groups).forEach(function (g) {
      cfg.groups[g].forEach(function (t) {
        var teamId = t[1];
        var team = { id: teamId, name: t[0], code: t[1], flag: t[2], group: g, stickerIds: [] };
        var pos = 0;
        function tadd(role, name, foil) {
          pos += 1;
          var st = add({ section: "team", teamId: teamId, group: g, role: role, name: name, foil: foil,
                         code: teamId + pos, codeLabel: teamId + " " + pos });
          team.stickerIds.push(st.id);
        }
        tadd("badge", "Escudo " + t[0], true);
        tadd("team_photo", "Plantilla " + t[0], false);
        for (var p = 1; p <= players; p++) tadd("player", "Jugador " + p, false);
        teams.push(team);
      });
    });

    var sno = 0;
    (cfg.specials || []).forEach(function (sp) {
      var ids = [];
      for (var i = 1; i <= sp.count; i++) {
        sno += 1;
        var st = add({ section: sp.key, role: "special", name: sp.title + " " + i, foil: true,
                       code: "S" + sno, codeLabel: "#" + sno });
        ids.push(st.id);
      }
      sections.push({ key: sp.key, title: sp.title, subtitle: sp.subtitle || "", stickerIds: ids });
    });

    stickers.forEach(function (s) {
      if (s.foil) { s.rarity = "rara"; s.value = 3; } else { s.rarity = "comun"; s.value = 1; }
    });
    window.ALBUM = {
      total: stickers.length, extrasTotal: 0, totalAll: stickers.length,
      stickers: stickers, teams: teams, sections: sections,
      extraSection: { key: "extras", title: "Extras", subtitle: "", stickerIds: [] },
      groups: Object.keys(cfg.groups),
      byId: stickers.reduce(function (m, s) { m[s.id] = s; return m; }, {}),
      meta: { badge: cfg.badge, hosts: cfg.hosts, host: cfg.host },
    };
  }

  // --- Apertura (9 cromos foil): cromo 00 + FWC 1..8 ---
  // Confirmado: el cromo 00 es el primero; FWC 1 y FWC 2 son el Trofeo.
  // (Los nombres son editables: tócalos dos veces para ajustarlos a tu álbum.)
  const OPENING_00 = "Apertura (00)"; // primer cromo del álbum
  const OPENING_FWC = [
    "Trofeo de la Copa Mundial (1)", // FWC 1
    "Trofeo de la Copa Mundial (2)", // FWC 2
    "Emblema oficial FIFA 2026",     // FWC 3
    "Mascotas oficiales",            // FWC 4
    "Balón oficial",                 // FWC 5
    "Eslogan oficial",               // FWC 6
    "Anfitrión: Canadá",             // FWC 7
    "Anfitrión: México / EE. UU.",   // FWC 8
  ];

  // --- FIFA Museum (11 cromos foil): FWC 9..19 ---
  // Campeones históricos (confirmado: FWC 9 = Italia 1934).
  const MUSEUM = [
    "Italia 1934",        // FWC 9
    "Uruguay 1950",       // FWC 10
    "Alemania (RFA) 1954",// FWC 11
    "Brasil 1962",        // FWC 12
    "Alemania (RFA) 1974",// FWC 13
    "Argentina 1986",     // FWC 14
    "Brasil 1994",        // FWC 15
    "Brasil 2002",        // FWC 16
    "Italia 2006",        // FWC 17
    "Alemania 2014",      // FWC 18
    "Argentina 2022",     // FWC 19
  ];

  // --- Extras exclusivos Coca-Cola (CC1..CC12) ---
  // No vienen en sobres normales: están bajo las etiquetas de botellas
  // Coca-Cola y completan una página especial del álbum.
  // [nombre, selección, bandera]
  const COCACOLA = [
    ["Lamine Yamal", "España", "🇪🇸"],
    ["Joshua Kimmich", "Alemania", "🇩🇪"],
    ["Harry Kane", "Inglaterra", "🏴󠁧󠁢󠁥󠁮󠁧󠁿"],
    ["Santiago Giménez", "México", "🇲🇽"],
    ["Antonee Robinson", "Estados Unidos", "🇺🇸"],
    ["Jefferson Lerma", "Colombia", "🇨🇴"],
    ["Edson Álvarez", "México", "🇲🇽"],
    ["Virgil van Dijk", "Países Bajos", "🇳🇱"],
    ["Alphonso Davies", "Canadá", "🇨🇦"],
    ["Weston McKennie", "Estados Unidos", "🇺🇸"],
    ["Lautaro Martínez", "Argentina", "🇦🇷"],
    ["Gabriel Magalhães", "Brasil", "🇧🇷"],
  ];

  // --- 48 selecciones por grupo (orden del sorteo final) ---
  // [nombre en español, código corto, bandera emoji]
  const GROUPS = {
    A: [
      ["México", "MEX", "🇲🇽"],
      ["Sudáfrica", "RSA", "🇿🇦"],
      ["Corea del Sur", "KOR", "🇰🇷"],
      ["Chequia", "CZE", "🇨🇿"],
    ],
    B: [
      ["Canadá", "CAN", "🇨🇦"],
      ["Bosnia y Herzegovina", "BIH", "🇧🇦"],
      ["Catar", "QAT", "🇶🇦"],
      ["Suiza", "SUI", "🇨🇭"],
    ],
    C: [
      ["Brasil", "BRA", "🇧🇷"],
      ["Marruecos", "MAR", "🇲🇦"],
      ["Haití", "HAI", "🇭🇹"],
      ["Escocia", "SCO", "🏴󠁧󠁢󠁳󠁣󠁴󠁿"],
    ],
    D: [
      ["Estados Unidos", "USA", "🇺🇸"],
      ["Paraguay", "PAR", "🇵🇾"],
      ["Australia", "AUS", "🇦🇺"],
      ["Turquía", "TUR", "🇹🇷"],
    ],
    E: [
      ["Alemania", "GER", "🇩🇪"],
      ["Curazao", "CUW", "🇨🇼"],
      ["Costa de Marfil", "CIV", "🇨🇮"],
      ["Ecuador", "ECU", "🇪🇨"],
    ],
    F: [
      ["Países Bajos", "NED", "🇳🇱"],
      ["Japón", "JPN", "🇯🇵"],
      ["Suecia", "SWE", "🇸🇪"],
      ["Túnez", "TUN", "🇹🇳"],
    ],
    G: [
      ["Bélgica", "BEL", "🇧🇪"],
      ["Egipto", "EGY", "🇪🇬"],
      ["Irán", "IRN", "🇮🇷"],
      ["Nueva Zelanda", "NZL", "🇳🇿"],
    ],
    H: [
      ["España", "ESP", "🇪🇸"],
      ["Cabo Verde", "CPV", "🇨🇻"],
      ["Arabia Saudita", "KSA", "🇸🇦"],
      ["Uruguay", "URU", "🇺🇾"],
    ],
    I: [
      ["Francia", "FRA", "🇫🇷"],
      ["Senegal", "SEN", "🇸🇳"],
      ["Irak", "IRQ", "🇮🇶"],
      ["Noruega", "NOR", "🇳🇴"],
    ],
    J: [
      ["Argentina", "ARG", "🇦🇷"],
      ["Argelia", "ALG", "🇩🇿"],
      ["Austria", "AUT", "🇦🇹"],
      ["Jordania", "JOR", "🇯🇴"],
    ],
    K: [
      ["Portugal", "POR", "🇵🇹"],
      ["RD Congo", "COD", "🇨🇩"],
      ["Uzbekistán", "UZB", "🇺🇿"],
      ["Colombia", "COL", "🇨🇴"],
    ],
    L: [
      ["Inglaterra", "ENG", "🏴󠁧󠁢󠁥󠁮󠁧󠁿"],
      ["Croacia", "CRO", "🇭🇷"],
      ["Ghana", "GHA", "🇬🇭"],
      ["Panamá", "PAN", "🇵🇦"],
    ],
  };

  // Construye la lista plana de cromos y la lista de equipos/secciones.
  const stickers = [];
  const teams = [];
  const sections = [];
  let no = 0; // contador global de número de cromo

  function add(sticker) {
    no += 1;
    sticker.no = no;
    sticker.id = "s" + no;
    // Código Panini, p.ej. "FWC" + "7" -> "FWC7" / etiqueta "FWC 7".
    // Si el cromo ya trae un código fijo (p.ej. "00"), se respeta.
    if (!sticker.code) {
      sticker.code = sticker.prefix + sticker.pos;
      sticker.codeLabel = sticker.prefix + " " + sticker.pos;
    }
    stickers.push(sticker);
    return sticker;
  }

  // Numeración de especiales:
  //   Apertura     -> 00, FWC 1..8
  //   FIFA Museum  -> FWC 9..19
  let fwc = 0;

  // Apertura: cromo 00 + FWC 1..8
  const openingIds = [];
  openingIds.push(add({
    section: "opening", role: "special", name: OPENING_00, foil: true,
    code: "00", codeLabel: "00", prefix: "", pos: 0,
  }).id);
  OPENING_FWC.forEach(function (name) {
    fwc += 1;
    openingIds.push(add({ section: "opening", role: "special", name: name, foil: true, prefix: "FWC", pos: fwc }).id);
  });
  sections.push({ key: "opening", title: "Apertura", subtitle: "Cromos foil · 00 + FWC", stickerIds: openingIds });

  // FIFA Museum: FWC 9..19
  const museumIds = [];
  MUSEUM.forEach(function (name) {
    fwc += 1;
    museumIds.push(add({ section: "museum", role: "special", name: name, foil: true, prefix: "FWC", pos: fwc }).id);
  });
  sections.push({ key: "museum", title: "FIFA Museum", subtitle: "Leyendas · Cromos foil · FWC 9-19", stickerIds: museumIds });

  // Selecciones
  Object.keys(GROUPS).forEach(function (groupKey) {
    GROUPS[groupKey].forEach(function (t) {
      const teamId = t[1]; // código corto, p.ej. "ARG"
      const team = {
        id: teamId,
        name: t[0],
        code: t[1],
        flag: t[2],
        group: groupKey,
        stickerIds: [],
      };

      // Distribución oficial de la página (20 cromos):
      //   1      -> escudo (foil)
      //   2-12   -> jugadores 1-11
      //   13     -> foto del equipo
      //   14-20  -> jugadores 12-18
      let playerNum = 0;
      for (let pos = 1; pos <= 20; pos++) {
        let st;
        // Código Panini por país: <CÓDIGO><posición>, p.ej. ARG1..ARG20
        const base = { section: "team", teamId: teamId, group: groupKey, prefix: teamId, pos: pos };
        if (pos === 1) {
          st = add(Object.assign({}, base, { role: "badge", name: "Escudo " + team.name, foil: true }));
        } else if (pos === 13) {
          st = add(Object.assign({}, base, { role: "team_photo", name: "Plantilla " + team.name, foil: false }));
        } else {
          playerNum += 1;
          // Nombre real del jugador según el orden del álbum (si está cargado)
          const roster = (window.PLAYERS && window.PLAYERS[teamId]) || null;
          const realName = roster && roster[playerNum - 1];
          st = add(Object.assign({}, base, { role: "player", name: realName || ("Jugador " + playerNum), foil: false }));
        }
        team.stickerIds.push(st.id);
      }

      teams.push(team);
    });
  });

  // Extras Coca-Cola (CC 1..12) — se cuentan aparte del álbum oficial (980)
  const extraIds = [];
  COCACOLA.forEach(function (p, i) {
    const st = add({
      section: "extra", role: "cocacola", extra: true,
      name: p[0], sub: p[1], flag: p[2], foil: true,
      prefix: "CC", pos: i + 1,
    });
    extraIds.push(st.id);
  });
  const extraSection = {
    key: "extras", title: "Extras · Coca-Cola", subtitle: "Exclusivos fuera de sobres",
    stickerIds: extraIds,
  };

  const baseCount = stickers.filter(function (s) { return !s.extra; }).length; // 980

  // Rareza y valor base por tipo (más raras = más valor):
  //   ultra  -> Coca-Cola (solo en botellas)            valor 10
  //   rara   -> foils (escudos, FWC, apertura 00)        valor 3
  //   comun  -> jugadores y foto de equipo               valor 1
  stickers.forEach(function (s) {
    if (s.extra) { s.rarity = "ultra"; s.value = 10; }
    else if (s.foil) { s.rarity = "rara"; s.value = 3; }
    else { s.rarity = "comun"; s.value = 1; }
  });

  window.ALBUM = {
    total: baseCount,            // 980 (álbum oficial)
    extrasTotal: extraIds.length, // 12 (Coca-Cola)
    totalAll: stickers.length,    // 992
    stickers: stickers,
    teams: teams,
    sections: sections,
    extraSection: extraSection,
    groups: Object.keys(GROUPS),
    byId: stickers.reduce(function (m, s) { m[s.id] = s; return m; }, {}),
    meta: { badge: "MUNDIAL 2026", hosts: "🇨🇦 🇺🇸 🇲🇽", host: "Canadá · EE. UU. · México" },
  };
})();
