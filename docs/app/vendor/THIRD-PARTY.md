# Librerías de terceros (servidas desde este repositorio)

Se copian aquí para que la demo no dependa de internet el día de la presentación (salvo las teselas del mapa).

| Archivo | Librería | Versión | Licencia | Origen |
|---|---|---|---|---|
| `jspdf.umd.min.js` | jsPDF | 2.5.1 | MIT | https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js |
| `xlsx.full.min.js` | SheetJS (xlsx) | 0.18.5 | Apache-2.0 | https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js |
| `leaflet.js`, `leaflet.css` | Leaflet | 1.9.4 | BSD-2-Clause | https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/ |
| `qrcode.min.js` | qrcode-generator | 1.4.4 | MIT | https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js |

Notas:
- SheetJS 0.18.5 tiene una vulnerabilidad conocida (CVE-2023-30533) al **leer** archivos manipulados. Esta aplicación solo
  **escribe** archivos Excel (nunca lee uno que suba el usuario), así que no la alcanza.
- `leaflet.css` menciona tres imágenes (marcador y control de capas) que **no se descargaron** porque la aplicación usa
  marcadores propios (`divIcon`) y no usa el control de capas.
- Las teselas del mapa vienen de OpenStreetMap (© colaboradores de OpenStreetMap) y se muestran con su atribución.
