import type { NextFunction, Request, Response } from 'express';
import { esBindLoopback } from './tokenInstancia.js';
import { responderFallo } from '../../interfaces/http/respuestaApi.js';

const VENTANA_MS = 60_000;
const MAX_PETICIONES = 90;

type Cubo = { marcas: number[] };

const cubos = new Map<string, Cubo>();

function esIpLoopback(ip?: string): boolean {
  if (!ip) return false;
  const limpia = ip.replace(/^::ffff:/, '').toLowerCase();
  return limpia === '127.0.0.1' || limpia === '::1' || limpia === 'localhost';
}

export function ipDePeticion(req: Pick<Request, 'ip' | 'socket'>): string {
  return req.ip || req.socket?.remoteAddress || 'desconocida';
}

/** Ventana deslizante. Devuelve false si hay que rechazar. */
export function cabenPeticiones(
  clave: string,
  ahora = Date.now(),
  max = MAX_PETICIONES,
  ventana = VENTANA_MS
): boolean {
  const cubo = cubos.get(clave) ?? { marcas: [] };
  cubo.marcas = cubo.marcas.filter((t) => ahora - t < ventana);
  if (cubo.marcas.length >= max) {
    cubos.set(clave, cubo);
    return false;
  }
  cubo.marcas.push(ahora);
  cubos.set(clave, cubo);
  return true;
}

export function reiniciarLimiteTasa(): void {
  cubos.clear();
}

/**
 * Rate limit solo si BIND_HOST no es loopback.
 * Peticiones desde localhost no se penalizan (LAN bind, cliente local).
 */
export function middlewareLimiteTasa(req: Request, res: Response, next: NextFunction): void {
  if (esBindLoopback()) {
    next();
    return;
  }
  const ip = ipDePeticion(req);
  if (esIpLoopback(ip)) {
    next();
    return;
  }
  if (!cabenPeticiones(ip)) {
    responderFallo(res, 'Demasiadas peticiones. Espera un momento.', 429);
    return;
  }
  next();
}
