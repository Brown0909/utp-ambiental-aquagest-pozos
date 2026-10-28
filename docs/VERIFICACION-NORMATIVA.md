# Verificación de los límites normativos (agua potable)

> **Fecha:** 28-oct-2026 · **Quién:** la sesión de desarrollo, por encargo de José Brown · **Principio 9 de la constitución:**
> ningún límite se inventa; solo se cargan los verificados contra el texto oficial.

## Fuente

**Reglamento Técnico DGNTI-COPANIT 21-2019** — *Tecnología de los alimentos. Agua potable. Definiciones y requisitos generales.*
Aprobado por la **Resolución N.º 35 del 6 de mayo de 2019** del Ministerio de Comercio e Industrias, publicada en la
**Gaceta Oficial N.º 28777-B** (20-may-2019). Texto consultado: copia del MINSA,
<https://www.minsa.gob.pa/sites/default/files/general/resolucion_35_del_6_de_mayo_de_2019_dgnti-copanit_21-2019.pdf>
(es un escaneo; se leyó página por página como imagen).

Este reglamento **reemplaza** al DGNTI-COPANIT 23-395-99, de donde salían los límites que usaba la app hasta el 27-oct.

## Lo que dice el texto oficial y cómo está cargado en la app

| Parámetro | Texto oficial | En la app (`normativa.js`) | Evidencia |
|---|---|---|---|
| **Nitrato** | Tabla No. 3 (sección 4.3): «Nitrato (N)» · VP **10 mg/L** · observación «**como Nitrógeno**» | máx. 10 mg/L **NO₃-N** | [Tabla 3](assets/normativa/COPANIT-21-2019_tabla3_inorganicos.jpg) |
| **pH** | Tabla No. 2 (sección 4.2): 6,5 – 8,5 unidades de pH | 6,5 – 8,5 (medición de campo) | [Tabla 2](assets/normativa/COPANIT-21-2019_tabla2_fisicoquimicos.jpg) |
| **Conductividad** | Tabla No. 3: **850 µS/cm** | máx. 850 µS/cm | [Tabla 3](assets/normativa/COPANIT-21-2019_tabla3_inorganicos.jpg) |
| **Coliformes totales** | Tabla No. 1 (sección 4.1): **< 1,1 NMP/100 mL** · **< 1 UFC/100 mL** | máx. 0 UFC/100 mL (ausencia) | [Tabla 1](assets/normativa/COPANIT-21-2019_tabla1_biologicos.jpg) |
| **Escherichia coli** | Tabla No. 1: **< 1,1 NMP/100 mL** · **< 1 UFC/100 mL** | máx. 0 UFC/100 mL (ausencia) | [Tabla 1](assets/normativa/COPANIT-21-2019_tabla1_biologicos.jpg) |

> Como la app registra **UFC por 100 mL como número entero**, «< 1 UFC/100 mL» es lo mismo que 0 colonias.

## Qué cambió respecto a la versión anterior de la app

| Parámetro | Antes (RT 23-395-99) | Ahora (RT 21-2019) |
|---|---|---|
| Nitrato | 10 mg/L, forma «por confirmar» | 10 mg/L **como N** (confirmado) |
| Coliformes totales | ≤ 3 en red de distribución; ≤ 10 en agua no distribuida | **ausencia** (< 1 UFC/100 mL), igual para pozo y red |
| E. coli | ≤ 0, usada «como indicador» de coliformes fecales | **ausencia**, nombrada directamente en la Tabla 1 |
| Conductividad | «Límite no cargado» | **850 µS/cm** |
| pH | 6,5 – 8,5 | 6,5 – 8,5 (sin cambio) |

## Lo que NO se pudo confirmar (dicho de frente)

- **Vigencia actual:** no se encontró ninguna resolución que modifique el 21-2019, pero la búsqueda no equivale a una consulta
  legal. Para cerrarlo hay que revisar en el archivo de la Gaceta Oficial las resoluciones posteriores del MICI que citen «21-2019»,
  o preguntar a la DGNTI.
- **Lectura del escaneo:** los valores se leyeron a simple vista en imágenes de buena resolución. Cualquiera del grupo puede
  comprobarlos abriendo las imágenes de `docs/assets/normativa/` o el PDF del MINSA.
- **Descarga (COPANIT 35-2019) y reutilización (24-99):** siguen **sin cargarse**; la app muestra «Límite no cargado».

## Nota sobre la «evaluación parcial»

Con el 21-2019 los cuatro parámetros de laboratorio del agua potable ya tienen límite, así que un dictamen de agua potable ya no
sale «parcial». La marca existe en el código para cuando se carguen reglamentos incompletos (p. ej. descargas).
