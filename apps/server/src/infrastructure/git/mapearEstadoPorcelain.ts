import type { FileStatusResult } from 'simple-git';
import type { FileChangeEntity } from '../../domain/entities/GitEntities.js';

function tipoDesdeCodigo(codigo: string): FileChangeEntity['status'] {
  if (codigo === 'A') return 'added';
  if (codigo === 'D') return 'deleted';
  if (codigo === 'R' || codigo === 'C') return 'renamed';
  if (codigo === 'U') return 'conflicted';
  return 'modified';
}

function esConflicto(idx: string, wd: string): boolean {
  return idx === 'U' || wd === 'U' || (idx === 'A' && wd === 'A') || (idx === 'D' && wd === 'D');
}

/**
 * Convierte el porcelain de simple-git (`status.files`) en filas de staging.
 * No usa `modified` + `staged` + `created`: esas listas se solapan y duplican archivos.
 *
 * `MM` → dos filas (preparado y sin preparar). `M ` → solo preparado. ` M` → solo sin preparar.
 */
export function mapearEstadoPorcelain(
  porcelain: FileStatusResult[],
  noTracked: string[]
): FileChangeEntity[] {
  const files: FileChangeEntity[] = [];
  const rutasUntracked = new Set<string>();

  for (const f of porcelain) {
    const ruta = f.path;
    const idx = f.index || ' ';
    const wd = f.working_dir || ' ';

    if (idx === '?' || wd === '?') {
      files.push({ path: ruta, status: 'untracked', staged: false });
      rutasUntracked.add(ruta);
      continue;
    }

    if (esConflicto(idx, wd)) {
      files.push({ path: ruta, status: 'conflicted', staged: false });
      continue;
    }

    if (idx !== ' ' && idx !== '!') {
      files.push({ path: ruta, status: tipoDesdeCodigo(idx), staged: true });
    }
    if (wd !== ' ' && wd !== '!') {
      files.push({ path: ruta, status: tipoDesdeCodigo(wd), staged: false });
    }
  }

  for (const file of noTracked) {
    if (rutasUntracked.has(file)) continue;
    if (files.some((x) => x.path === file)) continue;
    files.push({ path: file, status: 'untracked', staged: false });
  }

  return files;
}
