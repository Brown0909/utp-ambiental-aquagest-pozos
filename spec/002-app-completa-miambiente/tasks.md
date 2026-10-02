# Tareas — Spec 002

> Cada tarea cita sus RF y las filas M-n de `impacto.md`. «Hecho cuando» es un comando o algo que se ve.
> José pidió ver el resultado terminado, así que se ejecutan seguidas; cada una se marca al cerrarla, con su prueba.

- [x] **T1** (RNF-2; M-6, M-7, M-8) `package.json`, `docs/.nojekyll`, librerías en `docs/app/vendor/` con su nota de licencias.
  Hecho cuando: `node --test tests/` arranca y `ls docs/app/vendor` lista 5 archivos.
- [x] **T2** (RF-1, 19–22, 29, 36, 38, 50–52; M-6) `core/dates.js` y `core/validators.js`.
  Hecho cuando: `node --test tests/dates.test.js tests/validators.test.js` en verde.
- [x] **T3** (RF-32, 33, 54–59; M-6) `core/units.js` y `core/normativa.js`.
  Hecho cuando: `node --test tests/normativa.test.js` en verde, incluida la prueba que muerde (forma distinta sin conversión no compara).
- [x] **T4** (RF-14–16, 18, 27; M-6) `core/permissions.js` y `core/ids.js`.
  Hecho cuando: `node --test tests/permissions.test.js` en verde.
- [x] **T5** (RF-72; M-11) `core/seed.js` con datos de ejemplo relativos a «ahora».
  Hecho cuando: el seed deja 1 pozo, 3 puntos, 4 usuarios y 7 muestras en etapas distintas.
- [x] **T6** (RF-1–13, 67–70; M-6) `core/store.js`: acceso, bloqueo, recuperación, solicitudes, usuarios.
  Hecho cuando: `node --test tests/store-usuarios.test.js` en verde (🔴 RF-3, RF-4, RF-7, RF-69 con prueba que muerde).
- [x] **T7** (RF-16–26; M-6) `store`: puntos y pozos.
  Hecho cuando: `node --test tests/store-puntos.test.js` en verde (🔴 RF-21 y RF-16).
- [x] **T8** (RF-27–39; M-6) `store`: muestras.
  Hecho cuando: `node --test tests/store-muestras.test.js` en verde.
- [x] **T9** (RF-40–53; M-6) `store`: custodia y resultados de laboratorio.
  Hecho cuando: `node --test tests/store-flujo.test.js` en verde (🔴 RF-52).
- [x] **T10** (RF-54–60; M-6) `store`: conversión documentada y revisión técnica.
  Hecho cuando: `node --test tests/store-revision.test.js` en verde (🔴 RF-57, RF-59).
- [x] **T11** (RF-26, 61–66; M-6) `store`: selectores del panel, alertas, historial y mapa.
  Hecho cuando: `node --test tests/selectores.test.js` en verde.
- [x] **T12** (RF-62; M-8) `core/exports.js`.
  Hecho cuando: `node --test tests/exports.test.js` en verde (las filas exportadas = las filtradas).
- [x] **T13** (RF-71, 73, RNF-4; M-9, M-10) `ui/` (escape, formularios accesibles, diseño, router) y `css/app.css`.
  Hecho cuando: `node --test tests/dom.test.js` en verde (`<script>` queda escapado) y la página abre sin errores en consola.
- [x] **T14** (RF-1–13; M-1) Pantallas de acceso, recuperar, restablecer, solicitud y bandeja.
- [x] **T15** (RF-65, 66) Panel General de Control.
- [x] **T16** (RF-17–26) Puntos y pozos: lista, alta, detalle y edición.
- [x] **T17** (RF-27–39; M-8, M-9) Registrar muestra, Muestra guardada (con QR) y Detalle de muestra.
- [x] **T18** (RF-40–47) Recepción y traslado.
- [x] **T19** (RF-48–53; M-8) Resultados de laboratorio.
- [x] **T20** (RF-54–60) Evaluación normativa.
- [x] **T21** (RF-61, 62; M-8) Historial y reportes, con exportar PDF y Excel.
- [x] **T22** (RF-63, 64; M-9) Mapa.
- [x] **T23** (RF-67–70) Usuarios y roles.
  Hecho cuando (T14–T23): la pantalla abre desde el menú, se llena y se guarda, y cada error de validación se ve en la pantalla.
- [~] **T24** (RF-73, RNF-4) Pasada de celular (375 px) y de accesibilidad.
  Hecho cuando: ninguna pantalla desborda a 375 px y todo campo con error tiene texto asociado.
- [x] **T25** (RF-72; M-1, M-2, M-3, M-5) `docs/app.html` como redirección, `docs/index.html`, `README.md` y nota en la spec 001.
  Hecho cuando: `/app.html` lleva a `/app/` y todos los enlaces de `index.html` responden 200.
- [x] **T26** (todos) Recorrido completo en navegador (escritorio y 375 px), consola vacía, anotado en este archivo.
- [ ] **T27** (todos; M-10, M-13) Publicar y repetir el recorrido sobre el link público.
  Hecho cuando: el recorrido pasa en `brown0909.github.io/utp-ambiental-aquagest-pozos/app/`.

> Estado 02-oct-2026: T24 a medias — la pasada de celular (375 px, sin desbordes en las 17 pantallas) está hecha; falta una revisión formal de accesibilidad con lector de pantalla. T27 se marca al publicar.
