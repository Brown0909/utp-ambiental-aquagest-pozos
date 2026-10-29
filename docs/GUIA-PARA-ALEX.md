# Guía para Alex: probar AquaGest en tu computadora (15 minutos)

> Objetivo: comprobar **en tu computadora y con tu propia copia** que los registros se hacen y **se guardan**.
> No necesitas cuenta de GitHub ni instalar nada más que Node. Lo que registres queda solo en tu computadora; no afecta a la de José.
> **Usa solo datos de prueba**: el sistema es una demostración y las claves de ejemplo son conocidas.

## Qué necesitas

- Una computadora con Windows, Mac o Linux y un navegador (Chrome, Edge o Firefox).
- **Node.js 22.13 o más** (recomendado: la versión **LTS** actual, 24). Para saber si ya lo tienes, abre una terminal y escribe `node --version`.
  Si no sale un número, o sale uno menor a 22.13, instálalo desde <https://nodejs.org> (botón «LTS») y cierra y vuelve a abrir la terminal.

## Paso 1 — Bajar el proyecto (2 minutos)

**Opción A, sin git (la más fácil):**
1. Abre <https://github.com/Brown0909/utp-ambiental-aquagest-pozos>.
2. Botón verde **Code → Download ZIP**.
3. Descomprime el ZIP. Se crea una carpeta `utp-ambiental-aquagest-pozos-main`.

**Opción B, con git:** `git clone https://github.com/Brown0909/utp-ambiental-aquagest-pozos.git`

Asegúrate de estar en la rama **main** (el ZIP ya trae main).

## Paso 2 — Encender el servidor (1 minuto)

1. Abre una terminal **dentro de la carpeta del proyecto** (en Windows: abre la carpeta, clic en la barra de direcciones, escribe `cmd` y Enter).
2. Escribe:

   ```
   npm start
   ```

3. Debe aparecer algo así (el aviso amarillo «ExperimentalWarning» es normal):

   ```
   AquaGest MiAMBIENTE — servidor con base de datos
     Base de datos: ...\data\aquagest.db
     Entre desde este computador:
       http://localhost:3000/app/
   ```

   **Deja esa ventana abierta**: es el servidor. Para apagarlo después, `Ctrl+C`.

Si dice **«El puerto 3000 ya está en uso»**, usa otro número y cámbialo también en la dirección del navegador:
- Windows `cmd`: `set PUERTO=3100&& npm start` (sin espacio antes de `&&`)
- Windows PowerShell: `$env:PUERTO=3100; npm start`
- Mac/Linux: `PUERTO=3100 npm start`

## Paso 3 — Entrar (1 minuto)

Abre <http://localhost:3000/app/> en el navegador. Entra con:

| Rol | Correo | Clave |
|---|---|---|
| Técnico | `carlos.chen@miambiente.gob.pa` | `Aqua2026!` |
| Laboratorio | `ana.rodriguez@miambiente.gob.pa` | `Aqua2026!` |
| Administrador | `maria.castillo@miambiente.gob.pa` | `Aqua2026!` |

## Paso 4 — Hacer un registro completo (6 minutos)

Hazlo en este orden, cambiando de usuario con «Cerrar sesión» (abajo a la izquierda):

1. **Técnico → «Puntos y pozos» → nuevo pozo.** Nombre: `PRUEBA Alex`, comunidad: `Prueba`, profundidad `15`, latitud `8,8`, longitud `-82,6`. Debe llevarte al detalle del pozo con un ID tipo `PZ-020`.
2. **Técnico → «Registrar Muestra».** Elige tu pozo, tipo de agua «Subterránea/Pozo», objetivo «Consumo humano», clasificación «Referencia», deja la fecha de hoy. Debe salir **«Muestra guardada»** con un folio (`AG-2026-082`) y un código QR.
3. **Técnico → «Recepción y traslado» → tu folio → «Registrar envío».**
4. **Laboratorio → «Recepción y traslado» → tu folio → «Confirmar recepción».**
5. **Laboratorio → «Resultados Lab» → tu folio.** Rellena: conductividad `400`, coliformes `0`, E. coli `0`, nitrato `2,5` (forma **NO₃-N**), fecha de hoy, y pulsa **«Usar certificado de demostración»**. Guarda.
6. **Administrador → «Evaluación normativa» → tu folio → «Confirmar revisión»** (escribe una observación de 10 letras o más).
   Debe quedar **«Revisión confirmada · Cumple»**, con los límites del reglamento 21-2019.

## Paso 5 — Comprobar que de verdad se guardó (3 minutos)

1. En la ventana del servidor, **`Ctrl+C`** para apagarlo. Si intentas hacer algo en la página con el servidor apagado, debe avisarte que no hay conexión y **no perder lo que escribías**: es lo esperado.
2. Vuélvelo a encender con `npm start`.
3. **Recarga la página.** Debe seguir todo: tu pozo en «Puntos y pozos» y tu muestra en «Historial y reportes», con «Revisión confirmada».
4. Los datos están en el archivo **`data\aquagest.db`**, dentro de la carpeta del proyecto.

## Paso 6 — Cosas que deben RECHAZARSE (2 minutos)

Prueba que el sistema defiende sus reglas (son parte de lo que queremos comprobar):

- Como **Técnico**, esas pantallas ni aparecen en tu menú. Escribe a mano en el navegador `http://localhost:3000/app/#/usuarios` (y luego `#/laboratorio`): debe decir que **no tienes permiso para abrir esta pantalla**.
- Crea un pozo con latitud `45`: debe decir que está **fuera de Panamá**.
- Entra con una contraseña equivocada: debe decir «Correo o contraseña incorrectos». Con 5 fallos seguidos, **bloquea por un minuto**.

## Si algo no funciona

| Pasa esto | Haz esto |
|---|---|
| `npm` o `node` «no se reconoce» | Instala Node (arriba) y **abre una terminal nueva**. |
| Error de `node:sqlite` o «no encuentra el módulo» | Tu Node es viejo: `node --version` debe dar 22.13 o más. |
| «El puerto 3000 ya está en uso» | Usa otro puerto (Paso 2). |
| La página no carga | Revisa que la ventana del servidor siga abierta y que la dirección empiece con `http://localhost:` (no `https`). |
| Quieres empezar de cero | Apaga el servidor, borra `data\aquagest.db` y vuelve a hacer `npm start`. |

## Qué decirle a José al terminar

Mándale **una captura de la pantalla de «Revisión confirmada»** y dile cuál fue el último paso que te funcionó. Si algo falló, copia lo que dice
la **ventana del servidor** (la terminal) y una captura de la pantalla con el error.

## Lo que esta guía NO prueba

- No prueba el celular ni dos computadoras a la vez (eso está en [`GUIA-PRUEBA-EN-PAREJA.md`](GUIA-PRUEBA-EN-PAREJA.md)).
- Los certificados y fotos **no se guardan** (solo su nombre y tamaño): es una limitación conocida.
- No hay HTTPS ni revisión de seguridad independiente: **úsalo solo en tu red, nunca abierto a internet**.
