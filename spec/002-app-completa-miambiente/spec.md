# Spec 002 — AquaGest MiAMBIENTE: las 27 láminas como aplicación que se usa de verdad

> **Producto:** AquaGest + Pozos (proyecto universitario, UTP Ingeniería Ambiental) · **Estado:** APROBADA por delegación
> (02-oct-2026, José: «necesito que cada una de las pantallas sea usable… meter datos, validar todo el código») ·
> **Modo SDD:** actualización (segunda spec) · **Reemplaza** a la spec 001 (su demo de 4 pantallas con rol JAAR).
> Solo el QUÉ y el POR QUÉ. El cómo va en `plan.md`; lo que toca y puede romperse, en `impacto.md`.

## Objetivo y porqué

El grupo amplió el prototipo de Figma a **27 láminas** (AquaGest MiAMBIENTE). José necesita que **cada pantalla funcione**:
que se pueda tocar, escribir datos, y que el sistema **valide** lo escrito y haga cumplir los permisos de cada rol. Se
publica en el **mismo link gratis** de GitHub Pages, **sin base de datos ni cuentas externas** (decisión vigente desde la
spec 001: los datos viven en la memoria del navegador y se reinician al recargar).

## Las 27 láminas = 17 pantallas

Se verificó el tamaño de cada lámina del PDF: **14 son de escritorio (1440 px), 11 son móviles (390 px) y 2 son de
acceso**. Las versiones móviles repiten pantallas de escritorio, así que 27 láminas = 17 pantallas; la aplicación es
**responsiva** y cubre ambas versiones con el mismo código.

| Pantalla (ruta) | Láminas (escritorio / móvil) |
|---|---|
| Acceso al sistema (`#/acceso`) | 1 |
| Solicitud de cuenta (`#/solicitud`) | 20 |
| Recuperar contraseña (`#/recuperar`) y restablecer (`#/restablecer/…`) | 21 |
| Panel General de Control (`#/panel`) | 2 / 22 |
| Registrar muestra (`#/muestras/nueva`) | 11 / 23 |
| Muestra guardada (`#/muestras/AG-…/guardada`) | 10 |
| Detalle de muestra (`#/muestras/AG-…`) | 14 |
| Resultados de laboratorio (`#/laboratorio`) | 3 / 24 |
| Evaluación normativa (`#/evaluacion`) | 4 / 25 |
| Mapa de puntos y pozos (`#/mapa`) | 13 / 27 |
| Historial y reportes (`#/historial`) | 12 / 26 |
| Puntos y pozos (`#/puntos`) | 5 / 15 |
| Alta de punto o pozo (`#/puntos/nuevo`) | 6 / 16 |
| Detalle de punto o pozo (`#/puntos/PZ-…`) | 7 / 17 |
| Recepción y traslado — cadena de custodia (`#/custodia`) | 8 / 18 |
| Usuarios y roles (`#/usuarios`) | 9 / 19 |
| Bandeja de correo simulada (`#/bandeja`) — no está en el diseño; hace «usable» la recuperación y las invitaciones sin enviar correos reales | — |

## Usuarios

- **Técnico** — registra puntos, pozos, muestras y envíos.
- **Laboratorio** — confirma recepciones y carga resultados.
- **Administrador** — todo lo anterior, más revisión técnica y gestión de usuarios.
- Quien aún no tiene cuenta (solicitud de cuenta, recuperación de contraseña).

## Historias

- H1: Como técnico quiero registrar un pozo y una muestra con sus mediciones de campo, para dejar trazabilidad desde el campo.
- H2: Como técnico quiero registrar el envío de la muestra, para que la cadena de custodia quede documentada.
- H3: Como laboratorista quiero confirmar la recepción y cargar los resultados con su certificado, para que se evalúen.
- H4: Como administrador quiero revisar los resultados contra el reglamento y confirmar la revisión, para que exista un dictamen humano.
- H5: Como administrador quiero gestionar usuarios y roles, para controlar quién hace qué.
- H6: Como cualquier usuario quiero ver el mapa, el historial y el panel y exportar a PDF o Excel, para dar seguimiento.

## Requisitos funcionales (EARS)

### Acceso, recuperación y solicitud de cuenta
- **RF-1:** CUANDO el usuario envía el formulario de acceso, EL SISTEMA valida que el correo tenga formato válido y dominio `@miambiente.gob.pa` y que la contraseña no esté vacía, y señala cada campo inválido sin intentar el acceso.
- **RF-2:** SI el correo o la contraseña no corresponden a un usuario, ENTONCES EL SISTEMA muestra «Correo o contraseña incorrectos» sin indicar cuál de los dos falla.
- **RF-3 🔴:** SI el usuario existe, la contraseña es correcta y su estado es Inactivo, ENTONCES EL SISTEMA rechaza el acceso e informa que el usuario está inactivo.
- **RF-4 🔴:** SI un mismo correo acumula 5 intentos fallidos consecutivos, ENTONCES EL SISTEMA bloquea nuevos intentos de ese correo durante 60 segundos.
- **RF-5:** CUANDO se solicita recuperar la contraseña con un correo institucional válido, EL SISTEMA muestra siempre el mismo mensaje de confirmación, exista o no el correo, y, si el usuario existe y está activo, deja un correo con el enlace en la bandeja simulada.
- **RF-6:** SI el correo de recuperación tiene formato inválido o no es institucional, ENTONCES EL SISTEMA lo señala y no muestra la confirmación.
- **RF-7 🔴:** EL SISTEMA acepta un enlace de restablecimiento solo durante 30 minutos y una sola vez.
- **RF-8:** SI la nueva contraseña no tiene al menos 8 caracteres con mayúscula, minúscula y número, o no coincide con su confirmación, ENTONCES EL SISTEMA la rechaza.
- **RF-9:** CUANDO el usuario cierra sesión o recarga la página, EL SISTEMA vuelve a pedir el acceso.
- **RF-10:** MIENTRAS no haya sesión, EL SISTEMA redirige toda pantalla protegida al acceso.
- **RF-11:** SI la solicitud de cuenta tiene nombre, apellido, correo institucional, unidad, provincia o cargo vacíos o inválidos, ENTONCES EL SISTEMA impide enviarla y señala el campo.
- **RF-12:** SI el correo de la solicitud ya pertenece a un usuario o a otra solicitud pendiente, ENTONCES EL SISTEMA la rechaza.
- **RF-13:** CUANDO un Administrador aprueba una solicitud eligiendo un rol, EL SISTEMA crea el usuario Activo y deja un correo en la bandeja; CUANDO la rechaza con un motivo de al menos 5 caracteres, la marca Rechazada.

### Permisos
- **RF-14:** EL SISTEMA muestra en el menú solo las pantallas que la matriz de permisos permite al rol de la sesión.
- **RF-15:** SI el usuario abre por su dirección una pantalla que su rol no permite, ENTONCES EL SISTEMA muestra «No tiene permiso» y no carga la pantalla.
- **RF-16 🔴:** SI una acción de escritura la solicita un rol sin permiso (aunque se invoque sin pasar por la pantalla), ENTONCES EL SISTEMA la rechaza sin cambiar ningún dato.

### Puntos y pozos
- **RF-17:** EL SISTEMA lista los puntos y pozos con búsqueda por nombre, ID o comunidad, filtros por tipo y comunidad, el conteo («N registros · X pozos · Y puntos») y páginas de 10.
- **RF-18:** CUANDO se guarda un punto o pozo válido, EL SISTEMA le asigna un ID permanente consecutivo (`PZ-NNN` o `PT-NNN`) distinto del folio de muestra.
- **RF-19:** SI el nombre (3–80 caracteres), la comunidad (2–60) o las coordenadas faltan o son inválidos, ENTONCES EL SISTEMA impide guardar y señala el campo.
- **RF-20:** SI el registro es un pozo, ENTONCES EL SISTEMA exige profundidad entre 0,5 y 500 m; SI es un punto, no la pide.
- **RF-21 🔴:** SI las coordenadas caen fuera de Panamá (latitud 7,0 a 9,8; longitud −83,2 a −77,0), ENTONCES EL SISTEMA las rechaza.
- **RF-22:** SI ya existe un registro con el mismo nombre y comunidad, ENTONCES EL SISTEMA rechaza el duplicado.
- **RF-23:** CUANDO se pulsa «Capturar ubicación», EL SISTEMA llena latitud y longitud con la posición del dispositivo, o informa que el permiso fue negado o no está disponible.
- **RF-24:** EL SISTEMA permite editar nombre, comunidad, profundidad y coordenadas de un registro con las mismas validaciones, sin cambiar su ID ni su tipo.
- **RF-25:** EL SISTEMA muestra en el detalle de un registro sus muestras, la cronología de la muestra elegida, su lluvia asociada, sus resultados de laboratorio y sus mediciones de campo.
- **RF-26:** EL SISTEMA marca como «con seguimiento pendiente» a todo pozo que tenga una muestra de seguimiento sin revisión confirmada.

### Muestras
- **RF-27:** CUANDO se guarda una muestra válida, EL SISTEMA genera un folio único `AG-AAAA-NNN` y un código QR que lo identifica, y abre «Muestra guardada».
- **RF-28:** EL SISTEMA exige elegir el punto o pozo de la lista registrada; no admite texto libre.
- **RF-29:** SI la fecha y hora de la muestra son futuras o anteriores a 30 días, ENTONCES EL SISTEMA las rechaza.
- **RF-30:** SI el técnico responsable no es un usuario activo con rol Técnico o Administrador, ENTONCES EL SISTEMA lo rechaza.
- **RF-31:** SI el tipo de agua no es compatible con el tipo de registro (Subterránea/Pozo solo en pozos; un pozo solo admite Subterránea/Pozo o Agua potable), ENTONCES EL SISTEMA lo rechaza.
- **RF-32:** SI la combinación de tipo de agua y objetivo no está prevista (consumo humano con aguas residuales; descarga fuera de aguas residuales; reutilización fuera de agua residual tratada), ENTONCES EL SISTEMA la rechaza.
- **RF-33:** CUANDO se eligen tipo de agua y objetivo, EL SISTEMA muestra la normativa aplicable, y «Sin criterio aplicable» para solo monitoreo.
- **RF-34:** SI la clasificación es seguimiento, ENTONCES EL SISTEMA exige una muestra de referencia del mismo punto, de clasificación referencia y no posterior al seguimiento; SI es referencia, no la admite.
- **RF-35:** SI se informa la lluvia, ENTONCES EL SISTEMA exige cantidad (0 a 1000 mm), período y fuente completos; SI no se informa, la muestra dice «Sin dato».
- **RF-36:** SI un parámetro de campo está fuera de su rango físico (pH 0–14; temperatura 0–60 °C; oxígeno disuelto 0–25 mg/L; turbidez 0–1000 NTU; conductividad 0–100 000 µS/cm), ENTONCES EL SISTEMA lo rechaza.
- **RF-37:** EL SISTEMA exige al menos un parámetro solicitado al laboratorio.
- **RF-38 🔴:** SI la foto no es JPG o PNG verificado por su contenido, o pesa más de 5 MB, ENTONCES EL SISTEMA la rechaza.
- **RF-39:** SI la ubicación capturada está a más de 500 m del punto registrado, ENTONCES EL SISTEMA advierte sin bloquear.

### Cadena de custodia
- **RF-40:** EL SISTEMA lista las muestras en custodia con búsqueda por folio o pozo y filtros por estado de traslado y rango de fechas.
- **RF-41:** CUANDO se registra el envío de una muestra «Registrada», EL SISTEMA guarda responsable, fecha, hora, origen y destino.
- **RF-42:** SI la fecha y hora del envío son anteriores a las de la muestra o futuras, ENTONCES EL SISTEMA las rechaza.
- **RF-43:** CUANDO se confirma la recepción de una muestra «Enviada», EL SISTEMA guarda responsable, fecha, hora, condición e incidencias.
- **RF-44:** SI la condición de recepción no es «Envases íntegros y rotulados», ENTONCES EL SISTEMA exige describir la incidencia.
- **RF-45:** SI la recepción es anterior al envío o futura, ENTONCES EL SISTEMA la rechaza.
- **RF-46:** SI el responsable de recepción no es un usuario activo con rol Laboratorio o Administrador, ENTONCES EL SISTEMA lo rechaza.
- **RF-47:** EL SISTEMA no permite registrar un segundo envío de una muestra ni la recepción de una muestra que no fue enviada.

### Resultados de laboratorio
- **RF-48:** EL SISTEMA solo permite cargar resultados a muestras «Recibida en laboratorio» y muestra únicamente los parámetros solicitados.
- **RF-49:** EL SISTEMA exige el valor de cada parámetro solicitado y, si se pidió nitrato, su forma (NO3 o NO3-N).
- **RF-50:** SI un valor está fuera de rango (nitrato 0–1000 mg/L; conductividad 0–100 000 µS/cm; coliformes totales y E. coli enteros 0–100 000 UFC/100 mL), ENTONCES EL SISTEMA lo rechaza.
- **RF-51:** SI la fecha del análisis es anterior a la recepción o futura, ENTONCES EL SISTEMA la rechaza.
- **RF-52 🔴:** EL SISTEMA exige un certificado PDF verificado por su contenido y de hasta 10 MB.
- **RF-53:** CUANDO se guardan los resultados, EL SISTEMA conserva cada valor y la forma de nitrato tal como se reportaron, pasa la muestra a «Pendiente de revisión técnica» y no permite cargar resultados otra vez.

### Evaluación normativa
- **RF-54:** EL SISTEMA muestra, para una muestra con resultados, cada parámetro con su resultado, el límite aplicado y el reglamento.
- **RF-55:** SI el objetivo es solo monitoreo o la combinación no tiene criterio, ENTONCES EL SISTEMA muestra «Sin criterio» en cada parámetro y no propone Cumple ni No cumple.
- **RF-56:** SI el reglamento aplica pero un parámetro no tiene límite cargado, ENTONCES EL SISTEMA muestra «Límite no cargado» y no lo compara.
- **RF-57 🔴:** SI la forma de nitrato reportada difiere de la del límite y no hay conversión documentada, ENTONCES EL SISTEMA no compara y bloquea la confirmación de la revisión.
- **RF-58:** CUANDO un Administrador documenta una conversión de nitrato con una nota de al menos 10 caracteres, EL SISTEMA convierte con el factor 4,43, conserva el valor original y compara.
- **RF-59 🔴:** EL SISTEMA muestra «Cumple» o «No cumple» como dictamen únicamente después de que un Administrador confirma la revisión técnica.
- **RF-60:** CUANDO un Administrador confirma la revisión con observaciones de al menos 10 caracteres, EL SISTEMA registra analista, fecha y dictamen y pasa la muestra a «Revisión confirmada».

### Historial, mapa y panel
- **RF-61:** EL SISTEMA filtra el historial por tipo de agua, punto o pozo, rango de fechas y estado, y rechaza un rango cuyo «desde» sea posterior a su «hasta».
- **RF-62:** EL SISTEMA exporta a PDF y a Excel exactamente las muestras que cumplen el filtro vigente.
- **RF-63:** EL SISTEMA muestra en el mapa cada punto o pozo con el color del estado de su última muestra (cumple, no cumple, pendiente, sin criterio) y un aro de «muestra reciente» si tiene una de las últimas 72 horas.
- **RF-64:** EL SISTEMA filtra el mapa por tipo de registro, tipo de agua, estado y fecha, y ofrece «Mi ubicación».
- **RF-65:** EL SISTEMA calcula el panel con las muestras de los **últimos 30 días** (ventana móvil, ver D11): total, cumplen, no cumplen, pendientes de laboratorio, pendientes de revisión, distribución y últimas muestras.
- **RF-66:** EL SISTEMA muestra alertas: pH fuera de 6,5–8,5 en muestras de consumo humano, muestras con más de 48 h recibidas sin resultados, y envíos con más de 24 h sin recepción.

### Usuarios y roles
- **RF-67:** EL SISTEMA lista los usuarios con búsqueda, filtros por rol y estado, y muestra la matriz de permisos.
- **RF-68:** SI el nombre (al menos dos palabras), el correo institucional (único), el rol o el estado de una invitación son inválidos, ENTONCES EL SISTEMA la rechaza.
- **RF-69 🔴:** EL SISTEMA no permite desactivar al propio usuario ni desactivar o degradar al último Administrador activo.
- **RF-70:** EL SISTEMA permite a un Administrador cambiar el rol y activar o desactivar a otros usuarios.

### Transversales
- **RF-71 🔴:** EL SISTEMA escapa todo texto que escribe un usuario antes de mostrarlo.
- **RF-72:** CUANDO se recarga la página, EL SISTEMA reinicia todos los datos a los de ejemplo (nada se conserva entre visitas).
- **RF-73:** EL SISTEMA se puede usar en una pantalla de 375 px, con el menú plegable.

## Requisitos no funcionales

- **RNF-1:** Todo corre en el navegador; no hay servidor propio, base de datos, ni llamadas a servicios con cuenta.
- **RNF-2:** Las librerías (PDF, Excel, mapa, QR) se sirven desde el propio repositorio, para no depender de internet salvo las teselas del mapa.
- **RNF-3:** Idioma español; fechas `dd/mm/aaaa` y hora local.
- **RNF-4:** Cada campo con error lo indica con texto (no solo con color), asociado al campo, y el primer error recibe el foco.

## Casos límite

Doble clic al guardar (no duplica el folio) · recarga a mitad de un formulario · cambio de rol con una pantalla abierta · cerrar sesión con un formulario sin guardar · archivo renombrado (`.pdf` que no es PDF) · coordenadas con coma decimal · fecha 31 de febrero · enlace de restablecimiento vencido o ya usado · último administrador · dos usuarios con el mismo correo en mayúsculas distintas · texto con `<script>`.

## Qué partes del sistema toca

- **Pantallas:** las 17 de la tabla de arriba; reemplaza la demo de 4 pantallas de la spec 001.
- **Datos guardados:** usuarios, puntos y pozos, muestras (con custodia, resultados y revisión), solicitudes y correos simulados — **todo en memoria**, nada persiste.
- **Correos y avisos:** ninguno real; la «Bandeja de correo simulada» muestra los que el sistema «enviaría».
- **Reportes, Excel y PDF:** exportación del historial a PDF y a Excel; certificado PDF de demostración.
- **Permisos:** matriz de la lámina 19 de Figma, aplicada en pantalla y en cada acción.
- **Otras specs:** la spec 001 queda reemplazada (su RF-15 se conserva como RF-72; su semáforo de 7 mg/L se retira).

## 🔴 Datos y seguridad

- **No es un sistema real:** el acceso es simulado (clave de demostración común), sin cifrado ni servidor. **No se debe cargar ningún dato real de personas ni de comunidades.** Los datos de ejemplo son ficticios.
- Las únicas piezas con riesgo real son del navegador: **XSS** (RF-71), **archivos** (RF-38, RF-52) y **exportaciones**.
- Los límites normativos cargados provienen del texto oficial del RT DGNTI-COPANIT 23-395-99 (pH 6,5–8,5; nitrato 10 mg/L; coliformes fecales 0 y totales 3 o 10 por 100 mL). **Falta confirmarlos contra el texto publicado del RT 21-2019**, que lo reemplazó.

## Fuera de alcance

- Base de datos real, login real, correos reales, notificaciones push (decisión del grupo, spec 001 y 02-oct-2026).
- Límites de COPANIT 35-2019 (descargas) y 24-99 (reutilización): no están verificados, por eso muestran «Límite no cargado».
- Corregir o anular resultados ya cargados; borrar registros (la constitución dice que nada se borra).
- Evaluar turbidez, color, sólidos u otros parámetros no solicitados en el diseño.
- Cambiar el objetivo o el tipo de agua desde «Evaluación normativa» (el diseño muestra los selectores; aquí se leen de la muestra).

## Decisiones (delegadas por José el 02-oct-2026; **él puede vetar cualquiera**)

- D1 — Los datos se reinician al recargar (se mantiene la decisión de la spec 001). Alternativa si molesta: guardar en el navegador (`localStorage`); no se hizo porque cambia la decisión ya tomada.
- D2 — Acceso simulado con una clave de demostración común, mostrada en la pantalla de acceso.
- D3 — Se retira el «semáforo» de 7 mg/L de la spec 001: **era un umbral inventado por nosotros, no normativo**. El diseño nuevo solo usa Cumple / No cumple / Pendiente / Sin criterio.
- D4 — Solo se cargan límites verificados (ver «Datos y seguridad»); se compara E. coli contra el límite de coliformes fecales del reglamento y se avisa que esa equivalencia debe confirmarse.
- D5 — El nitrato se compara solo si la forma coincide con la del límite (NO3-N, por confirmar) o si un Administrador documenta la conversión (factor 4,43).
- D6 — Reglas de compatibilidad tipo de agua / registro / objetivo (RF-31, RF-32): decisión nuestra para evitar datos absurdos; el diseño no las define.
- D7 — El folio usa el año actual (`AG-2026-NNN`). **El diseño trae un error:** muestra `AG-2024-081` enlazada a una referencia `AG-2026-080`, y los datos de ejemplo usan folios `AG-2026-…`.
- D8 — Las fechas de los datos de ejemplo son relativas al momento de abrir la página (el diseño usa «18 Oct 2026» fijo, que hoy sería futuro y las validaciones lo rechazarían).
- D9 — «Evaluación normativa» muestra tipo de agua y objetivo como lectura (ver «Fuera de alcance»).
- D10 — Las cifras del panel se calculan de los datos de ejemplo (unas decenas), no las del diseño (1 248 muestras a nivel nacional), que eran ilustrativas.
- D11 — El panel usa una ventana móvil de **30 días** (no «el mes calendario»): los datos de ejemplo se generan con fechas relativas a hoy, así el panel nunca queda vacío al empezar un mes nuevo.

## Criterios de finalización

- Cada RF con su prueba corrida: lógica en `tests/` (`node --test`) y recorrido en el navegador anotado en `plan.md`.
- Las 17 pantallas se abren y se usan, en escritorio y a 375 px, sin errores en consola.
- El link público de GitHub Pages funciona.

## Dudas abiertas

Ninguna. (Las decisiones D1–D11 las tomó el asistente por delegación y están listadas arriba para que José las vete.)
