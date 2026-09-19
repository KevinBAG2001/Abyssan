import { afterEach, describe, expect, it } from 'vitest';
import type { Request, Response } from 'express';
import { SesionController } from '../controllers/SesionController.js';
import { vaciarSesiones } from '../../../infrastructure/seguridad/sesionInstancia.js';

function simular(
  method: 'GET' | 'POST' | 'DELETE',
  body?: { token?: string },
  origin = 'http://localhost:5174'
): { status: number; datos: Record<string, unknown>; cookie?: string } {
  const req = {
    method,
    headers: { origin },
    body: body ?? {},
  } as unknown as Request;
  let status = 200;
  let cookie: string | undefined;
  let payload: { datos?: Record<string, unknown> } = {};
  const res = {
    status(code: number) {
      status = code;
      return this;
    },
    json(cuerpo: { datos?: Record<string, unknown> }) {
      payload = cuerpo;
      return this;
    },
    setHeader(nombre: string, valor: string) {
      if (nombre === 'Set-Cookie') cookie = valor;
    },
  } as unknown as Response;
  const ctrl = new SesionController();
  if (method === 'GET') ctrl.estado(req, res);
  else if (method === 'POST') ctrl.abrir(req, res);
  else ctrl.cerrar(req, res);
  return { status, datos: payload.datos ?? {}, cookie };
}

describe('SesionController', () => {
  const bindOriginal = process.env.BIND_HOST;
  const tokenOriginal = process.env.ABYSSAN_API_TOKEN;

  afterEach(() => {
    vaciarSesiones();
    if (bindOriginal !== undefined) process.env.BIND_HOST = bindOriginal;
    else delete process.env.BIND_HOST;
    if (tokenOriginal !== undefined) process.env.ABYSSAN_API_TOKEN = tokenOriginal;
    else delete process.env.ABYSSAN_API_TOKEN;
  });

  it('en loopback abre sesión sin token permanente', () => {
    delete process.env.BIND_HOST;
    delete process.env.ABYSSAN_API_TOKEN;
    const r = simular('POST');
    expect(r.status).toBe(200);
    expect(r.datos.activa).toBe(true);
    expect(r.cookie).toContain('abyssan_sesion=');
    expect(r.cookie).toContain('HttpOnly');
  });

  it('en LAN exige el token de instancia y rechaza el vacío', () => {
    process.env.BIND_HOST = '0.0.0.0';
    process.env.ABYSSAN_API_TOKEN = 'secreto-lan';
    expect(simular('POST').status).toBe(401);
    const ok = simular('POST', { token: 'secreto-lan' });
    expect(ok.status).toBe(200);
    expect(ok.datos.idSesion).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rechaza un Origin ajeno', () => {
    const r = simular('POST', {}, 'https://evil.example');
    expect(r.status).toBe(403);
  });
});
