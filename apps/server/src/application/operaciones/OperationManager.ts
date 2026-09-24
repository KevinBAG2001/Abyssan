/**
 * Motor in-process de operaciones Git (Bloque C).
 * No es cola distribuida: vive en el proceso actual, en memoria.
 *
 * Camino: OperationManager → RepositoryOperationLock → trabajo (use case / adapter).
 * Compatibilidad UI: sincroniza RegistroOperaciones (estados en español / WS).
 */
import { randomBytes } from 'node:crypto';
import {
  EstadoGitOperacion,
  EscuchaProgresoGit,
  TipoGitOperacion,
} from '../../domain/entities/GitOperacion.js';
import { sanitizarTextoAuditoria } from '../../infrastructure/auditoria/AuditoriaJsonlAdapter.js';
import { mensajeErrorGit } from '../git/mensajeErrorGit.js';
import {
  OPERACIONES_EXCLUSIVAS,
  RepositoryOperationLock,
  TipoOperacionLock,
  clasificarOperacion,
} from './RepositoryOperationLock.js';
import { RegistroOperaciones, registroOperaciones } from './RegistroOperaciones.js';

export type EstadoOperacion = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export type RegistroOperacion = {
  operationId: string;
  repository: string;
  type: string;
  state: EstadoOperacion;
  startedAt?: string;
  finishedAt?: string;
  duration?: number;
  progress: number;
  error?: string;
  metadata: Record<string, unknown>;
};

const MAX_HISTORIAL = 80;

const TIPOS_GIT: ReadonlySet<string> = new Set<TipoGitOperacion>([
  'clone',
  'fetch',
  'pull',
  'push',
  'rebase',
  'merge',
  'reset',
  'discard',
  'checkout',
  'commit',
  'init',
  'cherry-pick',
  'revert',
  'borrarRama',
  'amend',
  'stash',
  'deshacer',
]);

export function mapearTipoLock(tipo: TipoGitOperacion): TipoOperacionLock {
  return tipo as TipoOperacionLock;
}

function estadoParaRegistro(state: EstadoOperacion): Extract<EstadoGitOperacion, 'exito' | 'fallo'> {
  return state === 'completed' ? 'exito' : 'fallo';
}

export class OperationManager {
  private operaciones = new Map<string, RegistroOperacion>();

  constructor(
    private readonly lock: RepositoryOperationLock,
    private readonly registro: RegistroOperaciones = registroOperaciones
  ) {}

  listar(): RegistroOperacion[] {
    return [...this.operaciones.values()].sort((a, b) =>
      (b.startedAt ?? '').localeCompare(a.startedAt ?? '')
    );
  }

  obtener(operationId: string): RegistroOperacion | undefined {
    const op = this.operaciones.get(operationId);
    return op ? this.copiar(op) : undefined;
  }

  hayLock(repository: string): boolean {
    return this.lock.hayTrabajo(repository);
  }

  async ejecutar<T>(params: {
    repository: string;
    type: TipoOperacionLock;
    metadata?: Record<string, unknown>;
    trabajo: (onProgreso: EscuchaProgresoGit) => Promise<T>;
  }): Promise<{ resultado: T; operacion: RegistroOperacion }> {
    const op = this.crear(params.repository, params.type, params.metadata);
    const exclusiva = clasificarOperacion(params.type) !== 'lectura';
    let liberar: (() => void) | undefined;

    try {
      if (exclusiva) {
        liberar = await this.lock.adquirir(params.repository, params.type);
      }
      this.marcarRunning(op.operationId);
      const onProgreso: EscuchaProgresoGit = (informe) => {
        this.actualizarProgreso(op.operationId, informe.porcentaje, informe.etapa);
      };
      const resultado = await params.trabajo(onProgreso);
      this.finalizar(op.operationId, 'completed');
      return { resultado, operacion: this.obtener(op.operationId)! };
    } catch (error) {
      const mensaje = sanitizarTextoAuditoria(mensajeErrorGit(error));
      this.finalizar(op.operationId, 'failed', mensaje);
      throw error;
    } finally {
      liberar?.();
    }
  }

  private crear(
    repository: string,
    type: TipoOperacionLock,
    metadata: Record<string, unknown> = {}
  ): RegistroOperacion {
    const operationId = randomBytes(6).toString('hex');
    const op: RegistroOperacion = {
      operationId,
      repository,
      type,
      state: 'queued',
      progress: 0,
      metadata: { ...metadata },
    };
    this.operaciones.set(operationId, op);
    this.podar();
    const tipoGit = TIPOS_GIT.has(type) ? (type as TipoGitOperacion) : undefined;
    if (tipoGit) {
      this.registro.crear(tipoGit, repository, operationId);
    }
    return this.copiar(op);
  }

  private marcarRunning(operationId: string): void {
    const op = this.operaciones.get(operationId);
    if (!op) return;
    op.state = 'running';
    op.startedAt = new Date().toISOString();
    this.registro.marcarCorriendo(operationId);
  }

  private actualizarProgreso(operationId: string, porcentaje: number, etapa?: string): void {
    const op = this.operaciones.get(operationId);
    if (!op || op.state === 'completed' || op.state === 'failed' || op.state === 'cancelled') {
      return;
    }
    op.state = 'running';
    op.progress = Math.max(0, Math.min(100, Math.round(porcentaje)));
    if (etapa) op.metadata = { ...op.metadata, etapa };
    if (!op.startedAt) op.startedAt = new Date().toISOString();
    this.registro.actualizarProgreso(operationId, op.progress, etapa);
  }

  private finalizar(operationId: string, state: 'completed' | 'failed' | 'cancelled', error?: string): void {
    const op = this.operaciones.get(operationId);
    if (!op) return;
    op.state = state;
    op.progress = state === 'completed' ? 100 : op.progress;
    op.finishedAt = new Date().toISOString();
    if (error) op.error = error;
    const inicio = op.startedAt ? Date.parse(op.startedAt) : Date.parse(op.finishedAt);
    const duracionMs = Date.parse(op.finishedAt) - inicio;
    op.duration = Number.isFinite(duracionMs) ? Math.max(0, duracionMs) : 0;
    if (TIPOS_GIT.has(op.type)) {
      this.registro.completar(operationId, estadoParaRegistro(state), error);
    }
  }

  private podar(): void {
    if (this.operaciones.size <= MAX_HISTORIAL) return;
    const terminales = [...this.operaciones.values()]
      .filter((op) => op.state === 'completed' || op.state === 'failed' || op.state === 'cancelled')
      .sort((a, b) => (a.finishedAt ?? '').localeCompare(b.finishedAt ?? ''));
    const sobrantes = this.operaciones.size - MAX_HISTORIAL;
    for (const extra of terminales.slice(0, sobrantes)) {
      this.operaciones.delete(extra.operationId);
    }
  }

  private copiar(op: RegistroOperacion): RegistroOperacion {
    return { ...op, metadata: { ...op.metadata } };
  }
}

export const candadoRepositorio = new RepositoryOperationLock();
export const gestorOperaciones = new OperationManager(candadoRepositorio, registroOperaciones);

export { OPERACIONES_EXCLUSIVAS };
