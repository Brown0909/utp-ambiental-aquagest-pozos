# Radio de impacto — Spec 005 (guardar archivos)

> Hecho el 10-nov-2026 sobre `main` (`e41588f`, 168 pruebas verdes). Búsquedas repetibles con `grep` sobre `docs/app/js` y `server/`.

| # | Hallazgo | Dónde | Qué se hace |
|---|---|---|---|
| M-1 | La app capta el archivo en `ui/archivos.js:9` y devuelve `{name,size,type,bytes[16],url: blob local}` | `enlazarArchivo`, usado en `laboratorio.js:55` (certificado) y `muestraNuevaLogica.js:15` (foto) | En modo servidor, además de los 16 bytes, hay que conservar el `File` para subirlo. El modo demostración no cambia (RF-110) |
| M-2 | El botón «Usar certificado de demostración» crea el PDF en el navegador (`ui/pdfDemo.js`) | `laboratorio.js:56` | Ese certificado también se sube al servidor: debe pasar por el mismo camino que un archivo elegido |
| M-3 | El núcleo valida con `checkFile` y guarda `url: cert.url ?? null` | `core/store-lab.js:41-46`, `core/store-muestras.js:90-95` | **No se toca el núcleo.** El servidor entrega al núcleo un archivo ya verificado con `bytes`, `size` y `url` propios |
| M-4 | Límites del núcleo: foto 5 MB, certificado 10 MB | `store-muestras.js:12`, `store-lab.js:7` | Se respetan; la ruta de subida aplica el mismo tope por tipo |
| M-5 | El servidor **descarta** el archivo: `limpiarArchivo` deja `bytes[16]` y `url:null` | `server/almacen.js:45-49`, usado en `:178-179` | Se reemplaza por «resolver archivo subido»: lee el archivo guardado y arma `{name,size,type,bytes,url}` verificados (RF-105) |
| M-6 | El cuerpo JSON máximo es 1,5 MB y solo se acepta `application/json` | `server/http.js:13,117-120` | La ruta nueva **no** reutiliza ese tope: lleva el suyo (5/10 MB por tipo). El resto de rutas no cambia (RF-102) |
| M-7 | La comprobación de `Origin` y la sesión ya existen por petición | `server/http.js` (`origenPermitido`, `sesionDe`) | La subida y la descarga las **reutilizan**; no se duplican |
| M-8 | La interfaz ya muestra `<img src=m.foto.url>` y `<a href=r.certificado.url>` si hay dirección | `muestraDetalle.js:38`, `ui/componentes.js:33` | Sin cambios de pantalla. Solo hay que comprobar que escape el nombre y que `target=_blank` lleve `rel=noopener` (ya lo trae) |
| M-9 | La CSP permite `img-src 'self'`, `default-src 'self'` y `object-src 'none'` | `docs/app/index.html` | Una foto del mismo origen carga. Un PDF en otra pestaña no la usa. **No se debilita** |
| M-10 | GitHub Pages publica toda `docs/` | `docs/` | `server/` y `data/` siguen **fuera** de `docs/`; `data/archivos/` queda cubierta por la regla ya existente de `.gitignore` (`data/`). Se agrega una prueba que lo vigile |
| M-11 | Nombre de archivo del usuario | `name` en el JSON | Solo se guarda como texto de presentación (escapado, tope 200); jamás para armar una ruta (RF-104) |
| M-12 | Reiniciar el servidor y la base | `server/db.js` | La tabla `archivos` se crea con `CREATE TABLE IF NOT EXISTS` (**aditivo**; se vuelve atrás ignorándola, no borra nada). Sin `DELETE FROM` en ninguna ruta (RF-109) |
| M-13 | Respaldo y zip | `README`, guías | Hay que avisar que respaldar = `aquagest.db` **+** `data/archivos/` (D4); el zip de GitHub no los incluye a propósito |
| M-14 | Pruebas existentes (168) | `tests/` | **No cambian.** Se cuentan antes y después |
| M-15 | Pruebas de servidor que mandan archivos como JSON con 16 bytes | `tests/servidor-http.test.js:207` (`guardarResultados` con certificado) | Deben seguir pasando: el servidor sigue aceptando la forma vieja en modo prueba **solo si** no trae referencia de archivo; si esa prueba se pone roja, se arregla el código, no la prueba |

## Lo que NO cambia

Núcleo de reglas, matriz de permisos, normativa, CSP, el modo demostración de GitHub Pages y las 168 pruebas.
