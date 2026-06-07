/*
 * adrenalyn.js — Adrenalyn XL LaLiga EA Sports 2025/26 (Panini).
 *
 * Estructura VERIFICADA de fuentes públicas (los números cuadran a 467):
 *   - Base 1–360: 20 clubes × (1 escudo + 17 jugadores) = 360.
 *   - ¡Vamos!        361–380  (20)
 *   - Guantes de Oro 381–387  (7)
 *   - Kryptonita     388–396  (9)
 *   - Diamante       397–414  (18)
 *   - Influencers    415–423  (9)
 *   - Protas         424–441  (18)
 *   - Super Crack    442–467  (26)
 *   Total: 467 cartas + 20 "Estadios" BIS (extra).
 *
 * Los nombres de jugador/carta son editables (tócalos dos veces). La estructura
 * y la numeración son las oficiales de la colección.
 */
window.ADRENALYN = {
  "adx-laliga-2526": {
    meta: { badge: "ADRENALYN · LALIGA 25/26", hosts: "🇪🇸", host: "LaLiga EA Sports 2025/26" },
    playersPerClub: 17,
    // [nombre del club, código]
    clubs: [
      ["Deportivo Alavés", "ALA"], ["Athletic Club", "ATH"], ["Atlético de Madrid", "ATM"],
      ["FC Barcelona", "BAR"], ["Real Betis", "BET"], ["Celta de Vigo", "CEL"],
      ["Elche CF", "ELC"], ["RCD Espanyol", "ESP"], ["Getafe CF", "GET"],
      ["Girona FC", "GIR"], ["Levante UD", "LEV"], ["RCD Mallorca", "MLL"],
      ["CA Osasuna", "OSA"], ["Real Oviedo", "OVI"], ["Rayo Vallecano", "RAY"],
      ["Real Madrid", "RMA"], ["Real Sociedad", "RSO"], ["Sevilla FC", "SEV"],
      ["Valencia CF", "VAL"], ["Villarreal CF", "VIL"],
    ],
    // [clave, título, subtítulo (rango), nº de cartas]
    series: [
      ["vamos", "¡Vamos!", "361-380", 20],
      ["guantes", "Guantes de Oro", "381-387 · porteros", 7],
      ["kryptonita", "Kryptonita", "388-396 · defensas", 9],
      ["diamante", "Diamante", "397-414 · jóvenes", 18],
      ["influencers", "Influencers", "415-423", 9],
      ["protas", "Protas", "424-441", 18],
      ["supercrack", "Super Crack", "442-467 · estrellas", 26],
    ],
    extras: ["Estadios (BIS)", 20],
  },
};
