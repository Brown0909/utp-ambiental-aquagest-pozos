# Plan y tareas — Spec 005 (guardar archivos)

> Cita las filas M-n de `impacto.md`. Versión barata aprobada el 10-nov-2026: 1 constructor Sonnet, sin refutador, en rama `spec-005-archivos`.

## Cómo funciona (ejemplo: subir el certificado)

1. Laboratorio elige el PDF (o pulsa «certificado de demostración») → la pantalla lo muestra como hoy.
2. Al guardar los resultados, en modo servidor, `ui/api.js` primero hace `POST ../api/archivo` con el contenido en bruto (cabecera `X-Tipo-Archivo: certificado`, `X-Nombre-Archivo`) → el servidor comprueba sesión, permiso `recepcion_resultados`, tope 10 MB y el **tipo real** (empieza con `%PDF`), lo guarda con un identificador aleatorio y responde `{ok:true, archivo:{id}}`.
3. Luego `ui/api.js` manda la acción de siempre pero con `certificado: {archivoId}` (sin bytes ni url).
4. El servidor **resuelve** ese `archivoId` (lo subió la misma persona, sin usar) y le entrega al núcleo `{name,size,type,bytes[16],url:'../api/archivo/<id>'}` tomados del archivo guardado. El núcleo valida igual que hoy.
5. La muestra queda con la dirección; la pantalla ya muestra el enlace «abrir». `GET /api/archivo/<id>` devuelve el archivo si hay sesión y permiso `consultar`.

## Contrato (lo único que une servidor y navegador)

| Ruta | Quién | Detalle |
|---|---|---|
| `POST /api/archivo` | sesión + permiso según tipo | Cuerpo binario. Cabeceras: `X-Tipo-Archivo: foto\|certificado`, `X-Nombre-Archivo` (texto codificado, máx. 200). Respuesta `{ok:true, archivo:{id,name,size,type}}` o `{ok:false, errores:{archivo}}` (tipo falso, vacío, sin permiso: HTTP 200 con `ok:false`; sin sesión 401; tamaño 413; `Origin` ajeno 403) |
| `GET /api/archivo/:id` | sesión + `consultar` | `:id` = 32 hex. Devuelve el binario con su tipo real, `nosniff`, `Content-Disposition: inline; filename="<seguro>"`. 401 sin sesión, 404 si no existe o el formato no es el esperado |
| `/api/accion` (`crearMuestra`, `guardarResultados`) | como hoy | `foto` / `certificado` pueden ser `{archivoId}` (servidor) |

## Tareas (una sola cadena, un constructor)

- [ ] **T1** (RF-100…106, 109; M-5, M-6, M-7, M-10…M-12) `server/archivos.js` + tabla `archivos` en `server/db.js` + rutas en `server/http.js` + resolución en `server/almacen.js`. **PASA:** subir un PDF válido devuelve id; un `.pdf` con texto adentro se rechaza; 5 MB + 1 de foto o 10 MB + 1 de PDF da 413; un id inventado o con `../` da 404; sin sesión 401; un archivo de otra persona o ya usado no se puede referenciar; el nombre en disco no contiene nada del nombre original; ninguna ruta del servidor contiene `DELETE FROM`.
- [ ] **T2** (RF-107, 108, 110; M-1, M-2, M-8, M-9) `ui/api.js`, `ui/archivos.js` (conservar el `File`), y `laboratorio.js`/`muestraNuevaLogica.js` solo si hace falta. **PASA:** en modo demostración todo sigue igual; en modo servidor foto y certificado (incluido el de demostración) se suben antes de la acción y se abren desde la muestra.
- [ ] **T3** (RF-111; M-13, M-14, M-15) pruebas nuevas en `tests/servidor-archivos.test.js` (cada una **muerde**: se rompe el código a propósito y se pone roja) + guía y README (respaldar `aquagest.db` y `data/archivos/`). **PASA:** `npm test` ≥ 168 + nuevas, ninguna prueba vieja modificada.

## Ficha (resumen)

1 constructor Sonnet · ~0,5–0,8 M de tokens · ~1,5–2 h · rama aparte · 🔴 subida de archivos. **No se toca:** `main`, la rama de Alex, `gerencia317`, el núcleo `core/`, la CSP.
