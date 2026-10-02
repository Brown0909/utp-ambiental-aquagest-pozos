# Radio de impacto — Spec 002

> Modo actualización (segunda spec). Se hizo **antes** del plan, con búsquedas ejecutadas el 02-oct-2026 sobre el repo
> `Brown0909/utp-ambiental-aquagest-pozos` (commit `58e4649`). El plan se apoya en estas filas (M-n).

## Búsquedas ejecutadas

| # | Comando | Resultado |
|---|---|---|
| B1 | `grep -rn "app\.html" --include=*.html --include=*.md --include=*.json .` (sin el propio archivo) | 7 coincidencias: 3 en `docs/index.html` (líneas 66, 79, 124) y 4 en `spec/001-…/plan.md` |
| B2 | `wc -l docs/app.html` y `grep -c "RF-" docs/app.html` | 580 líneas; 14 citas de RF de la spec 001 |
| B3 | `grep -c "assets/thumbs" docs/index.html` | 27 miniaturas enlazadas (la cuadrícula de las 27 láminas) |
| B4 | `grep -n "app\|demo\|spec" README.md` | 0 coincidencias: el README no menciona la demo |
| B5 | `ls tests package.json` | no existen: no hay pruebas automáticas hoy |
| B6 | `grep -n "RF-6\|RF-7\|RF-8\|semáforo\|7 mg" spec/001-…/spec.md` | 5 líneas: el semáforo de 7 mg/L vive en RF-7 y RF-8 y en una decisión |
| B7 | `grep -n "cdnjs\|https://" docs/app.html` | 3: dos librerías por CDN (jsPDF, SheetJS) y el enlace al repo |
| B8 | `grep -n "localStorage" docs/app.html` | 1: solo un comentario que dice que **no** se usa |

## Filas

| Fila | Qué se toca (archivo) | Quién lo usa o depende de ello | Cómo se rompe la solución | Prueba que lo cuida | RF |
|---|---|---|---|---|---|
| M-1 | `docs/app.html` (580 líneas): se reemplaza por una redirección a `docs/app/` | `docs/index.html:66,79,124` y la documentación de la spec 001 (B1) | Quien tenga guardado el link viejo (`…/app.html`) vería una página en blanco | Abrir `/app.html` en el navegador y comprobar que llega a `/app/` | RF-72 |
| M-2 | `docs/index.html` (textos «sin base de datos real — ver spec 001» y tres enlaces a la demo) | La página pública del proyecto; los 27 enlaces de miniaturas (B3) no cambian | Dejar enlaces a archivos que ya no existen o romper la cuadrícula de 27 láminas | Contar 27 `figure` y que cada enlace de la página responda 200 | RF-73 |
| M-3 | `spec/001-…/spec.md` (nota «Reemplazada por la spec 002») | `spec/001-…/plan.md` y `tasks.md` citan sus RF (B6) | Borrar o reescribir la spec 001 rompería el rastro de decisiones; la constitución dice que nada se borra | `git diff` solo agrega una nota; no se borra ninguna línea | — |
| M-4 | `spec/constitucion.md` (modo → actualización; principios 9–12) | Toda spec futura; ya se aplicó | Que el modo vuelva a «nuevo» | La línea `Modo SDD` dice «actualización» | — |
| M-5 | `README.md` (enlace a la demo y a la spec 002; sigue diciendo 27 pantallas) | Quien llega al repo (B4: hoy no menciona la demo) | Descripción que contradice a la spec (p. ej. «sin pantallas funcionales») | Revisión del texto final | — |
| M-6 | `package.json` y `tests/` (nuevos, en la raíz del repo) | Nada los usa hoy (B5); GitHub Pages sirve solo `docs/` | `"type":"module"` afecta cómo Node lee los `.js`; si el navegador y Node discrepan en una ruta, las pruebas pasan pero la página falla | Las pruebas importan **los mismos archivos** que carga el navegador (`docs/app/js/core/*.js`), no copias | todos |
| M-7 | `docs/.nojekyll` (nuevo) | GitHub Pages procesa `docs/` con Jekyll si no existe | Jekyll ignora carpetas que empiezan con `_` y puede alterar archivos | El sitio publicado sirve `vendor/` y `js/` tal cual (HTTP 200 por archivo) | RNF-2 |
| M-8 | Librerías: de CDN (B7) a `docs/app/vendor/` (jsPDF, SheetJS, Leaflet, QR) | Exportar PDF/Excel, mapa, QR | Ruta mal escrita o tipo MIME incorrecto → la librería no carga y los botones fallan sin aviso | Comprobar `window.jspdf`, `XLSX`, `L`, `qrcode` definidos y 0 errores en consola | RF-27, RF-62, RF-63 |
| M-9 | Política de contenido (`<meta http-equiv="Content-Security-Policy">` en `docs/app/index.html`) | Mapa (imágenes de OpenStreetMap), fotos (`blob:`), estilos en línea | Una política demasiado estricta bloquea las teselas del mapa o las fotos | En el navegador: el mapa muestra teselas y la foto se previsualiza, 0 violaciones de CSP | RF-38, RF-63, RNF-1 |
| M-10 | Rutas relativas (`./js/…`) en lugar de absolutas | El sitio vive en un subdirectorio (`/utp-ambiental-aquagest-pozos/`) | Una ruta que empiece con `/` funciona en local y **falla publicada** | Prueba final sobre el link público, no solo en local | RNF-1 |
| M-11 | Estado en memoria (`store`); B8 confirma que no hay almacenamiento | RF-72 (reinicio al recargar) | Usar `localStorage` «por comodidad» violaría la decisión del grupo | `grep -rn "localStorage\|sessionStorage" docs/app/js` debe dar 0 | RF-72 |
| M-12 | `docs/assets/` y `docs/assets/thumbs/` | La cuadrícula de láminas (B3) | Moverlas o renombrarlas rompe 54 enlaces | No se tocan; `git status` no debe mostrar cambios ahí | — |
| M-13 | Rama `main` del repo | Alex puede hacer `push` directo | Subir encima de un cambio de Alex sin traerlo antes | `git fetch` y comparar antes de cada `push` | — |

## Quién depende del comportamiento viejo

- **El semáforo de 7 mg/L** (spec 001, RF-7 y RF-8) deja de existir; nada más lo usa (B6). Es una decisión consciente (D3 de la spec 002).
- **El selector de rol JAAR** desaparece: el acceso real tiene tres roles (Técnico, Laboratorio, Administrador).

## Revisión del radio («lo que nadie anotó»)

- La cuadrícula de 27 láminas depende de rutas relativas `assets/…` desde `docs/index.html`; la nueva aplicación vive en `docs/app/` y **no debe** mover ni duplicar esas imágenes (M-12).
- Una pantalla que se abre por su dirección (`#/laboratorio`) con la sesión ya cerrada o con un rol sin permiso es un camino que el diseño no dibuja: está cubierto por RF-10 y RF-15.
