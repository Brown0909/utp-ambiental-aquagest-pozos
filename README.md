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

## Contenido de este repositorio

| Archivo | Qué contiene |
|---|---|
| [`AquaGest_Pozos_Prototipo_Figma.pdf`](./AquaGest_Pozos_Prototipo_Figma.pdf) | Exportación de las 12 pantallas del prototipo de Figma, ya con el módulo de pozos integrado |
| [`Integracion_AquaGest_Pozos.pdf`](./Integracion_AquaGest_Pozos.pdf) | Propuesta conceptual de la integración: flujo de información (técnico → registro → laboratorio → historial), fuente del contexto de lluvia, y cómo se ven las pantallas. Es la base que se usó para instruir al agente de diseño en Figma. |

## Archivo de Figma (fuente editable)

🔗 *Pendiente: agregar aquí el link del archivo de Figma (el de edición, no el de presentación).*

## Contexto normativo (Panamá)

- **Reglamento Técnico DGNTI-COPANIT 21-2019** — Valor Máximo Permitido de nitrato en agua potable.
  Aplica a cualquier sistema de abastecimiento, incluidos los pozos rurales.
- **Decreto Ejecutivo N.º 1839 (2014)** — marco regulatorio de las Juntas Administradoras de
  Acueductos Rurales (JAAR).

## Alcance y limitaciones

Esta es una **propuesta conceptual para revisar con el grupo** — no representa una integración ya
implementada en código. No hay datos de campo reales ni un backend funcionando; es el diseño de la
interfaz y del flujo de información.
