// Arranque del servidor: `npm start`. Variables: PUERTO (3000), AQUAGEST_DB (data/aquagest.db), AQUAGEST_DEMO (activa por defecto; 0 la apaga).
// ⚠️ Solo para la red local del grupo: no tiene límite de ritmo por IP ni revisión de seguridad independiente.
// NUNCA se debe abrir al internet (ver la advertencia del README).
import { networkInterfaces } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Base } from './db.js';
import { crearServidor } from './http.js';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const puerto = Number(process.env.PUERTO ?? 3000);
const rutaBase = process.env.AQUAGEST_DB ?? resolve(raiz, 'data', 'aquagest.db');
// Por defecto la demostración está ACTIVA (npm start); AQUAGEST_DEMO=0 la apaga. Funciona igual en Windows, Mac y Linux.
const demo = !['0', 'false'].includes(process.env.AQUAGEST_DEMO ?? '1');

if (!Number.isInteger(puerto) || puerto < 0 || puerto > 65535) {
  console.error(`PUERTO no es válido: «${process.env.PUERTO}». Use un número entre 1 y 65535.`);
  process.exit(1);
}

const base = new Base(rutaBase);
const { servidor } = crearServidor({ base, demo });

servidor.on('error', (err) => {
  console.error(err.code === 'EADDRINUSE' ? `El puerto ${puerto} ya está en uso. Cierre el otro servidor o use otro: PUERTO=3001 npm start` : `No se pudo iniciar el servidor: ${err.message}`);
  process.exit(1);
});

servidor.listen(puerto, '0.0.0.0', () => {
  const real = servidor.address().port;
  console.log('AquaGest MiAMBIENTE — servidor con base de datos');
  console.log(`  Base de datos: ${rutaBase}`);
  console.log(`  Modo demostración (bandeja de correo pública): ${demo ? 'SÍ' : 'no'}`);
  console.log('  Entre desde este computador:');
  console.log(`    http://localhost:${real}/app/`);
  const redes = Object.values(networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal);
  if (redes.length) {
    console.log('  Entre desde OTRO computador de la misma red:');
    for (const r of redes) console.log(`    http://${r.address}:${real}/app/`);
  }
  console.log('  ⚠️ Solo para la red local. No lo abra al internet. Para apagarlo: Ctrl+C.');
});

function apagar() {
  servidor.close(() => { base.cerrar(); process.exit(0); });
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on('SIGINT', apagar);
process.on('SIGTERM', apagar);
