import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { obtenerDirAbyssan } from '../auditoria/AuditoriaJsonlAdapter.js';
import {
  estaContenidaEnRaiz,
  validarRutaArchivoEnRepositorio,
  validarRutaRepositorio,
} from '../seguridad/validarRutaRepositorio.js';

export const MAX_BYTES_SNAPSHOT = 2 * 1024 * 1024;
export const MAX_ARCHIVOS_SNAPSHOT = 50;

export type ArchivoOmitidoSnapshot = { path: string; motivo: string };

export type ManifestSnapshot = {
  archivos: string[];
  omitidos: ArchivoOmitidoSnapshot[];
};

const ID_SEGURO = /^[a-f0-9]{16}$/;

export function validarIdSnapshot(id: string): string {
  if (!ID_SEGURO.test(id)) {
    throw new Error('Identificador de snapshot no válido');
  }
  return id;
}

export function obtenerDirSnapshots(dirBase?: string): string {
  return path.join(dirBase ?? obtenerDirAbyssan(), 'snapshots');
}

function asegurarContencion(destino: string, raiz: string): string {
  const dest = path.resolve(destino);
  if (!estaContenidaEnRaiz(dest, path.resolve(raiz))) {
    throw new Error('Ruta de snapshot fuera del directorio permitido');
  }
  return dest;
}

function rutaEnSnapshot(dirSnapshot: string, relativo: string): string {
  const normalizado = path.normalize(relativo);
  if (path.isAbsolute(normalizado) || normalizado.startsWith('..') || normalizado.includes(`..${path.sep}`)) {
    throw new Error('Ruta de archivo no válida en snapshot');
  }
  return asegurarContencion(path.join(dirSnapshot, normalizado), dirSnapshot);
}

export function crearSnapshotArchivos(
  repoPath: string,
  rutasRelativas: string[],
  dirBase?: string
): { id: string; manifest: ManifestSnapshot } {
  const repo = validarRutaRepositorio(repoPath);
  const id = randomBytes(8).toString('hex');
  const dirSnapshot = path.join(obtenerDirSnapshots(dirBase), id);
  fs.mkdirSync(dirSnapshot, { recursive: true });

  const manifest: ManifestSnapshot = { archivos: [], omitidos: [] };
  const vistas = [...new Set(rutasRelativas)].slice(0, MAX_ARCHIVOS_SNAPSHOT);

  if (rutasRelativas.length > MAX_ARCHIVOS_SNAPSHOT) {
    for (const extra of rutasRelativas.slice(MAX_ARCHIVOS_SNAPSHOT)) {
      manifest.omitidos.push({ path: extra, motivo: 'Límite de archivos en snapshot' });
    }
  }

  for (const relativo of vistas) {
    let seguro: string;
    try {
      seguro = validarRutaArchivoEnRepositorio(repo, relativo);
    } catch {
      manifest.omitidos.push({ path: relativo, motivo: 'Ruta de archivo no autorizada' });
      continue;
    }

    const origen = path.resolve(repo, seguro);
    if (!estaContenidaEnRaiz(origen, repo)) {
      manifest.omitidos.push({ path: seguro, motivo: 'Ruta de archivo fuera del repositorio' });
      continue;
    }
    if (!fs.existsSync(origen)) {
      manifest.omitidos.push({ path: seguro, motivo: 'El archivo ya no existía' });
      continue;
    }
    const stat = fs.statSync(origen);
    if (!stat.isFile()) {
      manifest.omitidos.push({ path: seguro, motivo: 'Solo se copian archivos, no directorios' });
      continue;
    }
    if (stat.size > MAX_BYTES_SNAPSHOT) {
      manifest.omitidos.push({ path: seguro, motivo: 'Archivo demasiado grande para snapshot' });
      continue;
    }

    const dest = rutaEnSnapshot(dirSnapshot, seguro);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(origen, dest);
    manifest.archivos.push(seguro.replace(/\\/g, '/'));
  }

  fs.writeFileSync(path.join(dirSnapshot, 'manifest.json'), JSON.stringify(manifest), 'utf8');
  return { id, manifest };
}

export function restaurarSnapshot(id: string, repoPath: string, dirBase?: string): string[] {
  const snapshotId = validarIdSnapshot(id);
  const repo = validarRutaRepositorio(repoPath);
  const dirSnapshot = path.join(obtenerDirSnapshots(dirBase), snapshotId);
  if (!fs.existsSync(dirSnapshot)) {
    throw new Error('No hay snapshot para restaurar');
  }

  const bruto = fs.readFileSync(path.join(dirSnapshot, 'manifest.json'), 'utf8');
  const manifest = JSON.parse(bruto) as ManifestSnapshot;
  const restaurados: string[] = [];

  for (const relativo of manifest.archivos ?? []) {
    const seguro = validarRutaArchivoEnRepositorio(repo, relativo);
    const origen = rutaEnSnapshot(dirSnapshot, seguro);
    if (!fs.existsSync(origen) || !fs.statSync(origen).isFile()) continue;
    const dest = path.resolve(repo, seguro);
    if (!estaContenidaEnRaiz(dest, repo)) {
      throw new Error('Ruta de archivo fuera del repositorio');
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(origen, dest);
    restaurados.push(seguro);
  }

  return restaurados;
}

export function borrarSnapshot(id: string, dirBase?: string): void {
  if (!ID_SEGURO.test(id)) return;
  const dir = path.join(obtenerDirSnapshots(dirBase), id);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export function contarArchivosSnapshot(id: string | undefined, dirBase?: string): number {
  if (!id || !ID_SEGURO.test(id)) return 0;
  const manifestPath = path.join(obtenerDirSnapshots(dirBase), id, 'manifest.json');
  if (!fs.existsSync(manifestPath)) return 0;
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as ManifestSnapshot;
    return Array.isArray(manifest.archivos) ? manifest.archivos.length : 0;
  } catch {
    return 0;
  }
}
