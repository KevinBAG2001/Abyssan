export type TipoGitOperacion =
  | 'clone'
  | 'fetch'
  | 'pull'
  | 'push'
  | 'rebase'
  | 'merge'
  | 'reset'
  | 'discard'
  | 'checkout'
  | 'commit'
  | 'init'
  | 'cherry-pick'
  | 'revert'
  | 'borrarRama'
  | 'amend'
  | 'stash'
  | 'deshacer';

export type EstadoGitOperacion = 'en_cola' | 'corriendo' | 'exito' | 'fallo';

export type InformeProgresoGit = {
  etapa: string;
  porcentaje: number;
};

export type EscuchaProgresoGit = (informe: InformeProgresoGit) => void;

export type GitOperacion = {
  id: string;
  tipo: TipoGitOperacion;
  repo: string;
  estado: EstadoGitOperacion;
  progreso: number;
  etapa?: string;
  timestamps: {
    creada: string;
    inicio?: string;
    fin?: string;
  };
  error?: string;
};

export const TIPOS_DESTRUCTIVOS: ReadonlySet<TipoGitOperacion> = new Set([
  'clone',
  'pull',
  'push',
  'rebase',
  'merge',
  'reset',
  'discard',
  'checkout',
  'cherry-pick',
  'revert',
  'borrarRama',
  'amend',
  'stash',
]);
