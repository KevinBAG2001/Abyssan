import fs from 'node:fs';
import path from 'node:path';

/**
 * Valida que una ruta de repositorio esté contenida dentro de PROJECTS_ROOT.
 * Canoniza con realpath: un symlink bajo la raíz que apunta fuera es 403.
 */
export function obtenerRaizProyectos(): string {
  const raiz = process.env.PROJECTS_ROOT;
  if (!raiz) {
    throw new Error('PROJECTS_ROOT no está configurado en el entorno del servidor');
  }
  return path.resolve(raiz);
}

function canonizarSiExiste(ruta: string): string {
  try {
    return fs.realpathSync.native(ruta);
  } catch {
    try {
      return fs.realpathSync(ruta);
    } catch {
      return path.resolve(ruta);
    }
  }
}

/** Ruta canónica: sigue symlinks; si el destino aún no existe, canoniza el ancestro existente. */
export function canonizarRuta(ruta: string): string {
  const resuelto = path.resolve(ruta);
  if (fs.existsSync(resuelto)) {
    return canonizarSiExiste(resuelto);
  }
  let actual = resuelto;
  const segmentos: string[] = [];
  while (!fs.existsSync(actual)) {
    const padre = path.dirname(actual);
    if (padre === actual) break;
    segmentos.unshift(path.basename(actual));
    actual = padre;
  }
  const base = fs.existsSync(actual) ? canonizarSiExiste(actual) : path.resolve(actual);
  return path.resolve(base, ...segmentos);
}

export function estaContenidaEnRaiz(candidato: string, raiz: string): boolean {
  const raizNorm = path.resolve(raiz);
  const candNorm = path.resolve(candidato);
  if (process.platform === 'win32') {
    const r = raizNorm.toLowerCase();
    const c = candNorm.toLowerCase();
    return c === r || c.startsWith(r + path.sep.toLowerCase()) || c.startsWith(r + '\\') || c.startsWith(r + '/');
  }
  return candNorm === raizNorm || candNorm.startsWith(raizNorm + path.sep);
}

export function validarRutaRepositorio(repoPath: string): string {
  if (!repoPath || typeof repoPath !== 'string') {
    throw new Error('La ruta del repositorio es requerida');
  }

  const raizLexica = obtenerRaizProyectos();
  const raizCanon = canonizarRuta(raizLexica);
  const resueltoLexico = path.resolve(repoPath);

  if (!estaContenidaEnRaiz(resueltoLexico, raizLexica) && !estaContenidaEnRaiz(resueltoLexico, raizCanon)) {
    throw new Error('Ruta de repositorio no autorizada');
  }

  const canon = canonizarRuta(resueltoLexico);
  if (!estaContenidaEnRaiz(canon, raizCanon)) {
    throw new Error('Ruta de repositorio no autorizada');
  }

  return canon;
}

/** Absoluta en el host o con forma Windows (`C:\...`) aunque el server sea POSIX. */
export function esRutaArchivoAbsoluta(filePath: string): boolean {
  return path.posix.isAbsolute(filePath) || path.win32.isAbsolute(filePath);
}

export function validarRutaArchivoEnRepositorio(repoPath: string, filePath: string): string {
  const repoResuelto = validarRutaRepositorio(repoPath);

  if (!filePath || typeof filePath !== 'string') {
    throw new Error('La ruta del archivo es requerida');
  }

  if (esRutaArchivoAbsoluta(filePath)) {
    throw new Error('La ruta del archivo debe ser relativa al repositorio');
  }

  const normalizado = path.normalize(filePath);
  if (normalizado.startsWith('..') || normalizado.includes(`..${path.sep}`)) {
    throw new Error('Ruta de archivo no válida');
  }

  const archivoResuelto = path.resolve(repoResuelto, normalizado);
  const archivoCanon = fs.existsSync(archivoResuelto) ? canonizarRuta(archivoResuelto) : archivoResuelto;
  if (!estaContenidaEnRaiz(archivoCanon, repoResuelto)) {
    throw new Error('Ruta de archivo fuera del repositorio');
  }

  return normalizado;
}

/**
 * Nombre de carpeta destino para clone/init: 1 o 2 segmentos bajo PROJECTS_ROOT.
 * Rechaza `..`, absolutas y separadores extraños. Canoniza con realpath.
 */
export function validarDestinoNuevo(nombreCarpeta: string): string {
  if (!nombreCarpeta || typeof nombreCarpeta !== 'string') {
    throw new Error('El nombre de carpeta es requerido');
  }
  const recortado = nombreCarpeta.trim().replace(/\\/g, '/');
  if (!recortado) {
    throw new Error('El nombre de carpeta es requerido');
  }
  const partes = recortado.split('/').filter((p) => p.length > 0);
  if (partes.length === 0 || partes.length > 2) {
    throw new Error('El destino debe ser una subcarpeta (máximo dos niveles) de PROJECTS_ROOT');
  }
  if (partes.some((p) => p === '.' || p === '..' || p.includes('..'))) {
    throw new Error('Ruta de repositorio no autorizada');
  }
  const destino = path.join(obtenerRaizProyectos(), ...partes);
  return validarRutaRepositorio(destino);
}

export function validarUrlClone(url: string): string {
  if (!url || typeof url !== 'string') {
    throw new Error('La URL de clonado es requerida');
  }
  const recortada = url.trim();
  if (/^file:/i.test(recortada) || recortada.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(recortada)) {
    throw new Error('Solo se permite clonar por HTTPS o SSH. file:// no está permitido.');
  }
  if (!/^https:\/\//i.test(recortada) && !/^git@/i.test(recortada) && !/^ssh:\/\//i.test(recortada)) {
    throw new Error('La URL debe ser HTTPS o SSH');
  }
  return recortada;
}
