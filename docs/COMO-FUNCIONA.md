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

## 28-oct-2026 — El servidor y la base de datos (Spec 004)

> Antes era así: todo vivía en la libreta de la pestaña (*store*) y se perdía al recargar. Ahora, si la app se abre desde el
> servidor, la libreta vive en el servidor y se guarda en un archivo. En GitHub Pages sigue siendo como antes.

### 🧒 Cómo funciona por dentro

1. **Qué problema resuelve.** Lo que registraba una persona se perdía al recargar y nadie más lo veía. Ahora queda guardado y lo ven
   todas las computadoras que entren al mismo servidor.
2. **La lógica: una oficina con un solo archivador.** Antes cada visitante traía su propia libreta. Ahora hay una oficina (el
   *servidor*) con **un archivador compartido** (la *base de datos*, en un archivo `data/aquagest.db`, de tipo SQLite). Quien entra
   le pide a la oficina que anote o busque algo; la oficina decide y archiva.
3. **Las mismas reglas, un solo reglamento.** La oficina usa **exactamente el mismo reglamento** (validaciones, permisos, normativa)
   que ya tenía el navegador. No hay dos versiones que puedan contradecirse. Por eso el navegador casi no cambió: solo espera la
   respuesta de la oficina antes de seguir (en el código se ve como `await`).
4. **El portero ahora es de verdad.** Al entrar, la oficina te da un **gafete** (una *cookie de sesión*) que el navegador no puede
   leer ni copiar (*HttpOnly*). Las contraseñas no se guardan: se guarda su **huella** mezclada con sal (*hash scrypt*), como una
   cerradura que se puede comprobar pero no abrir al revés. Y los permisos se vuelven a revisar en la oficina (*doble candado*),
   aunque la pantalla ya haya escondido el botón.
5. **El libro de visitas que nadie puede tachar.** Cada entrada, salida y contraseña equivocada se anota en un libro (tabla
   `accesos`) con un candado: ni con SQL se puede editar ni borrar (*disparadores* o *triggers*). Nada se guarda de las contraseñas.
6. **Nada se borra.** El archivador solo agrega o cambia el estado; no tiene ninguna orden de borrar.
7. **Qué pasaría si falla y qué lo vigila.** Si el servidor se cae, la pantalla avisa y no pierde lo escrito en el formulario. 167
   pruebas automáticas ensayan el servidor y cada una se verificó rompiendo el código a propósito para ver que se pone en rojo.
8. **Lo que NO tiene (honesto).** No tuvo revisión de seguridad independiente (decisión de José: proyecto universitario), no se
   protege con HTTPS y las claves de ejemplo son conocidas (`Aqua2026!`). **Por eso es solo para la red del grupo, nunca para
   internet abierto.** Además, una revisión automática señaló que la «bandeja de correo simulada» regalaba enlaces de recuperación a
   cualquiera de la red: se corrigió (ahora solo la ve el computador del servidor o un Administrador).

### Glosario (continuación)

| Palabra técnica | Comparación |
|---|---|
| *servidor* | La oficina que atiende a todos y guarda los papeles |
| *base de datos / SQLite* | El archivador compartido, en un solo archivo |
| *cookie de sesión / HttpOnly* | El gafete que te dan al entrar y que el navegador no puede leer |
| *hash scrypt con sal* | La huella de la contraseña: se puede comprobar, no se puede deshacer |
| *trigger (disparador)* | Un candado automático: «si alguien intenta tachar el libro, se prohíbe» |
| *consulta preparada* | Rellenar un formulario con huecos, para que lo escrito nunca se confunda con una orden |
| *CSRF / Origin* | Revisar de dónde viene el pedido, para que otra página no lo mande a tu nombre |
| *await / async* | «Espera la respuesta de la oficina antes de seguir» |
