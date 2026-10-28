# Radio de impacto — Spec 004 (servidor y base de datos)

> Modo actualización. Hecho el 28-oct-2026 sobre la rama `spec-004-backend` (base: `VersionTripleA`, commit `83eab20`,
> 119 pruebas en verde). Las búsquedas se pueden repetir con los comandos de la columna «Cómo se halló».

## Búsquedas hechas

| # | Búsqueda | Resultado |
|---|---|---|
| B1 | Llamadas a acciones que escriben, en `screens/`, `ui/`, `main.js` | **17 llamadas** (tabla de abajo) |
| B2 | Escrituras directas a `store.data` fuera del núcleo | **0**: ninguna pantalla escribe sin pasar por una acción |
| B3 | Lecturas de `store.data` en pantallas | 16 (muestras 5, usuarios 4, puntos 4, correos 2, solicitudes 1) |
| B4 | Usos del reloj o de la sesión del almacén (`ahora`, `usuario`, `sesion`) | 26 |
| B5 | Uso de `password`, `tokens`, `intentos`, `estadoToken` en el navegador | `acceso.js` (clave de demostración), `restablecer.js`, `ui/publico.js` (solo el ojito) |
| B6 | Estructura de `store.data` | usuarios, puntos, muestras, solicitudes, correos, historico, sesion, intentos, tokens, contador |
| B7 | Código del núcleo que toca el navegador (`window`, `document`, `localStorage`) | **0**: el núcleo corre igual en Node |

## Inventario de las 17 escrituras (cada una = una línea que pasa a `await`)

| Fila | Acción | Dónde se llama | Pública (sin sesión) |
|---|---|---|---|
| M-1 | `login` | `screens/acceso.js:43` | sí |
| M-2 | `logout` | `main.js:28` | no |
| M-3 | `solicitarCuenta` | `screens/solicitud.js:29` | sí |
| M-4 | `solicitarRecuperacion` | `screens/recuperar.js:31` | sí |
| M-5 | `restablecer` | `screens/restablecer.js:37` | sí |
| M-6 | `resolverSolicitud` | `screens/usuariosSolicitudes.js:28` | no |
| M-7 | `invitarUsuario` | `screens/usuarios.js:88` | no |
| M-8 | `cambiarRol` | `screens/usuarios.js:70` | no |
| M-9 | `cambiarEstado` | `screens/usuarios.js:77` | no |
| M-10 | `crearPunto` (también edita) | `screens/puntoForm.js:86` | no |
| M-11 | `crearMuestra` | `screens/muestraNuevaLogica.js:74` | no |
| M-12 | `registrarEnvio` | `screens/custodiaForms.js:46` | no |
| M-13 | `confirmarRecepcion` | `screens/custodiaForms.js:47` | no |
| M-14 | `guardarResultados` | `screens/laboratorio.js:60` | no |
| M-15 | `documentarConversion` | `screens/evaluacionRevision.js:54` | no |
| M-16 | `confirmarRevision` | `screens/evaluacionRevision.js:55` | no |
| M-17 | `importarHistorico` | `ui/serieHistorica.js:105` (Spec 003 de Alex) | no |

## Otras filas de impacto (lo que no es una de las 17 llamadas)

| Fila | Qué | Por qué importa | Qué se hace |
|---|---|---|---|
| M-18 | `store.usuario` / `sesion` (B4) | Hoy el almacén guarda **un** usuario en sesión; el servidor atiende a varios | El servidor pone el usuario de **esa petición** en el almacén justo antes de la acción (las acciones son síncronas: no se mezclan) |
| M-19 | `restablecer.js:16` `store.estadoToken()` | Hoy se lee al dibujar, de inmediato; en modo servidor tiene que **esperar** | Se pide al servidor antes de dibujar la pantalla |
| M-20 | `bandeja.js` lee `store.data.correos` | La bandeja es pública y los correos son del servidor | Ruta pública del servidor, solo con `AQUAGEST_DEMO=1` (D7) |
| M-21 | `main.js` `pintar()` guarda las rutas con `store.usuario` | Al recargar hay que **recuperar la sesión** del servidor antes del primer dibujo | `GET /api/estado` antes de pintar |
| M-22 | Reloj: `ahora()` / `ahoraIso()` | Validaciones «no futura» y marcas de tiempo; un reloj de PC desajustado rechazaría «hoy» | Marcas del servidor; el navegador usa el desfase (D8) |
| M-23 | Contraseñas en la semilla (`seed.js` guarda `Aqua2026!` en claro) | No pueden ir así a una base ni al navegador | El servidor cifra al sembrar y quita `password`, `tokens` e `intentos` de lo que envía (RF-88) |
| M-24 | Folios e IDs (`siguienteFolio`, `siguienteIdPunto`) | Dos computadoras podrían crear el mismo folio | Solo el servidor los asigna (RF-93); el navegador muestra el devuelto |
| M-25 | `ui/acceso.js:37` rellena `CLAVE_DEMO` | Atajo de demostración | Se mantiene; sigue siendo la clave de ejemplo (D6) |
| M-26 | Pruebas existentes (119) | Importan el núcleo; **no deben cambiar** (regla 18) | Se cuentan antes y después: 119 antes → ≥119 después, sin tocar ninguna |
| M-27 | Rama de Alex (Spec 003) | `store-historico.js`, `seed.js`, `store.js`, pantallas | Nuestros cambios van en archivos **nuevos** y en 17 líneas `await`; así un `merge` con lo que Alex siga editando casi no choca |
| M-28 | **GitHub Pages publica toda la carpeta `docs/`** | Si `server/` o `data/` quedaran en `docs/`, **se publicaría la base** | `server/` y `data/` en la raíz; `data/` en `.gitignore`; el vigilante de tareas lo comprueba |
| M-29 | CSP de `index.html` (`connect-src 'self'`) | El `fetch` al servidor es del mismo origen: compatible | Sin cambio; se verifica sin violaciones |
| M-30 | Ruta del API vista desde Pages (`/utp-…/app/`) | Una ruta absoluta `/api` caería en la raíz de github.io | Ruta **relativa** (`../api/`); en Pages da 404 y la app entra en modo demostración sin avisar error (RF-84) |
| M-31 | Nuevos puntos de ataque: SQL, CSRF, fuerza bruta, tamaño | El servidor es superficie nueva | Solo consultas preparadas, cookie `SameSite=Strict` + revisión de `Origin`, tope de ritmo, tope de cuerpo (RF-97) |
| M-32 | Regla 17 de José (accesos) | No existe en el sistema hoy | Tabla `accesos` de solo agregar, con disparadores que impiden `UPDATE` y `DELETE` (RF-90) |
| M-33 | Principio 4 (nada se borra) | Ninguna acción actual borra | La capa de guardado solo hace `INSERT` y `UPDATE` de estado; una prueba lo vigila (RF-94) |

## Lo que NO cambia

El núcleo de reglas (`docs/app/js/core/*` salvo lo que ya trajo Alex), las pantallas de lectura, el CSS, la matriz de
permisos, los 110+9 casos de prueba existentes y el link público de Pages.
