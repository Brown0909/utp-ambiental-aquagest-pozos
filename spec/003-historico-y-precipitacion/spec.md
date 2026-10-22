# Spec 003 — Histórico mensual de pozos y relación con la precipitación

> **Estado:** PROPUESTA — pendiente de aprobación del grupo (constitución, principio 1) · **Modo SDD:** actualización.
> **Origen:** retroalimentación de José Brown del 02-oct-2026: «valores de pozos: calidad del agua, profundidad, caudales»,
> «tienen base de datos de meses de años», «buscar datos reales», «relacionar con precipitación».
> Solo el QUÉ y el POR QUÉ. Incluye su radio de impacto (constitución: toda spec lleva impacto antes del plan).

## Objetivo y porqué

Hoy cada pozo muestra sus muestras sueltas. Para estudiar un pozo hace falta verlo **a lo largo de meses y años** y
**junto a la lluvia**. Esta spec agrega: caudal del pozo, histórico mensual, comparación referencia–seguimiento y una
forma de cargar **datos reales** (no se inventa ninguno: lo que no hay se muestra como «Sin dato»).

## Requisitos funcionales (EARS)

- **RF-74:** EL SISTEMA permite registrar el **caudal (L/s)** de un pozo, opcional, entre 0 y 500; a un punto lo ignora.
- **RF-75:** EL SISTEMA guarda un **histórico mensual** por pozo o punto: período (AAAA-MM), nitrato con su forma, lluvia del mes (mm), caudal (L/s) y **fuente obligatoria**; al menos un dato por fila.
- **RF-76:** CUANDO un Técnico o Administrador sube un CSV, EL SISTEMA lo valida fila por fila y lo importa **todo o nada**; rechaza meses futuros, anteriores a 1990, duplicados del mismo pozo, nitrato sin forma y valores fuera de rango.
- **RF-77:** EL SISTEMA muestra en el detalle del pozo una **gráfica** (lluvia en barras, nitrato en línea), un **resumen por año** y una **tabla mensual**, con las mismas cifras en texto.
- **RF-78:** EL SISTEMA muestra la **correlación lluvia–nitrato** solo con 6 o más meses con ambos datos, la rotula «orientativa» y aclara que no prueba causalidad.
- **RF-79:** EL SISTEMA no mezcla NO₃ con NO₃-N: la serie usa una sola forma y avisa cuántos registros quedan fuera.
- **RF-80:** EL SISTEMA muestra cada **seguimiento frente a su referencia** (cambio absoluto y %, lluvia registrada) sin declarar cumplimiento; si las formas difieren o falta un resultado, lo dice y no compara.
- **RF-81:** EL SISTEMA marca los datos de ejemplo como «Ejemplo (ficticio)» y avisa que no son hallazgos.
- **RF-82:** EL SISTEMA obliga a **elegir** el objetivo de la evaluación al registrar una muestra (antes venía «Solo monitoreo» marcado y un pozo quedaba sin evaluar sin que nadie lo decidiera).
- **RF-83:** EL SISTEMA muestra los avisos flotantes 3,5 s (errores 8 s), se cierran con un clic y en móvil van bajo el encabezado, sin tapar los formularios.

## Qué partes del sistema toca (impacto)

| Pieza | Cambio | Riesgo |
|---|---|---|
| `core/historico.js` (nuevo), `core/store-historico.js` (nuevo) | Lógica pura y acciones del store | Bajo: archivos nuevos con pruebas |
| `core/store.js` | Registra el nuevo módulo y los datos de ejemplo | Bajo |
| `core/store-puntos.js`, `core/seed.js` | Campo `caudal` | Bajo: opcional, `undefined` se lee como «Sin dato» |
| `screens/puntoDetalle.js`, `screens/puntoForm.js`, `ui/serieHistorica.js` (nuevo) | Pantallas | Medio: lo que más se ve |
| `screens/muestraNueva.js` | Objetivo sin selección inicial | Bajo: ya era obligatorio |
| `ui/avisos.js`, `css/mejoras.css` (nuevo), `index.html` | Avisos y estilos | Bajo |
| Matriz de permisos | **No cambia**: se reutiliza `registrar_puntos_muestras` | — |

## 🔴 Datos y seguridad

- El CSV se lee en el navegador (`file.text()`), máximo 1 MB y 1000 filas; los mensajes se pintan con `textContent` y todo texto pasa por `html```.
- Un CSV no se vuelve a exportar en esta spec, así que no hay riesgo nuevo de inyección de fórmulas.
- Los datos importados viven en la memoria del navegador y se pierden al recargar (RF-72 sigue vigente).

## Fuera de alcance (decisiones anotadas, principio 8)

- **Pronóstico del tiempo:** se deja fuera a propósito. Haría falta una API y el pronóstico no es lluvia observada; el campo de lluvia de cada muestra sigue siendo lluvia **registrada**.
- **Conexión automática a una API de lluvia** (IMHPA, NASA POWER): la importación por CSV cubre el uso real sin servicios externos. Ver `docs/FUENTES-DE-DATOS.md`.
- **Guardar datos entre visitas:** exige cambiar RF-72 (base de datos o almacenamiento local). Decisión del grupo.
- **Dictamen de cumplimiento del histórico:** solo la revisión técnica de una muestra dictamina; el histórico describe, no evalúa.
- **Parámetros de aguas residuales (DQO, sólidos, grasas) y límites de los reglamentos 35-2019 y 24-99:** siguen sin cargarse hasta verificarlos contra el texto oficial (principio 9).

## Dudas abiertas para el grupo

1. ¿Se aprueba que el histórico se cargue por CSV (sin servicios externos)?
2. ¿Se decide ya el alcance para aguas residuales (acotarlo a agua potable y pozos, o cargar sus parámetros)?
3. ¿Hay que verificar el límite de nitrato (10 mg/L como N) contra el PDF oficial del reglamento 21-2019 y su modificación posterior?
