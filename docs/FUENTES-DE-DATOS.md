# Dónde conseguir datos reales para el histórico

> **Importante:** este documento lista **dónde buscar**. Ningún valor de pozo salió de aquí. Antes de importar algo,
> el grupo debe confirmar que tiene el dato, quién lo midió, la unidad y el permiso para usarlo. Los datos de
> ejemplo de la aplicación son ficticios.

## Lluvia (para la columna `lluvia_mm`, total del mes)

| Fuente | Qué ofrece | Cómo conseguirla | Nota |
|---|---|---|---|
| **IMHPA** (Instituto de Meteorología e Hidrología de Panamá, imhpa.gob.pa) | Lluvia medida en estaciones; mantiene el Banco Nacional de Datos Hidrometeorológicos (más de 280 estaciones según su comunicado) | Solicitar los datos de la estación más cercana al pozo, con el período que se necesita | Es la opción más defendible: dato medido en tierra. Pedir también el nombre y la ubicación de la estación para escribirlos en `fuente` |
| **NASA POWER** (power.larc.nasa.gov) | Precipitación diaria y mensual para cualquier coordenada (parámetro PRECTOTCORR, mm/día), gratis | Consultar por latitud y longitud del pozo y sumar los días de cada mes | Es un estimado de satélite y modelo, no un pluviómetro: indicarlo en `fuente`. Piden citar «These data were obtained from the NASA Langley Research Center POWER Project funded through the NASA Earth Science Directorate Applied Science Program» |

## Pozos (calidad, profundidad, caudal)

| Fuente | Qué hay | Nota |
|---|---|---|
| **MiAMBIENTE** | Estudio de aguas subterráneas con zonificación de acuíferos en Chiriquí, Coclé y Azuero, anunciado por el ministerio (prensa: 4.000 pozos estimados, 1.300 con permiso) | Pedir si hay datos de pozos de ese estudio que se puedan compartir |
| **IDAAN / MINSA / juntas administradoras (JAAR)** | Análisis de pozos que abastecen acueductos | Sirven los informes de laboratorio de pozos que ya tengan; piden permiso |
| **Artículos de la UTP (Revista I+D Tecnológico)** | «Diagnóstico de acueductos rurales abastecidos de fuentes subterráneas: caso El Calabacito» (UTP, CIHH) y estudios sobre agua subterránea en Azuero | Son estudios reales con muestreo; los autores pueden indicar qué datos comparten |

## Cómo anotar la fuente al importar

En la columna `fuente` escriba de dónde salió **ese** dato, por ejemplo `IMHPA, estación X (2023)` o `Informe laboratorio Y, 12-mar-2025`.
Lo que no se sepa, se deja vacío: la pantalla dirá «Sin dato».
