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

  // --- Apertura (9 cromos foil) ---
  const OPENING = [
    "Logo Panini",
    "Emblema oficial FIFA 2026",
    "Mascotas oficiales",
    "Eslogan oficial",
    "Balón oficial",
    "Trofeo de la Copa Mundial",
    "Anfitrión: Canadá",
    "Anfitrión: México",
    "Anfitrión: Estados Unidos",
  ];

  // --- FIFA Museum (11 cromos foil) ---
  const MUSEUM = [
    "Leyenda Mundial 1",
    "Leyenda Mundial 2",
    "Leyenda Mundial 3",
    "Leyenda Mundial 4",
    "Leyenda Mundial 5",
    "Leyenda Mundial 6",
    "Leyenda Mundial 7",
    "Leyenda Mundial 8",
    "Leyenda Mundial 9",
    "Leyenda Mundial 10",
    "Leyenda Mundial 11",
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
    // Código Panini, p.ej. "FWC" + "7" -> "FWC7" / etiqueta "FWC 7"
    sticker.code = sticker.prefix + sticker.pos;
    sticker.codeLabel = sticker.prefix + " " + sticker.pos;
    stickers.push(sticker);
    return sticker;
  }

  // Apertura + FIFA Museum comparten la numeración FWC (FWC 1..20):
  //   Apertura     -> FWC 1..9
  //   FIFA Museum  -> FWC 10..20
  let fwc = 0;

  // Apertura
  const openingIds = [];
  OPENING.forEach(function (name) {
    fwc += 1;
    openingIds.push(add({ section: "opening", role: "special", name: name, foil: true, prefix: "FWC", pos: fwc }).id);
  });
  sections.push({ key: "opening", title: "Apertura", subtitle: "Cromos foil · FWC", stickerIds: openingIds });

  // FIFA Museum
  const museumIds = [];
  MUSEUM.forEach(function (name) {
    fwc += 1;
    museumIds.push(add({ section: "museum", role: "special", name: name, foil: true, prefix: "FWC", pos: fwc }).id);
  });
  sections.push({ key: "museum", title: "FIFA Museum", subtitle: "Leyendas · Cromos foil · FWC", stickerIds: museumIds });

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
          st = add(Object.assign({}, base, { role: "player", name: "Jugador " + playerNum, foil: false }));
        }
        team.stickerIds.push(st.id);
      }

      teams.push(team);
    });
  });

  window.ALBUM = {
    total: stickers.length, // 980
    stickers: stickers,
    teams: teams,
    sections: sections,
    groups: Object.keys(GROUPS),
    byId: stickers.reduce(function (m, s) { m[s.id] = s; return m; }, {}),
  };
})();
