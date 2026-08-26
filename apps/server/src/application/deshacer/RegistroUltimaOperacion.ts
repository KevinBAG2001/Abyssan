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
  | 'init';

export type UltimaOperacion = {
  tipo: TipoOperacion;
  repoPath: string;
  descripcion: string;
  puedeDeshacer: boolean;
  motivoBloqueo?: string;
  payload: Record<string, string>;
  timestamp: string;
};

export class RegistroUltimaOperacion {
  private actual: UltimaOperacion | null = null;

  registrar(op: Omit<UltimaOperacion, 'timestamp'>): void {
    this.actual = { ...op, timestamp: new Date().toISOString() };
  }

  obtener(repoPath?: string): UltimaOperacion | null {
    if (!this.actual) return null;
    if (repoPath && this.actual.repoPath !== repoPath) return null;
    return this.actual;
  }

  marcarNoDeshacer(motivo: string): void {
    if (!this.actual) return;
    this.actual = { ...this.actual, puedeDeshacer: false, motivoBloqueo: motivo };
  }

  limpiar(): void {
    this.actual = null;
  }
}

export const registroUltimaOperacion = new RegistroUltimaOperacion();
