/**
 * Motor in-process de operaciones Git.
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
import { hubWebSocket } from '../../infrastructure/ws/HubWebSocket.js';

export type TipoEventoOperacion =
  | 'operation.started'
  | 'operation.progress'
  | 'operation.completed'
  | 'operation.failed'
  | 'operation.cancelled';

export type DifusorOperacion = (repository: string, mensaje: Record<string, unknown>) => void;

const CLAVES_EVENTO = [
  'type',
  'operationId',
  'repository',
  'operationType',
  'timestamp',
  'state',
  'progress',
  'error',
] as const;

function difundirPorDefecto(repository: string, mensaje: Record<string, unknown>): void {
  hubWebSocket.emitirARepo(repository, mensaje);
}

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

type TrabajoOperacion<T> = (onProgreso: EscuchaProgresoGit) => Promise<T>;

export class OperationManager {
  private operaciones = new Map<string, RegistroOperacion>();
  private pendientes = new Map<string, Promise<void>>();

  constructor(
    private readonly lock: RepositoryOperationLock,
    private readonly registro: RegistroOperaciones = registroOperaciones,
    private readonly difundir: DifusorOperacion = difundirPorDefecto
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

  /**
   * Arranca el trabajo y devuelve el registro sin esperar a git.
   * El fallo queda en el estado; no rechaza al llamador HTTP.
   */
  iniciar<T>(params: {
    repository: string;
    type: TipoOperacionLock;
    metadata?: Record<string, unknown>;
    trabajo: TrabajoOperacion<T>;
  }): RegistroOperacion {
    const op = this.crear(params.repository, params.type, params.metadata);
    const tarea = this.correr(op.operationId, params).then(
      () => undefined,
      () => undefined
    );
    this.pendientes.set(op.operationId, tarea);
    void tarea.finally(() => {
      this.pendientes.delete(op.operationId);
    });
    return this.obtener(op.operationId)!;
  }

  async esperar(operationId: string): Promise<RegistroOperacion | undefined> {
    const pendiente = this.pendientes.get(operationId);
    if (pendiente) await pendiente;
    return this.obtener(operationId);
  }

  /** Solo en cola. Un git ya en marcha no se puede abortar desde aquí. */
  cancelar(operationId: string): boolean {
    const op = this.operaciones.get(operationId);
    if (!op || op.state !== 'queued') return false;
    this.finalizar(operationId, 'cancelled', 'Operación cancelada');
    return true;
  }

  async ejecutar<T>(params: {
    repository: string;
    type: TipoOperacionLock;
    metadata?: Record<string, unknown>;
    trabajo: TrabajoOperacion<T>;
  }): Promise<{ resultado: T; operacion: RegistroOperacion }> {
    const op = this.crear(params.repository, params.type, params.metadata);
    const resultado = await this.correr(op.operationId, params);
    const operacion = this.obtener(op.operationId)!;
    if (operacion.state !== 'completed') {
      throw new Error(operacion.error || 'La operación no se completó');
    }
    return { resultado: resultado as T, operacion };
  }

  private async correr<T>(
    operationId: string,
    params: {
      repository: string;
      type: TipoOperacionLock;
      trabajo: TrabajoOperacion<T>;
    }
  ): Promise<T | undefined> {
    if (this.esTerminal(operationId)) return undefined;
    const exclusiva = clasificarOperacion(params.type) !== 'lectura';
    let liberar: (() => void) | undefined;

    try {
      if (exclusiva) {
        liberar = await this.lock.adquirir(params.repository, params.type);
      }
      if (this.esTerminal(operationId)) return undefined;
      this.marcarRunning(operationId);
      const onProgreso: EscuchaProgresoGit = (informe) => {
        this.actualizarProgreso(operationId, informe.porcentaje, informe.etapa);
      };
      const resultado = await params.trabajo(onProgreso);
      this.finalizar(operationId, 'completed');
      return resultado;
    } catch (error) {
      if (!this.esTerminal(operationId)) {
        const mensaje = sanitizarTextoAuditoria(mensajeErrorGit(error));
        this.finalizar(operationId, 'failed', mensaje);
      }
      throw error;
    } finally {
      liberar?.();
    }
  }

  private esTerminal(operationId: string): boolean {
    const op = this.operaciones.get(operationId);
    return !op || op.state === 'completed' || op.state === 'failed' || op.state === 'cancelled';
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
    this.publicar(operationId, 'operation.started');
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
    this.publicar(operationId, 'operation.progress');
  }

  private finalizar(operationId: string, state: 'completed' | 'failed' | 'cancelled', error?: string): void {
    const op = this.operaciones.get(operationId);
    if (!op || op.state === 'completed' || op.state === 'failed' || op.state === 'cancelled') return;
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
    const tipo: TipoEventoOperacion =
      state === 'completed' ? 'operation.completed' : state === 'failed' ? 'operation.failed' : 'operation.cancelled';
    this.publicar(operationId, tipo);
  }

  private publicar(operationId: string, type: TipoEventoOperacion): void {
    const op = this.operaciones.get(operationId);
    if (!op) return;
    const mensaje: Record<string, unknown> = {
      type,
      operationId: op.operationId,
      repository: op.repository,
      operationType: op.type,
      timestamp: new Date().toISOString(),
      state: op.state,
      progress: op.progress,
    };
    if (type === 'operation.failed' && op.error) {
      mensaje.error = op.error;
    }
    for (const clave of Object.keys(mensaje)) {
      if (!(CLAVES_EVENTO as readonly string[]).includes(clave)) {
        delete mensaje[clave];
      }
    }
    this.difundir(op.repository, mensaje);
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
