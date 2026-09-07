import fs from 'node:fs';
import { simpleGit } from 'simple-git';

const RUTA_GITCONFIG_EN_CONTENEDOR = '/host-gitconfig';

async function leerClave(archivo: string, clave: 'user.name' | 'user.email'): Promise<string> {
  try {
    return (await simpleGit().raw(['config', '-f', archivo, '--get', clave])).trim();
  } catch {
    return '';
  }
}

/**
 * Copia solo user.name / user.email del gitconfig montado.
 * No incluye safe.directory ni helpers: esas claves de Windows rompen Git en Linux
 * y no deben entrar al contenedor.
 *
 * Si el archivo no existe (dev en el host), no toca el gitconfig global.
 */
export async function aplicarIdentidadGitHost(
  archivoHost = process.env.ABYSSAN_GITCONFIG_INTERNO?.trim() || RUTA_GITCONFIG_EN_CONTENEDOR
): Promise<boolean> {
  if (!fs.existsSync(archivoHost) || !fs.statSync(archivoHost).isFile()) {
    return false;
  }

  const git = simpleGit();

  try {
    await git.raw(['config', '--global', '--unset-all', 'include.path']);
  } catch {
    /* no había include.path */
  }

  const nombre = await leerClave(archivoHost, 'user.name');
  const correo = await leerClave(archivoHost, 'user.email');
  if (!nombre && !correo) return false;

  if (nombre) await git.raw(['config', '--global', 'user.name', nombre]);
  if (correo) await git.raw(['config', '--global', 'user.email', correo]);
  return true;
}
