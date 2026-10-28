# Guía de prueba en pareja (10 minutos)

Para comprobar a mano, entre **dos personas en dos computadoras**, que AquaGest ahora **guarda los datos** en un servidor y que los dos ven lo que hace el otro.

> ⚠️ **Solo dentro de la misma red** (el mismo Wi-Fi o el mismo cable). Este servidor **no se abre al internet**: no tiene todavía las defensas que necesita un sistema público.

## Lo que necesitan

- **Computadora 1 (la «servidora»):** Node 22.13 o más nuevo. Para saberlo, abran una terminal y escriban `node -v` (debe decir `v22.13` o un número mayor).
- **Computadora 2:** solo un navegador (Chrome, Edge o Firefox). No instala nada.
- Las dos computadoras en **la misma red**.

## Paso 1 — Encender el servidor (Computadora 1, 2 minutos)

1. Abran una terminal **en la carpeta del proyecto** (la que tiene `package.json`).
2. Escriban:
   ```
   npm start
   ```
3. Debe aparecer algo así (los números cambian en cada red):
   ```
   AquaGest MiAMBIENTE — servidor con base de datos
     Base de datos: ...\data\aquagest.db
     Entre desde este computador:
       http://localhost:3000/app/
     Entre desde OTRO computador de la misma red:
       http://192.168.0.178:3000/app/
   ```
4. **Anoten la dirección de «OTRO computador»** (la que empieza con `192.168.` o `10.`). Esa es la que usará la Computadora 2. Si salen varias, prueben con la primera; si no abre, con la siguiente.
5. Si Windows pregunta por el **Firewall**, elijan **«Permitir acceso»** (en la red privada).
6. **No cierren esa terminal**: mientras esté abierta, el servidor está encendido.

## Paso 2 — Entrar los dos (1 minuto)

| | Computadora 1 (Persona A) | Computadora 2 (Persona B) |
|---|---|---|
| Dirección | `http://localhost:3000/app/` | la dirección de red anotada, por ejemplo `http://192.168.0.178:3000/app/` |
| Entra como | botón **Entrar como Administrador** y luego «Iniciar Sesión» | botón **Entrar como Técnico** y luego «Iniciar Sesión» |

(La clave de todos los usuarios de ejemplo es `Aqua2026!`; es solo de demostración.)

**Debe verse:** cada una ve su nombre abajo a la izquierda y su menú. El Técnico **no** ve «Usuarios y roles».

## Paso 3 — Probar que se comparten los datos (4 minutos)

1. **Persona B (Técnico):** menú **Puntos y pozos** → **+ Nuevo punto/pozo** → tipo *Pozo*, nombre «Pozo de prueba», comunidad «Boquete», profundidad `10`, latitud `8.78`, longitud `-82.44` → **Guardar**.
   *Debe verse:* el pozo guardado con un código nuevo (`PZ-020`). **Ese código lo puso el servidor**, no la computadora de B.
2. **Persona A (Administrador):** **no recargue la página.** Vaya a **Puntos y pozos** y espere unos 5 segundos.
   *Debe verse:* aparece «Pozo de prueba». A ve lo que B acaba de hacer sin hacer nada más.
3. **Persona B:** menú **Registrar Muestra** → elija «Pozo de prueba», tipo de agua *Subterránea/Pozo*, objetivo *Solo monitoreo* → **Guardar muestra**.
   *Debe verse:* un folio nuevo tipo `AG-2026-082`.
4. **Persona B:** **Recepción y traslado** → abra la muestra → **Registrar envío**.
5. **Persona A:** **Recepción y traslado** → la muestra aparece como «Enviada» → **Confirmar recepción**. Luego **Resultados Lab** → busque el folio → llene los resultados y use **«Usar certificado de demostración»** → **Guardar y enviar a evaluación**.
6. **Persona A:** **Evaluación Normativa** → abra la muestra → escriba una observación de 10 letras o más → **Confirmar revisión**.
   *Debe verse:* la muestra queda en «Revisión confirmada».
7. **Persona B:** abra la misma muestra desde **Historial y Reportes**. *Debe verse* la revisión confirmada por A.

## Paso 4 — Probar que cada rol hace solo lo suyo (1 minuto)

- **Persona B (Técnico):** intente abrir `…/app/#/usuarios` escribiéndolo en la barra de direcciones.
  *Debe verse:* «No tiene permiso para abrir esta pantalla».
- **Persona B:** en el pozo de arriba, no debe aparecer ningún botón de «Confirmar revisión».

## Paso 5 — Apagar y comprobar que los datos siguen (2 minutos)

1. **Persona A** va a la terminal de la Computadora 1 y aprieta **Ctrl + C** (se apaga el servidor).
2. **Las dos personas** intentan hacer algo (por ejemplo, guardar otro pozo).
   *Debe verse:* un aviso rojo «El servidor no responde» y un mensaje en el formulario. **Lo que escribieron no se borra.**
3. **Persona A** vuelve a escribir `npm start` y espera a que diga «Entre desde este computador».
4. Las dos personas recargan la página y entran de nuevo.
   *Debe verse:* **el «Pozo de prueba», la muestra y la revisión confirmada siguen ahí.** Eso prueba que se guardaron en la base de datos.

Para una prueba extra: busquen el archivo `data/aquagest.db` en la carpeta del proyecto. Ese archivo **es** la base de datos; copiarlo es hacer un respaldo. **No se sube a GitHub** (está en `.gitignore`).

## Si algo no funciona

| Qué pasa | Qué hacer |
|---|---|
| `npm start` dice que Node es viejo o falla con `node:sqlite` | Instalar Node 22.13 o más nuevo (`node -v` para ver la versión). |
| «El puerto 3000 ya está en uso» | Cerrar el otro servidor, o usar otro puerto: en PowerShell `$env:PUERTO=3001; npm start`. |
| La Computadora 2 no abre la dirección | Revisar que estén en la **misma red**, que la dirección tenga el puerto (`:3000`) y que el Firewall haya permitido el acceso. |
| Sale «Origen no permitido» | Entren por la **misma dirección** que muestra el servidor (no por otro nombre). |
| Quiero empezar de cero con los datos de ejemplo | Apaguen el servidor (Ctrl + C) y **muevan** `data/aquagest.db` a otra carpeta (no la borren si no están seguros); al encender se crea una base nueva. |
| La clave se bloquea | Después de 5 intentos fallidos se bloquea esa cuenta 60 segundos. Esperen y prueben de nuevo. |

## Lo que esta guía NO prueba

- Los **archivos** (la foto de la muestra y el certificado PDF) **no se guardan** en el servidor en esta versión: se guarda su nombre y tamaño, pero no el contenido.
- No hay correo real: los «correos» se ven en la **bandeja simulada** (`…/app/#/bandeja`), solo mientras el servidor corre en modo demostración.
- Desde **GitHub Pages** la aplicación sigue funcionando como demostración **sin guardar** nada (no hay servidor allí).
