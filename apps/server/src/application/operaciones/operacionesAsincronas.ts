import type { TipoGitOperacion } from '../../domain/entities/GitOperacion.js';
import type { EstadoOperacion, RegistroOperacion } from './OperationManager.js';

/**
 * Operaciones cuya respuesta HTTP no espera al proceso git.
 *
 * Hace falta desacoplarlas: dependen de red y pueden durar más que el cliente.
 * `rebase` no tiene ruta propia; es `POST /pull` con `modo: "rebase"`.
 *
 * Merge y cherry-pick se quedan en la petición. Son locales y el conflicto
 * tiene que volver en esa misma respuesta.
 */
export const OPERACIONES_HTTP_DESACOPLADAS: ReadonlySet<TipoGitOperacion> = new Set([
  'clone',
  'fetch',
  'pull',
  'push',
  'rebase',
]);

/** `randomBytes(6)` en hexadecimal. No es una ruta. */
export const PATRON_ID_OPERACION = /^[a-f0-9]{12}$/;

export type VistaOperacion = {
  operationId: string;
  repository: string;
  operationType: string;
  state: EstadoOperacion;
  progress: number;
  startedAt?: string;
  finishedAt?: string;
  duration?: number;
  error?: string;
};

/** Proyección pública: sin metadata, URLs ni contenido de archivos. */
export function vistaOperacion(op: RegistroOperacion): VistaOperacion {
  const vista: VistaOperacion = {
    operationId: op.operationId,
    repository: op.repository,
    operationType: op.type,
    state: op.state,
    progress: op.progress,
  };
  if (op.startedAt) vista.startedAt = op.startedAt;
  if (op.finishedAt) vista.finishedAt = op.finishedAt;
  if (op.duration !== undefined) vista.duration = op.duration;
  if (op.error) vista.error = op.error;
  return vista;
}
