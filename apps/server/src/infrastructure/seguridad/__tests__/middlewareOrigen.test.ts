import { describe, it, expect } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { middlewareOrigenMutacion } from '../../../interfaces/http/middlewareOrigen.js';

function simular(
  method: string,
  origin: string | undefined
): { status?: number; mensaje?: string; nextCalled: boolean } {
  const req = { method, headers: origin ? { origin } : {} } as unknown as Request;
  let status: number | undefined;
  let mensaje: string | undefined;
  const res = {
    status(code: number) {
      status = code;
      return this;
    },
    json(cuerpo: { mensaje?: string }) {
      mensaje = cuerpo.mensaje;
      return this;
    },
  } as unknown as Response;
  let nextCalled = false;
  const next: NextFunction = () => {
    nextCalled = true;
  };
  middlewareOrigenMutacion(req, res, next);
  return { status, mensaje, nextCalled };
}

describe('middlewareOrigenMutacion', () => {
  it('deja pasar GET', () => {
    const r = simular('GET', 'https://evil.example');
    expect(r.nextCalled).toBe(true);
    expect(r.status).toBeUndefined();
  });

  it('deja pasar POST sin Origin', () => {
    const r = simular('POST', undefined);
    expect(r.nextCalled).toBe(true);
  });

  it('deja pasar POST desde la SPA', () => {
    const r = simular('POST', 'http://localhost:5174');
    expect(r.nextCalled).toBe(true);
  });

  it('rechaza POST de un origen ajeno', () => {
    const r = simular('POST', 'https://evil.example');
    expect(r.nextCalled).toBe(false);
    expect(r.status).toBe(403);
    expect(r.mensaje).toBe('Origen no permitido');
  });
});
