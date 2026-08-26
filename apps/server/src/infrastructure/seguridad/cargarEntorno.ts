import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function aplicarArchivoEnv(ruta: string): void {
  if (!fs.existsSync(ruta)) return;
  const texto = fs.readFileSync(ruta, 'utf8');
  for (const linea of texto.split('\n')) {
    const recortada = linea.trim();
    if (!recortada || recortada.startsWith('#')) continue;
    const idx = recortada.indexOf('=');
    if (idx <= 0) continue;
    const clave = recortada.slice(0, idx).trim();
    let valor = recortada.slice(idx + 1).trim();
    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1);
    }
    if (process.env[clave] === undefined) {
      process.env[clave] = valor;
    }
  }
}

function buscarHaciaArriba(desde: string, nombre: string): string | undefined {
  let dir = path.resolve(desde);
  for (let i = 0; i < 8; i++) {
    const candidato = path.join(dir, nombre);
    if (fs.existsSync(candidato)) return candidato;
    const padre = path.dirname(dir);
    if (padre === dir) break;
    dir = padre;
  }
  return undefined;
}

/**
 * Carga `.env` de la raíz del monorepo sin pisar variables ya definidas.
 */
export function cargarEntorno(): void {
  const aqui = path.dirname(fileURLToPath(import.meta.url));
  const candidatos = [
    buscarHaciaArriba(process.cwd(), '.env'),
    buscarHaciaArriba(aqui, '.env'),
    path.resolve(process.cwd(), '../../.env'),
    path.resolve(aqui, '../../../../..', '.env'),
  ];
  for (const ruta of candidatos) {
    if (ruta && fs.existsSync(ruta)) {
      aplicarArchivoEnv(ruta);
    }
  }
}
