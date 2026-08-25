import type { NextFunction, Request, Response } from 'express';
import {
  extraerTokenBearer,
  tokenEsValido,
  tokenLanEsObligatorio,
} from '../../infrastructure/seguridad/tokenInstancia.js';
import { responderFallo } from './respuestaApi.js';

export function middlewareTokenInstancia(req: Request, res: Response, next: NextFunction): void {
  if (!tokenLanEsObligatorio()) {
    next();
    return;
  }
  const token = extraerTokenBearer(req.headers.authorization);
  if (!tokenEsValido(token)) {
    responderFallo(res, 'Token de instancia requerido', 401);
    return;
  }
  next();
}
