/**
 * Política centralizada de refs Git (SEC-REF-01).
 *
 * Contrato de API: Abyssan acepta nombres de rama/tag, hashes, HEAD,
 * `origin/main` y refs completas (`refs/heads/…`, `refs/remotes/…`).
 * No acepta expresiones de reflog ni de revisión (`HEAD~1`, `HEAD^`,
 * `main^{}`, `HEAD@{1}`, globs, rangos `..`).
 */

const CARACTERES_REF_PROHIBIDOS = ['~', '^', ':', '?', '*', '[', '\\', ';', '|', '&', '$', '`', '<', '>'];

/** Hash de commit (4–40 hex). Evita inyectar rangos o flags en git. */
export function validarHashGit(hash: string): string {
  const recortado = (hash ?? '').trim();
  if (!/^[0-9a-fA-F]{4,40}$/.test(recortado)) {
    throw new Error('Hash de commit no válido');
  }
  return recortado;
}

/**
 * Nombre de rama/tag/ref o hash. Alineado con git-check-ref-format:
 * rechaza flags (`-u`), rangos (`..`), reflog (`@{`) y metacaracteres.
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

/**
 * Refspec de fetch de forja (PR/MR) o una ref simple.
 * Permite `+pull/12/head:abyssan-pr-12` y `+merge-requests/3/head:abyssan-mr-3`.
 */
export function validarRefspecFetch(refspec: string): string {
  const recortado = (refspec ?? '').trim();
  if (!recortado || recortado.length > 255) {
    throw new Error('Refspec de fetch no válido');
  }
  const forja = /^\+?(pull|merge-requests)\/(\d+)\/head:([A-Za-z0-9._/-]+)$/.exec(recortado);
  if (forja) {
    validarRefGit(forja[3]);
    return recortado;
  }
  return validarRefGit(recortado);
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
