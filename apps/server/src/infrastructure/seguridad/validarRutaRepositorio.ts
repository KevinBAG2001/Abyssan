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
