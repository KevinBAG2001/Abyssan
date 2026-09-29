export type TipoOperacion =
  | 'crearRama'
  | 'borrarRama'
  | 'renombrarRama'
  | 'commit'
  | 'amend'
  | 'reset'
  | 'discard'
  | 'checkout'
  | 'merge'
  | 'clone'
  | 'init'
  | 'cherry-pick'
  | 'revert'
  | 'pull'
  | 'push';

/**
 * Estado del journal. No es el estado de React ni de la cola en memoria.
 * `en_curso` se persiste antes de mutar, para poder recuperar tras un cierre del proceso.
 */
export type EstadoJournal = 'en_curso' | 'completada' | 'fallida' | 'recuperada';

/** Punto observable del repositorio. Hoy solo HEAD; no es una copia del árbol. */
export type PuntoRepositorio = {
  head?: string;
};

export type EstrategiaRecuperacion = 'ref_temporal' | 'snapshot' | 'ninguna';

/**
 * Cómo volver atrás. La ref vive en el repo (`refs/abyssan/recovery/<id>`).
 * El hash es una comprobación, no la única copia del commit.
 */
export type InformacionRecuperacion = {
  estrategia: EstrategiaRecuperacion;
  ref?: string;
  hash?: string;
  snapshotId?: string;
  disponible: boolean;
  motivo?: string;
};

/** Vista de la última operación (contrato Daily Driver). */
export type UltimaOperacion = {
  id?: string;
  tipo?: TipoOperacion;
  repoPath?: string;
  descripcion?: string;
  puedeDeshacer: boolean;
  motivoBloqueo?: string;
  payload?: Record<string, string>;
  comandoGit?: string;
  estadoAnterior?: string;
  timestamp?: string;
};

export type DatosRegistroJournal = {
  tipo: TipoOperacion;
  repoPath: string;
  descripcion: string;
  puedeDeshacer: boolean;
  motivoBloqueo?: string;
  payload: Record<string, string>;
  snapshotId?: string;
  comandoGit?: string;
  estadoAnterior?: string;
  antes?: PuntoRepositorio;
  despues?: PuntoRepositorio;
  estado?: EstadoJournal;
  recuperacion?: InformacionRecuperacion;
};

export type EntradaJournal = DatosRegistroJournal & {
  id: string;
  timestamp: string;
  deshecha: boolean;
  estado: EstadoJournal;
};

/** Lo que sale por HTTP: sin contenidos de archivo ni payload crudo. */
export type EntradaJournalPublica = {
  id: string;
  tipo: TipoOperacion;
  descripcion: string;
  puedeDeshacer: boolean;
  motivoBloqueo?: string;
  comandoGit: string;
  estadoAnterior: string;
  timestamp: string;
  deshecha: boolean;
  esPunta: boolean;
  archivosSnapshot: number;
  estado: EstadoJournal;
  estrategiaRecuperacion: EstrategiaRecuperacion;
};
