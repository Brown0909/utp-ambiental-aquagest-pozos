# Spec 001 — Simulación interactiva del módulo de Pozos en AquaGest

> **Cliente/producto:** AquaGest + Pozos (proyecto universitario, UTP Ingeniería Ambiental) ·
> **Estado:** APROBADA (30-sep-2026, José, en representación del grupo) · **Tipo:** anclada al código.
> Solo el QUÉ y el POR QUÉ. El cómo va en `plan.md`.

> **Nota (02-oct-2026):** esta spec fue **reemplazada por la spec 002** (`../002-app-completa-miambiente/`), que cubre las
> 27 láminas completas. Se conserva como historial; `docs/app.html` ahora solo redirige a la app nueva.

## Objetivo y porqué

Convertir el prototipo visual de Figma (AquaGest + módulo de pozos rurales/nitratos) en una demo
**interactiva y publicada en un link gratis**, que se sienta funcional aunque no tenga una base de
datos real detrás: quien la abra puede registrar una muestra, cargar un resultado de laboratorio, ver
el semáforo de riesgo calculado en vivo contra el límite normativo, y ver todo reflejado de inmediato
en el mapa y el historial — todo dentro de la misma visita al navegador.

## Usuarios

- **Técnico de campo** — registra muestras.
- **Laboratorio** — registra resultados de nitrato.
- **Administrador JAAR** — consulta mapa, dashboard e historial.

No hay autenticación real: un selector visual cambia qué pantallas/acciones se muestran (ver RF-1).

## Historias

- H1: Como técnico de campo, quiero registrar una muestra de un pozo con su ubicación y
  clasificación, para que quede documentada la visita.
- H2: Como laboratorio, quiero registrar el resultado de nitrato con su unidad exacta, para que el
  sistema lo compare correctamente contra el límite.
- H3: Como cualquier usuario, quiero ver el estado de riesgo de un pozo al instante, para saber si
  hace falta actuar.
- H4: Como administrador JAAR, quiero ver el historial de un pozo con sus muestras, la lluvia
  asociada y los resultados, para dar seguimiento.

## Requisitos funcionales (EARS)

- **RF-1:** CUANDO el usuario selecciona un rol (Técnico, Laboratorio o JAAR), EL SISTEMA muestra
  únicamente las pantallas y acciones correspondientes a ese rol.
- **RF-2:** EL SISTEMA permite registrar una muestra con: pozo, comunidad/JAAR, coordenadas GPS,
  fecha/hora, clasificación (referencia o seguimiento después de lluvia) y foto de campo.
- **RF-3:** CUANDO se guarda una muestra, EL SISTEMA genera un folio único y lo muestra en pantalla.
- **RF-4:** EL SISTEMA permite registrar un resultado de laboratorio con: valor de nitrato, unidad
  (NO3⁻ o N-NO3), método analítico, laboratorio y fecha.
- **RF-5:** CUANDO se ingresa un resultado de nitrato, EL SISTEMA convierte el valor a la unidad del
  Valor Máximo Permitido (10 mg/L como N-NO3) antes de compararlo, usando el factor 4,43.
- **RF-6 🔴:** SI el valor convertido de nitrato es mayor o igual a 10 mg/L (N-NO3), ENTONCES EL
  SISTEMA marca la muestra como riesgo alto (rojo).
- **RF-7:** SI el valor convertido está entre 7 y 10 mg/L (N-NO3), ENTONCES EL SISTEMA marca la
  muestra como riesgo medio (amarillo).
- **RF-8:** SI el valor convertido es menor a 7 mg/L (N-NO3), ENTONCES EL SISTEMA marca la muestra
  como riesgo bajo (verde).
- **RF-9:** CUANDO se registra una muestra o un resultado durante la sesión, EL SISTEMA lo agrega de
  inmediato a la lista de Historial de ese pozo, sin recargar la página.
- **RF-10:** EL SISTEMA muestra para cada pozo un contexto de lluvia de ejemplo, separando
  "Pronóstico" de "Precipitación observada" (cantidad en mm, período y fuente).
- **RF-11:** SI no hay dato de lluvia disponible para un pozo, ENTONCES EL SISTEMA muestra el texto
  "Sin dato".
- **RF-12:** EL SISTEMA muestra en el Mapa de Muestreo cada pozo con el color de su estado más
  reciente.
- **RF-13:** EL SISTEMA muestra en el Historial del pozo una línea de tiempo con las muestras, el
  contexto de lluvia asociado y los resultados de laboratorio, en orden cronológico.
- **RF-14:** MIENTRAS una muestra no tenga resultado de laboratorio registrado, EL SISTEMA la marca
  con el estado "Pendiente de laboratorio".
- **RF-15:** CUANDO se recarga la página, EL SISTEMA reinicia todos los datos a los de ejemplo
  (ninguna información ingresada durante la sesión se conserva).
- **RF-16:** SI falta un campo obligatorio o tiene un formato inválido (texto donde va número,
  coordenadas vacías, nitrato no numérico), ENTONCES EL SISTEMA impide guardar y señala el campo.
- **RF-17:** EL SISTEMA permite exportar el historial de un pozo como archivo PDF descargable.
- **RF-18:** EL SISTEMA permite exportar el historial de un pozo como archivo Excel (.xlsx)
  descargable.
- **RF-19:** EL SISTEMA conserva el valor de nitrato en la unidad exacta que reportó el laboratorio
  (NO3⁻ o N-NO3) y muestra la conversión como referencia, nunca como el único valor — nunca se
  compara una forma contra el límite de la otra sin esa aclaración visible.

## Requisitos no funcionales

- **RNF-1:** EL SISTEMA se usa correctamente en una pantalla de 375 px de ancho (celular).
- **RNF-2:** EL SISTEMA funciona sin conexión a un servidor propio: todo el cálculo ocurre en el
  navegador de quien lo visita.
- **RNF-3:** EL SISTEMA se publica en GitHub Pages, sin costo.

## Casos límite

- Valor de nitrato vacío o no numérico al guardar un resultado.
- Coordenadas GPS vacías.
- Se cambia de rol a mitad de un formulario sin terminar de llenarlo.
- Se registra un resultado para una muestra que no existe en la sesión actual.

## Qué partes del sistema toca

- **Pantallas:** Registrar Muestra, Resultados Lab, Mapa de Muestreo/Dashboard, Historial y
  Reportes — las 4 ya ampliadas en el prototipo de Figma.
- **Datos guardados:** ninguno persiste entre visitas (RF-15); durante la sesión vive en memoria del
  navegador.
- **Correos y avisos:** ninguno.
- **Reportes, Excel y PDF:** ninguno en esta entrega (el PDF del prototipo de Figma ya existe aparte,
  no se genera dinámicamente).
- **Permisos:** selector de rol visual (RF-1), sin autenticación real.
- **Otras specs:** ninguna — es la primera spec del proyecto.

## 🔴 Datos y seguridad

Todos los pozos, muestras y resultados de esta demo son **ficticios**, creados para ilustrar el
funcionamiento. No debe cargarse información real de ninguna comunidad o JAAR mientras el sistema no
tenga persistencia real ni control de acceso. No aplica respaldo: nada persiste.

## Fuera de alcance

- Persistencia real de datos (base de datos) — decisión explícita del grupo, 30-sep-2026.
- Autenticación real de usuarios.
- Integración real con una API de clima (el contexto de lluvia es de ejemplo).
- Generación real de certificados/PDF de laboratorio.
- Notificaciones por correo o WhatsApp.
- Multiidioma.

## Decisiones de José (no volver a preguntar)

- 30-sep-2026 — Sin base de datos real; todo simulado en memoria del navegador. Por presupuesto $0
  y alcance de una entrega de curso.
- 30-sep-2026 — El semáforo se calcula en vivo, con conversión de unidad si el laboratorio reporta
  NO3⁻ en vez de N-NO3.
- 30-sep-2026 — Selector de rol visual (Técnico/Laboratorio/JAAR), sin login real.
- 30-sep-2026 — El contexto de lluvia se simula con datos de ejemplo.
- 30-sep-2026 — Fecha de entrega: 3 semanas desde hoy (objetivo ~21-oct-2026).
- 30-sep-2026 — José delegó al asistente las decisiones de implementación restantes (nombres de
  pantallas, datos de ejemplo, detalles visuales), pidiendo ver el resultado terminado.
- 01-oct-2026 — Se consideró agregar base de datos real (Supabase) tras ver una versión mucho más
  completa del prototipo de Figma ("AquaGest MiAMBIENTE", 27 pantallas, con roles institucionales,
  cadena de custodia y matriz de permisos). **Se descartó por ahora**: José no quiere crear cuentas
  nuevas en ningún servicio externo. También se descartó XAMPP (solo funciona en una computadora
  local, no es alcanzable desde el link público de GitHub Pages). Se reafirma la decisión original:
  sin base de datos real, todo simulado en el navegador. Si el proyecto necesita login real más
  adelante, será una Spec 002 — no se reabre esta decisión sin una razón nueva.
- 01-oct-2026 — Se adopta el criterio de **no convertir automáticamente** entre NO3⁻ y N-NO3 (lo que
  sí hacía la primera versión de esta spec): se conserva el valor tal como lo reportó el laboratorio
  y se muestra la conversión solo como referencia visible, nunca en silencio. Es más riguroso y
  coincide con cómo lo resuelve la versión ampliada del prototipo de Figma.
- 01-oct-2026 — Se agregan validaciones de formulario (RF-16) y exportación a PDF/Excel (RF-17,
  RF-18), ambas sin necesidad de servidor ni cuenta externa (librerías que corren en el navegador).

## Criterios de finalización

- Cada RF verificado manualmente en el navegador (clic a clic), con su resultado anotado en
  `plan.md` → Estrategia de pruebas.
- El grupo ve el sistema funcionando en el link público de GitHub Pages.

## Dudas abiertas

Ninguna — las 6 decisiones de alcance quedaron resueltas por el grupo el 30-sep-2026.
