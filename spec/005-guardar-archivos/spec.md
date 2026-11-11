# Spec 005 — Guardar de verdad los certificados PDF y las fotos de campo

> **Estado:** APROBADA (10-nov-2026, «dale» de José, rama `spec-005-archivos`, versión barata: 1 constructor, sin refutador) · **Modo SDD:** actualización.
> **Origen:** pregunta de José: «¿los certificados y fotos deben guardarse de verdad?» → sí. El servidor corre en su computador.
> Solo el QUÉ y el POR QUÉ. Radio de impacto en `impacto.md`; cómo y tareas en `plan.md`.

## Objetivo y porqué

Hoy el sistema guarda de un certificado o una foto solo el **nombre, el tamaño y los primeros 16 bytes** (RF de la Spec 004: el archivo
en sí se descarta). Después no se puede volver a abrir lo que el laboratorio certificó. Esta spec guarda el archivo **de verdad** en el
computador que corre el servidor y permite abrirlo o descargarlo desde la muestra, sin cambiar las reglas de validación existentes.

## Requisitos funcionales (EARS) — continúan desde RF-99

- **RF-100:** CUANDO la app corre con el servidor, EL SISTEMA guarda el certificado PDF y la foto de campo como archivos en `data/archivos/` (fuera de `docs/`, ignorada por git), nunca dentro de la base ni en una carpeta que se publique.
- **RF-101:** 🔴 CUANDO llega un archivo, EL SISTEMA verifica **en el servidor** su tipo real por el contenido (PDF, JPG o PNG), no por la extensión ni por lo que declare el navegador; SI el tipo real no es el permitido, ENTONCES lo rechaza y no guarda nada.
- **RF-102:** 🔴 EL SISTEMA mantiene los límites de la app: **foto hasta 5 MB** (JPG/PNG) y **certificado hasta 10 MB** (PDF). EL SISTEMA no sube el límite de las peticiones JSON (1,5 MB): los archivos viajan por una ruta aparte, con su propio tope por tipo, y SI se excede ENTONCES responde 413 sin guardar.
- **RF-103:** 🔴 EL SISTEMA solo acepta una subida de quien tenga sesión **y** el permiso de la acción que la usa (foto: `registrar_puntos_muestras`; certificado: `recepcion_resultados`), y la entrega al navegador con un identificador aleatorio.
- **RF-104:** 🔴 EL SISTEMA nombra los archivos en disco con un identificador aleatorio generado por el servidor (nunca con el nombre que manda el navegador) y nunca arma una ruta de disco con texto del usuario (sin salirse de `data/archivos/`).
- **RF-105:** 🔴 CUANDO una acción (`crearMuestra`, `guardarResultados`) referencia un archivo subido, EL SISTEMA comprueba que lo subió **esa misma persona**, que **no está ya usado** en otra muestra, y toma el tipo, el tamaño y los primeros bytes **del archivo guardado**, no de lo que diga el navegador.
- **RF-106:** EL SISTEMA guarda en la muestra la referencia al archivo con una dirección relativa (`../api/archivo/<id>`) que el servidor construye; el navegador nunca puede mandar esa dirección (RF de la Spec 004 se mantiene: se ignora cualquier `url` que venga del navegador).
- **RF-107:** CUANDO alguien con sesión y permiso `consultar` pide `GET /api/archivo/<id>`, EL SISTEMA devuelve el archivo con su tipo real, `X-Content-Type-Options: nosniff` y `Content-Disposition: inline` con un nombre seguro; SI no hay sesión, ENTONCES 401; SI el identificador no existe o no tiene el formato esperado, ENTONCES 404.
- **RF-108:** EL SISTEMA muestra la foto en el detalle de la muestra y el certificado como enlace «abrir» (se reutiliza lo que la pantalla ya hace cuando el archivo trae dirección), y el nombre original del archivo se muestra siempre escapado (principio 12).
- **RF-109:** EL SISTEMA no borra ni reemplaza archivos (principio 4): un archivo subido que no llega a usarse queda en disco sin referencia; no se elimina.
- **RF-110:** CUANDO la app corre en modo demostración (GitHub Pages, sin servidor), EL SISTEMA se comporta exactamente como hoy (archivos solo en memoria y con la vista local del navegador).
- **RF-111:** EL SISTEMA trae pruebas automáticas de esta spec, y **ninguna prueba existente se modifica** (regla 18).

## Qué partes del sistema toca (resumen; detalle en `impacto.md`)

| Pieza | Cambio | Riesgo |
|---|---|---|
| `server/archivos.js` (nuevo) | Guardar, leer, verificar tipo real, límites | 🔴 Alto: subida de archivos |
| `server/http.js` | Ruta de subida (cuerpo binario) y de descarga; el filtro «solo JSON» no cambia para el resto | 🔴 Alto |
| `server/almacen.js`, `server/db.js` | Tabla `archivos` (aditiva) y resolver la referencia en `crearMuestra`/`guardarResultados` | 🔴 Medio |
| `docs/app/js/ui/api.js`, `ui/archivos.js` | Subir el archivo antes de la acción (solo en modo servidor) | Medio |
| Pantallas de muestra y laboratorio | Casi sin cambios (ya muestran foto y enlace si hay dirección) | Bajo |
| Núcleo `core/` y CSP | **No cambia** (la CSP ya permite `img-src 'self'` y enlaces del mismo origen) | — |

## Decisiones tomadas por delegación (José: «hazlo como tú creas mejor»)

- **D1 —** Los archivos se guardan en el sistema de archivos (carpeta `data/archivos/`), no dentro de SQLite: más simple, no engorda la base y se respaldan copiando la carpeta junto con `aquagest.db`.
- **D2 —** Subida **antes** de la acción y en una ruta aparte (`POST /api/archivo`, cuerpo binario, tipo declarado por cabecera), porque el JSON no puede pasar de 1,5 MB.
- **D3 —** Sin vista previa del PDF dentro de la app, sin borrar ni reemplazar, sin compresión de fotos (menos código, menos superficie de ataque, regla 19).
- **D4 —** Para respaldar o llevar la base a otra PC hay que copiar **las dos cosas**: `data/aquagest.db` y `data/archivos/`.

## Fuera de alcance

- Servidor en internet, HTTPS, antivirus, miniaturas, borrado, versiones de un mismo archivo.
- Archivos de otros tipos (solo PDF, JPG, PNG).
- Cambiar las reglas de validación del núcleo.
