# ⚽ Mi Álbum Mundial 2026

App web (móvil + PC) para gestionar tu **álbum Panini de la Copa Mundial 2026**:
saber qué cromos **tienes**, cuáles te **faltan** y cuáles tienes **repetidos**
para luego **cambiar o vender** con otros usuarios.

## ✨ Qué hace hoy (Fase 1 — álbum personal)

- **Réplica exacta** del álbum oficial: **980 cromos** organizados como en Panini.
  - **Apertura** (9 cromos foil): logo, emblema, mascotas, balón, anfitriones…
  - **FIFA Museum** (11 cromos foil): leyendas / campeones históricos.
  - **48 selecciones × 20 cromos** = 960, en 12 grupos (A–L).
    Cada selección: **escudo** (foil) + **foto de equipo** + **18 jugadores**.
- **Códigos oficiales Panini** en cada cromo:
  - Especiales (Apertura + FIFA Museum): `FWC 1` … `FWC 20`.
  - Selecciones: código de país de 3 letras + número, p. ej. `ARG 1` (escudo),
    `ARG 13` (plantilla) … `ARG 20`, `BRA 7`, `MEX 12`, etc.
  - El buscador entiende los códigos: escribe `ARG7` o `ARG 7`.
- **Sección de Extras (Coca-Cola)**: los 12 cromos exclusivos `CC 1`…`CC 12`
  (con jugador y selección reales) que se completan en la página especial del
  álbum, con su propio progreso (x/12).
- **% de avance** bien visible: porcentaje grande + barra del álbum oficial (980).
- **Marcar cromos**: toca un cromo para marcarlo como *Tengo*; toca otra vez para
  sumar **repetidas** (x2, x3…). El botón **−** quita una.
- **Faltan**: lista de todo lo que aún no tienes, agrupado por selección.
- **Repes**: lista de repetidas con la cantidad sobrante (tu lista para cambiar/vender).
- **Progreso**: barra y contadores (Tengo / Faltan / Repes) en tiempo real.
- **Buscar** por equipo, jugador o número.
- **Renombrar** cromos (✎) para poner los nombres reales de los jugadores.
- **Respaldo**: exportar/importar tu progreso en un archivo `.json`.
- Todo se guarda **en tu dispositivo** (no requiere internet ni cuenta).

## ▶️ Cómo abrirla

Es una web sin instalación. Dos opciones:

**1) Rápido (servidor local):**
```bash
python3 -m http.server 8000
```
Luego abre `http://localhost:8000` en el navegador (del PC o del celular en la misma red).

**2) Publicarla gratis en internet (GitHub Pages):**
1. Sube este repo a GitHub.
2. En *Settings → Pages*, elige la rama y carpeta raíz (`/`).
3. Tendrás una URL para abrirla desde cualquier celular.

> También puedes abrir `index.html` directamente, pero algunos navegadores
> limitan funciones en `file://`; se recomienda el servidor local o GitHub Pages.

## 🗂️ Estructura

```
index.html        # interfaz y maquetación
styles.css        # estilos (mobile-first, tema mundialista)
js/data.js        # estructura del álbum (980 cromos, equipos, grupos)
js/storage.js     # guardado local (localStorage) del progreso
js/app.js         # lógica de la interfaz (álbum, faltan, repes)
```

## 🛣️ Próximos pasos (Fase 2 — intercambio entre usuarios)

- Cuentas de usuario e inicio de sesión.
- Sincronización en la nube (tu álbum en cualquier dispositivo).
- **Mercado / trueque**: ver las repetidas de otros usuarios, proponer
  cambios y vender cromos dentro de la app.
- Emparejado automático: "tú tienes lo que a mí me falta y viceversa".
- **Foto real del cromo (estado/condición)**: cada usuario podrá subir una
  foto de su propio cromo (su producto) para mostrar el estado —clave en
  colecciones antiguas (2010, 2014, 2018…)—. La foto se comprime y se guarda
  en la nube para que el comprador/cambista la vea antes de cerrar el trato.
  Es contenido del usuario (foto de su producto), no un escaneo oficial.
- **Colecciones antiguas**: añadir otros álbumes (Mundiales pasados,
  Adrenalyn XL…) para ser un punto de referencia de coleccionistas.

Esto requiere un servidor y base de datos; la app actual ya está estructurada
para conectarse a ese backend cuando lo añadamos.

## ℹ️ Notas

- Los **nombres de jugadores** vienen como plantillas (“Jugador 1…”) porque las
  plantillas oficiales se confirman cerca del torneo. Puedes editarlos con el
  botón ✎ en cada cromo.
- Estructura basada en la información pública del álbum Panini FIFA World Cup 2026
  (980 cromos, 48 equipos, 12 grupos).
