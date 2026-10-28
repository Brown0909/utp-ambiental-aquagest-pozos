# Tareas — Spec 004

> Cada tarea cita sus RF y filas M-n, y trae su criterio PASA/NO-PASA. Marcar `[x]` solo con la salida real de su prueba.
> Regla 18 de José: **ninguna prueba existente se cambia** para que pase; si una se pone roja, se arregla el código.

## Construcción — Agente A (servidor)

- [ ] **T1** (RF-84, 85, 94, 96; M-23, 24, 28, 33) `server/db.js`: esquema, siembra única, guardar solo lo que cambió, cargar al arrancar, `data/` en `.gitignore`. **PASA:** una prueba crea un punto, cierra y reabre la base y lo encuentra; ninguna ruta del código contiene `DELETE FROM`.
- [ ] **T2** (RF-87, 88, 90, 91; M-1, 2, 5, 23, 32) `server/auth.js`: scrypt con sal, sesiones con cookie `HttpOnly`/`SameSite=Strict` y 8 h, tabla `accesos` con disparadores. **PASA:** `UPDATE accesos` y `DELETE FROM accesos` fallan; la clave guardada no es `Aqua2026!`; el registro no contiene contraseñas ni el correo tecleado en un fallo.
- [ ] **T3** (RF-86, 89, 93, 97; M-3…M-18, 22, 31) `server/almacen.js` + `server/http.js` + `server/index.js`: rutas del contrato, lista blanca de acciones, usuario de la petición, permiso del rol, límites de cuerpo/ritmo/origen, servir `docs/`. **PASA:** un Técnico que manda `confirmarRevision` recibe `{ok:false, sinPermiso:true}`; una acción fuera de la lista blanca da 400; un cuerpo de 2 MB da 413; un `Origin` ajeno da 403.
- [ ] **T4** (RF-99) scripts de `package.json` (`start`; `engines` ≥ 22.13) + pruebas `tests/servidor-*.test.js`. **PASA:** `npm test` verde con el total ≥ 119 más las nuevas; cada prueba nueva «muerde» (se rompe el código a propósito y se pone roja).

## Construcción — Agente B (navegador)

- [ ] **T5** (RF-84, 92, 95; M-19…M-22, 29, 30) `docs/app/js/ui/api.js`: `AlmacenRemoto`, detección de modo con `GET ../api/salud`, copia local, refresco cada 5 s, desfase de reloj, aviso si el servidor no responde sin perder el formulario. **PASA:** en Pages (sin `/api`) la app arranca en modo demostración sin mostrar error.
- [ ] **T6** (RF-86; M-1…M-17, M-21) las 17 llamadas pasan a `await` y sus manejadores a `async`; `main.js` recupera la sesión antes del primer dibujo; `restablecer.js` y `bandeja.js` esperan al servidor. **PASA:** `git diff` de las pantallas solo muestra `await`/`async` y esas esperas; las 119 pruebas siguen verdes.

## Verificación — la sesión

- [ ] **T7** (todos) *(Versión barata)* Prueba por script contra el servidor real (arranca, hace el flujo crear pozo → muestra → envío → recepción → resultados → revisión por HTTP, se apaga, se enciende y comprueba que los datos siguen). El recorrido en el navegador lo hace el grupo con la guía de prueba en pareja.
- [~] **T8** *(RETIRADA en la versión barata por decisión de José: sin refutador de seguridad independiente.)*
- [ ] **T9** (RF-99, regla 14) `docs/GUIA-PRUEBA-EN-PAREJA.md`, README y `docs/COMO-FUNCIONA.md` (con «🧒 Cómo funciona por dentro»).
- [ ] **T10** (M-26, M-27) Revisión de pruebas: casos antes y después; informe a José de cualquier prueba vieja tocada (debe ser ninguna). Mostrar a Alex el diff contra su rama.
