// Austria: Clon temporal aislado para simular Git sin tocar el repositorio del usuario.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { simpleGit } from 'simple-git';

function rutaGit(p: string): string {
  return p.replace(/\\/g, '/');
}

function borrarDir(ruta: string): void {
  try {
    fs.rmSync(ruta, { recursive: true, force: true, maxRetries: 8, retryDelay: 40 });
  } catch {
    // Windows puede retener el lock de git un instante
  }
}

function desactivarHooksEnClon(rutaSandbox: string, hooksVacios: string): void {
  const configPath = path.join(rutaSandbox, '.git', 'config');
  if (!fs.existsSync(configPath)) return;
  fs.appendFileSync(configPath, `\n[core]\n\thooksPath = ${rutaGit(hooksVacios)}\n`, 'utf8');
}

/**
 * Clona `repoOrigen` a un directorio temporal (fuera de PROJECTS_ROOT),
 * desactiva hooks (sin `git config`, simple-git lo bloquea) y ejecuta `trabajo`.
 * El clon se borra siempre. No escribe refs, índice ni worktree del origen.
 */
export async function ejecutarEnClonTemporal<T>(
  repoOrigen: string,
  trabajo: (rutaSandbox: string) => Promise<T>,
): Promise<T> {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'abyssan-sandbox-'));
  const hooksVacios = path.join(raiz, '_hooks_vacios');
  const rutaSandbox = path.join(raiz, 'repo');
  fs.mkdirSync(hooksVacios, { recursive: true });

  try {
    await simpleGit().raw([
      'clone',
      '--local',
      '--no-checkout',
      repoOrigen,
      rutaSandbox,
    ]);
    desactivarHooksEnClon(rutaSandbox, hooksVacios);
    return await trabajo(rutaSandbox);
  } finally {
    borrarDir(raiz);
  }
}
