/*
 * worldcups.js — Ediciones anteriores de la Copa del Mundo (equipos y grupos
 * VERIFICADOS de fuentes públicas). Estructura tipo álbum: por cada selección
 * 20 cromos (escudo foil + foto de equipo + 18 jugadores), con nombres de
 * jugador editables (igual que el Mundial 2026).
 *
 * Nota honesta: equipos y grupos son oficiales. Los nombres de jugadores y la
 * numeración fina por edición se afinan cuando tengamos el checklist Panini
 * exacto de cada año.
 *
 * [nombre, código de 3 letras, bandera]
 */
window.WORLDCUPS = {
  wc2022: {
    badge: "MUNDIAL 2022", host: "Catar", hosts: "🇶🇦",
    players: 18, // escudo + foto + 18 jugadores = 20 por equipo (670 total)
    specials: [{ key: "especiales", title: "Especiales", subtitle: "Estadios · emblema · balón…", count: 30 }],
    groups: {
      A: [["Catar","QAT","🇶🇦"],["Ecuador","ECU","🇪🇨"],["Senegal","SEN","🇸🇳"],["Países Bajos","NED","🇳🇱"]],
      B: [["Inglaterra","ENG","🏴󠁧󠁢󠁥󠁮󠁧󠁿"],["Irán","IRN","🇮🇷"],["Estados Unidos","USA","🇺🇸"],["Gales","WAL","🏴󠁧󠁢󠁷󠁬󠁳󠁿"]],
      C: [["Argentina","ARG","🇦🇷"],["Arabia Saudita","KSA","🇸🇦"],["México","MEX","🇲🇽"],["Polonia","POL","🇵🇱"]],
      D: [["Francia","FRA","🇫🇷"],["Australia","AUS","🇦🇺"],["Dinamarca","DEN","🇩🇰"],["Túnez","TUN","🇹🇳"]],
      E: [["España","ESP","🇪🇸"],["Costa Rica","CRC","🇨🇷"],["Alemania","GER","🇩🇪"],["Japón","JPN","🇯🇵"]],
      F: [["Bélgica","BEL","🇧🇪"],["Canadá","CAN","🇨🇦"],["Marruecos","MAR","🇲🇦"],["Croacia","CRO","🇭🇷"]],
      G: [["Brasil","BRA","🇧🇷"],["Serbia","SRB","🇷🇸"],["Suiza","SUI","🇨🇭"],["Camerún","CMR","🇨🇲"]],
      H: [["Portugal","POR","🇵🇹"],["Ghana","GHA","🇬🇭"],["Uruguay","URU","🇺🇾"],["Corea del Sur","KOR","🇰🇷"]],
    },
  },
  wc2018: {
    badge: "MUNDIAL 2018", host: "Rusia", hosts: "🇷🇺",
    players: 18, // 20 por equipo (670 total)
    specials: [{ key: "especiales", title: "Especiales", subtitle: "Estadios · emblema · leyendas…", count: 30 }],
    groups: {
      A: [["Rusia","RUS","🇷🇺"],["Arabia Saudita","KSA","🇸🇦"],["Egipto","EGY","🇪🇬"],["Uruguay","URU","🇺🇾"]],
      B: [["Portugal","POR","🇵🇹"],["España","ESP","🇪🇸"],["Marruecos","MAR","🇲🇦"],["Irán","IRN","🇮🇷"]],
      C: [["Francia","FRA","🇫🇷"],["Australia","AUS","🇦🇺"],["Perú","PER","🇵🇪"],["Dinamarca","DEN","🇩🇰"]],
      D: [["Argentina","ARG","🇦🇷"],["Islandia","ISL","🇮🇸"],["Croacia","CRO","🇭🇷"],["Nigeria","NGA","🇳🇬"]],
      E: [["Brasil","BRA","🇧🇷"],["Suiza","SUI","🇨🇭"],["Costa Rica","CRC","🇨🇷"],["Serbia","SRB","🇷🇸"]],
      F: [["Alemania","GER","🇩🇪"],["México","MEX","🇲🇽"],["Suecia","SWE","🇸🇪"],["Corea del Sur","KOR","🇰🇷"]],
      G: [["Bélgica","BEL","🇧🇪"],["Panamá","PAN","🇵🇦"],["Túnez","TUN","🇹🇳"],["Inglaterra","ENG","🏴󠁧󠁢󠁥󠁮󠁧󠁿"]],
      H: [["Polonia","POL","🇵🇱"],["Senegal","SEN","🇸🇳"],["Colombia","COL","🇨🇴"],["Japón","JPN","🇯🇵"]],
    },
  },
  wc2014: {
    badge: "MUNDIAL 2014", host: "Brasil", hosts: "🇧🇷",
    players: 17, // escudo + foto + 17 jugadores = 19 por equipo (640 total)
    specials: [
      { key: "apertura", title: "Apertura", subtitle: "Balón · mascota · emblema", count: 8 },
      { key: "estadios", title: "Estadios", subtitle: "12 estadios (2 cromos c/u)", count: 24 },
    ],
    groups: {
      A: [["Brasil","BRA","🇧🇷"],["Croacia","CRO","🇭🇷"],["México","MEX","🇲🇽"],["Camerún","CMR","🇨🇲"]],
      B: [["España","ESP","🇪🇸"],["Países Bajos","NED","🇳🇱"],["Chile","CHI","🇨🇱"],["Australia","AUS","🇦🇺"]],
      C: [["Colombia","COL","🇨🇴"],["Grecia","GRE","🇬🇷"],["Costa de Marfil","CIV","🇨🇮"],["Japón","JPN","🇯🇵"]],
      D: [["Uruguay","URU","🇺🇾"],["Costa Rica","CRC","🇨🇷"],["Inglaterra","ENG","🏴󠁧󠁢󠁥󠁮󠁧󠁿"],["Italia","ITA","🇮🇹"]],
      E: [["Suiza","SUI","🇨🇭"],["Ecuador","ECU","🇪🇨"],["Francia","FRA","🇫🇷"],["Honduras","HON","🇭🇳"]],
      F: [["Argentina","ARG","🇦🇷"],["Bosnia y Herzegovina","BIH","🇧🇦"],["Irán","IRN","🇮🇷"],["Nigeria","NGA","🇳🇬"]],
      G: [["Alemania","GER","🇩🇪"],["Portugal","POR","🇵🇹"],["Ghana","GHA","🇬🇭"],["Estados Unidos","USA","🇺🇸"]],
      H: [["Bélgica","BEL","🇧🇪"],["Argelia","ALG","🇩🇿"],["Rusia","RUS","🇷🇺"],["Corea del Sur","KOR","🇰🇷"]],
    },
  },
  wc2010: {
    badge: "MUNDIAL 2010", host: "Sudáfrica", hosts: "🇿🇦",
    players: 17, // escudo + foto + 17 jugadores = 19 por equipo (640 total)
    specials: [{ key: "inicio", title: "Inicio y Estadios", subtitle: "Especiales · 00/000 · estadios", count: 32 }],
    groups: {
      A: [["Sudáfrica","RSA","🇿🇦"],["México","MEX","🇲🇽"],["Uruguay","URU","🇺🇾"],["Francia","FRA","🇫🇷"]],
      B: [["Argentina","ARG","🇦🇷"],["Nigeria","NGA","🇳🇬"],["Corea del Sur","KOR","🇰🇷"],["Grecia","GRE","🇬🇷"]],
      C: [["Inglaterra","ENG","🏴󠁧󠁢󠁥󠁮󠁧󠁿"],["Estados Unidos","USA","🇺🇸"],["Argelia","ALG","🇩🇿"],["Eslovenia","SVN","🇸🇮"]],
      D: [["Alemania","GER","🇩🇪"],["Australia","AUS","🇦🇺"],["Serbia","SRB","🇷🇸"],["Ghana","GHA","🇬🇭"]],
      E: [["Países Bajos","NED","🇳🇱"],["Dinamarca","DEN","🇩🇰"],["Japón","JPN","🇯🇵"],["Camerún","CMR","🇨🇲"]],
      F: [["Italia","ITA","🇮🇹"],["Paraguay","PAR","🇵🇾"],["Nueva Zelanda","NZL","🇳🇿"],["Eslovaquia","SVK","🇸🇰"]],
      G: [["Brasil","BRA","🇧🇷"],["Corea del Norte","PRK","🇰🇵"],["Costa de Marfil","CIV","🇨🇮"],["Portugal","POR","🇵🇹"]],
      H: [["España","ESP","🇪🇸"],["Suiza","SUI","🇨🇭"],["Honduras","HON","🇭🇳"],["Chile","CHI","🇨🇱"]],
    },
  },
};
