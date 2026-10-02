# Plan — Spec 001

> El CÓMO. Spec aprobada, sin dudas abiertas. Modo nuevo: el radio de impacto va en su sección corta,
> aquí abajo (no aplica `impacto.md`).

## Qué RF cubre cada pieza

| Pieza | RF |
|---|---|
| `docs/app.html` — selector de rol + navegación entre las 4 pantallas | RF-1 |
| Formulario "Registrar Muestra" | RF-2, RF-3 |
| Formulario "Resultados Lab" + conversión de unidad | RF-4, RF-5, RF-6, RF-7, RF-8 |
| Estado compartido en memoria (`store` de JavaScript) | RF-9, RF-15 |
| Sección "Mapa de Muestreo" | RF-10, RF-11, RF-12 |
| Sección "Historial y Reportes" | RF-13, RF-14 |

## Archivos que se tocan

- `docs/app.html` (nuevo) — aplicación completa: HTML + CSS + JavaScript en un solo archivo, sin
  build ni dependencias propias, para que corra igual en GitHub Pages sin configuración. Carga dos
  librerías por CDN, ambas gratis y sin cuenta: **jsPDF** (exportar PDF) y **SheetJS/xlsx**
  (exportar Excel).
- `docs/index.html` (editar) — se agrega un enlace destacado a la demo interactiva y se corrigen los
  enlaces a `spec/constitucion.md`, `spec/001-simulacion-interactiva-pozos/{spec,plan,tasks}.md`.
- Nada toca autenticación, dinero ni datos de terceros — no hay piezas 🔴 de infraestructura en este
  plan (el único 🔴 es de contenido: RF-6, la clasificación de riesgo alto).

## Decisión registrada el 01-oct-2026: se evaluó y se descartó base de datos real

Se consideró Supabase (gratis) tras ver la versión ampliada del prototipo ("AquaGest MiAMBIENTE",
con roles institucionales y permisos). Se descartó porque José no quiere crear cuentas nuevas en
servicios externos. Se evaluó también XAMPP y se descartó: corre solo en una computadora local, no
es alcanzable desde un link público — no sirve para lo que se pidió. Ver `spec.md` → Decisiones.

## Migraciones

No aplica — no hay base de datos.

## Cómo se guardan los "datos" (en vez de la sección de Ambientes/BD)

Un objeto JavaScript `store` vive en memoria mientras la pestaña del navegador está abierta:

```js
store = {
  pozos: [ /* datos de ejemplo, ver Tarea T1 */ ],
  muestras: [],   // se llenan en vivo cuando alguien usa "Registrar Muestra"
  resultados: [], // se llenan en vivo cuando alguien usa "Resultados Lab"
  lluvia: [ /* datos de ejemplo por pozo/fecha */ ],
}
```

Al recargar la página, `store` se vuelve a crear desde cero con los datos de ejemplo (cumple RF-15
automáticamente, sin código adicional: es simplemente no usar `localStorage` ni ningún backend).

## Decisiones

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| HTML/CSS/JS plano, un solo archivo | React/Vite con build | GitHub Pages sirve el archivo tal cual, sin paso de compilación; para 15 RF no justifica la complejidad de un build |
| Factor de conversión NO3⁻→N-NO3 = 4,43 fijo en el código | Pedir el factor como dato configurable | Es una constante química (62,0/14,0), no cambia entre pozos ni con el tiempo |
| Un solo archivo `app.html` en vez de varias páginas | Multi-página con enlaces `<a href>` | Con múltiples páginas, cambiar de "pantalla" recargaría el navegador y RF-9 (reflejar cambios sin recargar) se rompería entre pantallas distintas |

## Radio de impacto

Modo nuevo: sin usuarios reales todavía, no hay nada en producción que este cambio pueda romper. El
único "sistema existente" es el prototipo de Figma (solo visual, sin lógica) y el `docs/index.html`
ya publicado — este plan solo le agrega un enlace, no le quita nada.

## Estrategia de pruebas

Sin infraestructura de pruebas automatizadas (no se justifica para 15 RF sin backend). Cada RF se
verifica a mano, en el navegador, y se dejan los pasos documentados aquí para que cualquiera del
grupo los repita:

| RF | Cómo se prueba |
|---|---|
| RF-1 | Cambiar el selector de rol y confirmar que las secciones visibles cambian |
| RF-2, RF-3 | Llenar "Registrar Muestra" y guardar; confirmar que aparece un folio nuevo |
| RF-4 a RF-8 | Registrar un resultado con 12 mg/L como NO3⁻ (debe salir verde, ≈2,7 mg/L N) y luego con 12 mg/L como N-NO3 (debe salir rojo) |
| RF-9 | Confirmar que la muestra/resultado recién guardado aparece en Historial sin recargar |
| RF-10, RF-11 | Ver un pozo con lluvia de ejemplo y otro sin dato (debe decir "Sin dato") |
| RF-12 | Confirmar que el color del pozo en el Mapa coincide con su último resultado |
| RF-13 | Confirmar que el Historial ordena por fecha, mezclando muestras, lluvia y resultados |
| RF-14 | Ver una muestra sin resultado — debe decir "Pendiente de laboratorio" |
| RF-15 | Registrar algo, recargar la página (F5), confirmar que vuelve a los datos de ejemplo |
| RF-16 | Intentar guardar un formulario con un campo vacío u otro con texto en el valor de nitrato |
| RF-17 | En Historial, clic en "Exportar PDF" y confirmar que descarga un PDF con los datos del pozo |
| RF-18 | En Historial, clic en "Exportar Excel" y confirmar que descarga un .xlsx con los datos |
| RF-19 | Confirmar que el valor reportado se ve primero y la conversión aparece aclarada, no sola |

## Ficha de construcción

1. **Qué:** demo interactiva de AquaGest+Pozos en un solo archivo HTML/CSS/JS, sin backend.
2. **Qué código se toca:** `docs/app.html` (nuevo), `docs/index.html` (enlaces). Nada 🔴 de
   infraestructura (sin auth, sin BD, sin dinero, sin correo).
3. **Modelo que construye:** esta sesión (Sonnet), directo — no se justifican subagentes para este
   tamaño.
4. **Agentes:** ninguno adicional.
5. **Cómo se manda:** una sola tarea de construcción, secuencial (José pidió ver el resultado
   terminado en vez de aprobar tarea por tarea).
6. **Tokens aprox.:** ~40-60k · **Tiempo:** ~15-20 min.

**PASA/NO-PASA:** pasa si las 15 RF de la tabla de arriba se verifican en el navegador sin error y el
link de GitHub Pages carga. **Qué NO se toca:** ningún otro repo de la cuenta `gerencia317`, ningún
archivo fuera de `docs/` y `spec/`.
