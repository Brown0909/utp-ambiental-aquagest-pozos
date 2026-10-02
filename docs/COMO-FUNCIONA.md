# Cómo funciona AquaGest MiAMBIENTE por dentro (cuaderno de clases)

> Se agrega al final, con fecha. Lo anterior no se reescribe: si algo cambia se anota «antes era así, ahora es así».

## 02-oct-2026 — La app usable (Spec 002)

### 🧒 Cómo funciona por dentro

1. **Qué problema resuelve.** El prototipo de Figma eran dibujos. Ahora cada dibujo es una pantalla que se puede tocar:
   se escribe, se valida, se guarda y se ve el resultado en las demás pantallas.
2. **No hay base de datos: hay una "libreta" en la pestaña.** Al abrir la página se copia una libreta con datos de
   ejemplo (en programación se llama *store*, un almacén en memoria). Todo lo que haces se anota ahí. Si recargas la
   página, se tira la libreta y se empieza otra limpia. Por eso no hace falta crear cuentas ni pagar nada.
3. **El portero tiene dos candados.** El menú esconde lo que tu rol no puede hacer, pero además cada acción vuelve a
   preguntar "¿esta persona tiene permiso?" (se llama *doble candado*, y la tabla de permisos es la *matriz de
   permisos*). Así, aunque alguien abra la dirección a mano, el sistema lo detiene.
4. **El formulario es un revisor estricto.** Antes de guardar, cada campo pasa por una regla (se llama *validación*):
   fecha no futura, coordenadas dentro de Panamá, pH entre 0 y 14, correo `@miambiente.gob.pa`. Si falla, el error
   aparece pegado al campo, en español.
5. **Lo que escribes nunca se ejecuta.** Todo texto se "desinfecta" antes de mostrarse (*escape*, protege contra *XSS*)
   y los archivos se abren por dentro para ver qué son: un texto renombrado como `.pdf` se rechaza (*magic bytes*).
6. **El programa propone; la persona decide.** El sistema compara cada resultado con el límite de la norma, pero el
   "Cumple / No cumple" solo aparece cuando un Administrador confirma la revisión técnica. Si no hay un límite
   verificado, dice "Límite no cargado" en vez de inventarlo. El nitrato como NO₃ y como NO₃-N son "monedas
   distintas": no se comparan sin una conversión documentada (factor 4,43).
7. **Hash en la dirección.** Las pantallas se cambian con `#/ruta` (*hash routing*), porque GitHub Pages es un
   archivador de páginas y no sabe inventar direcciones nuevas.
8. **Qué pasaría si falla y qué lo vigila.** Hay 110 pruebas automáticas (`npm test`) que ensayan la lógica sin abrir
   el navegador, y un recorrido a mano en escritorio y celular. Si una regla se rompe, la prueba se pone en rojo.

### Glosario (crece con cada entrega)

| Palabra técnica | Comparación |
|---|---|
| *store* | La libreta donde se anota todo mientras la pestaña está abierta |
| *validación* | El revisor que no deja pasar un formulario mal llenado |
| *doble candado* | El menú esconde la puerta y la cerradura igual pregunta quién eres |
| *matriz de permisos* | La tabla que dice qué puede hacer cada rol |
| *escape / XSS* | Lavar el texto de los usuarios para que nunca se convierta en una orden |
| *magic bytes* | Mirar la cédula del archivo, no el nombre que trae escrito |
| *hash routing* | Direcciones con `#` para moverse entre pantallas sin recargar |
| *CSP* | Lista de invitados: el navegador solo carga lo que la página autorizó |
| *SDD* | Escribir primero qué debe hacer el sistema (spec) y después construirlo |
