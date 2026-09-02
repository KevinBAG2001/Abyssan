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
};

export type EntradaJournal = DatosRegistroJournal & {
  id: string;
  timestamp: string;
  deshecha: boolean;
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
};
