import { randomBytes } from 'node:crypto';
import {
  EstadoGitOperacion,
  GitOperacion,
  TipoGitOperacion,
} from '../../domain/entities/GitOperacion.js';
import { auditoriaJsonl } from '../../infrastructure/auditoria/AuditoriaJsonlAdapter.js';
import { hubWebSocket } from '../../infrastructure/ws/HubWebSocket.js';

const MAX_HISTORIAL = 80;

export class RegistroOperaciones {
  private operaciones = new Map<string, GitOperacion>();

  listar(): GitOperacion[] {
    return [...this.operaciones.values()].sort((a, b) =>
      b.timestamps.creada.localeCompare(a.timestamps.creada)
    );
  }

  crear(tipo: TipoGitOperacion, repo: string): GitOperacion {
    const op: GitOperacion = {
      id: randomBytes(6).toString('hex'),
      tipo,
      repo,
      estado: 'en_cola',
      progreso: 0,
      timestamps: { creada: new Date().toISOString() },
    };
    this.operaciones.set(op.id, op);
    this.podar();
    this.emitir(op);
    return op;
  }

  marcarCorriendo(id: string): void {
    const op = this.operaciones.get(id);
    if (!op) return;
    op.estado = 'corriendo';
    op.timestamps.inicio = new Date().toISOString();
    this.emitir(op);
  }

  actualizarProgreso(id: string, porcentaje: number, etapa?: string): void {
    const op = this.operaciones.get(id);
    if (!op || op.estado === 'exito' || op.estado === 'fallo') return;
    op.estado = 'corriendo';
    op.progreso = Math.max(0, Math.min(100, Math.round(porcentaje)));
    if (etapa) op.etapa = etapa;
    if (!op.timestamps.inicio) op.timestamps.inicio = new Date().toISOString();
    this.emitir(op);
  }

  completar(id: string, estado: Extract<EstadoGitOperacion, 'exito' | 'fallo'>, error?: string): void {
    const op = this.operaciones.get(id);
    if (!op) return;
    op.estado = estado;
    op.progreso = estado === 'exito' ? 100 : op.progreso;
    op.timestamps.fin = new Date().toISOString();
    if (error) op.error = error;
    const inicio = op.timestamps.inicio ? Date.parse(op.timestamps.inicio) : Date.parse(op.timestamps.creada);
    const duracionMs = Date.parse(op.timestamps.fin) - inicio;
    auditoriaJsonl.registrar({
      tipo: op.tipo,
      repo: op.repo,
      estado,
      duracionMs: Number.isFinite(duracionMs) ? duracionMs : undefined,
      error,
    });
    this.emitir(op);
  }

  private emitir(op: GitOperacion): void {
    hubWebSocket.emitir({
      type: 'OPERACION_PROGRESO',
      datos: { ...op, timestamps: { ...op.timestamps } },
    });
  }

  private podar(): void {
    if (this.operaciones.size <= MAX_HISTORIAL) return;
    const ordenadas = this.listar();
    for (const extra of ordenadas.slice(MAX_HISTORIAL)) {
      if (extra.estado === 'exito' || extra.estado === 'fallo') {
        this.operaciones.delete(extra.id);
      }
    }
  }
}

export const registroOperaciones = new RegistroOperaciones();
