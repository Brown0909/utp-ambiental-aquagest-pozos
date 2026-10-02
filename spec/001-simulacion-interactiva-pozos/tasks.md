# Tareas — Spec 001

> Modo nuevo: no cita `impacto.md`. José pidió ver el resultado terminado, así que estas tareas se
> ejecutan seguidas en un solo pase (no una por una con pausa), y se marcan al final con su prueba.

- [x] **T1** (RF-2, RF-4, RF-10) Crear los datos de ejemplo: 4 pozos ficticios en Chiriquí, con
  lluvia de ejemplo para 3 de ellos (el cuarto queda sin dato, para probar RF-11).
  Hecho cuando: el `store` inicial tiene 4 pozos y se ve reflejado en Mapa e Historial al abrir la
  página.
- [x] **T2** (RF-1) Construir el selector de rol y el show/hide de secciones según el rol elegido.
  Hecho cuando: cambiar el selector oculta/muestra las pantallas correctas.
- [x] **T3** (RF-2, RF-3) Construir el formulario "Registrar Muestra" con generación de folio.
  Hecho cuando: al guardar, aparece un folio nuevo y la muestra queda en el `store`.
- [x] **T4** (RF-4, RF-5, RF-6, RF-7, RF-8) Construir "Resultados Lab" con selector de unidad,
  conversión NO3⁻→N-NO3 (factor 4,43) y clasificación de semáforo.
  Hecho cuando: 12 mg/L NO3⁻ da verde y 12 mg/L N-NO3 da rojo.
- [x] **T5** (RF-9, RF-12) Conectar Mapa de Muestreo al `store`: cada pozo muestra el color de su
  último resultado, actualizado en vivo.
  Hecho cuando: guardar un resultado cambia el color del pozo en el Mapa sin recargar.
- [x] **T6** (RF-13, RF-14) Construir Historial con línea de tiempo (muestras + lluvia + resultados)
  y el estado "Pendiente de laboratorio".
  Hecho cuando: una muestra sin resultado se ve como pendiente, y todo aparece ordenado por fecha.
- [x] **T7** (RF-11) Mostrar "Sin dato" en el pozo sin información de lluvia.
  Hecho cuando: el pozo 4 (sin lluvia) muestra el texto exacto "Sin dato".
- [x] **T8** (RF-15) Confirmar que nada usa `localStorage` ni llamadas a servidor — todo vive en
  variables de JavaScript en memoria.
  Hecho cuando: recargar la página (F5) borra cualquier muestra/resultado agregado y vuelve a los 4
  pozos de ejemplo.
- [x] **T9** (RNF-1) Revisar que el diseño no se rompe en un ancho de 375 px.
  Hecho cuando: con las herramientas de desarrollador en modo celular, ningún elemento se corta ni
  se sale de la pantalla.
- [x] **T11** (RF-16) Agregar validación real a los formularios: campos obligatorios, números
  válidos, no dejar guardar si falta algo.
  Hecho cuando: intentar guardar con un campo vacío o inválido lo impide y lo señala.
- [x] **T12** (RF-19) Quitar la conversión automática y silenciosa de nitrato; mostrar el valor
  reportado como lo principal y la conversión solo como referencia aclarada.
  Hecho cuando: Historial y Resultados Lab muestran la unidad original primero, con la conversión
  entre paréntesis y una nota de que es referencial.
- [x] **T13** (RF-17, RF-18) Agregar "Exportar PDF" y "Exportar Excel" en Historial, usando jsPDF y
  SheetJS por CDN (sin servidor, sin cuenta).
  Hecho cuando: ambos botones descargan un archivo real con los datos del pozo filtrado.
- [x] **T10** (todos) Compuerta final: corregir enlaces en `docs/index.html`, publicar en GitHub
  Pages y verificar las 19 RF de la tabla de pruebas del `plan.md`.
  Hecho cuando: el link público carga y cada RF de la tabla se cumple tal como está descrito.
