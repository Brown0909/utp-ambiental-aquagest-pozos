# Spec 004 — Servidor y base de datos para AquaGest MiAMBIENTE

> **Estado:** APROBADA en versión barata (28-oct-2026, «dale» de José: proyecto universitario, solo lo necesario) · **Modo SDD:** actualización.
> **Origen:** pedido de José del 28-oct-2026 (chat del grupo: para el 75 % del jueves falta «el backend y la base de
> datos que guarde registros»). Se construye **sobre la rama `VersionTripleA` de Alex** (Spec 003), sin modificarla.
> Solo el QUÉ y el POR QUÉ. Radio de impacto en `impacto.md`; el cómo en `plan.md`.

## Objetivo y porqué

Hoy todo vive en la memoria del navegador y se pierde al recargar (RF-72). Esta spec agrega un **servidor con base de
datos** para que lo que registre el grupo **se guarde, se comparta entre personas y sobreviva a un reinicio**.
Aprovecha que las reglas (validaciones, permisos, normativa) ya son código puro: **el mismo código corre en el servidor**,
así que no hay dos versiones de las reglas que puedan separarse.

## Requisitos funcionales (EARS) — continúan desde RF-83 de la Spec 003

- **RF-84:** CUANDO la app se abre servida por el servidor (`npm start`), EL SISTEMA guarda todo registro en una base SQLite (archivo `data/aquagest.db`) y lo conserva al apagar y volver a encender; CUANDO se abre desde GitHub Pages, EL SISTEMA funciona como hoy (datos en memoria, RF-72).
- **RF-85:** CUANDO el servidor arranca con la base vacía, EL SISTEMA la llena **una sola vez** con los datos de ejemplo, marcados como ficticios (RF-81).
- **RF-86:** CUANDO el navegador pide una acción de escritura (las 17 del inventario de `impacto.md`), EL SISTEMA la ejecuta **en el servidor** con el mismo código de reglas y devuelve el mismo formato de resultado (`{ok, datos}` o `{ok:false, errores}`); el navegador nunca escribe en la base.
- **RF-87:** 🔴 EL SISTEMA identifica al usuario por una **sesión del servidor** (cookie `HttpOnly`, `SameSite=Strict`), nunca por un dato que mande el navegador; SI no hay sesión válida, ENTONCES rechaza toda acción excepto las públicas (entrar, solicitar cuenta, pedir recuperación, ver estado de un enlace y restablecer).
- **RF-88:** 🔴 EL SISTEMA guarda las contraseñas **solo cifradas** (scrypt con sal propia) y nunca envía al navegador contraseñas, cifrados, enlaces de recuperación ni contadores de intentos.
- **RF-89:** 🔴 CUANDO el servidor recibe una acción, EL SISTEMA vuelve a comprobar el permiso del **rol de la sesión** (doble candado, principio 11) aunque la pantalla ya lo haya ocultado.
- **RF-90:** 🔴 EL SISTEMA anota en una tabla de accesos **que no se puede editar ni borrar** (ni con SQL): cada entrada, salida, contraseña equivocada, bloqueo y sesión vencida, con hora, cuenta (si existe), IP y navegador; **nunca** la contraseña ni el correo escrito en un fallo. SI anotar falla, ENTONCES la persona entra igual y el error va al registro del servidor.
- **RF-91:** MIENTRAS una sesión lleva más de 8 horas, EL SISTEMA la da por vencida y pide entrar de nuevo.
- **RF-92:** CUANDO alguien hace una acción, EL SISTEMA actualiza los datos de su pantalla con lo que devolvió el servidor; y CADA 5 segundos refresca los datos, para que dos personas vean los cambios de la otra sin recargar.
- **RF-93:** SI dos personas registran a la vez, ENTONCES EL SISTEMA asigna folios e IDs **en el servidor** (nunca repetidos) y el navegador muestra el que asignó el servidor.
- **RF-94:** EL SISTEMA **no borra nada** de la base (principio 4): solo agrega o cambia el estado de un registro.
- **RF-95:** SI el servidor no responde, ENTONCES EL SISTEMA lo avisa con un mensaje claro y **conserva lo escrito en el formulario**.
- **RF-96:** EL SISTEMA guarda el histórico mensual y la importación CSV de la Spec 003 en la base, con el mismo límite (1 MB y 1000 filas) comprobado también en el servidor.
- **RF-97:** 🔴 EL SISTEMA limita el cuerpo de cada petición a 1,5 MB, acepta solo JSON y rechaza peticiones de otro origen. *(Versión barata: sin límite de ritmo por IP; el bloqueo de 5 intentos por cuenta del núcleo se mantiene.)*
- **RF-98:** *(RETIRADO en la versión barata, 28-oct-2026: la base es un archivo `data/aquagest.db` que se copia a mano.)*
- **RF-99:** EL SISTEMA trae pruebas automáticas del servidor (`npm test`) y una **guía de prueba en pareja (10 minutos)** para que dos personas lo verifiquen a mano desde dos computadoras.

## Qué partes del sistema toca (resumen; detalle en `impacto.md`)

| Pieza | Cambio | Riesgo |
|---|---|---|
| `server/` (nuevo, **fuera de `docs/`**) | Servidor, base, sesiones, accesos | 🔴 Alto: acceso, claves, permisos, SQL |
| `docs/app/js/ui/api.js` (nuevo) | El navegador habla con el servidor | Medio |
| 17 llamadas de escritura en `screens/`, `ui/serieHistorica.js`, `main.js` | Pasan a `await` | Medio: mecánico, 1 línea cada una |
| `screens/restablecer.js`, `screens/bandeja.js`, `main.js` | Lectura que hoy es inmediata pasa a esperar al servidor | Medio |
| Núcleo de reglas (`core/`), CSS | **No cambia** | — |
| `package.json`, `.gitignore`, README | Scripts, `data/` ignorada, instrucciones | Bajo |

## Decisiones tomadas por delegación (José: «hazlo como tú creas mejor»; se anotan para que el grupo las vete)

- **D1 —** Servidor Node **sin dependencias** (módulo `http` nativo) con `node:sqlite` incluido en Node. Pide **Node 22.13 o superior** en cada computadora que corra el servidor.
- **D2 —** Un **solo código de reglas**: el servidor importa los mismos módulos de `docs/app/js/core/` que el navegador.
- **D3 —** El navegador conserva una copia de lectura de los datos (las pantallas de lectura no cambian); lo que cambia son las 17 escrituras, que esperan al servidor.
- **D4 —** Una sola base compartida. Para probar entre ustedes: un computador corre `npm start` y los demás entran por `http://<IP del computador>:3000` desde la misma red.
- **D5 —** GitHub Pages **sigue en modo demostración**: no puede alojar un servidor.
- **D6 —** Las contraseñas de los usuarios de ejemplo siguen siendo `Aqua2026!` (ahora cifradas en la base); son de demostración.
- **D7 —** La «bandeja de correo simulada» sigue pública solo mientras `AQUAGEST_DEMO=1` (activo en `npm start`): muestra los enlaces de recuperación, algo que un sistema real **no** debe hacer.
- **D8 —** Las marcas de tiempo las pone **el reloj del servidor**; el navegador usa el desfase con ese reloj para sus fechas por defecto.

## Fuera de alcance

- **Versión barata (decisión de José, 28-oct):** sin revisión de seguridad independiente, sin recorrido automático en el navegador, sin respaldo automático, sin límite de ritmo por IP. **Por eso el servidor es solo para la red local del grupo, nunca para internet abierto.**
- Servidor en la nube / link público con datos guardados (decisión de José: «en un PC con `npm start`»).
- Correo real, pronóstico del tiempo y conexión automática a APIs de lluvia (siguen como en la Spec 003).
- Segundo factor, recuperación por correo real, alertas de actividad sospechosa (regla 17 de José: solo se **guarda** el registro de accesos en esta spec).
- Cambiar el diseño de ninguna pantalla.

## Dudas abiertas

1. ¿Qué versión de Node tienen Alex y Ethan? (necesitan 22.13 o más para correr el servidor).
2. ¿Qué computador del grupo corre el servidor el jueves?
3. ¿Se aprueba que esta rama (`spec-004-backend`, sobre la de Alex) se junte a `main` cuando pase la revisión?
