# AquaGest + Módulo de Pozos — Proyecto UTP, Ingeniería Ambiental

> ⚠️ **Este repositorio es un trabajo universitario (UTP, Ingeniería Ambiental).**
> No es un proyecto de BEC Technologies ni de ningún cliente.

## Qué es esto

Prototipo de interfaz para **AquaGest**, un sistema de gestión de muestreo ambiental, ampliado con
un módulo de **pozos rurales y monitoreo de nitratos** (contaminación de agua subterránea en
comunidades con Juntas Administradoras de Acueductos Rurales, JAAR).

El módulo de pozos se integró a las pantallas existentes de AquaGest sin crear una segunda
plataforma: se ampliaron los formularios de registro de muestra, resultados de laboratorio, mapa/
dashboard y el historial del pozo, agregando clasificación de muestra, ubicación por Comunidad/JAAR,
contexto de lluvia (pronóstico vs. precipitación observada) y trazabilidad del análisis de nitrato.

## Grupo

- Alex Aguilar
- Ethan González
- José Brown
- *(nombres del resto del grupo — pendientes, se agregan cuando los confirme José)*

## ▶ Probar la aplicación (sin cuentas ni instalación)

🔗 **https://brown0909.github.io/utp-ambiental-aquagest-pozos/app/**

Las 27 láminas del prototipo son **17 pantallas** (escritorio + celular) y todas se pueden usar: entrar con un rol,
registrar pozos y muestras, enviar y recibir en laboratorio, cargar resultados con certificado, evaluar contra la
norma, confirmar la revisión técnica, ver el mapa, filtrar el historial y descargar PDF/Excel.
Usuarios de demostración (clave `Aqua2026!`): `carlos.chen@` (Técnico), `ana.rodriguez@` (Laboratorio),
`maria.castillo@` (Administrador), todos `@miambiente.gob.pa`. **No hay base de datos:** lo que se escribe vive
en la pestaña y se reinicia al recargar. Pruebas: `npm test` (110 pruebas automáticas).

## Contenido de este repositorio

| Archivo | Qué contiene |
|---|---|
| [`AquaGest_Pozos_Prototipo_Figma.pdf`](./AquaGest_Pozos_Prototipo_Figma.pdf) | Exportación de las 27 pantallas del prototipo de Figma (AquaGest + Pozos), incluyendo roles institucionales, cadena de custodia y evaluación normativa |
| [`Integracion_AquaGest_Pozos.pdf`](./Integracion_AquaGest_Pozos.pdf) | Propuesta conceptual de la integración: flujo de información (técnico → registro → laboratorio → historial), fuente del contexto de lluvia, y cómo se ven las pantallas. Es la base que se usó para instruir al agente de diseño en Figma. |

## Archivo de Figma (fuente editable)

🔗 *Pendiente: agregar aquí el link del archivo de Figma (el de edición, no el de presentación).*

## Contexto normativo (Panamá)

- **Reglamento Técnico DGNTI-COPANIT 21-2019** — Valor Máximo Permitido de nitrato en agua potable.
  Aplica a cualquier sistema de abastecimiento, incluidos los pozos rurales.
- **Decreto Ejecutivo N.º 1839 (2014)** — marco regulatorio de las Juntas Administradoras de
  Acueductos Rurales (JAAR).

## Alcance y limitaciones

Es una **demostración universitaria con datos ficticios**: no hay datos de campo reales ni backend; la
aplicación (`docs/app/`) simula el flujo completo en el navegador. El dictamen Cumple/No cumple solo aparece
tras una revisión técnica humana confirmada, y los límites normativos sin verificar se muestran como
«Límite no cargado». Metodología: SDD — ver `spec/` (constitución, spec 001 y spec 002).
