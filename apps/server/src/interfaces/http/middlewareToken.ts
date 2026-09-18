import type { NextFunction, Request, Response } from 'express';
import {
  extraerTokenBearer,
  tokenEsValido,
  tokenLanEsObligatorio,
} from '../../infrastructure/seguridad/tokenInstancia.js';
import { extraerCookieSesion, sesionEsValida } from '../../infrastructure/seguridad/sesionInstancia.js';
import { responderFallo } from './respuestaApi.js';

export function middlewareTokenInstancia(req: Request, res: Response, next: NextFunction): void {
  if (!tokenLanEsObligatorio()) {
    next();
    return;
  }
  const bearer = extraerTokenBearer(req.headers.authorization);
  if (tokenEsValido(bearer) || sesionEsValida(bearer) || sesionEsValida(extraerCookieSesion(req.headers.cookie))) {
    next();
    return;
  }
  responderFallo(res, 'Token de instancia requerido', 401, { requiereToken: true });
}
