import { afterEach, describe, expect, it } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { middlewareTokenInstancia } from '../../../interfaces/http/middlewareToken.js';
import { crearSesion, NOMBRE_COOKIE_SESION, vaciarSesiones } from '../sesionInstancia.js';

function simular(auth?: string, cookie?: string): { status?: number; nextCalled: boolean } {
  const headers: Record<string, string> = {};
  if (auth) headers.authorization = auth;
  if (cookie) headers.cookie = cookie;
  const req = { headers } as unknown as Request;
  let status: number | undefined;
  const res = {
    status(code: number) {
      status = code;
      return this;
    },
    json() {
      return this;
    },
  } as unknown as Response;
  let nextCalled = false;
  const next: NextFunction = () => {
    nextCalled = true;
  };
  middlewareTokenInstancia(req, res, next);
  return { status, nextCalled };
}

describe('middlewareTokenInstancia', () => {
  const bindOriginal = process.env.BIND_HOST;
  const tokenOriginal = process.env.ABYSSAN_API_TOKEN;

  afterEach(() => {
    vaciarSesiones();
    if (bindOriginal !== undefined) process.env.BIND_HOST = bindOriginal;
    else delete process.env.BIND_HOST;
    if (tokenOriginal !== undefined) process.env.ABYSSAN_API_TOKEN = tokenOriginal;
    else delete process.env.ABYSSAN_API_TOKEN;
  });

  it('en loopback no exige token', () => {
    delete process.env.BIND_HOST;
    delete process.env.ABYSSAN_API_TOKEN;
    const r = simular();
    expect(r.nextCalled).toBe(true);
  });

  it('en LAN acepta Bearer del token permanente o cookie de sesión', () => {
    process.env.BIND_HOST = '0.0.0.0';
    process.env.ABYSSAN_API_TOKEN = 'secreto-lan';
    expect(simular('Bearer secreto-lan').nextCalled).toBe(true);
    expect(simular('Bearer otro').nextCalled).toBe(false);
    expect(simular('Bearer otro').status).toBe(401);

    const sesion = crearSesion();
    expect(simular(undefined, `${NOMBRE_COOKIE_SESION}=${sesion.id}`).nextCalled).toBe(true);
    expect(simular(`Bearer ${sesion.id}`).nextCalled).toBe(true);
  });
});
