/**
 * RemotePolicy (SEC-REM-01): validación de URLs y nombres de remoto.
 *
 * Protocolos permitidos: HTTPS y SSH (`https://`, `ssh://`, `git@host:path`).
 * Toda operación que use un remoto persistido (fetch, pull, push) debe
 * volver a pasar por esta política; no basta con validar en clone/add.
 */

const MENSAJE_PROTOCOLO = 'La URL debe ser HTTPS o SSH';
const MENSAJE_FILE = 'Solo se permite clonar por HTTPS o SSH. file:// no está permitido.';
const MENSAJE_CREDENCIALES = 'No incrustes credenciales en la URL del remoto';

function recortarUrl(url: string, mensajeVacio: string): string {
  if (!url || typeof url !== 'string') {
    throw new Error(mensajeVacio);
  }
  const recortada = url.trim();
  if (!recortada || recortada.includes('\0') || recortada.includes('\r') || recortada.includes('\n')) {
    throw new Error(mensajeVacio);
  }
  return recortada;
}

function pareceRutaLocal(url: string): boolean {
  return (
    /^file:/i.test(url) ||
    url.startsWith('/') ||
    url.startsWith('\\\\') ||
    /^[a-zA-Z]:[\\/]/.test(url) ||
    url.startsWith('./') ||
    url.startsWith('../')
  );
}

function tieneCredencialesEnUrl(url: string): boolean {
  if (/^https:\/\//i.test(url)) {
    return /^https:\/\/[^/]*:[^/]*@/i.test(url);
  }
  if (/^ssh:\/\//i.test(url)) {
    return /^ssh:\/\/[^/]*:[^/]*@/i.test(url);
  }
  return false;
}

/** Allowlist de URL para clone, remote add, fetch y push. */
export function validarUrlRemoto(url: string): string {
  const recortada = recortarUrl(url, 'La URL de clonado es requerida');
  if (pareceRutaLocal(recortada)) {
    throw new Error(MENSAJE_FILE);
  }
  if (tieneCredencialesEnUrl(recortada)) {
    throw new Error(MENSAJE_CREDENCIALES);
  }
  if (!/^https:\/\//i.test(recortada) && !/^git@/i.test(recortada) && !/^ssh:\/\//i.test(recortada)) {
    throw new Error(MENSAJE_PROTOCOLO);
  }
  return recortada;
}

/** Alias histórico: clone y `git remote add` usan la misma allowlist. */
export function validarUrlClone(url: string): string {
  return validarUrlRemoto(url);
}

/** Destino de fetch/pull: revalida un remoto ya persistido en `.git/config`. */
export function validarDestinoFetch(url: string): string {
  return validarUrlRemoto(url);
}

/** Destino de push: misma allowlist; no se empuja a file:// ni a rutas locales. */
export function validarDestinoPush(url: string): string {
  return validarUrlRemoto(url);
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

/** Quita user:pass de una URL para mostrarla en API/UI. No lanza. */
export function sanitizarRemotoParaMostrar(url: string): string {
  if (!url) return '';
  return url.replace(/^(https?:\/\/)([^/@]+)@/i, '$1').replace(/^(ssh:\/\/)([^/@]+)@/i, '$1git@');
}
