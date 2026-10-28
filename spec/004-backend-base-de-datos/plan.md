# Plan — Spec 004 (servidor y base de datos)

> El CÓMO. Parte de `spec.md` y cita las filas M-n de `impacto.md`. Borrador del 28-oct-2026, a espera del «dale».

## Idea central (en una frase)

El servidor es **el mismo almacén de reglas que ya existe**, pero corriendo en Node, con sesiones, una base SQLite debajo y un
registro de accesos. El navegador sigue leyendo de una copia local y manda sus 17 escrituras al servidor.

## Cómo funciona una acción (ejemplo: «registrar envío»)

1. La pantalla llama `await store.registrarEnvio(folio, datos)` (M-12).
2. En modo servidor, `store` es un `AlmacenRemoto` (`ui/api.js`): manda `POST ../api/accion` con `{accion, args}`.
3. El servidor busca la sesión por la cookie → usuario → lo pone en su almacén → comprueba el permiso (RF-89) → corre **la misma
   acción** del núcleo → si salió bien, guarda lo que cambió en SQLite → responde `{resultado, estado}`.
4. El navegador pone `estado` en su copia local, avisa a las pantallas (`notificar`) y devuelve `resultado` a quien llamó.
5. Cada 5 s el navegador pide `GET ../api/estado` para ver lo que hicieron los demás (RF-92).

## Contrato del servidor (lo único que une las dos mitades)

Todo en JSON, UTF-8. Las rutas son relativas a la raíz del servidor (`/api/...`). Errores de transporte: 400 (cuerpo mal formado),
401 (sin sesión), 403 (origen no permitido), 413 (cuerpo grande), 429 (ritmo), 500 (falla interna, sin detalles al navegador).
Un rechazo de **regla** (permiso, validación) **no** es error de transporte: llega con 200 y `{ok:false, errores, sinPermiso?}`.

| Ruta | Quién | Cuerpo → Respuesta |
|---|---|---|
| `GET /api/salud` | cualquiera | → `{ok:true, modo:"servidor", demo:bool}` (si da 404, el navegador entra en modo demostración) |
| `GET /api/estado` | cualquiera | → `{ok:true, ahoraServidor:ISO, usuario:{id,nombre,correo,rol,estado}\|null, datos:{...}}`. Sin sesión: `datos` solo trae `{usuarios:[], puntos:[], muestras:[], solicitudes:[], correos:[], historico:[]}` vacíos. Con sesión: todo **sin** `password`, `tokens`, `intentos` |
| `POST /api/login` | cualquiera | `{correo,password}` → `{ok:true, datos:{usuario}}` + cookie, o `{ok:false, errores}`. Bloqueo 5 fallos/60 s (regla del núcleo) |
| `POST /api/logout` | con sesión | → `{ok:true}` + borra cookie |
| `POST /api/accion` | con sesión salvo públicas | `{accion, args:[...]}` → `{resultado:{ok,...}, estado:{...igual que /api/estado}}`. `accion` ∈ lista blanca de las 16 acciones restantes (M-3…M-17); otra cosa → 400 |
| `GET /api/token/:token` | cualquiera | → resultado de `estadoToken` (M-19) |
| `GET /api/bandeja` | cualquiera, solo si `demo` | → `{ok:true, correos:[...]}` (M-20); sin demo → 404 |

Públicas (sin sesión): `solicitarCuenta`, `solicitarRecuperacion`, `restablecer`. El resto exige sesión y permiso del rol.

## Base de datos (`data/aquagest.db`, SQLite)

Tablas, cada una con **columnas para lo que se busca** y una columna `datos` (JSON) para el resto:

| Tabla | Columnas clave | Notas |
|---|---|---|
| `usuarios` | `id`, `correo` único, `rol`, `estado`, `clave_cifrada` | La clave va cifrada con scrypt (RF-88) |
| `puntos` | `id`, `tipo` | |
| `muestras` | `folio`, `punto_id`, `etapa`, `fecha_hora` | `custodia`, `resultados`, `revision`, `conversion` van en `datos` |
| `solicitudes`, `correos`, `historico` | `id`, `estado`/`punto_id`/`periodo` | `historico`: único por (`punto_id`,`periodo`) |
| `tokens` | `hash`, `usuario_id`, `vence`, `usado` | Se guarda el **hash** del enlace, no el enlace |
| `sesiones` | `hash`, `usuario_id`, `creada`, `vence` | Cookie = valor aleatorio de 32 bytes; en la base solo su hash |
| `accesos` | `id`, `fecha`, `evento`, `cuenta_id`, `ip`, `navegador` | **Solo agregar**: `BEFORE UPDATE` y `BEFORE DELETE` lanzan error (RF-90, M-32) |
| `meta` | `clave`, `valor` | Contadores (folios, etc.), versión del esquema, marca de «ya sembrada» (RF-85) |

Guardado: después de cada acción exitosa se comparan las filas con lo ya guardado y se hace `INSERT … ON CONFLICT DO UPDATE`
solo de las que cambiaron. **Nunca `DELETE`** en ninguna tabla (RF-94, M-33). Todas las consultas son preparadas.

## Estructura de archivos

```
server/                  (raíz del repo, FUERA de docs/ — M-28)
  index.js               arranque: lee PUERTO y AQUAGEST_DEMO, abre la base, sirve docs/ y /api
  http.js                enrutado, límites (cuerpo, ritmo, origen), cabeceras, cookies
  db.js                  esquema + migración inicial + guardar/cargar + disparadores de accesos
  auth.js                scrypt, sesiones, registro de accesos
  almacen.js             arma el Store del núcleo para cada petición (M-18) y la lista blanca
  respaldo.js            npm run respaldo (RF-98)
data/                    (en .gitignore) aquagest.db, respaldos/
docs/app/js/ui/api.js    AlmacenRemoto + detección de modo + sincronía cada 5 s
tests/servidor-*.test.js pruebas del servidor (base en memoria)
docs/GUIA-PRUEBA-EN-PAREJA.md   cómo probar entre dos computadoras (RF-99)
```

## Filas de impacto que cubre cada pieza

| Pieza | Filas |
|---|---|
| `server/db.js` | M-23, M-24, M-32, M-33, RF-84/85/94/96 |
| `server/auth.js` | M-1, M-2, M-5, M-23, M-31, M-32, RF-87/88/90/91 |
| `server/almacen.js` + `http.js` | M-3…M-18, M-22, M-31, RF-86/89/93/97 |
| `ui/api.js` | M-19…M-22, M-27, M-29, M-30, RF-92/95 |
| 17 líneas `await` y `main.js` | M-1…M-17, M-21 |

## Ficha de construcción (delta respecto a la ficha aprobada en el chat)

1. **Qué:** servidor + base de datos + navegador conectado, incluyendo el histórico de Alex.
2. **Código:** `server/` nuevo, `ui/api.js` nuevo, 17 líneas `await` + `main.js` + `restablecer.js` + `bandeja.js`; 🔴 acceso, claves, sesiones, permisos, SQL.
3. **Modelo:** Sonnet construye; la sesión escribe contrato, verifica con scripts y recorre el navegador.
4. **Agentes:** 2 constructores Sonnet (A servidor, B navegador) + 1 refutador de seguridad Sonnet (+ arreglos).
5. **Cómo:** A y B en paralelo en copias aisladas (el contrato de arriba los une); luego refutador; luego recorrido.
6. **Costo:** ~1,8–2,4 M de tokens (sube ~0,2 M por incluir el histórico de Alex) y 3–4 h.
✅ **PASA:** `npm test` ≥ 119 verde sin tocar pruebas viejas · pruebas del servidor verdes · un registro sigue ahí tras reiniciar · un Técnico no confirma una revisión ni por la API · `accesos` rechaza `UPDATE`/`DELETE` · `data/` y `server/` no salen en Pages · recorrido en navegador sin errores de consola ni de CSP.
⛔ **No se toca:** `main`, la rama `VersionTripleA`, `gerencia317`, los servicios de BEC, el link público de Pages.

## Riesgos conocidos (dichos de frente)

- `node:sqlite` aún es «experimental» en Node: funciona hoy (probado en Node 24.14), pero puede cambiar entre versiones.
- Dos personas editando **el mismo** registro a la vez: gana la última acción (no hay bloqueo por registro). Aceptable para esta demostración.
- La bandeja simulada pública (D7) es solo de demostración.
