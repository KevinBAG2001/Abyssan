import type { NextFunction, Request, Response } from 'express';
import { extraerOrigin, origenDePeticionPermitido } from '../../infrastructure/seguridad/origenesPermitidos.js';
import { responderFallo } from './respuestaApi.js';

const METODOS_MUTACION = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Bloquea mutaciones cuyo Origin no está en CORS_ORIGINS.
 * Los clientes sin Origin (CLI local) siguen pasando; el POST cruzado del navegador sí envía Origin.
 */
export function middlewareOrigenMutacion(req: Request, res: Response, next: NextFunction): void {
  if (!METODOS_MUTACION.has(req.method)) {
    next();
    return;
  }
  const origin = extraerOrigin(req.headers.origin);
  if (!origenDePeticionPermitido(origin)) {
    responderFallo(res, 'Origen no permitido', 403);
    return;
  }
  next();
}
