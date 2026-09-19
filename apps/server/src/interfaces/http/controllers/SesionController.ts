import type { Request, Response } from 'express';
import { tokenEsValido, tokenLanEsObligatorio } from '../../../infrastructure/seguridad/tokenInstancia.js';
import {
  cabeceraBorrarCookieSesion,
  cabeceraSetCookieSesion,
  crearSesion,
  extraerCookieSesion,
  revocarSesion,
  sesionEsValida,
  TTL_SESION_MS,
} from '../../../infrastructure/seguridad/sesionInstancia.js';
import { extraerOrigin, origenDePeticionPermitido } from '../../../infrastructure/seguridad/origenesPermitidos.js';
import { responderExito, responderFallo } from '../respuestaApi.js';

function idSesionDePeticion(req: Request): string | undefined {
  return extraerCookieSesion(req.headers.cookie);
}

export class SesionController {
  estado(req: Request, res: Response): void {
    const id = idSesionDePeticion(req);
    const activa = !tokenLanEsObligatorio() || sesionEsValida(id);
    responderExito(
      res,
      {
        activa,
        requiereToken: tokenLanEsObligatorio() && !activa,
        expiraEnMs: activa && tokenLanEsObligatorio() ? TTL_SESION_MS : null,
      },
      activa ? 'Sesión activa' : 'Sesión requerida'
    );
  }

  abrir(req: Request, res: Response): void {
    if (!origenDePeticionPermitido(extraerOrigin(req.headers.origin))) {
      responderFallo(res, 'Origen no permitido', 403);
      return;
    }

    if (tokenLanEsObligatorio()) {
      const token = typeof req.body?.token === 'string' ? req.body.token : undefined;
      if (!tokenEsValido(token)) {
        responderFallo(res, 'Token de instancia requerido', 401, { requiereToken: true });
        return;
      }
    }

    const sesion = crearSesion();
    res.setHeader('Set-Cookie', cabeceraSetCookieSesion(sesion.id));
    responderExito(
      res,
      {
        activa: true,
        idSesion: sesion.id,
        requiereToken: false,
        expiraEnMs: TTL_SESION_MS,
      },
      'Sesión abierta'
    );
  }

  cerrar(req: Request, res: Response): void {
    revocarSesion(idSesionDePeticion(req));
    res.setHeader('Set-Cookie', cabeceraBorrarCookieSesion());
    responderExito(res, { activa: false, requiereToken: tokenLanEsObligatorio() }, 'Sesión cerrada');
  }
}

export const sesionController = new SesionController();
