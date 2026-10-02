# Plan — Spec 002

> El CÓMO. Spec aprobada, sin dudas abiertas. **Modo actualización:** se apoya en `impacto.md` (filas M-1 a M-13), que
> se hizo antes de este plan. Sin base de datos, sin servidor, sin cuentas externas.

## Arquitectura en una frase

Una página (`docs/app/index.html`) que carga módulos JavaScript nativos (sin compilar). La **lógica** vive en
`js/core/` (funciones puras y un `store` en memoria, **sin tocar el DOM**) y se prueba con `node --test`; la **pantalla**
vive en `js/ui/` y `js/screens/` y solo llama al `store`. Así los permisos y las validaciones se cumplen aunque alguien
llame una acción sin pasar por la pantalla (RF-16).

## Qué RF cubre cada pieza (y las filas de impacto que la condicionan)

| Pieza | RF | Filas |
|---|---|---|
| `core/dates.js`, `core/validators.js` (fechas reales, números con coma, correo, coordenadas en Panamá, archivos por contenido) | RF-1, 19–22, 29, 36, 38, 50–52 | M-6 |
| `core/units.js`, `core/normativa.js` (conversión NO3/NO3-N, normativa aplicable, límites verificados, evaluación y dictamen) | RF-32, 33, 54–59 | M-6 |
| `core/permissions.js` (matriz de roles, menú, guardia de rutas) | RF-14, 15, 16 | M-6 |
| `core/ids.js`, `core/seed.js` (IDs, folios, datos de ejemplo relativos a «ahora») | RF-18, 27, 72 | M-11 |
| `core/store.js` (acciones con permiso + validación; selectores del panel, alertas, historial, mapa) | RF-1–13, 16–70 | M-6, M-11 |
| `core/exports.js` (filas para PDF/Excel) | RF-62 | M-8 |
| `ui/dom.js` (escape de texto), `ui/forms.js` (errores accesibles), `ui/layout.js`, `ui/router.js` | RF-9, 10, 14, 15, 71, 73, RNF-4 | M-9, M-10 |
| `screens/acceso.js`, `recuperar.js`, `solicitud.js`, `bandeja.js` | RF-1–13 | M-1 |
| `screens/panel.js` | RF-65, 66 | M-2 |
| `screens/puntos.js`, `puntoAlta.js`, `puntoDetalle.js` | RF-17–26 | M-12 |
| `screens/muestraNueva.js`, `muestraGuardada.js`, `muestraDetalle.js` | RF-27–39 | M-8, M-9 |
| `screens/custodia.js`, `laboratorio.js`, `evaluacion.js` | RF-40–60 | M-8 |
| `screens/historial.js`, `mapa.js` | RF-61–64 | M-8, M-9 |
| `screens/usuarios.js` | RF-67–70 | — |
| `docs/app.html` (redirección), `docs/index.html`, `README.md`, `.nojekyll` | RF-72 | M-1, M-2, M-5, M-7 |

## Archivos que se tocan

- **Nuevos:** `docs/app/` (`index.html`, `css/app.css`, `js/**`, `vendor/**`), `docs/.nojekyll`, `package.json`, `tests/*.test.js`, `spec/002-…`.
- **Editados:** `docs/app.html` (pasa a ser una redirección, M-1), `docs/index.html` (M-2), `README.md` (M-5), `spec/constitucion.md` (M-4), `spec/001-…/spec.md` (solo una nota, M-3).
- **No se tocan:** `docs/assets/**` (M-12) ni ningún repo ajeno.
- 🔴 Lo delicado es de contenido y de navegador, no de infraestructura: permisos (RF-16), límites normativos (RF-21, 55–59), archivos (RF-38, 52) y XSS (RF-71).

## Migraciones

No aplica: no hay base de datos.

## Decisiones técnicas

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Módulos ES nativos, sin compilar | React/Vite con build | GitHub Pages sirve los archivos tal cual; el grupo puede abrirlos y leerlos |
| Lógica pura separada de la pantalla | Todo mezclado en cada pantalla | Se puede probar con `node --test` y los permisos no dependen de la pantalla (RF-16) |
| Rutas con `#/…` (hash) | Rutas sin `#` | Pages no tiene reescritura: una ruta sin `#` daría 404 al recargar (M-10) |
| Librerías servidas desde `docs/app/vendor/` | CDN | La demo no depende de internet el día de la presentación (RNF-2) |
| Mapa con Leaflet y marcadores `divIcon` | Marcadores con imagen | Evita 3 imágenes de Leaflet que no se descargaron |
| Texto de usuario siempre escapado por una función `html` | `innerHTML` directo | XSS (RF-71): lo escapado es el valor por defecto, lo crudo hay que pedirlo (`raw()`) |
| Política de contenido por `<meta>` | Sin política | Segunda barrera contra scripts ajenos; Pages no permite cabeceras (M-9) |
| Archivos validados leyendo sus primeros bytes | Confiar en la extensión o en `file.type` | Un `.pdf` renombrado engañaría a la extensión (RF-38, RF-52) |
| Clave de demostración común | Una clave por usuario | Es una demo; se dice a la vista en la pantalla de acceso |

## Radio de impacto

Se apoya en `impacto.md`. Las filas que **condicionan el orden**: M-10 (rutas relativas: se prueba en el link público, no solo
en local), M-9 (la política de contenido se ajusta mirando el mapa y las fotos reales) y M-1 (la redirección de `app.html`
se hace al final, cuando la nueva app ya funciona).

## Estrategia de pruebas

1. **Lógica (`node --test`):** `tests/*.test.js` importa los mismos archivos de `docs/app/js/core/` que carga el navegador.
   Cada RF de lógica tiene al menos una prueba; las 🔴 tienen una que **muerde** (se rompe la regla a propósito y la
   prueba debe fallar).
2. **Pantallas (navegador):** recorrido completo — acceso → alta de pozo → muestra → envío → recepción → laboratorio →
   evaluación → revisión → historial (PDF y Excel) → mapa → usuarios — en escritorio y a 375 px, con la consola vacía.
3. **Link público:** el mismo recorrido sobre `brown0909.github.io/utp-ambiental-aquagest-pozos/app/` (M-10).

## Ficha de construcción

1. **Qué:** 17 pantallas usables con validaciones y permisos. 2. **Código:** solo este repo; nada 🔴 de infraestructura.
3. **Modelo:** esta sesión, directo. 4. **Agentes:** ninguno. 5. **Cómo:** tareas en orden (lógica → pantallas → publicar).
6. **Tokens:** alto (~300–500 k). **PASA/NO-PASA:** pruebas en verde + recorrido completo + 375 px + link público.
**Qué NO se toca:** `gerencia317`, otros repos de `Brown0909`, `docs/assets/`.
