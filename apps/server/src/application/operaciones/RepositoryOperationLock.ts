/**
 * Contrato in-process de exclusión por repositorio (OPS-01).
 * No es un motor de cola distribuida: vive en el proceso actual.
 *
 * Primera versión: WAIT serializa mutaciones pesadas del mismo repo.
 * Distintos repos no se bloquean entre sí. Lecturas no adquieren lock.
 */

export type ClasificacionOperacion = 'lectura' | 'mutacion_ligera' | 'mutacion_pesada';

export type DecisionBloqueo = 'permitir' | 'esperar' | 'rechazar';

export type TipoOperacionLock =
  | 'status'
  | 'log'
  | 'diff'
  | 'commit'
  | 'branch'
  | 'stage'
  | 'fetch'
  | 'pull'
  | 'push'
  | 'clone'
  | 'init'
  | 'merge'
  | 'rebase'
  | 'reset'
  | 'checkout'
  | 'discard'
  | 'stash'
  | 'amend'
  | 'deshacer'
  | 'borrarRama'
  | 'cherry-pick'
  | 'revert';

const CLASIFICACION: Record<TipoOperacionLock, ClasificacionOperacion> = {
  status: 'lectura',
  log: 'lectura',
  diff: 'lectura',
  commit: 'mutacion_ligera',
  branch: 'mutacion_ligera',
  stage: 'mutacion_ligera',
  fetch: 'mutacion_pesada',
  pull: 'mutacion_pesada',
  push: 'mutacion_pesada',
  clone: 'mutacion_pesada',
  init: 'mutacion_pesada',
  merge: 'mutacion_pesada',
  rebase: 'mutacion_pesada',
  reset: 'mutacion_pesada',
  checkout: 'mutacion_pesada',
  discard: 'mutacion_pesada',
  stash: 'mutacion_pesada',
  amend: 'mutacion_pesada',
  deshacer: 'mutacion_pesada',
  borrarRama: 'mutacion_pesada',
  'cherry-pick': 'mutacion_pesada',
  revert: 'mutacion_pesada',
};

/** Mutaciones incompatibles: un repositorio no ejecuta dos a la vez. */
export const OPERACIONES_EXCLUSIVAS: ReadonlySet<TipoOperacionLock> = new Set([
  'fetch',
  'pull',
  'push',
  'clone',
  'init',
  'merge',
  'rebase',
  'reset',
  'checkout',
  'discard',
  'stash',
  'amend',
  'deshacer',
  'borrarRama',
  'cherry-pick',
  'revert',
]);

/** Lecturas: no adquieren lock. */
export const OPERACIONES_LECTURA: ReadonlySet<TipoOperacionLock> = new Set([
  'status',
  'log',
  'diff',
]);

export function requiereExclusividad(tipo: TipoOperacionLock): boolean {
  return clasificarOperacion(tipo) !== 'lectura';
}

export function clasificarOperacion(tipo: TipoOperacionLock): ClasificacionOperacion {
  return CLASIFICACION[tipo];
}

type Permiso = {
  tipo: TipoOperacionLock;
  clasificacion: ClasificacionOperacion;
};

export class RepositoryOperationLock {
  private ocupados = new Map<string, Permiso>();
  private colas = new Map<string, Array<() => void>>();

  private clave(repo: string): string {
    return repo.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
  }

  decidir(repo: string, tipo: TipoOperacionLock): DecisionBloqueo {
    const clasificacion = clasificarOperacion(tipo);
    if (clasificacion === 'lectura') return 'permitir';
    const actual = this.ocupados.get(this.clave(repo));
    if (!actual) return 'permitir';
    if (actual.clasificacion === 'mutacion_pesada' && clasificacion === 'mutacion_pesada') {
      return 'esperar';
    }
    if (actual.clasificacion === 'mutacion_pesada') {
      return 'esperar';
    }
    return 'esperar';
  }

  async adquirir(repo: string, tipo: TipoOperacionLock): Promise<() => void> {
    const clasificacion = clasificarOperacion(tipo);
    if (clasificacion === 'lectura') {
      return () => undefined;
    }
    const clave = this.clave(repo);
    while (this.ocupados.has(clave)) {
      await new Promise<void>((resolver) => {
        const cola = this.colas.get(clave) ?? [];
        cola.push(resolver);
        this.colas.set(clave, cola);
      });
    }
    this.ocupados.set(clave, { tipo, clasificacion });
    return () => this.liberar(repo);
  }

  hayTrabajo(repo: string): boolean {
    return this.ocupados.has(this.clave(repo));
  }

  private liberar(repo: string): void {
    const clave = this.clave(repo);
    this.ocupados.delete(clave);
    const siguiente = this.colas.get(clave)?.shift();
    if (siguiente) siguiente();
    if ((this.colas.get(clave)?.length ?? 0) === 0) {
      this.colas.delete(clave);
    }
  }
}
