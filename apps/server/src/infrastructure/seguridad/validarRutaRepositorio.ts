import path from 'path';

/**
 * Valida que una ruta de repositorio esté contenida dentro de PROJECTS_ROOT.
 * Previene path traversal (../) y acceso a rutas arbitrarias del host.
 */
export function obtenerRaizProyectos(): string {
  const raiz = process.env.PROJECTS_ROOT;
  if (!raiz) {
    throw new Error('PROJECTS_ROOT no está configurado en el entorno del servidor');
  }
  return path.resolve(raiz);
}

export function validarRutaRepositorio(repoPath: string): string {
  if (!repoPath || typeof repoPath !== 'string') {
    throw new Error('La ruta del repositorio es requerida');
  }

  const raiz = obtenerRaizProyectos();
  const resuelto = path.resolve(repoPath);

  if (resuelto !== raiz && !resuelto.startsWith(raiz + path.sep)) {
    throw new Error('Ruta de repositorio no autorizada');
  }

  return resuelto;
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
  if (!archivoResuelto.startsWith(repoResuelto + path.sep) && archivoResuelto !== repoResuelto) {
    throw new Error('Ruta de archivo fuera del repositorio');
  }

  return normalizado;
}

/**
 * Nombre de carpeta destino para clone/init: 1 o 2 segmentos bajo PROJECTS_ROOT.
 * Rechaza `..`, absolutas y separadores extraños.
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
