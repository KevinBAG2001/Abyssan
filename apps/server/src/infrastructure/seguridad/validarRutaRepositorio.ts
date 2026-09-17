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

/**
 * Allowlist de URL para clone y `git remote add`.
 * Bloquea file://, rutas locales, UNC, git:// y protocolos ext.
 */
export function validarUrlClone(url: string): string {
  if (!url || typeof url !== 'string') {
    throw new Error('La URL de clonado es requerida');
  }
  const recortada = url.trim();
  if (
    !recortada ||
    recortada.includes('\0') ||
    recortada.includes('\r') ||
    recortada.includes('\n')
  ) {
    throw new Error('La URL de clonado es requerida');
  }
  if (
    /^file:/i.test(recortada) ||
    recortada.startsWith('/') ||
    recortada.startsWith('\\\\') ||
    /^[a-zA-Z]:[\\/]/.test(recortada)
  ) {
    throw new Error('Solo se permite clonar por HTTPS o SSH. file:// no está permitido.');
  }
  if (!/^https:\/\//i.test(recortada) && !/^git@/i.test(recortada) && !/^ssh:\/\//i.test(recortada)) {
    throw new Error('La URL debe ser HTTPS o SSH');
  }
  return recortada;
}

/** Nombre de remoto Git: un token, sin flags (`-u`) ni metacaracteres. */
export function validarNombreRemoto(nombre: string): string {
  const recortado = (nombre ?? '').trim();
  if (!recortado || recortado.length > 100) {
    throw new Error('Nombre de remoto no válido');
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(recortado)) {
    throw new Error('Nombre de remoto no válido');
  }
  return recortado;
}

/** Hash de commit (4–40 hex). Evita inyectar rangos o flags en git. */
export function validarHashGit(hash: string): string {
  const recortado = (hash ?? '').trim();
  if (!/^[0-9a-fA-F]{4,40}$/.test(recortado)) {
    throw new Error('Hash de commit no válido');
  }
  return recortado;
}

const CARACTERES_REF_PROHIBIDOS = ['~', '^', ':', '?', '*', '[', '\\', ';', '|', '&', '$', '`', '<', '>'];

/**
 * Nombre de rama/tag/ref o hash. Alineado con git-check-ref-format:
 * rechaza flags (`-u`), rangos (`..`), reflog (`@{`) y metacaracteres.
 * No acepta `HEAD~1` ni `main^{}`: el API trabaja con nombres y hashes.
 */
export function validarRefGit(ref: string): string {
  const recortado = (ref ?? '').trim();
  if (!recortado || recortado.length > 255) {
    throw new Error('Ref Git no válida');
  }
  if (recortado === '@') {
    throw new Error('Ref Git no válida');
  }
  if (
    recortado.startsWith('-') ||
    recortado.startsWith('/') ||
    recortado.endsWith('.') ||
    recortado.endsWith('.lock') ||
    recortado.includes('\0') ||
    recortado.includes('\r') ||
    recortado.includes('\n') ||
    recortado.includes('..') ||
    recortado.includes('//') ||
    recortado.includes('@{')
  ) {
    throw new Error('Ref Git no válida');
  }
  if (/\s/.test(recortado) || CARACTERES_REF_PROHIBIDOS.some((c) => recortado.includes(c))) {
    throw new Error('Ref Git no válida');
  }
  return recortado;
}

/** Índice de stash@{n}: entero ≥ 0. Evita interpolar texto en el refspec. */
export function validarIndiceStash(indice: unknown): number {
  const n = typeof indice === 'number' ? indice : Number(indice);
  if (!Number.isInteger(n) || n < 0 || n > 10_000) {
    throw new Error('Índice de stash no válido');
  }
  return n;
}

export function validarTipoReset(tipo: string): 'soft' | 'mixed' | 'hard' {
  if (tipo !== 'soft' && tipo !== 'mixed' && tipo !== 'hard') {
    throw new Error('Tipo de reset no válido');
  }
  return tipo;
}
